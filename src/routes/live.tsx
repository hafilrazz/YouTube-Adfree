import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Radio } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { getLive } from "@/lib/youtube.functions";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live — Streams happening right now" },
      { name: "description", content: "Watch live streams on Premium: gaming, music, news, sports and more, broadcasting right now." },
      { property: "og:title", content: "Live — Streams happening right now" },
      { property: "og:description", content: "Live streams across gaming, music, news and sports — updated in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

const TAGS = ["live", "gaming", "music", "news", "sports", "talk", "lofi", "coding"];

function LivePage() {
  const [q, setQ] = useState("live");
  const liveFn = useServerFn(getLive);
  const { data: videos = [], isLoading, error } = useQuery<Video[]>({
    queryKey: ["live", q],
    queryFn: () => liveFn({ data: { q } }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  return (
    <FakeTubeLayout>
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold">
          <Radio className="h-3.5 w-3.5" /> LIVE
        </span>
        <h1 className="text-lg font-semibold">Streams happening now</h1>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
        {TAGS.map((t) => (
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
          Couldn't load live streams. {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-neutral-500 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live streams…
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center text-sm text-neutral-500 py-16">No live streams found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => (
            <div key={v.id} className="relative">
              <VideoCard video={v} />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
            </div>
          ))}
        </div>
      )}
    </FakeTubeLayout>
  );
}
