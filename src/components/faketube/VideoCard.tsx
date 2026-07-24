import { Link } from "@tanstack/react-router";
import type { Video } from "@/lib/faketube-data";

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link to="/watch/$id" params={{ id: video.id }} className="block group">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-200">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover group-hover:rounded-none transition-all"
        />
        <span className={`absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-medium rounded ${
          video.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"
        }`}>
          {video.duration}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <img src={video.channelAvatar} alt={video.channel} className="h-9 w-9 rounded-full shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold line-clamp-2 leading-snug">{video.title}</h3>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{video.channel}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-300">
            {video.views} views · {video.posted}
          </p>

        </div>
      </div>
    </Link>
  );
}
