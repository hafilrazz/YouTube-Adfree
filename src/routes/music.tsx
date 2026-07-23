import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, PlaySquare, Music2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { useMusicVideos } from "@/lib/music-videos";
import { useVideosByIds } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Music — FakeTube" },
      { name: "description", content: "Your music library." },
      { property: "og:title", content: "Music — FakeTube" },
      { property: "og:description", content: "Your music library." },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const musicVids = useMusicVideos();
  const { data: videos = [] } = useVideosByIds(musicVids.ids);

  return (
    <FakeTubeLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Music</h1>
          <p className="text-sm text-neutral-500">Music you've added from videos.</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl">
          <Music2 className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-600">Tap “Add to music” on any video to build your library.</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Browse videos</Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white">
          {videos.map((v: Video) => (
            <li key={v.id} className="flex items-center gap-3 p-2 sm:p-3 hover:bg-neutral-50">
              <Link to="/watch/$id" params={{ id: v.id }} className="relative h-12 w-20 shrink-0 rounded overflow-hidden bg-neutral-200">
                <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <PlaySquare className="h-5 w-5 text-white" />
                </span>
              </Link>
              <Link to="/watch/$id" params={{ id: v.id }} className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{v.title}</p>
                <p className="text-xs text-neutral-500 truncate">{v.channel}</p>
              </Link>
              <button
                onClick={() => musicVids.remove(v.id)}
                className="p-2 rounded-full hover:bg-red-50 text-red-600"
                aria-label="Remove"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </FakeTubeLayout>
  );
}
