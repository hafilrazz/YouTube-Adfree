import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { VIDEOS } from "@/lib/faketube-data";

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
  return (
    <FakeTubeLayout activeCategory={category} onCategoryChange={setCategory}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {VIDEOS.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </FakeTubeLayout>
  );
}
