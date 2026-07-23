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

export const getTrending = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; region?: string }) => ({
    category: d?.category ?? "All",
    region: d?.region ?? "US",
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    setResponseHeader("cache-control", "public, max-age=300, s-maxage=600, stale-while-revalidate=1800");
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
  });


export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; limit?: number; pageToken?: string }) => ({
    q: String(d?.q ?? "").slice(0, 120),
    limit: Math.min(Math.max(Number(d?.limit ?? 20), 1), 50),
    pageToken: d?.pageToken ? String(d.pageToken) : "",
  }))
  .handler(async ({ data }): Promise<{ items: Video[]; nextPageToken?: string; prevPageToken?: string }> => {
    if (!data.q.trim()) return { items: [] };
    setResponseHeader("cache-control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600");

    const params: Record<string, string> = {
      part: "snippet",
      q: data.q,
      type: "video",
      maxResults: String(data.limit),
    };
    if (data.pageToken) params.pageToken = data.pageToken;
    const url = new URL(`${API}/search`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("key", process.env.GOOGLE_API_KEY!);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube search failed (${res.status})`);
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
    if (!res.ok) throw new Error(`YouTube shorts search failed (${res.status})`);
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
