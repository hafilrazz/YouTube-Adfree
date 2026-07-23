import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Pause, Plus, Check, ListMusic } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { TRACKS } from "@/lib/music-data";
import { useMusic } from "@/lib/music-player";

export const Route = createFileRoute("/music")({
  head: () => ({
    meta: [
      { title: "Music — FakeTube" },
      { name: "description", content: "Stream music with background playback and lockscreen controls." },
      { property: "og:title", content: "Music — FakeTube" },
      { property: "og:description", content: "Stream music with background playback and lockscreen controls." },
    ],
  }),
  component: MusicPage,
});

function MusicPage() {
  const { current, isPlaying, playFromQueue, toggle, addToPlaylist, removeFromPlaylist, isInPlaylist } = useMusic();

  return (
    <FakeTubeLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Music</h1>
          <p className="text-sm text-neutral-500">Plays in the background — controls appear on your lockscreen.</p>
        </div>
        <Link
          to="/music/playlist"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-700"
        >
          <ListMusic className="h-4 w-4" /> My playlist
        </Link>
      </div>

      <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden bg-white">
        {TRACKS.map((t, i) => {
          const active = current?.id === t.id;
          const inList = isInPlaylist(t.id);
          return (
            <li key={t.id} className="flex items-center gap-3 p-2 sm:p-3 hover:bg-neutral-50">
              <button
                onClick={() => (active ? toggle() : playFromQueue(TRACKS, i))}
                className="relative h-12 w-12 shrink-0 rounded overflow-hidden group"
                aria-label={active && isPlaying ? "Pause" : "Play"}
              >
                <img src={t.cover} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  {active && isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                </span>
                {active && (
                  <span className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                    {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white ml-0.5" />}
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${active ? "text-red-600 font-semibold" : "font-medium"}`}>{t.title}</p>
                <p className="text-xs text-neutral-500 truncate">{t.artist}</p>
              </div>
              <button
                onClick={() => (inList ? removeFromPlaylist(t.id) : addToPlaylist(t.id))}
                className={`p-2 rounded-full ${inList ? "text-red-600 hover:bg-red-50" : "hover:bg-neutral-100"}`}
                aria-label={inList ? "Remove from playlist" : "Add to playlist"}
                title={inList ? "In your playlist" : "Add to playlist"}
              >
                {inList ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </FakeTubeLayout>
  );
}
