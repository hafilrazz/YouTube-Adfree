import { createFileRoute, Link } from "@tanstack/react-router";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { useRecent, useVideosByIds } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Premium" },
      { name: "description", content: "Recently watched videos on Premium." },
      { property: "og:title", content: "Watch history" },
      { property: "og:description", content: "Recently watched videos on Premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { ids, clear } = useRecent();
  const videos = videosByIds(ids);
  return (
    <FakeTubeLayout>
      <div className="flex items-center gap-3 mb-6">
        <HistoryIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Watch history</h1>
        <span className="text-neutral-500 text-sm">{videos.length}</span>
        {videos.length > 0 && (
          <button
            onClick={clear}
            className="ml-auto text-sm flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200"
          >
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        )}
      </div>
      {videos.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <p className="font-semibold">No watch history yet</p>
          <p className="text-sm text-neutral-600 mt-1">Videos you watch show up here.</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Browse videos</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </FakeTubeLayout>
  );
}
