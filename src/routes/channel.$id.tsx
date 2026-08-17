import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getChannel } from "@/lib/youtube.functions";
import { VideoCard } from "@/components/faketube/VideoCard";
import { useSubscriptions } from "@/lib/subscriptions";
import { Loader2, Bell, Share2, Search, Info } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/channel/$id")({
  validateSearch: z.object({
    sp: z.string().optional().catch(""),
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Channel — YouTube` },
    ],
  }),
  component: ChannelPage,
});

function ChannelPage() {
  const { id } = Route.useParams();
  const channelFn = useServerFn(getChannel);
  const subscriptions = useSubscriptions();
  const [activeTab, setActiveTab] = useState("videos");

  const { data: channel, isLoading, error } = useQuery({
    queryKey: ["yt-channel", id],
    queryFn: () => channelFn({ data: { id } }),
    staleTime: 15 * 60_000,
  });

  if (isLoading) {
    return (
      <FakeTubeLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
        </div>
      </FakeTubeLayout>
    );
  }

  if (error || !channel) {
    return (
      <FakeTubeLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">Channel not found</h1>
          <p className="mt-2 text-neutral-500">We couldn't retrieve information for this channel.</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 font-medium">Back to Home</Link>
        </div>
      </FakeTubeLayout>
    );
  }

  const isSubscribed = subscriptions.isSubscribed(id);

  return (
    <FakeTubeLayout>
      <div className="flex flex-col w-full">
        {/* Banner */}
        {channel.banner && (
          <div className="w-full aspect-[6/1] overflow-hidden rounded-xl mb-6">
            <img src={channel.banner} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-8 px-2 md:px-0">
          <img 
            src={channel.avatar} 
            alt={channel.name} 
            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shrink-0" 
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold mb-1 truncate">{channel.name}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              <span>@{channel.name.toLowerCase().replace(/\s/g, '')}</span>
              <span>•</span>
              <span>{channel.subscribers || "0"} subscribers</span>
              <span>•</span>
              <span>{channel.videos.length}+ videos</span>
            </div>
            
            {channel.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 max-w-2xl mb-4">
                {channel.description}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  subscriptions.toggle({
                    channelId: id,
                    name: channel.name,
                    avatar: channel.avatar,
                  })
                }
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
                  isSubscribed
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    : "bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200"
                }`}
              >
                {isSubscribed ? "Subscribed" : "Subscribe"}
              </button>
              
              <button className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="videos" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-transparent border-b border-neutral-200 dark:border-neutral-800 h-12 p-0 rounded-none mb-6">
            <TabsTrigger 
              value="videos" 
              className="px-6 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm"
            >
              Videos
            </TabsTrigger>
            <TabsTrigger 
              value="about" 
              className="px-6 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-sm"
            >
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {channel.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
            {channel.videos.length === 0 && (
              <div className="py-20 text-center text-neutral-500">
                No videos found for this channel.
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-0 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h3 className="text-xl font-bold mb-4">Description</h3>
                <p className="text-base text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {channel.description || "No description provided."}
                </p>
              </div>
              <div className="md:col-span-1">
                <h3 className="text-xl font-bold mb-4">Stats</h3>
                <div className="flex flex-col gap-4 py-4 border-y border-neutral-200 dark:border-neutral-800">
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Subscribers</span>
                    <span className="text-base font-medium">{channel.subscribers || "0"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-500">Videos</span>
                    <span className="text-base font-medium">{channel.videos.length}+</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FakeTubeLayout>
  );
}
