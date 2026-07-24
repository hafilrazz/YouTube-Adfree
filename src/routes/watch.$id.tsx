import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsUp, ThumbsDown, Share2, Download, Scissors, Bell, BookmarkPlus, BookmarkCheck, Music2, Check, Loader2, Heart, Pin, BadgeCheck, Maximize2, Minimize2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getYouTubeVideo, getComments } from "@/lib/youtube.functions";
import { useLikes, usePlaylist, useRecent, getProgress, saveProgress } from "@/lib/user-data";
import { useMusicVideos } from "@/lib/music-videos";
import type { Video } from "@/lib/faketube-data";


export const Route = createFileRoute("/watch/$id")({
  // No loader: navigation is instant and the player mounts immediately from the id.
  // Metadata + related are streamed in via useQuery inside the component.
  head: ({ params }) => ({
    meta: [
      { title: "Watching — Premium" },
      { property: "og:image", content: `https://i.ytimg.com/vi/${params.id}/hqdefault.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://i.ytimg.com/vi/${params.id}/hqdefault.jpg` },
    ],
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
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isFs, setIsFs] = useState(false);
  

  useEffect(() => {
    const onFsChange = async () => {
      const fs = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFs(!!fs);
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (!isMobile) return;
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

  const toggleFullscreen = async () => {
    const el = wrapRef.current as any;
    if (!el) return;
    const doc = document as any;
    const fs = doc.fullscreenElement || doc.webkitFullscreenElement;
    try {
      if (!fs) {
        const iframe = el.querySelector("iframe") as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (iframe?.webkitEnterFullscreen) iframe.webkitEnterFullscreen(); // iOS Safari
        else if (iframe?.requestFullscreen) await iframe.requestFullscreen();
      } else {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
    } catch {}
  };

  const playerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = Math.floor(getProgress(id));

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId: id,
        playerVars: { autoplay: 1, rel: 0, start, playsinline: 1, fs: 1 },
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
    <div
      ref={wrapRef}
      className={`relative overflow-hidden bg-black ${isFs ? "fixed inset-0 z-[2147483647] rounded-none" : "rounded-xl aspect-video"}`}
    >
      <div
        ref={mountRef}
        className="h-full w-full origin-center"
        style={isFs ? { transform: "scale(1.34)" } : undefined}
        title={title}
      />


      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute bottom-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 md:hidden"
        aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Watch() {
  const { id } = Route.useParams();
  const videoFn = useServerFn(getYouTubeVideo);
  const { data } = useQuery({
    queryKey: ["yt-watch", id],
    queryFn: () => videoFn({ data: { id } }),
    staleTime: 10 * 60_000,
  });
  const video = data?.video ?? {
    id,
    title: "",
    channel: "",
    channelAvatar: `https://i.ytimg.com/vi/${id}/default.jpg`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    views: "",
    posted: "",
    duration: "",
    description: "",
  } as Video;
  const related: Video[] = data?.related ?? [];

  const [subscribed, setSubscribed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const likes = useLikes();
  const playlist = usePlaylist();
  const musicVids = useMusicVideos();
  const { record } = useRecent();

  useEffect(() => { record(id); }, [id, record]);

  const liked = likes.isLiked(id);
  const saved = playlist.isSaved(id);
  const inMusic = musicVids.has(id);




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
          <CommentsSection videoId={video.id} />
        </div>
        <aside className="xl:w-96 flex flex-col gap-3 min-w-0">
          <h2 className="font-semibold text-sm text-neutral-700">Up next</h2>
          {related.map((v: Video) => (
            <Link to="/watch/$id" params={{ id: v.id }} key={v.id} className="flex gap-2 group">
              <div className="relative w-36 sm:w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-200">
                <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                {v.duration ? (
                  <span className={`absolute bottom-1 right-1 px-1 text-[10px] rounded ${v.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}>{v.duration}</span>
                ) : null}

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

function CommentsSection({ videoId }: { videoId: string }) {
  const commentsFn = useServerFn(getComments);
  const { data, isLoading, error } = useQuery({
    queryKey: ["yt-comments", videoId],
    queryFn: () => commentsFn({ data: { id: videoId } }),
    staleTime: 5 * 60_000,
  });

  const comments = data?.comments ?? [];

  return (
    <section className="mt-6">
      <h2 className="text-lg font-bold mb-4">
        Comments {comments.length > 0 && <span className="text-sm font-normal text-neutral-500">· {comments.length}</span>}
      </h2>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading comments…
        </div>
      ) : error ? (
        <p className="text-sm text-neutral-500">Couldn't load comments.</p>
      ) : data?.disabled ? (
        <p className="text-sm text-neutral-500">Comments are disabled for this video.</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-neutral-500">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <img src={c.avatar} alt="" className="h-9 w-9 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {c.pinned && (
                    <span className="inline-flex items-center gap-1 text-neutral-500">
                      <Pin className="h-3 w-3" /> Pinned
                    </span>
                  )}
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                    {c.author}
                    {c.verified && <BadgeCheck className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-300" />}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-300">{c.time}</span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.text}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-neutral-600 dark:text-neutral-300">

                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" /> {c.likes > 0 ? c.likes.toLocaleString() : ""}
                  </span>
                  {c.hearted && <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />}
                  {c.replies > 0 && <span>{c.replies} {c.replies === 1 ? "reply" : "replies"}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
