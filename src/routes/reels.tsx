import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, ThumbsUp, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getShorts } from "@/lib/youtube.functions";
import { useLikes } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";


export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels — Short videos on Premium" },
      { name: "description", content: "Swipe through short vertical videos: viral clips, music shorts, funny moments and more." },
      { property: "og:title", content: "Reels — Short videos on Premium" },
      { property: "og:description", content: "Swipe through short vertical videos: viral clips, music shorts, funny moments and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReelsPage,
});

function ReelsPage() {
  const [q, setQ] = useState("shorts");
  const shortsFn = useServerFn(getShorts);
  const hourBucket = Math.floor(Date.now() / (60 * 60_000));
  const { data, isLoading, error } = useQuery<{ items: Video[] }>({
    queryKey: ["shorts", q, hourBucket],
    queryFn: () => shortsFn({ data: { q } }),
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const tags = ["shorts", "music", "comedy", "gaming", "sports", "dance", "food", "news"];
  const items = data?.items ?? [];

  return (
    <FakeTubeLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setQ(t)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap capitalize ${
                q === t ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error ? (
          <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            Couldn't load reels. {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-neutral-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reels…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-neutral-500 py-16">No reels found.</div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setMuted((m) => !m)}
              className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <div className="h-[calc(100vh-10rem)] overflow-y-auto snap-y snap-mandatory rounded-xl">
              {items.map((v) => (
                <Reel key={v.id} video={v} muted={muted} />
              ))}
            </div>
          </div>
        )}

      </div>
    </FakeTubeLayout>
  );
}

function Reel({ video }: { video: Video }) {
  const { toggle, isLiked } = useLikes();
  const liked = isLiked(video.id);

  return (
    <div className="snap-start snap-always h-[calc(100vh-10rem)] flex items-center justify-center gap-3 mb-2">
      <div className="relative h-full aspect-[9/16] max-h-full bg-black rounded-2xl overflow-hidden shadow-lg">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${video.id}`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
          <Link
            to="/watch/$id"
            params={{ id: video.id }}
            className="pointer-events-auto text-sm font-medium line-clamp-2"
          >
            {video.title}
          </Link>
          <div className="text-xs opacity-80 mt-1">{video.channel} · {video.views} views</div>
        </div>
      </div>
      <div className="flex flex-col gap-4 items-center text-neutral-700">
        <button
          onClick={() => toggle(video.id)}
          className="flex flex-col items-center gap-1 text-xs"
          aria-label="Like"
        >
          <span className={`h-11 w-11 rounded-full flex items-center justify-center ${liked ? "bg-red-100 text-red-600" : "bg-neutral-100 hover:bg-neutral-200"}`}>
            <ThumbsUp className="h-5 w-5" />
          </span>
          {liked ? "Liked" : "Like"}
        </button>
        <Link
          to="/watch/$id"
          params={{ id: video.id }}
          className="flex flex-col items-center gap-1 text-xs"
        >
          <span className="h-11 w-11 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </span>
          Comments
        </Link>
        <button
          onClick={() => {
            const url = `${window.location.origin}/watch/${video.id}`;
            if (navigator.share) navigator.share({ title: video.title, url }).catch(() => {});
            else navigator.clipboard?.writeText(url);
          }}
          className="flex flex-col items-center gap-1 text-xs"
          aria-label="Share"
        >
          <span className="h-11 w-11 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center">
            <Share2 className="h-5 w-5" />
          </span>
          Share
        </button>
      </div>
    </div>
  );
}
