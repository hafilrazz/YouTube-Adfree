import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import type { Video } from "@/lib/faketube-data";
import { getRecommendedFromLikes } from "@/lib/youtube.functions";
import { useLikes, useRecent, useSearchHistory, useVideosByIds } from "@/lib/user-data";
import { z } from "zod";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { sp?: string } => ({
    sp: typeof search.sp === 'string' ? search.sp : "",
  }),
  head: () => ({
    meta: [
      { title: "YouTube — Recommended videos for you" },
      { name: "description", content: "Your personalized YouTube feed — recommendations based on videos you've liked." },
      { property: "og:title", content: "YouTube — Recommended videos for you" },
      { property: "og:description", content: "Your personalized YouTube feed — recommendations based on videos you've liked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { ids: recentIds } = useRecent();
  const { data: recent = [] } = useVideosByIds(recentIds.slice(0, 6));

  const { ids: likedIds } = useLikes();
  const { queries: searchQueries } = useSearchHistory();
  const recFn = useServerFn(getRecommendedFromLikes);
  const seedIds = likedIds.slice(0, 5);
  const seedQueries = searchQueries.slice(0, 5);
  const hasSignal = seedIds.length > 0 || seedQueries.length > 0;
  const { data: recommended = [], isLoading, error } = useQuery<Video[]>({
    queryKey: ["recommended", seedIds.join(","), seedQueries.join("|")],
    queryFn: () => recFn({ data: { ids: seedIds, queries: seedQueries } }),
    enabled: hasSignal,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  return (
    <FakeTubeLayout>
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recommended for you</h2>
        {hasSignal && (
          <span className="text-xs text-neutral-500">
            Based on your {seedIds.length > 0 && "likes"}{seedIds.length > 0 && seedQueries.length > 0 && " & "}{seedQueries.length > 0 && "searches"}
          </span>
        )}
      </div>

      {!hasSignal ? (
        <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center text-sm text-neutral-500">
          Like some videos or search for something to get personalized recommendations here.{" "}
          <Link to="/discover" className="text-blue-600">Browse discover</Link> to get started.
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          Couldn't load recommendations. {(error as Error).message}
        </div>
      ) : isLoading ? (
        <SkeletonGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {recommended.map((v) => (
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
