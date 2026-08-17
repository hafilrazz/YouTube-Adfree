import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Compass, Loader2, RefreshCw } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { getTrending } from "@/lib/youtube.functions";

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>): { sp?: string } => ({
    sp: typeof search.sp === 'string' ? search.sp : "",
  }),
  head: () => ({
    meta: [
      { title: "Discover — Premium" },
      { name: "description", content: "Discover fresh videos on Premium — the feed changes every time you refresh." },
      { property: "og:title", content: "Discover — Premium" },
      { property: "og:description", content: "A new random topic every refresh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverPage,
});

const DISCOVER_TOPICS = [
  "Space exploration", "Street food", "Nature documentary", "Retro gaming",
  "Guitar cover", "AI news", "Mountain climbing", "Formula 1 highlights",
  "Standup comedy", "Lo-fi beats", "Anime openings", "Home cooking",
  "Woodworking", "Tech reviews", "Travel vlog Japan", "Photography tips",
  "Physics explained", "Chess puzzles", "Marvel breakdown", "Football skills",
  "Drone footage", "Piano tutorial", "History documentary", "Marathon training",
  "Street art", "Car reviews", "Startup stories", "Magic tricks",
  "Wildlife 4K", "Coding tutorial", "Book review", "Meditation",
  "Basketball highlights", "K-pop dance", "Fashion trends", "Life hacks",
];

function pickTopic() {
  return DISCOVER_TOPICS[Math.floor(Math.random() * DISCOVER_TOPICS.length)];
}

function DiscoverPage() {
  const trending = useServerFn(getTrending);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["discover-feed"],
    queryFn: async () => {
      const topic = pickTopic();
      const res = (await trending({ data: { category: topic } })) as unknown;
      const list = (Array.isArray(res) ? res : ((res as { items?: unknown[] })?.items ?? [])) as import("@/lib/faketube-data").Video[];
      const items = [...list].sort(() => Math.random() - 0.5);


      return { topic, items };
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  return (
    <FakeTubeLayout>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Compass className="h-6 w-6 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Discover</h1>
            {data?.topic && (
              <p className="text-sm text-neutral-600 truncate">
                Today's pick: <span className="font-medium">{data.topic}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Shuffle
        </button>
      </div>

      {isFetching && !data ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-10">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding something new…
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <p className="font-semibold">Nothing to discover right now</p>
          <p className="text-sm text-neutral-600 mt-1">Try shuffling again.</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Back to home</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {data.items.map((v, i) => <VideoCard key={`${v.id}-${i}`} video={v} />)}
        </div>
      )}
    </FakeTubeLayout>
  );
}
