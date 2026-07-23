import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import type { Video } from "@/lib/faketube-data";
import { getTrending } from "@/lib/youtube.functions";
import { useRecent, useVideosByIds } from "@/lib/user-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Youtube — Trending videos right now" },
      { name: "description", content: "Watch what's trending today on YouTube — music, gaming, news, sports and more, streamed straight from the source." },
      { property: "og:title", content: "Youtube — Trending videos right now" },
      { property: "og:description", content: "Watch what's trending today on YouTube — music, gaming, news, sports and more, streamed straight from the source." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [category, setCategory] = useState("All");
  const trendingFn = useServerFn(getTrending);
  const { data: videos = [], isLoading, error } = useQuery<Video[]>({
    queryKey: ["trending", category],
    queryFn: () => trendingFn({ data: { category } }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });


  const { ids: recentIds } = useRecent();
  const { data: recent = [] } = useVideosByIds(recentIds.slice(0, 6));

  return (
    <FakeTubeLayout activeCategory={category} onCategoryChange={setCategory}>
      {recent.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recently watched</h2>
            <Link to="/history" className="text-sm text-blue-600">View all</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {recent.map((v) => (
              <div key={v.id} className="w-64 shrink-0 snap-start">
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </section>
      )}

      {error ? (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          Couldn't load videos from YouTube. {(error as Error).message}
        </div>
      ) : isLoading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
    </FakeTubeLayout>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-video rounded-xl bg-neutral-200 animate-pulse" />
          <div className="mt-3 flex gap-3">
            <div className="h-9 w-9 rounded-full bg-neutral-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-neutral-200 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-neutral-200 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
      <div className="col-span-full text-center text-sm text-neutral-500 flex items-center justify-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading videos…
      </div>
    </div>
  );
}
