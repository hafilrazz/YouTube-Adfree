import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { searchYouTube } from "@/lib/youtube.functions";
import { useSearchHistory } from "@/lib/user-data";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  sp: fallback(z.string(), "").default(""), // search params (filters)
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
  const { q, sp } = Route.useSearch();
  const navigate = useNavigate();
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
    queryKey: ["yt-search-infinite", q, sp],
    queryFn: ({ pageParam }) =>
      searchFn({ data: { q, limit: 50, pageToken: pageParam || undefined, params: sp || undefined } }),

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
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SearchIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold truncate">
              {q ? <>Results for “{q}”</> : "Search"}
            </h1>
          </div>
          {q && <SearchFilters currentSp={sp} onFilterChange={(newSp) => navigate({ search: (prev: { q: string; sp?: string }) => ({ ...prev, sp: newSp }) })} />}
        </div>
        
        {sp && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate({ search: (prev: { q: string; sp?: string }) => ({ ...prev, sp: "" }) })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-xs font-medium transition-colors"
            >
              Clear filters

              <X className="h-3 w-3" />
            </button>
          </div>
        )}
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

function SearchFilters({ currentSp, onFilterChange }: { currentSp: string; onFilterChange: (sp: string) => void }) {
  const [isOpen, setIsOpen] = (useEffect(() => {}, []), (function useToggle(initial: boolean) {
    const [v, setV] = (typeof window !== "undefined" ? (window as any).useState : (initial: any) => [initial, (v: any) => v])(initial);
    return [v, () => setV((prev: any) => !prev)];
  } as any)(false)); // Simplified state for the moment, let's use standard React
  
  // Real implementation below
  return <SearchFiltersImpl currentSp={currentSp} onFilterChange={onFilterChange} />;
}

import { useState } from "react";

function SearchFiltersImpl({ currentSp, onFilterChange }: { currentSp: string; onFilterChange: (sp: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const filters = [
    {
      title: "Upload Date",
      options: [
        { label: "Last hour", sp: "EgQIARAB" },
        { label: "Today", sp: "EgQIAhAB" },
        { label: "This week", sp: "EgQIAxAB" },
        { label: "This month", sp: "EgQIBBAB" },
        { label: "This year", sp: "EgQIBRAB" },
      ],
    },
    {
      title: "Type",
      options: [
        { label: "Video", sp: "EgIQAQ%3D%3D" },
        { label: "Channel", sp: "EgIQAg%3D%3D" },
        { label: "Playlist", sp: "EgIQAw%3D%3D" },
        { label: "Movie", sp: "EgIQBA%3D%3D" },
      ],
    },
    {
      title: "Duration",
      options: [
        { label: "Under 4 minutes", sp: "EgQIAhAB" },
        { label: "4 - 20 minutes", sp: "EgQIAxAB" },
        { label: "Over 20 minutes", sp: "EgQIBBAB" },
      ],
    },
    {
      title: "Sort By",
      options: [
        { label: "Relevance", sp: "" },
        { label: "Upload date", sp: "CAI%3D" },
        { label: "View count", sp: "CAM%3D" },
        { label: "Rating", sp: "CAE%3D" },
      ],
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          isOpen ? "bg-neutral-200" : "hover:bg-neutral-100"
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 p-6 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 w-[80vw] max-w-4xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {filters.map((section) => (
              <div key={section.title}>
                <h3 className="text-[12px] font-bold text-neutral-900 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">
                  {section.title}
                </h3>
                <div className="flex flex-col gap-3">
                  {section.options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        onFilterChange(opt.sp);
                        setIsOpen(false);
                      }}
                      className={`text-sm text-left hover:text-neutral-900 transition-colors ${
                        currentSp === opt.sp ? "font-bold text-neutral-900" : "text-neutral-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

