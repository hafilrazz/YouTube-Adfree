import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ChevronLeft, ChevronRight, Search as SearchIcon } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { searchYouTube } from "@/lib/youtube.functions";
import { useSearchHistory } from "@/lib/user-data";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  page: fallback(z.string(), "").default(""),
  prev: fallback(z.string(), "").default(""),
  n: fallback(z.number().int(), 1).default(1),
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
  const { q, page, prev, n } = Route.useSearch();
  const navigate = Route.useNavigate();
  const searchFn = useServerFn(searchYouTube);
  const { record: recordSearch } = useSearchHistory();

  useEffect(() => {
    if (q.trim() && n === 1) recordSearch(q);
  }, [q, n, recordSearch]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["yt-search-page", q, page],
    queryFn: () => searchFn({ data: { q, limit: 24, pageToken: page || undefined } }),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

  const items = data?.items ?? [];
  const nextToken = data?.nextPageToken;
  const prevToken = data?.prevPageToken;

  return (
    <FakeTubeLayout>
      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold truncate">
          {q ? <>Results for “{q}”</> : "Search"}
        </h1>
        {n > 1 && <span className="text-sm text-neutral-500">Page {n}</span>}
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
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <p className="font-semibold">No videos found</p>
          <p className="text-sm text-neutral-600 mt-1">Try different keywords.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {items.map((v) => <VideoCard key={v.id} video={v} />)}
          </div>
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              disabled={!prevToken || n <= 1}
              onClick={() =>
                navigate({
                  search: { q, page: prevToken ?? "", prev: page, n: Math.max(1, n - 1) },
                })
              }
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-sm text-neutral-500">Page {n}</span>
            <button
              disabled={!nextToken}
              onClick={() =>
                navigate({
                  search: { q, page: nextToken ?? "", prev: page, n: n + 1 },
                })
              }
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {isFetching && (
            <div className="text-center text-xs text-neutral-500 mt-3 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Updating…
            </div>
          )}
        </>
      )}
    </FakeTubeLayout>
  );
}
