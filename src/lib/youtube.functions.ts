import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { Video } from "./faketube-data";


const API = "https://www.googleapis.com/youtube/v3";

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`;
}

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

interface YTItem {
  id: string | { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    description?: string;
    thumbnails?: Record<string, { url: string }>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

function toVideo(it: YTItem): Video {
  const id = typeof it.id === "string" ? it.id : (it.id.videoId ?? "");
  const sn = it.snippet;
  const dur = it.contentDetails?.duration ? parseDuration(it.contentDetails.duration) : "LIVE";
  const thumb =
    sn.thumbnails?.maxres?.url ??
    sn.thumbnails?.high?.url ??
    sn.thumbnails?.medium?.url ??
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return {
    id,
    title: sn.title,
    channel: sn.channelTitle,
    channelAvatar: avatar(sn.channelTitle),
    views: it.statistics?.viewCount ? `${formatViews(it.statistics.viewCount)}` : "—",
    posted: timeAgo(sn.publishedAt),
    duration: dur,
    thumbnail: thumb,
    description: sn.description ?? "",
  };
}

async function yt(path: string, params: Record<string, string>): Promise<{ items?: YTItem[] }> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not configured");
  const url = new URL(`${API}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    console.error(`YouTube API ${res.status} on ${path}: ${body}`);
    throw new Error(`YouTube API request failed (${res.status})`);
  }
  return res.json();
}

// ================== Piped (primary source) ==================
// Piped is an open-source YouTube proxy. Free, no API key, no daily quota.
// We hit multiple public instances and fall back to the official API on failure.

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
  "https://api.piped.projectsegfau.lt",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.leptons.xyz",
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

function formatSeconds(sec: number): string {
  if (!sec || sec < 0) return "LIVE";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
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

async function piped<T>(path: string): Promise<T> {
  let lastErr: unknown = null;
  for (const base of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}${path}`, {
        headers: { "user-agent": "Mozilla/5.0" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastErr = new Error(`${base} → ${res.status}`);
        continue;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error("All Piped instances failed");
}

export const getTrending = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; region?: string }) => ({
    category: d?.category ?? "All",
    region: d?.region ?? "US",
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    setResponseHeader("cache-control", "public, max-age=300, s-maxage=600, stale-while-revalidate=1800");

    // Primary: Piped trending
    if (data.category === "All" || data.category === "Trending") {
      try {
        const items = await piped<PipedItem[]>(`/trending?region=${encodeURIComponent(data.region)}`);
        const videos = items.map(pipedToVideo).filter((v): v is Video => Boolean(v));
        if (videos.length) return videos.slice(0, 32);
      } catch (e) {
        console.warn("Piped trending failed, falling back to YouTube API:", (e as Error).message);
      }
    } else {
      // Category → treat as a Piped search sorted by relevance
      try {
        const res = await piped<{ items?: PipedItem[] }>(
          `/search?q=${encodeURIComponent(data.category)}&filter=videos`,
        );
        const videos = (res.items ?? [])
          .map(pipedToVideo)
          .filter((v): v is Video => Boolean(v));
        if (videos.length) return videos.slice(0, 32);
      } catch (e) {
        console.warn("Piped category search failed, falling back:", (e as Error).message);
      }
    }

    // Fallback: official YouTube Data API
    try {
      if (data.category === "All" || data.category === "Trending") {
        const j = await yt("videos", {
          part: "snippet,contentDetails,statistics",
          chart: "mostPopular",
          regionCode: data.region,
          maxResults: "32",
        });
        return (j.items ?? []).map(toVideo);
      }
      const s = await yt("search", {
        part: "snippet",
        q: data.category,
        type: "video",
        maxResults: "32",
        order: "viewCount",
        regionCode: data.region,
      });
      const ids = (s.items ?? [])
        .map((it) => (typeof it.id === "string" ? it.id : it.id.videoId))
        .filter((x): x is string => Boolean(x));
      if (!ids.length) return [];
      const v = await yt("videos", {
        part: "snippet,contentDetails,statistics",
        id: ids.join(","),
      });
      return (v.items ?? []).map(toVideo);
    } catch (e) {
      console.error("Trending fallback failed", e);
      return [];
    }
  });


export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; limit?: number; pageToken?: string }) => ({
    q: String(d?.q ?? "").slice(0, 120),
    limit: Math.min(Math.max(Number(d?.limit ?? 20), 1), 50),
    pageToken: d?.pageToken ? String(d.pageToken) : "",
  }))
  .handler(async ({ data }): Promise<{ items: Video[]; nextPageToken?: string; prevPageToken?: string; quotaExceeded?: boolean }> => {
    if (!data.q.trim()) return { items: [] };
    setResponseHeader("cache-control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600");

    // Primary: Piped search (no quota)
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
      console.warn("Piped search failed, falling back to YouTube API:", (e as Error).message);
    }

    // Fallback: official YouTube Data API
    const params: Record<string, string> = {
      part: "snippet",
      q: data.q,
      type: "video",
      maxResults: String(data.limit),
    };
    // pageToken from Piped is not compatible with YT API — only pass when it looks like a YT token
    if (data.pageToken && !data.pageToken.startsWith("{")) params.pageToken = data.pageToken;
    const url = new URL(`${API}/search`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("key", process.env.GOOGLE_API_KEY ?? "");
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`YouTube search failed (${res.status})`, body);
      const quotaExceeded = res.status === 429 || res.status === 403 || /quota/i.test(body);
      return { items: [], quotaExceeded };
    }
    const s = (await res.json()) as { items?: YTItem[]; nextPageToken?: string; prevPageToken?: string };
    const ids = (s.items ?? [])
      .map((it) => (typeof it.id === "string" ? it.id : it.id.videoId))
      .filter((x): x is string => Boolean(x));
    if (!ids.length) return { items: [], nextPageToken: s.nextPageToken, prevPageToken: s.prevPageToken };
    const v = await yt("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
    });
    return {
      items: (v.items ?? []).map(toVideo),
      nextPageToken: s.nextPageToken,
      prevPageToken: s.prevPageToken,
    };
  });

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

export const getYouTubeVideo = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<{ video: Video | null; related: Video[] }> => {
    if (!data.id) return { video: null, related: [] };
    setResponseHeader("cache-control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");
    const v = await yt("videos", { part: "snippet,contentDetails,statistics", id: data.id });
    const item = v.items?.[0];
    if (!item) return { video: null, related: [] };
    const video = toVideo(item);

    // Fetch channel-based related AND trending fallback in parallel; pick the best.
    const channelId = item.snippet.channelId;
    const [channelRes, trendingRes] = await Promise.allSettled([
      yt("search", {
        part: "snippet",
        channelId,
        type: "video",
        maxResults: "12",
        order: "date",
      }),
      yt("videos", {
        part: "snippet,contentDetails,statistics",
        chart: "mostPopular",
        regionCode: "US",
        maxResults: "12",
      }),
    ]);

    let related: Video[] = [];
    if (channelRes.status === "fulfilled") {
      const ids = (channelRes.value.items ?? [])
        .map((it) => (typeof it.id === "string" ? it.id : it.id.videoId))
        .filter((id): id is string => Boolean(id) && id !== data.id);
      if (ids.length) {
        try {
          const rv = await yt("videos", {
            part: "snippet,contentDetails,statistics",
            id: ids.join(","),
          });
          related = (rv.items ?? []).map(toVideo);
        } catch (e) {
          console.error("related-channel details failed", e);
        }
      }
    }
    if (related.length < 8 && trendingRes.status === "fulfilled") {
      const extras = (trendingRes.value.items ?? [])
        .map(toVideo)
        .filter((x) => x.id !== data.id && !related.some((r) => r.id === x.id));
      related = [...related, ...extras].slice(0, 12);
    }

    return { video, related };
  });


export const getVideosByIds = createServerFn({ method: "GET" })
  .inputValidator((d: { ids: string[] }) => ({
    ids: (Array.isArray(d?.ids) ? d.ids : []).slice(0, 50).map(String).filter(Boolean),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    if (!data.ids.length) return [];
    const v = await yt("videos", {
      part: "snippet,contentDetails,statistics",
      id: data.ids.join(","),
    });
    const map = new Map<string, Video>();
    for (const it of v.items ?? []) {
      const vid = toVideo(it);
      map.set(vid.id, vid);
    }
    return data.ids.map((id) => map.get(id)).filter((x): x is Video => Boolean(x));
  });

export const getShorts = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; pageToken?: string }) => ({
    q: String(d?.q ?? "shorts").slice(0, 80),
    pageToken: d?.pageToken ? String(d.pageToken) : "",
  }))
  .handler(async ({ data }): Promise<{ items: Video[]; nextPageToken?: string }> => {
    setResponseHeader("cache-control", "public, max-age=300, s-maxage=900, stale-while-revalidate=3600");
    const params: Record<string, string> = {
      part: "snippet",
      q: data.q,
      type: "video",
      videoDuration: "short",
      maxResults: "24",
      order: "viewCount",
    };
    if (data.pageToken) params.pageToken = data.pageToken;
    const url = new URL(`${API}/search`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("key", process.env.GOOGLE_API_KEY!);
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`YouTube shorts search failed (${res.status})`);
      return { items: [] };
    }
    const s = (await res.json()) as { items?: YTItem[]; nextPageToken?: string };
    const ids = (s.items ?? [])
      .map((it) => (typeof it.id === "string" ? it.id : it.id.videoId))
      .filter((x): x is string => Boolean(x));
    if (!ids.length) return { items: [], nextPageToken: s.nextPageToken };
    const v = await yt("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
    });
    // Keep only genuinely short videos (<= 60s)
    const items = (v.items ?? [])
      .filter((it) => {
        const iso = it.contentDetails?.duration ?? "";
        const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) return false;
        const h = Number(m[1] ?? 0), min = Number(m[2] ?? 0), s = Number(m[3] ?? 0);
        return h === 0 && min === 0 && s > 0 && s <= 60;
      })
      .map(toVideo);
    return { items, nextPageToken: s.nextPageToken };
  });

export const getRecommendedFromLikes = createServerFn({ method: "GET" })
  .inputValidator((d: { ids?: string[]; queries?: string[] }) => ({
    ids: (Array.isArray(d?.ids) ? d.ids : []).slice(0, 5).map(String).filter(Boolean),
    queries: (Array.isArray(d?.queries) ? d.queries : []).slice(0, 5).map((q) => String(q).slice(0, 80)).filter(Boolean),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    if (!data.ids.length && !data.queries.length) return [];
    setResponseHeader("cache-control", "private, max-age=300, stale-while-revalidate=1800");

    // Fetch liked videos to get their channelIds, titles, tags
    const seedItems = data.ids.length
      ? ((await yt("videos", { part: "snippet", id: data.ids.join(",") })).items ?? [])
      : [];

    const channelIds = Array.from(
      new Set(seedItems.map((it) => it.snippet.channelId).filter((x): x is string => Boolean(x))),
    ).slice(0, 3);

    // Build lightweight search queries from titles: strip punctuation, drop stopwords,
    // keep the 3-4 most meaningful words per liked video.
    const stop = new Set([
      "the","a","an","of","and","or","to","in","on","for","with","is","are","was",
      "were","this","that","by","at","from","how","why","what","official","video",
      "feat","ft","vs","new","best","top","full","hd","4k","live","2024","2025","2026",
    ]);
    const titleQueries = seedItems.map((it) => {
      const words = it.snippet.title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w));
      return words.slice(0, 4).join(" ");
    });
    const queries = Array.from(
      new Set([...titleQueries, ...data.queries].map((q) => q.trim()).filter(Boolean)),
    ).slice(0, 6);

    // In parallel: recent uploads from each seed channel + keyword searches across YouTube
    const [channelResults, keywordResults] = await Promise.all([
      Promise.allSettled(
        channelIds.map((cid) =>
          yt("search", {
            part: "snippet",
            channelId: cid,
            type: "video",
            maxResults: "5",
            order: "date",
          }),
        ),
      ),
      Promise.allSettled(
        queries.map((q) =>
          yt("search", {
            part: "snippet",
            q,
            type: "video",
            maxResults: "8",
            order: "relevance",
          }),
        ),
      ),
    ]);

    const foundIds = new Set<string>();
    const collect = (results: PromiseSettledResult<{ items?: YTItem[] }>[]) => {
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        for (const it of r.value.items ?? []) {
          const id = typeof it.id === "string" ? it.id : it.id.videoId;
          if (id && !data.ids.includes(id)) foundIds.add(id);
        }
      }
    };
    collect(channelResults);
    collect(keywordResults);

    const ids = Array.from(foundIds).slice(0, 40);
    if (!ids.length) return [];
    const v = await yt("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
    });
    // Shuffle so channel and keyword picks are interleaved
    const items = (v.items ?? []).map(toVideo);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, 24);
  });




export const getLive = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string }) => ({
    q: String(d?.q ?? "").slice(0, 80),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    setResponseHeader("cache-control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
    const params: Record<string, string> = {
      part: "snippet",
      type: "video",
      eventType: "live",
      maxResults: "24",
      order: "viewCount",
      q: data.q || "live",
    };
    const s = await yt("search", params);
    const ids = (s.items ?? [])
      .map((it) => (typeof it.id === "string" ? it.id : it.id.videoId))
      .filter((x): x is string => Boolean(x));
    if (!ids.length) return [];
    const v = await yt("videos", {
      part: "snippet,contentDetails,statistics,liveStreamingDetails",
      id: ids.join(","),
    });
    return (v.items ?? []).map((it) => {
      const vid = toVideo(it);
      // Mark as LIVE with concurrent viewer count when available
      const live = (it as unknown as { liveStreamingDetails?: { concurrentViewers?: string } }).liveStreamingDetails;
      const viewers = live?.concurrentViewers;
      return {
        ...vid,
        duration: "LIVE",
        views: viewers ? `${formatViews(viewers)} watching` : vid.views,
      };
    });
  });
