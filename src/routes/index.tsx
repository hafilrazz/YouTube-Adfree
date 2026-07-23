import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { VIDEOS } from "@/lib/faketube-data";
import { useRecent, videosByIds } from "@/lib/user-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premium — Watch trending videos" },
      { name: "description", content: "Premium: browse and watch trending videos across music, gaming, news, sports and more." },
      { property: "og:title", content: "Premium" },
      { property: "og:description", content: "Browse and watch trending videos across every category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [category, setCategory] = useState("All");
  const { ids: recentIds } = useRecent();
  const recent = videosByIds(recentIds).slice(0, 6);
  return (
    <FakeTubeLayout activeCategory={category} onCategoryChange={setCategory}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {VIDEOS.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </FakeTubeLayout>
  );
}
