import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ThumbsUp } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { useLikes, useVideosByIds } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/liked")({
  validateSearch: z.object({
    sp: z.string().optional().catch(""),
  }),
  head: () => ({
    meta: [
      { title: "Liked videos — Premium" },
      { name: "description", content: "Videos you've liked on Premium." },
      { property: "og:title", content: "Liked videos" },
      { property: "og:description", content: "Videos you've liked on Premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LikedPage,
});

function LikedPage() {
  const { ids } = useLikes();
  const { data: videos = [] } = useVideosByIds(ids);
  return (
    <FakeTubeLayout>
      <div className="flex items-center gap-3 mb-6">
        <ThumbsUp className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Liked videos</h1>
        <span className="text-neutral-500 text-sm">{videos.length}</span>
      </div>
      {videos.length === 0 ? (
        <EmptyState
          title="No liked videos yet"
          hint="Tap the like button on any video and it will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v: Video) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}
    </FakeTubeLayout>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-20 border border-dashed rounded-2xl">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-neutral-600 mt-1">{hint}</p>
      <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Browse videos</Link>
    </div>
  );
}
