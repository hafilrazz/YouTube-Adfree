import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Check } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { VIDEOS } from "@/lib/faketube-data";
import { usePremium } from "@/lib/use-premium";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FakeTube Premium — Watch anything, verify nothing" },
      { name: "description", content: "FakeTube Premium: ad-free fake videos, offline pretending, and background play for videos you don't actually own." },
      { property: "og:title", content: "FakeTube Premium" },
      { property: "og:description", content: "The definitely-not-real YouTube clone, now with Premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [category, setCategory] = useState("All");
  const { premium } = usePremium();
  return (
    <FakeTubeLayout activeCategory={category} onCategoryChange={setCategory}>
      <PremiumBanner premium={premium} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
        {VIDEOS.map((v) => (
          <VideoCard key={v.id} video={v} />
        ))}
      </div>
    </FakeTubeLayout>
  );
}

function PremiumBanner({ premium }: { premium: boolean }) {
  if (premium) {
    return (
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-100 border border-amber-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">Premium is unlocked</p>
            <p className="text-sm text-amber-800">Ad-free, background play & offline pretending are active.</p>
          </div>
        </div>
        <Link to="/premium" className="text-sm font-medium text-amber-900 underline">Manage</Link>
      </div>
    );
  }
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-700 text-white p-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-400 text-neutral-900 flex items-center justify-center">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Get FakeTube Premium</p>
          <p className="text-sm text-neutral-300">Ad-free videos, background play, and offline downloads (pretend).</p>
        </div>
      </div>
      <Link
        to="/premium"
        className="px-4 py-2 rounded-full bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-100"
      >
        Unlock Premium
      </Link>
    </div>
  );
}
