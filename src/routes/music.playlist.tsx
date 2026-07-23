import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Pause, SkipBack, SkipForward, Trash2, Music2 } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { useMusicVideos } from "@/lib/music-videos";
import { useVideosByIds } from "@/lib/user-data";
import { useMusic, videoToTrack, formatTime } from "@/lib/music-player";
import type { Video } from "@/lib/faketube-data";

export const Route = createFileRoute("/music/playlist")({
  head: () => ({
    meta: [
      { title: "My Music Playlist — Premium" },
      { name: "description", content: "Audio-only playback of your saved music videos with background play." },
      { property: "og:title", content: "My Music Playlist — Premium" },
      { property: "og:description", content: "Audio-only playback of your saved music videos with background play." },
    ],
  }),
  component: MusicPlaylistPage,
});

function MusicPlaylistPage() {
  const musicVids = useMusicVideos();
  const { data: videos = [] } = useVideosByIds(musicVids.ids);
  const { current, isPlaying, progress, duration, playFromQueue, toggle, next, prev, seek } = useMusic();

  const tracks = videos.map(videoToTrack);
  const playAt = (i: number) => playFromQueue(tracks, i);
  const currentIndex = current ? tracks.findIndex((t) => t.id === current.id) : -1;

  return (
    <FakeTubeLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Music playlist</h1>
          <p className="text-sm text-neutral-500">{videos.length} track{videos.length === 1 ? "" : "s"} · audio only</p>
        </div>
        {tracks.length > 0 && (
          <button
            onClick={() => playAt(0)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm hover:bg-red-700"
          >
            <Play className="h-4 w-4" /> Play all
          </button>
        )}
      </div>

      {current && currentIndex >= 0 && (
        <NowPlayingBar
          cover={current.cover}
          title={current.title}
          artist={current.artist}
          isPlaying={isPlaying}
          progress={progress}
          duration={duration}
          onPrev={prev}
          onNext={next}
          onToggle={toggle}
          onSeek={seek}
        />
      )}

      {videos.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl">
          <Music2 className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-600">No music yet — tap “Add to music” on any video.</p>
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
                  className="relative h-14 w-24 shrink-0 rounded overflow-hidden bg-neutral-200"
                  aria-label={active && isPlaying ? "Pause" : "Play"}
                >
                  <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    {active && isPlaying
                      ? <Pause className="h-5 w-5 text-white" />
                      : <Play className="h-5 w-5 text-white ml-0.5" />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${active ? "text-red-600 font-semibold" : "font-medium"}`}>{v.title}</p>
                  <p className="text-xs text-neutral-500 truncate">{v.channel}</p>
                </div>
                <button
                  onClick={() => {
                    musicVids.remove(v.id);
                  }}
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

function NowPlayingBar({ cover, title, artist, isPlaying, progress, duration, onPrev, onNext, onToggle, onSeek }: {
  cover: string; title: string; artist: string; isPlaying: boolean; progress: number; duration: number;
  onPrev: () => void; onNext: () => void; onToggle: () => void; onSeek: (t: number) => void;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <img src={cover} alt="" className="h-16 w-24 rounded object-cover bg-neutral-200" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-neutral-500 truncate">{artist}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-2 rounded-full hover:bg-neutral-100" aria-label="Previous">
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={onToggle}
            className="h-11 w-11 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-700"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
          <button onClick={onNext} className="p-2 rounded-full hover:bg-neutral-100" aria-label="Next">
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center gap-2">
        <span className="text-[11px] tabular-nums text-neutral-500 w-10 text-right">{formatTime(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 h-1 accent-red-600 cursor-pointer"
          aria-label="Seek"
        />
        <span className="text-[11px] tabular-nums text-neutral-500 w-10">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
