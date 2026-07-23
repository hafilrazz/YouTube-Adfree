import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { Video } from "./faketube-data";

// ============================================================
// This module fetches YouTube data WITHOUT using the official
// YouTube Data API. All requests go through public open-source
// frontends (Piped → Invidious), which act as unauthenticated
// proxies. No API key, no quota.
// ============================================================

function formatViews(nStr: string | undefined): string {
  const n = Number(nStr ?? 0);
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const mo = Math.floor(d / 30);
  const y = Math.floor(d / 365);
  const p = (n: number, unit: string) => `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  if (y) return p(y, "year");
  if (mo) return p(mo, "month");
  if (d) return p(d, "day");
  if (h) return p(h, "hour");
  if (m) return p(m, "minute");
  return "just now";
}

function avatar(seed: string): string {
  return `https://i.pravatar.cc/80?u=${encodeURIComponent(seed)}`;
}

function formatSeconds(sec: number): string {
  if (!sec || sec < 0) return "LIVE";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function stripHtml(s: string): string {
  return (s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ================== Piped (primary source) ==================

const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.wireway.ch",
];


interface PipedItem {
  url?: string;
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  uploaderUrl?: string;
  uploaderAvatar?: string;
  uploadedDate?: string;
  uploaded?: number;
  duration?: number;
  views?: number;
  shortDescription?: string;
  isShort?: boolean;
}

function pipedIdFromUrl(u: string | undefined): string {
  if (!u) return "";
  const m = u.match(/[?&]v=([\w-]{6,})/);
  return m ? m[1] : "";
}

function channelIdFromUrl(u: string | undefined): string {
  if (!u) return "";
  const m = u.match(/\/channel\/([\w-]+)/);
  return m ? m[1] : "";
}

function pipedToVideo(it: PipedItem): Video | null {
  const id = pipedIdFromUrl(it.url);
  if (!id) return null;
  const posted = it.uploadedDate
    ? it.uploadedDate
    : it.uploaded
      ? timeAgo(new Date(it.uploaded).toISOString())
      : "";
  return {
    id,
    title: it.title ?? "",
    channel: it.uploaderName ?? "",
    channelAvatar: it.uploaderAvatar || avatar(it.uploaderName ?? id),
    views: typeof it.views === "number" && it.views >= 0 ? formatViews(String(it.views)) : "—",
    posted,
    duration: formatSeconds(it.duration ?? 0),
    thumbnail: it.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    description: it.shortDescription ?? "",
  };
}

// In-memory cache shared across piped() and invidious() calls.
// Server functions run per-request; this cache lives for the lifetime of the
// worker instance and dramatically reduces repeat fetches to public mirrors.
const memCache = new Map<string, { at: number; ttl: number; value: unknown }>();
function cacheGet<T>(key: string): T | null {
  const hit = memCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > hit.ttl) {
    memCache.delete(key);
    return null;
  }
  return hit.value as T;
}
function cacheSet(key: string, value: unknown, ttlMs: number): void {
  memCache.set(key, { at: Date.now(), ttl: ttlMs, value });
  if (memCache.size > 500) {
    // Evict oldest ~100 entries
    const keys = Array.from(memCache.keys()).slice(0, 100);
    for (const k of keys) memCache.delete(k);
  }
}

async function raceFetch(bases: string[], path: string, timeoutMs = 6000): Promise<unknown> {
  const attempts = bases.map(async (base) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "user-agent": "Mozilla/5.0" },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`${base} → ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  });
  return Promise.any(attempts);
}

async function piped<T>(path: string, ttlMs = 5 * 60_000): Promise<T> {
  const key = `piped:${path}`;
  const cached = cacheGet<T>(key);
  if (cached) return cached;
  const value = (await raceFetch(PIPED_INSTANCES, path)) as T;
  cacheSet(key, value, ttlMs);
  return value;
}


// ================== Invidious (secondary fallback) ==================

const INVIDIOUS_INSTANCES: string[] = [
  // Public Invidious API access is currently rate-limited/CAPTCHA-gated on
  // nearly every instance. Left empty so we short-circuit to the primary
  // Piped path instead of wasting time on failing fetches. Add entries here
  // if a public API endpoint becomes reachable again.
];


interface InvVideoItem {
  type?: string;
  videoId?: string;
  title?: string;
  author?: string;
  authorId?: string;
  authorUrl?: string;
  authorThumbnails?: { url: string; width: number }[];
  videoThumbnails?: { url: string; quality?: string; width?: number }[];
  viewCount?: number;
  viewCountText?: string;
  publishedText?: string;
  published?: number;
  lengthSeconds?: number;
  description?: string;
  descriptionHtml?: string;
  liveNow?: boolean;
  isUpcoming?: boolean;
}

function invAvatar(list: { url: string; width: number }[] | undefined, seed: string): string {
  if (!list || !list.length) return avatar(seed);
  const sorted = [...list].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const u = sorted[0].url;
  return u.startsWith("//") ? `https:${u}` : u;
}

function invThumb(list: { url: string; quality?: string; width?: number }[] | undefined, id: string): string {
  if (!list || !list.length) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const pick =
    list.find((t) => t.quality === "maxresdefault") ??
    list.find((t) => t.quality === "hqdefault") ??
    list.find((t) => t.quality === "high") ??
    list[0];
  const u = pick.url;
  return u.startsWith("//") ? `https:${u}` : u;
}

function invToVideo(it: InvVideoItem): Video | null {
  const id = it.videoId;
  if (!id) return null;
  return {
    id,
    title: it.title ?? "",
    channel: it.author ?? "",
    channelAvatar: invAvatar(it.authorThumbnails, it.author ?? id),
    views:
      typeof it.viewCount === "number" && it.viewCount >= 0
        ? formatViews(String(it.viewCount))
        : it.viewCountText ?? "—",
    posted: it.publishedText ?? (it.published ? timeAgo(new Date(it.published * 1000).toISOString()) : ""),
    duration: it.liveNow ? "LIVE" : formatSeconds(it.lengthSeconds ?? 0),
    thumbnail: invThumb(it.videoThumbnails, id),
    description: it.description ?? "",
  };
}

async function invidious<T>(path: string, ttlMs = 5 * 60_000): Promise<T> {
  const key = `inv:${path}`;
  const cached = cacheGet<T>(key);
  if (cached) return cached;
  const value = (await raceFetch(INVIDIOUS_INSTANCES, path)) as T;
  cacheSet(key, value, ttlMs);
  return value;
}

// ================== Trending ==================

export const getTrending = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; region?: string }) => ({
    category: d?.category ?? "All",
    region: d?.region ?? "US",
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    setResponseHeader("cache-control", "public, max-age=300, s-maxage=600, stale-while-revalidate=1800");

    const isTrending = data.category === "All" || data.category === "Trending";

    // Primary: Piped
    try {
      if (isTrending) {
        const items = await piped<PipedItem[]>(`/trending?region=${encodeURIComponent(data.region)}`);
        const videos = items.map(pipedToVideo).filter((v): v is Video => Boolean(v));
        if (videos.length) return videos.slice(0, 32);
      } else {
        const res = await piped<{ items?: PipedItem[] }>(
          `/search?q=${encodeURIComponent(data.category)}&filter=videos`,
        );
        const videos = (res.items ?? []).map(pipedToVideo).filter((v): v is Video => Boolean(v));
        if (videos.length) return videos.slice(0, 32);
      }
    } catch (e) {
      console.warn("Piped trending failed:", (e as Error).message);
    }

    // Secondary: Invidious
    try {
      if (isTrending) {
        const items = await invidious<InvVideoItem[]>(
          `/api/v1/trending?region=${encodeURIComponent(data.region)}`,
        );
        const videos = items.map(invToVideo).filter((v): v is Video => Boolean(v));
        if (videos.length) return videos.slice(0, 32);
      } else {
        const items = await invidious<InvVideoItem[]>(
          `/api/v1/search?q=${encodeURIComponent(data.category)}&type=video&sort_by=relevance`,
        );
        const videos = items.map(invToVideo).filter((v): v is Video => Boolean(v));
        if (videos.length) return videos.slice(0, 32);
      }
    } catch (e) {
      console.warn("Invidious trending failed:", (e as Error).message);
    }

    return [];
  });

// ================== Search ==================

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; limit?: number; pageToken?: string }) => ({
    q: String(d?.q ?? "").slice(0, 120),
    limit: Math.min(Math.max(Number(d?.limit ?? 20), 1), 50),
    pageToken: d?.pageToken ? String(d.pageToken) : "",
  }))
  .handler(async ({ data }): Promise<{ items: Video[]; nextPageToken?: string; prevPageToken?: string; quotaExceeded?: boolean }> => {
    if (!data.q.trim()) return { items: [] };
    setResponseHeader("cache-control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600");

    // Primary: Piped
    try {
      const path = data.pageToken
        ? `/nextpage/search?nextpage=${encodeURIComponent(data.pageToken)}&q=${encodeURIComponent(data.q)}&filter=videos`
        : `/search?q=${encodeURIComponent(data.q)}&filter=videos`;
      const res = await piped<{ items?: PipedItem[]; nextpage?: string | null }>(path);
      const items = (res.items ?? [])
        .filter((it) => !it.type || it.type === "stream")
        .map(pipedToVideo)
        .filter((v): v is Video => Boolean(v))
        .slice(0, data.limit);
      if (items.length) {
        return {
          items,
          nextPageToken: res.nextpage ? String(res.nextpage) : undefined,
        };
      }
    } catch (e) {
      console.warn("Piped search failed:", (e as Error).message);
    }

    // Secondary: Invidious (first page only — pagination uses ?page=N which we don't track)
    if (!data.pageToken) {
      try {
        const items = await invidious<InvVideoItem[]>(
          `/api/v1/search?q=${encodeURIComponent(data.q)}&type=video`,
        );
        const mapped = items
          .filter((it) => !it.type || it.type === "video")
          .map(invToVideo)
          .filter((v): v is Video => Boolean(v))
          .slice(0, data.limit);
        if (mapped.length) return { items: mapped };
      } catch (e) {
        console.warn("Invidious search failed:", (e as Error).message);
      }
    }

    return { items: [] };
  });

// ================== Search suggestions ==================

export const suggestSearch = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => ({ q: String(d?.q ?? "").slice(0, 100) }))
  .handler(async ({ data }): Promise<string[]> => {
    const q = data.q.trim();
    if (!q) return [];
    setResponseHeader("cache-control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!res.ok) return [];
      const j = (await res.json()) as [string, string[]];
      return Array.isArray(j?.[1]) ? j[1].slice(0, 10) : [];
    } catch {
      return [];
    }
  });

// ================== Watch page (video + related) ==================

export const getYouTubeVideo = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<{ video: Video | null; related: Video[] }> => {
    if (!data.id) return { video: null, related: [] };
    setResponseHeader("cache-control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");

    // Primary: Piped /streams/{id}
    try {
      const s = await piped<{
        title?: string;
        description?: string;
        uploadDate?: string;
        uploader?: string;
        uploaderUrl?: string;
        uploaderAvatar?: string;
        duration?: number;
        views?: number;
        thumbnailUrl?: string;
        relatedStreams?: PipedItem[];
        livestream?: boolean;
      }>(`/streams/${encodeURIComponent(data.id)}`);

      const video: Video = {
        id: data.id,
        title: s.title ?? "",
        channel: s.uploader ?? "",
        channelAvatar: s.uploaderAvatar || avatar(s.uploader ?? data.id),
        views: typeof s.views === "number" && s.views >= 0 ? formatViews(String(s.views)) : "—",
        posted: s.uploadDate ?? "",
        duration: s.livestream ? "LIVE" : formatSeconds(s.duration ?? 0),
        thumbnail: s.thumbnailUrl || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
        description: stripHtml(s.description ?? ""),
      };

      const related = (s.relatedStreams ?? [])
        .filter((it) => !it.type || it.type === "stream")
        .map(pipedToVideo)
        .filter((v): v is Video => Boolean(v) && v!.id !== data.id)
        .slice(0, 20);

      return { video, related };
    } catch (e) {
      console.warn("Piped /streams failed:", (e as Error).message);
    }

    // Secondary: Invidious /api/v1/videos/{id}
    try {
      const s = await invidious<{
        title?: string;
        description?: string;
        descriptionHtml?: string;
        publishedText?: string;
        author?: string;
        authorThumbnails?: { url: string; width: number }[];
        lengthSeconds?: number;
        viewCount?: number;
        videoThumbnails?: { url: string; quality?: string; width?: number }[];
        recommendedVideos?: InvVideoItem[];
        liveNow?: boolean;
      }>(`/api/v1/videos/${encodeURIComponent(data.id)}`);

      const video: Video = {
        id: data.id,
        title: s.title ?? "",
        channel: s.author ?? "",
        channelAvatar: invAvatar(s.authorThumbnails, s.author ?? data.id),
        views:
          typeof s.viewCount === "number" && s.viewCount >= 0
            ? formatViews(String(s.viewCount))
            : "—",
        posted: s.publishedText ?? "",
        duration: s.liveNow ? "LIVE" : formatSeconds(s.lengthSeconds ?? 0),
        thumbnail: invThumb(s.videoThumbnails, data.id),
        description: stripHtml(s.description ?? ""),
      };

      const related = (s.recommendedVideos ?? [])
        .map(invToVideo)
        .filter((v): v is Video => v !== null && v.id !== data.id)
        .slice(0, 20);

      return { video, related };
    } catch (e) {
      console.warn("Invidious /videos failed:", (e as Error).message);
    }

    return { video: null, related: [] };
  });

// ================== Comments ==================

export interface WatchComment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  replies: number;
  pinned: boolean;
  hearted: boolean;
  verified: boolean;
}

export const getComments = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; pageToken?: string }) => ({
    id: String(d?.id ?? ""),
    pageToken: d?.pageToken ? String(d.pageToken) : "",
  }))
  .handler(async ({ data }): Promise<{ comments: WatchComment[]; nextPageToken?: string; disabled?: boolean }> => {
    if (!data.id) return { comments: [] };
    setResponseHeader("cache-control", "public, max-age=300, s-maxage=1800, stale-while-revalidate=3600");

    interface PipedComment {
      commentId?: string;
      author?: string;
      thumbnail?: string;
      commentText?: string;
      commentedTime?: string;
      likeCount?: number;
      replyCount?: number;
      hearted?: boolean;
      pinned?: boolean;
      verified?: boolean;
    }

    try {
      const path = data.pageToken
        ? `/nextpage/comments/${encodeURIComponent(data.id)}?nextpage=${encodeURIComponent(data.pageToken)}`
        : `/comments/${encodeURIComponent(data.id)}`;
      const res = await piped<{ comments?: PipedComment[]; nextpage?: string | null; disabled?: boolean }>(path);
      if (res.disabled) return { comments: [], disabled: true };
      const comments: WatchComment[] = (res.comments ?? []).map((c) => ({
        id: c.commentId ?? Math.random().toString(36).slice(2),
        author: c.author ?? "",
        avatar: c.thumbnail || avatar(c.author ?? "user"),
        text: stripHtml(c.commentText ?? ""),
        time: c.commentedTime ?? "",
        likes: typeof c.likeCount === "number" ? c.likeCount : 0,
        replies: typeof c.replyCount === "number" ? c.replyCount : 0,
        pinned: Boolean(c.pinned),
        hearted: Boolean(c.hearted),
        verified: Boolean(c.verified),
      }));
      if (comments.length) {
        return { comments, nextPageToken: res.nextpage ? String(res.nextpage) : undefined };
      }
    } catch (e) {
      console.warn("Piped comments failed, trying Invidious:", (e as Error).message);
    }

    // Secondary: Invidious
    try {
      interface InvComment {
        commentId?: string;
        author?: string;
        authorThumbnails?: { url: string; width: number }[];
        content?: string;
        publishedText?: string;
        likeCount?: number;
        replies?: { replyCount?: number };
        isPinned?: boolean;
        creatorHeart?: unknown;
        verified?: boolean;
      }
      const res = await invidious<{ comments?: InvComment[]; continuation?: string }>(
        `/api/v1/comments/${encodeURIComponent(data.id)}?source=youtube`,
      );
      const comments: WatchComment[] = (res.comments ?? []).map((c) => ({
        id: c.commentId ?? Math.random().toString(36).slice(2),
        author: c.author ?? "",
        avatar: invAvatar(c.authorThumbnails, c.author ?? "user"),
        text: stripHtml(c.content ?? ""),
        time: c.publishedText ?? "",
        likes: typeof c.likeCount === "number" ? c.likeCount : 0,
        replies: typeof c.replies?.replyCount === "number" ? c.replies.replyCount : 0,
        pinned: Boolean(c.isPinned),
        hearted: Boolean(c.creatorHeart),
        verified: Boolean(c.verified),
      }));
      return { comments, nextPageToken: res.continuation };
    } catch (e) {
      console.warn("Invidious comments failed:", (e as Error).message);
      return { comments: [] };
    }
  });

// ================== Batch video lookup ==================

export const getVideosByIds = createServerFn({ method: "GET" })
  .inputValidator((d: { ids: string[] }) => ({
    ids: (Array.isArray(d?.ids) ? d.ids : []).slice(0, 50).map(String).filter(Boolean),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    if (!data.ids.length) return [];
    setResponseHeader("cache-control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");

    // Fan out to Piped /streams/{id} in parallel; fall back per-id to Invidious.
    const results = await Promise.allSettled(
      data.ids.map(async (id): Promise<Video | null> => {
        try {
          const s = await piped<{
            title?: string;
            uploader?: string;
            uploaderAvatar?: string;
            duration?: number;
            views?: number;
            thumbnailUrl?: string;
            uploadDate?: string;
            livestream?: boolean;
            description?: string;
          }>(`/streams/${encodeURIComponent(id)}`);
          return {
            id,
            title: s.title ?? "",
            channel: s.uploader ?? "",
            channelAvatar: s.uploaderAvatar || avatar(s.uploader ?? id),
            views: typeof s.views === "number" && s.views >= 0 ? formatViews(String(s.views)) : "—",
            posted: s.uploadDate ?? "",
            duration: s.livestream ? "LIVE" : formatSeconds(s.duration ?? 0),
            thumbnail: s.thumbnailUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            description: stripHtml(s.description ?? ""),
          };
        } catch {
          try {
            const s = await invidious<{
              title?: string;
              author?: string;
              authorThumbnails?: { url: string; width: number }[];
              lengthSeconds?: number;
              viewCount?: number;
              videoThumbnails?: { url: string; quality?: string; width?: number }[];
              publishedText?: string;
              liveNow?: boolean;
              description?: string;
            }>(`/api/v1/videos/${encodeURIComponent(id)}`);
            return {
              id,
              title: s.title ?? "",
              channel: s.author ?? "",
              channelAvatar: invAvatar(s.authorThumbnails, s.author ?? id),
              views:
                typeof s.viewCount === "number" && s.viewCount >= 0
                  ? formatViews(String(s.viewCount))
                  : "—",
              posted: s.publishedText ?? "",
              duration: s.liveNow ? "LIVE" : formatSeconds(s.lengthSeconds ?? 0),
              thumbnail: invThumb(s.videoThumbnails, id),
              description: stripHtml(s.description ?? ""),
            };
          } catch {
            return null;
          }
        }
      }),
    );

    const map = new Map<string, Video>();
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) map.set(r.value.id, r.value);
    }
    return data.ids.map((id) => map.get(id)).filter((x): x is Video => Boolean(x));
  });

// ================== Shorts ==================

export const getShorts = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; pageToken?: string }) => ({
    q: String(d?.q ?? "shorts").slice(0, 80),
    pageToken: d?.pageToken ? String(d.pageToken) : "",
  }))
  .handler(async ({ data }): Promise<{ items: Video[]; nextPageToken?: string }> => {
    setResponseHeader("cache-control", "public, max-age=300, s-maxage=900, stale-while-revalidate=3600");

    // Primary: Piped search, then filter to short-duration videos.
    try {
      const path = data.pageToken
        ? `/nextpage/search?nextpage=${encodeURIComponent(data.pageToken)}&q=${encodeURIComponent(data.q)}&filter=videos`
        : `/search?q=${encodeURIComponent(data.q + " shorts")}&filter=videos`;
      const res = await piped<{ items?: PipedItem[]; nextpage?: string | null }>(path);
      const items = (res.items ?? [])
        .filter((it) => it.isShort || (typeof it.duration === "number" && it.duration > 0 && it.duration <= 60))
        .map(pipedToVideo)
        .filter((v): v is Video => Boolean(v))
        .slice(0, 24);
      if (items.length) {
        return { items, nextPageToken: res.nextpage ? String(res.nextpage) : undefined };
      }
    } catch (e) {
      console.warn("Piped shorts search failed:", (e as Error).message);
    }

    // Secondary: Invidious
    try {
      const items = await invidious<InvVideoItem[]>(
        `/api/v1/search?q=${encodeURIComponent(data.q + " shorts")}&type=video&duration=short`,
      );
      const mapped = items
        .filter((it) => typeof it.lengthSeconds === "number" && it.lengthSeconds > 0 && it.lengthSeconds <= 60)
        .map(invToVideo)
        .filter((v): v is Video => Boolean(v))
        .slice(0, 24);
      return { items: mapped };
    } catch (e) {
      console.warn("Invidious shorts failed:", (e as Error).message);
      return { items: [] };
    }
  });

// ================== Recommendations from likes + searches ==================

export const getRecommendedFromLikes = createServerFn({ method: "GET" })
  .inputValidator((d: { ids?: string[]; queries?: string[] }) => ({
    ids: (Array.isArray(d?.ids) ? d.ids : []).slice(0, 5).map(String).filter(Boolean),
    queries: (Array.isArray(d?.queries) ? d.queries : []).slice(0, 5).map((q) => String(q).slice(0, 80)).filter(Boolean),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    if (!data.ids.length && !data.queries.length) return [];
    setResponseHeader("cache-control", "private, max-age=300, stale-while-revalidate=1800");

    const stop = new Set([
      "the","a","an","of","and","or","to","in","on","for","with","is","are","was",
      "were","this","that","by","at","from","how","why","what","official","video",
      "feat","ft","vs","new","best","top","full","hd","4k","live","2024","2025","2026",
    ]);

    // Fetch each liked video via Piped /streams to get title + channel id
    const seeds = await Promise.allSettled(
      data.ids.map((id) =>
        piped<{ title?: string; uploaderUrl?: string; relatedStreams?: PipedItem[] }>(
          `/streams/${encodeURIComponent(id)}`,
        ),
      ),
    );

    const titleQueries: string[] = [];
    const channelIds: string[] = [];
    const relatedFromSeeds: Video[] = [];

    for (const r of seeds) {
      if (r.status !== "fulfilled") continue;
      const s = r.value;
      if (s.title) {
        const words = s.title
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stop.has(w));
        const q = words.slice(0, 4).join(" ");
        if (q) titleQueries.push(q);
      }
      const cid = channelIdFromUrl(s.uploaderUrl);
      if (cid) channelIds.push(cid);
      // Use related streams from the seed video as a cheap recommendation source
      for (const it of s.relatedStreams ?? []) {
        const v = pipedToVideo(it);
        if (v && !data.ids.includes(v.id)) relatedFromSeeds.push(v);
      }
    }

    const queries = Array.from(new Set([...titleQueries, ...data.queries].map((q) => q.trim()).filter(Boolean))).slice(0, 6);
    const uniqueChannels = Array.from(new Set(channelIds)).slice(0, 3);

    // Fan out keyword searches + channel uploads
    const [keywordResults, channelResults] = await Promise.all([
      Promise.allSettled(
        queries.map((q) =>
          piped<{ items?: PipedItem[] }>(`/search?q=${encodeURIComponent(q)}&filter=videos`),
        ),
      ),
      Promise.allSettled(
        uniqueChannels.map((cid) =>
          piped<{ relatedStreams?: PipedItem[] }>(`/channel/${encodeURIComponent(cid)}`),
        ),
      ),
    ]);

    const collected: Video[] = [...relatedFromSeeds];
    for (const r of keywordResults) {
      if (r.status !== "fulfilled") continue;
      for (const it of r.value.items ?? []) {
        const v = pipedToVideo(it);
        if (v && !data.ids.includes(v.id)) collected.push(v);
      }
    }
    for (const r of channelResults) {
      if (r.status !== "fulfilled") continue;
      for (const it of r.value.relatedStreams ?? []) {
        const v = pipedToVideo(it);
        if (v && !data.ids.includes(v.id)) collected.push(v);
      }
    }

    // Dedupe and shuffle
    const seen = new Set<string>();
    const unique: Video[] = [];
    for (const v of collected) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      unique.push(v);
    }
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique.slice(0, 24);
  });

// ================== Live ==================

export const getLive = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string }) => ({
    q: String(d?.q ?? "").slice(0, 80),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    setResponseHeader("cache-control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
    const q = data.q || "live";

    // Primary: Invidious has a proper live filter (features=live)
    try {
      const items = await invidious<InvVideoItem[]>(
        `/api/v1/search?q=${encodeURIComponent(q)}&type=video&features=live&sort_by=view_count`,
      );
      const mapped = items
        .filter((it) => it.liveNow)
        .map(invToVideo)
        .filter((v): v is Video => Boolean(v))
        .map((v) => ({ ...v, duration: "LIVE" }))
        .slice(0, 24);
      if (mapped.length) return mapped;
    } catch (e) {
      console.warn("Invidious live search failed:", (e as Error).message);
    }

    // Secondary: Piped search — no strict live filter, so infer from duration<=0
    try {
      const res = await piped<{ items?: PipedItem[] }>(
        `/search?q=${encodeURIComponent(q + " live")}&filter=videos`,
      );
      const items = (res.items ?? [])
        .filter((it) => !it.duration || it.duration <= 0)
        .map(pipedToVideo)
        .filter((v): v is Video => Boolean(v))
        .map((v) => ({ ...v, duration: "LIVE" }))
        .slice(0, 24);
      return items;
    } catch (e) {
      console.warn("Piped live search failed:", (e as Error).message);
      return [];
    }
  });
