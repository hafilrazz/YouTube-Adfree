import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { VIDEOS } from "@/lib/faketube-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FakeTube — Watch anything, verify nothing" },
      { name: "description", content: "FakeTube is a totally-not-real video sharing platform. Browse, watch and pretend-subscribe." },
      { property: "og:title", content: "FakeTube" },
      { property: "og:description", content: "A YouTube-style clone for demos and fun." },
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
