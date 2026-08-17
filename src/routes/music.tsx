import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Play, Pause, Music2 } from "lucide-react";
import { z } from "zod";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { useMusicVideos } from "@/lib/music-videos";
import { useVideosByIds } from "@/lib/user-data";
import { useMusic, videoToTrack } from "@/lib/music-player";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/music")({
  validateSearch: z.object({
    sp: z.string().optional().catch(""),
  }),
  head: () => ({
    meta: [
      { title: "Music — Premium" },
      { name: "description", content: "Your music library — audio-only playback with background support." },
      { property: "og:title", content: "Music — Premium" },
      { property: "og:description", content: "Your music library — audio-only playback with background support." },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const musicVids = useMusicVideos();
  const { data: videos = [] } = useVideosByIds(musicVids.ids);
  const { current, isPlaying, playFromQueue, toggle } = useMusic();

  const tracks = videos.map(videoToTrack);
  const playAt = (i: number) => playFromQueue(tracks, i);

  return (
    <FakeTubeLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Music</h1>
          <p className="text-sm text-neutral-500">Audio-only playback of videos you've added.</p>
        </div>
        {tracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => playAt(0)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm hover:bg-red-700"
            >
              <Play className="h-4 w-4" /> Play all
            </button>
            <Link to="/music/playlist" className="text-sm text-blue-600">Open playlist</Link>
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl">
          <Music2 className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-600">Tap “Add to music” on any video to build your library.</p>
          <Link to="/" className="inline-block mt-4 text-blue-600 text-sm">Browse videos</Link>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white">
          {videos.map((v: Video, i: number) => {
            const active = current?.id === v.id;
            return (
              <li key={v.id} className="flex items-center gap-3 p-2 sm:p-3 hover:bg-neutral-50">
                <button
                  onClick={() => (active ? toggle() : playAt(i))}
                  className="relative h-12 w-20 shrink-0 rounded overflow-hidden bg-neutral-200"
                  aria-label={active && isPlaying ? "Pause" : "Play"}
                >
                  <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    {active && isPlaying
                      ? <Pause className="h-4 w-4 text-white" />
                      : <Play className="h-4 w-4 text-white ml-0.5" />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${active ? "text-red-600 font-semibold" : "font-medium"}`}>{v.title}</p>
                  <p className="text-xs text-neutral-500 truncate">{v.channel}</p>
                </div>
                <button
                  onClick={() => musicVids.remove(v.id)}
                  className="p-2 rounded-full hover:bg-red-50 text-red-600"
                  aria-label="Remove"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </FakeTubeLayout>
  );
}
