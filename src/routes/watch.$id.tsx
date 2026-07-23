import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Share2, Download, Scissors, Bell, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getYouTubeVideo } from "@/lib/youtube.functions";
import { useLikes, usePlaylist, useRecent } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/watch/$id")({
  loader: async ({ params }) => {
    const res = await getYouTubeVideo({ data: { id: params.id } });
    if (!res.video) throw notFound();
    return res as { video: NonNullable<typeof res.video>; related: typeof res.related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.video.title} — Premium` },
          { name: "description", content: loaderData.video.description.slice(0, 160) },
          { property: "og:title", content: loaderData.video.title },
          { property: "og:description", content: loaderData.video.description.slice(0, 160) },
          { property: "og:image", content: loaderData.video.thumbnail },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.video.thumbnail },
        ]
      : [{ title: "Not found — Premium" }, { name: "robots", content: "noindex" }],
  }),
  component: Watch,
  errorComponent: ({ error }) => (
    <FakeTubeLayout>
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Couldn't load this video</h1>
        <p className="text-sm text-neutral-600 mt-2">{error.message}</p>
        <Link to="/" className="text-blue-600 mt-4 inline-block">Back home</Link>
      </div>
    </FakeTubeLayout>
  ),
  notFoundComponent: () => (
    <FakeTubeLayout>
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Video not found</h1>
        <Link to="/" className="text-blue-600 mt-4 inline-block">Back home</Link>
      </div>
    </FakeTubeLayout>
  ),
});

function Watch() {
  const { video, related } = Route.useLoaderData();
  const [subscribed, setSubscribed] = useState(false);
  const likes = useLikes();
  const playlist = usePlaylist();
  const { record } = useRecent();

  useEffect(() => { record(video.id); }, [video.id, record]);

  const liked = likes.isLiked(video.id);
  const saved = playlist.isSaved(video.id);

  return (
    <FakeTubeLayout>
      <div className="flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto">
        <div className="flex-1 min-w-0">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <iframe
              key={video.id}
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <h1 className="mt-4 text-xl font-bold">{video.title}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={video.channelAvatar} className="h-10 w-10 rounded-full" alt="" />
              <div>
                <p className="font-semibold text-sm">{video.channel}</p>
                <p className="text-xs text-neutral-600">YouTube channel</p>
              </div>
              <button
                onClick={() => setSubscribed((v) => !v)}
                className={`ml-4 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                  subscribed ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 text-white"
                }`}
              >
                {subscribed && <Bell className="h-4 w-4" />}
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-neutral-100 rounded-full">
                <button
                  onClick={() => likes.toggle(video.id)}
                  className="px-4 py-2 flex items-center gap-2 border-r border-neutral-300 hover:bg-neutral-200 rounded-l-full text-sm"
                >
                  <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current text-blue-600" : ""}`} />
                  {liked ? "Liked" : "Like"}
                </button>
                <button className="px-4 py-2 hover:bg-neutral-200 rounded-r-full">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => playlist.toggle(video.id)}
                className={`rounded-full px-4 py-2 text-sm flex items-center gap-2 ${
                  saved ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-neutral-100 hover:bg-neutral-200"
                }`}
              >
                {saved ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                {saved ? "Saved" : "Save"}
              </button>
              <button className="bg-neutral-100 hover:bg-neutral-200 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button className="bg-neutral-100 hover:bg-neutral-200 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <Download className="h-4 w-4" /> Download
              </button>
              <button className="bg-neutral-100 hover:bg-neutral-200 rounded-full px-4 py-2 text-sm flex items-center gap-2">
                <Scissors className="h-4 w-4" /> Clip
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-neutral-100">
            <p className="text-sm font-semibold">{video.views} views · {video.posted}</p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{video.description}</p>
          </div>
        </div>
        <aside className="xl:w-96 flex flex-col gap-3">
          <h2 className="font-semibold text-sm text-neutral-700">Up next</h2>
          {related.map((v) => (
            <Link to="/watch/$id" params={{ id: v.id }} key={v.id} className="flex gap-2 group">
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-200">
                <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
                <span className={`absolute bottom-1 right-1 px-1 text-[10px] rounded ${v.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}>{v.duration}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold line-clamp-2 leading-snug">{v.title}</h3>
                <p className="text-xs text-neutral-600 mt-1">{v.channel}</p>
                <p className="text-xs text-neutral-600">{v.views} views · {v.posted}</p>
              </div>
            </Link>
          ))}
        </aside>
      </div>
    </FakeTubeLayout>
  );
}
