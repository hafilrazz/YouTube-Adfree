import { Link } from "@tanstack/react-router";
import type { Video } from "@/lib/faketube-data";

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link to="/watch/$id" params={{ id: video.id }} search={(prev: any) => ({ ...prev, sp: prev.sp || "" })} className="block group">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-200">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover group-hover:rounded-none transition-all"
        />
        {video.duration ? (
          <span className={`absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-medium rounded ${
            video.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"
          }`}>
            {video.duration}
          </span>
        ) : null}

      </div>
      <div className="mt-3 flex gap-3">
        <Link 
          to="/channel/$id" 
          params={{ id: video.channelId || "" }} 
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={video.channelAvatar} alt={video.channel} className="h-9 w-9 rounded-full object-cover" />
        </Link>
        <div className="min-w-0">
          <h3 className="text-base font-semibold line-clamp-2 leading-snug">{video.title}</h3>
          <Link 
            to="/channel/$id" 
            params={{ id: video.channelId || "" }}
            className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors block"
            onClick={(e) => e.stopPropagation()}
          >
            {video.channel}
          </Link>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {video.views} views · {video.posted}
          </p>
        </div>
      </div>
    </Link>
  );
}
