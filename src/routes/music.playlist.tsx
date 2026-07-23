import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Pause, Trash2, Music2, PlaySquare } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { getTrack } from "@/lib/music-data";
import { useMusic } from "@/lib/music-player";
import { useMusicVideos } from "@/lib/music-videos";
import { useVideosByIds } from "@/lib/user-data";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/music/playlist")({
  head: () => ({
    meta: [
      { title: "My Music Playlist — FakeTube" },
      { name: "description", content: "Your saved music tracks with background playback." },
      { property: "og:title", content: "My Music Playlist — FakeTube" },
      { property: "og:description", content: "Your saved music tracks with background playback." },
    ],
  }),
  component: MusicPlaylistPage,
});

function MusicPlaylistPage() {
  const { playlist, current, isPlaying, playPlaylist, toggle, removeFromPlaylist } = useMusic();
  const tracks = playlist.map((id) => getTrack(id)).filter((t): t is NonNullable<ReturnType<typeof getTrack>> => !!t);
  const musicVids = useMusicVideos();
  const { data: videos = [] } = useVideosByIds(musicVids.ids);

  return (
    <FakeTubeLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Music playlist</h1>
          <p className="text-sm text-neutral-500">{tracks.length} track{tracks.length === 1 ? "" : "s"}</p>
        </div>
        {tracks.length > 0 && (
          <button
            onClick={() => playPlaylist()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm hover:bg-red-700"
          >
            <Play className="h-4 w-4" /> Play all
          </button>
        )}
      </div>

      {tracks.length > 0 && (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white">
          {tracks.map((t) => {
            const active = current?.id === t.id;
            return (
              <li key={t.id} className="flex items-center gap-3 p-2 sm:p-3 hover:bg-neutral-50">
                <button
                  onClick={() => (active ? toggle() : playPlaylist(t.id))}
                  className="relative h-12 w-12 shrink-0 rounded overflow-hidden"
                  aria-label={active && isPlaying ? "Pause" : "Play"}
                >
                  <span className="h-full w-full flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-white"><Music2 className="h-5 w-5" /></span>
                  <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    {active && isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${active ? "text-red-600 font-semibold" : "font-medium"}`}>{t.title}</p>
                  <p className="text-xs text-neutral-500 truncate">{t.artist}</p>
                </div>
                <button
                  onClick={() => removeFromPlaylist(t.id)}
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

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <PlaySquare className="h-5 w-5" />
          <h2 className="text-lg font-bold">Videos</h2>
          <span className="text-sm text-neutral-500">{videos.length}</span>
        </div>
        {videos.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-2xl">
            <p className="text-sm text-neutral-600">No videos added yet. Tap “Add to music” on any video.</p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white">
            {videos.map((v: Video) => (
              <li key={v.id} className="flex items-center gap-3 p-2 sm:p-3 hover:bg-neutral-50">
                <Link to="/watch/$id" params={{ id: v.id }} className="relative h-12 w-20 shrink-0 rounded overflow-hidden bg-neutral-200">
                  <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
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
      </div>
    </FakeTubeLayout>
  );
}
