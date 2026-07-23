import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { getTrending } from "@/lib/youtube.functions";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending — Most popular videos right now" },
      { name: "description", content: "Browse the most popular videos trending on YouTube right now across music, gaming, movies and more." },
      { property: "og:title", content: "Trending — Most popular videos right now" },
      { property: "og:description", content: "The hottest videos trending worldwide, refreshed hourly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrendingPage,
});

const CATEGORIES = ["All", "Music", "Gaming", "Movies", "News", "Sports", "Comedy", "Tech"];

function TrendingPage() {
  const [cat, setCat] = useState("All");
  const trendingFn = useServerFn(getTrending);
  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const { data: videos = [], isLoading, error } = useQuery<Video[]>({
    queryKey: ["trending-page", cat, hourBucket],
    queryFn: () => trendingFn({ data: { category: cat } }),
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
  });

  return (
    <FakeTubeLayout>
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold">
          <Flame className="h-3.5 w-3.5" /> TRENDING
        </span>
        <h1 className="text-lg font-semibold">Popular right now</h1>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
        {CATEGORIES.map((t) => (
          <button
            key={t}
            onClick={() => setCat(t)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
              cat === t ? "bg-neutral-900 text-white dark:bg-white dark:text-black" : "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          Couldn't load trending videos. {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-neutral-500 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trending…
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center text-sm text-neutral-500 py-16">No trending videos found.</div>
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
