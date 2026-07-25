import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { searchYouTube } from "@/lib/youtube.functions";
import { useSearchHistory } from "@/lib/user-data";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: ({ match }) => {
    const q = (match.search as { q?: string })?.q ?? "";
    const title = q ? `${q} — Premium search` : "Search — Premium";
    return {
      meta: [
        { title },
        { name: "description", content: q ? `YouTube search results for "${q}" on Premium.` : "Search every public YouTube video on Premium." },
        { property: "og:title", content: title },
        { property: "og:description", content: "Full YouTube search on Premium." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const searchFn = useServerFn(searchYouTube);
  const { record: recordSearch } = useSearchHistory();

  useEffect(() => {
    if (q.trim()) recordSearch(q);
  }, [q, recordSearch]);

  const {
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ["yt-search-infinite", q],
    queryFn: ({ pageParam }) =>
      searchFn({ data: { q, limit: 50, pageToken: pageParam || undefined } }),
    initialPageParam: "" as string,
    getNextPageParam: (last) => last?.nextPageToken || undefined,
    enabled: q.trim().length > 0,
    staleTime: 5 * 60_000,
  });

  const items = data?.pages.flatMap((p) => p.items ?? []) ?? [];
  const quotaExceeded = data?.pages.some((p) => p.quotaExceeded);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length]);

  return (
    <FakeTubeLayout>
      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold truncate">
          {q ? <>Results for “{q}”</> : "Search"}
        </h1>
      </div>

      {!q ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <p className="font-semibold">Type something in the search bar above</p>
          <p className="text-sm text-neutral-600 mt-1">We'll query every public YouTube video.</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Back to trending</Link>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          Search failed. {(error as Error).message}
        </div>
      ) : isFetching && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-10">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching YouTube…
        </div>
      ) : quotaExceeded && items.length === 0 ? (
        <div className="p-6 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <p className="font-semibold">YouTube search quota reached for today</p>
          <p className="mt-1">The YouTube Data API allows only 100 searches per day on this key. It resets at midnight Pacific Time.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <p className="font-semibold">No videos found</p>
          <p className="text-sm text-neutral-600 mt-1">Try different keywords.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {items.map((v, i) => <VideoCard key={`${v.id}-${i}`} video={v} />)}
          </div>
          <div ref={sentinelRef} className="h-10" />
          {isFetchingNextPage && (
            <div className="text-center text-sm text-neutral-500 mt-6 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
            </div>
          )}
          {!hasNextPage && items.length > 0 && (
            <div className="text-center text-xs text-neutral-500 mt-6">No more results.</div>
          )}
        </>
      )}
    </FakeTubeLayout>
  );
}
