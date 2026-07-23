import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Share2, Download, Scissors, Bell } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getVideo, relatedVideos } from "@/lib/faketube-data";

export const Route = createFileRoute("/watch/$id")({
  loader: ({ params }) => {
    const video = getVideo(params.id);
    if (!video) throw notFound();
    return { video, related: relatedVideos(params.id) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.video.title} — FakeTube` },
          { name: "description", content: loaderData.video.description },
          { property: "og:title", content: loaderData.video.title },
          { property: "og:description", content: loaderData.video.description },
          { property: "og:image", content: loaderData.video.thumbnail },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.video.thumbnail },
        ]
      : [{ title: "Not found — FakeTube" }, { name: "robots", content: "noindex" }],
  }),
  component: Watch,
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
  const [liked, setLiked] = useState(false);
  return (
    <FakeTubeLayout>
      <div className="flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto">
        <div className="flex-1 min-w-0">
          <div className="aspect-video rounded-xl overflow-hidden bg-black relative">
            <img src={video.thumbnail.replace("/480/270", "/1280/720")} alt={video.title} className="h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-red-600/90 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[22px] border-l-white border-y-[14px] border-y-transparent ml-2" />
              </div>
            </div>
          </div>
          <h1 className="mt-4 text-xl font-bold">{video.title}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src={video.channelAvatar} className="h-10 w-10 rounded-full" alt="" />
              <div>
                <p className="font-semibold text-sm">{video.channel}</p>
                <p className="text-xs text-neutral-600">1.2M subscribers</p>
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
                  onClick={() => setLiked((v) => !v)}
                  className="px-4 py-2 flex items-center gap-2 border-r border-neutral-300 hover:bg-neutral-200 rounded-l-full text-sm"
                >
                  <ThumbsUp className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                  {liked ? "12K" : "11K"}
                </button>
                <button className="px-4 py-2 hover:bg-neutral-200 rounded-r-full">
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </div>
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
          <div className="mt-6">
            <h2 className="font-semibold mb-3">247 Comments</h2>
            <div className="flex gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
              <input className="flex-1 border-b border-neutral-300 py-2 text-sm outline-none focus:border-neutral-900" placeholder="Add a comment..." />
            </div>
            {[
              { u: "faketube_fan", t: "First! Love this video, so real 🔥" },
              { u: "notabot", t: "Definitely not written by AI. Definitely." },
              { u: "old_school", t: "Take my like, sir." },
            ].map((c, i) => (
              <div key={i} className="flex gap-3 mb-4">
                <img src={`https://i.pravatar.cc/80?u=${c.u}`} className="h-10 w-10 rounded-full" alt="" />
                <div>
                  <p className="text-xs font-semibold">@{c.u} <span className="text-neutral-500 font-normal ml-2">2 days ago</span></p>
                  <p className="text-sm mt-1">{c.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="xl:w-96 flex flex-col gap-3">
          {related.map((v: typeof related[number]) => (
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
