import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, X } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { VideoCard } from "@/components/faketube/VideoCard";
import { useSubscriptions } from "@/lib/subscriptions";
import { getSubscriptionsFeed } from "@/lib/youtube.functions";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — Premium" },
      { name: "description", content: "Latest videos from channels you follow on Premium." },
      { property: "og:title", content: "Subscriptions" },
      { property: "og:description", content: "Latest videos from channels you follow on Premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { subs, unsubscribe } = useSubscriptions();
  const channelIds = subs.map((s) => s.channelId);
  const fn = useServerFn(getSubscriptionsFeed);
  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["subs-feed", channelIds],
    queryFn: () => fn({ data: { channelIds } }),
    enabled: channelIds.length > 0,
    staleTime: 5 * 60_000,
  });

  return (
    <FakeTubeLayout>
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <span className="text-neutral-500 text-sm">{subs.length} channels</span>
      </div>

      {subs.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-3 mb-6">
          {subs.map((s) => (
            <div
              key={s.channelId}
              className="flex-shrink-0 flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-full pl-1 pr-3 py-1"
            >
              <img src={s.avatar} alt="" className="h-8 w-8 rounded-full" />
              <span className="text-sm max-w-[140px] truncate">{s.name || "Channel"}</span>
              <button
                onClick={() => unsubscribe(s.channelId)}
                className="ml-1 p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                aria-label={`Unsubscribe from ${s.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {subs.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          hint="Tap Subscribe on any video and this feed will fill with their latest uploads."
        />
      ) : isLoading ? (
        <div className="text-center py-20 text-neutral-500 text-sm">Loading latest uploads…</div>
      ) : videos.length === 0 ? (
        <EmptyState
          title="No recent uploads"
          hint="Your channels haven't posted anything new — check back later."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
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
