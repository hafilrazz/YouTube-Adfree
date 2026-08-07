import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getShorts } from "@/lib/youtube.functions";
import { useVideoPlayer } from "@/lib/video-player-context";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/shorts")({
  component: ShortsPage,
  head: () => ({
    meta: [
      { title: "Shorts — YouTube" },
      { name: "description", content: "Watch short vertical videos on YouTube." },
    ],
  }),
});

function ShortsPage() {
  const shortsFn = useServerFn(getShorts);
  const { openVideo, closeVideo } = useVideoPlayer();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ["yt-shorts-feed"],
    queryFn: ({ pageParam }) => shortsFn({ data: { pageToken: pageParam || undefined } }),
    initialPageParam: "" as string,
    getNextPageParam: (last) => last?.nextPageToken || undefined,
    staleTime: 5 * 60_000,
  });

  // When leaving the shorts page, close the mini player
  useEffect(() => {
    return () => {
      closeVideo();
    };
  }, [closeVideo]);


  const videos = data?.pages.flatMap(p => p.items) ?? [];

  return (
    <FakeTubeLayout>
      <div className="max-w-md mx-auto space-y-4 pb-20">
        <h1 className="text-2xl font-bold mb-6 px-4">Shorts</h1>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-neutral-500">Finding shorts...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {videos.map((v, i) => (
              v && <ShortVideoItem key={`${v.id}-${i}`} video={v} onVisible={() => openVideo(v)} />
            ))}
            
            <div id="shorts-sentinel" className="h-20 flex items-center justify-center">
              {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />}
            </div>
          </div>
        )}
      </div>
    </FakeTubeLayout>
  );
}

function ShortVideoItem({ video, onVisible }: { video: Video; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasReported, setHasReported] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsActive(true);
          if (!hasReported) {
            onVisible();
            setHasReported(true);
          }
        } else {
          setIsActive(false);
        }
      },
      { threshold: 0.6 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible, hasReported]);

  return (
    <div ref={ref} className="relative aspect-[9/16] w-full bg-black rounded-2xl overflow-hidden shadow-2xl group">
      {isActive ? (
        <iframe
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&mute=0&controls=0&loop=1&playlist=${video.id}&rel=0&modestbranding=1`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          title={video.title}
        />
      ) : (
        <img 
          src={video.thumbnail.replace('hqdefault', 'maxresdefault')} 
          className="absolute inset-0 w-full h-full object-cover opacity-80" 
          alt=""
        />
      )}
      
      {/* Overlay to catch clicks and prevent iframe interaction issues */}
      <div className="absolute inset-0 z-10" />

      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
        <h3 className="text-white font-bold text-lg leading-tight mb-2">{video.title}</h3>
        <div className="flex items-center gap-3">
          <img src={video.channelAvatar} className="h-9 w-9 rounded-full border border-white/20" alt="" />
          <span className="text-white font-medium text-sm">@{video.channel.replace(/\s+/g, '').toLowerCase()}</span>
          <button className="bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full ml-auto">
            Subscribe
          </button>
        </div>
      </div>

      <div className="absolute right-4 bottom-24 flex flex-col gap-6 text-white items-center">
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 bg-neutral-800/60 rounded-full backdrop-blur-md">
            <ThumbsUp className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium">{video.views}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 bg-neutral-800/60 rounded-full backdrop-blur-md">
            <ThumbsDown className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium">Dislike</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="p-3 bg-neutral-800/60 rounded-full backdrop-blur-md">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium">Share</span>
        </div>
      </div>
    </div>
  );
}

import { ThumbsUp, ThumbsDown, Share2 } from "lucide-react";
