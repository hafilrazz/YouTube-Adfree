import { Play, Pause, SkipBack, SkipForward, ListMusic } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMusic, formatTime } from "@/lib/music-player";

export function MiniPlayer() {
  const { current, isPlaying, progress, duration, toggle, next, prev, seek } = useMusic();
  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 shadow-lg">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={progress}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full h-1 accent-red-600 cursor-pointer"
        aria-label="Seek"
      />
      <div className="flex items-center gap-3 px-3 py-2 max-w-[1600px] mx-auto">
        <img src={current.cover} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{current.title}</p>
          <p className="text-xs text-neutral-500 truncate">
            {current.artist} · {formatTime(progress)} / {formatTime(duration)}
          </p>
        </div>
        <button onClick={prev} className="p-2 rounded-full hover:bg-neutral-100" aria-label="Previous">
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          onClick={toggle}
          className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-700"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button onClick={next} className="p-2 rounded-full hover:bg-neutral-100" aria-label="Next">
          <SkipForward className="h-5 w-5" />
        </button>
        <Link
          to="/music/playlist"
          className="p-2 rounded-full hover:bg-neutral-100 hidden sm:inline-flex"
          aria-label="Playlist"
        >
          <ListMusic className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
