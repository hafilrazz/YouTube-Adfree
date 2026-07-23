import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsUp, ThumbsDown, Share2, Download, Scissors, Bell, BookmarkPlus, BookmarkCheck, Music2, Check, Loader2, Heart, Pin, BadgeCheck } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getYouTubeVideo, getComments } from "@/lib/youtube.functions";
import { useLikes, usePlaylist, useRecent, getProgress, saveProgress } from "@/lib/user-data";
import { useMusicVideos } from "@/lib/music-videos";
import type { Video } from "@/lib/faketube-data";


export const Route = createFileRoute("/watch/$id")({
  loader: async ({ params }) => {
    const res = await getYouTubeVideo({ data: { id: params.id } });
    if (!res.video) throw notFound();
    return res as { video: NonNullable<typeof res.video>; related: typeof res.related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.video.title} — Premium` },
          { name: "description", content: loaderData.video.description.slice(0, 160) },
          { property: "og:title", content: loaderData.video.title },
          { property: "og:description", content: loaderData.video.description.slice(0, 160) },
          { property: "og:image", content: loaderData.video.thumbnail },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.video.thumbnail },
        ]
      : [{ title: "Not found — Premium" }, { name: "robots", content: "noindex" }],
  }),
  component: Watch,
  errorComponent: ({ error }) => (
    <FakeTubeLayout>
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Couldn't load this video</h1>
        <p className="text-sm text-neutral-600 mt-2">{error.message}</p>
        <Link to="/" className="text-blue-600 mt-4 inline-block">Back home</Link>
      </div>
    </FakeTubeLayout>
  ),
  notFoundComponent: () => (
    <FakeTubeLayout>
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Video not found</h1>
        <Link to="/" className="text-blue-600 mt-4 inline-block">Back home</Link>
      </div>
    </FakeTubeLayout>
  ),
});

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;
    const onFsChange = async () => {
      const fs = document.fullscreenElement || (document as any).webkitFullscreenElement;
      const orientation = (screen as any).orientation;
      try {
        if (fs && orientation?.lock) {
          await orientation.lock("landscape");
        } else if (!fs && orientation?.unlock) {
          orientation.unlock();
        }
      } catch {
        // Orientation lock only works in fullscreen; ignore rejections.
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as any);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as any);
      try { (screen as any).orientation?.unlock?.(); } catch {}
    };
  }, []);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = Math.floor(getProgress(id));

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId: id,
        playerVars: { autoplay: 1, rel: 0, start },
        events: {
          onReady: (e: any) => {
            interval = setInterval(() => {
              const p = playerRef.current;
              if (!p?.getCurrentTime) return;
              const t = p.getCurrentTime();
              const d = p.getDuration();
              if (d > 0) saveProgress(id, t, d);
            }, 3000);
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            const p = playerRef.current;
            if (!p) return;
            const d = p.getDuration?.() ?? 0;
            const t = p.getCurrentTime?.() ?? 0;
            if (d > 0) saveProgress(id, t, d);
            if (e.data === YT.PlayerState.ENDED && d > 0) saveProgress(id, d, d);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      const p = playerRef.current;
      if (p) {
        try {
          const d = p.getDuration?.() ?? 0;
          const t = p.getCurrentTime?.() ?? 0;
          if (d > 0) saveProgress(id, t, d);
          p.destroy?.();
        } catch {}
      }
      playerRef.current = null;
    };
  }, [id]);

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <div ref={mountRef} className="h-full w-full" title={title} />
    </div>
  );
}

function Watch() {
  const { video, related } = Route.useLoaderData();
  const [subscribed, setSubscribed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const likes = useLikes();
  const playlist = usePlaylist();
  const musicVids = useMusicVideos();
  const { record } = useRecent();

  useEffect(() => { record(video.id); }, [video.id, record]);

  const liked = likes.isLiked(video.id);
  const saved = playlist.isSaved(video.id);
  const inMusic = musicVids.has(video.id);


  return (
    <FakeTubeLayout>
      <div className="flex flex-col xl:flex-row gap-6 w-full min-w-0">
        <div className="flex-1 min-w-0">
          <YouTubePlayer id={video.id} title={video.title} />


          <h1 className="mt-4 text-lg sm:text-xl font-bold break-words">{video.title}</h1>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={video.channelAvatar} className="h-10 w-10 rounded-full" alt="" />
              <div>
                <p className="font-semibold text-sm">{video.channel}</p>
                <p className="text-xs text-neutral-600">YouTube channel</p>
              </div>
              <button
                onClick={() => setSubscribed((v) => !v)}
                className={`ml-4 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                  subscribed ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 text-white"
                }`}
              >
                {subscribed && <Bell className="h-4 w-4" />}
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-neutral-100 rounded-full">
                <button
                  onClick={() => likes.toggle(video.id)}
                  className="px-4 py-2 flex items-center gap-2 border-r border-neutral-300 hover:bg-neutral-200 rounded-l-full text-sm"
                >
                  <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current text-blue-600" : ""}`} />
                  {liked ? "Liked" : "Like"}
                </button>
                <button className="px-4 py-2 hover:bg-neutral-200 rounded-r-full">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => playlist.toggle(video.id)}
                className={`rounded-full px-4 py-2 text-sm flex items-center gap-2 ${
                  saved ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-neutral-100 hover:bg-neutral-200"
                }`}
              >
                {saved ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                {saved ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => musicVids.toggle(video.id)}
                className={`rounded-full px-4 py-2 text-sm flex items-center gap-2 ${
                  inMusic ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-neutral-100 hover:bg-neutral-200"
                }`}
                title={inMusic ? "In music playlist" : "Add to music playlist"}
              >
                {inMusic ? <Check className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
                {inMusic ? "In music" : "Add to music"}
              </button>
              <button className="bg-neutral-100 hover:bg-neutral-200 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button className="bg-neutral-100 hover:bg-neutral-200 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <Download className="h-4 w-4" /> Download
              </button>
              <button className="bg-neutral-100 hover:bg-neutral-200 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <Scissors className="h-4 w-4" /> Clip
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-neutral-100">
            <p className="text-sm font-semibold">{video.views} views · {video.posted}</p>
            <p className={`mt-2 text-sm whitespace-pre-wrap break-words ${descExpanded ? "" : "line-clamp-2"}`}>
              {video.description}
            </p>
            {video.description && video.description.length > 120 && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="mt-2 text-sm font-semibold hover:underline"
              >
                {descExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        </div>
        <aside className="xl:w-96 flex flex-col gap-3 min-w-0">
          <h2 className="font-semibold text-sm text-neutral-700">Up next</h2>
          {related.map((v: Video) => (
            <Link to="/watch/$id" params={{ id: v.id }} key={v.id} className="flex gap-2 group">
              <div className="relative w-36 sm:w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-200">
                <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                <span className={`absolute bottom-1 right-1 px-1 text-[10px] rounded ${v.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}>{v.duration}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold line-clamp-2 leading-snug break-words">{v.title}</h3>
                <p className="text-xs text-neutral-600 mt-1 truncate">{v.channel}</p>
                <p className="text-xs text-neutral-600 truncate">{v.views} views · {v.posted}</p>
              </div>
            </Link>
          ))}
        </aside>


      </div>
    </FakeTubeLayout>
  );
}
