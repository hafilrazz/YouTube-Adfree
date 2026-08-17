import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ListVideo } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { usePlaylist, useVideosByIds } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/playlist")({
  validateSearch: (search: Record<string, unknown>): { sp?: string } => ({
    sp: typeof search.sp === 'string' ? search.sp : "",
  }),
  head: () => ({
    meta: [
      { title: "My playlist — Premium" },
      { name: "description", content: "Videos you've saved to your playlist." },
      { property: "og:title", content: "My playlist" },
      { property: "og:description", content: "Videos you've saved to your playlist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { ids, toggle } = usePlaylist();
  const { data: videos = [] } = useVideosByIds(ids);
  return (
    <FakeTubeLayout>
      <div className="flex items-center gap-3 mb-6">
        <ListVideo className="h-6 w-6" />
        <h1 className="text-2xl font-bold">My playlist</h1>
        <span className="text-neutral-500 text-sm">{videos.length}</span>
      </div>
      {videos.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-2xl">
          <p className="font-semibold">Your playlist is empty</p>
          <p className="text-sm text-neutral-600 mt-1">Hit “Save” on any video to add it to your playlist.</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Browse videos</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v: Video) => (
            <div key={v.id} className="relative">
              <VideoCard video={v} />
              <button
                onClick={() => toggle(v.id)}
                className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </FakeTubeLayout>
  );
}
