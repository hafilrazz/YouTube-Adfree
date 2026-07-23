import { createServerFn } from "@tanstack/react-start";
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
  .inputValidator((d: { q: string; limit?: number }) => ({
    q: String(d?.q ?? "").slice(0, 120),
    limit: Math.min(Math.max(Number(d?.limit ?? 12), 1), 25),
  }))
  .handler(async ({ data }): Promise<Video[]> => {
    if (!data.q.trim()) return [];
    const s = await yt("search", {
      part: "snippet",
      q: data.q,
      type: "video",
      maxResults: String(data.limit),
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

export const getYouTubeVideo = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<{ video: Video | null; related: Video[] }> => {
    if (!data.id) return { video: null, related: [] };
    const v = await yt("videos", { part: "snippet,contentDetails,statistics", id: data.id });
    const item = v.items?.[0];
    if (!item) return { video: null, related: [] };
    const video = toVideo(item);

    let related: Video[] = [];
    try {
      const channelId = item.snippet.channelId;
      const s = await yt("search", {
        part: "snippet",
        channelId,
        type: "video",
        maxResults: "12",
        order: "date",
      });
      const ids = (s.items ?? [])
        .map((it) => (typeof it.id === "string" ? it.id : it.id.videoId))
        .filter((id): id is string => Boolean(id) && id !== data.id);
      if (ids.length) {
        const rv = await yt("videos", {
          part: "snippet,contentDetails,statistics",
          id: ids.join(","),
        });
        related = (rv.items ?? []).map(toVideo);
      }
    } catch (e) {
      console.error("related-channel fetch failed", e);
    }

    if (related.length < 8) {
      try {
        const t = await yt("videos", {
          part: "snippet,contentDetails,statistics",
          chart: "mostPopular",
          regionCode: "US",
          maxResults: "12",
        });
        const extras = (t.items ?? [])
          .map(toVideo)
          .filter((x) => x.id !== data.id && !related.some((r) => r.id === x.id));
        related = [...related, ...extras].slice(0, 12);
      } catch (e) {
        console.error("related-trending fallback failed", e);
      }
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
