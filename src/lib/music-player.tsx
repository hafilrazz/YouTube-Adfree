import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Track = {
  id: string; // YouTube video id
  title: string;
  artist: string;
  cover: string; // thumbnail URL
};

type Ctx = {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  ready: boolean;
  playFromQueue: (queue: Track[], index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
};

const MusicCtx = createContext<Ctx | null>(null);

// Minimal typings for the YT IFrame API
interface YTPlayer {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (n: number) => void;
}
interface YTNS {
  Player: new (
    el: HTMLElement | string,
    opts: {
      height?: string | number;
      width?: string | number;
      videoId?: string;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
}
declare global {
  interface Window {
    YT?: YTNS;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YTNS> | null = null;
function loadYouTubeApi(): Promise<YTNS> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

// 1-second silent WAV, looped, keeps the page's audio focus alive so mobile
// browsers don't suspend the hidden YouTube iframe when the screen locks.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const pendingRef = useRef<string | null>(null);
  const wantsPlayRef = useRef(false); // user intent — separate from actual player state
  const silentRef = useRef<HTMLAudioElement | null>(null);

  const current = queue[index] ?? null;

  // Init hidden YT player
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        height: "1",
        width: "1",
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            setReady(true);
            if (pendingRef.current) {
              playerRef.current?.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e) => {
            const S = window.YT!.PlayerState;
            if (e.data === S.PLAYING) setIsPlaying(true);
            else if (e.data === S.PAUSED) {
              setIsPlaying(false);
              // Mobile browsers auto-pause iframes when the tab/screen backgrounds.
              // If the user still wants playback, resume immediately.
              if (wantsPlayRef.current) {
                setTimeout(() => {
                  try { playerRef.current?.playVideo(); } catch { /* ignore */ }
                }, 50);
              }
            }
            else if (e.data === S.ENDED) nextRef.current?.();
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Keep audio focus alive across screen locks with a looping silent WAV.
  useEffect(() => {
    const a = silentRef.current;
    if (!a) return;
    a.loop = true;
    a.volume = 0;
    if (isPlaying) {
      a.play().catch(() => { /* ignore autoplay rejection */ });
    } else {
      a.pause();
    }
  }, [isPlaying]);

  // When the tab is hidden (screen lock), the YT iframe often self-pauses.
  // Nudge it back to playing if that's what the user asked for.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && wantsPlayRef.current) {
        // Retry a few times — some browsers take a moment to allow it.
        let tries = 0;
        const iv = window.setInterval(() => {
          tries += 1;
          try { playerRef.current?.playVideo(); } catch { /* ignore */ }
          if (tries >= 5) window.clearInterval(iv);
        }, 300);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);


  // Poll progress
  useEffect(() => {
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        setProgress(p.getCurrentTime() || 0);
        const d = p.getDuration() || 0;
        setDuration(d);
      } catch { /* ignore */ }
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const playFromQueue = useCallback((q: Track[], i: number) => {
    setQueue(q);
    setIndex(i);
    const vid = q[i]?.id;
    if (!vid) return;
    wantsPlayRef.current = true;
    silentRef.current?.play().catch(() => { /* ignore */ });
    if (readyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(vid);
    } else {
      pendingRef.current = vid;
    }
  }, []);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p || !current) return;
    if (isPlaying) {
      wantsPlayRef.current = false;
      p.pauseVideo();
    } else {
      wantsPlayRef.current = true;
      silentRef.current?.play().catch(() => { /* ignore */ });
      p.playVideo();
    }
  }, [current, isPlaying]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const ni = (index + 1) % queue.length;
    setIndex(ni);
    wantsPlayRef.current = true;
    playerRef.current?.loadVideoById(queue[ni].id);
  }, [queue, index]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    const p = playerRef.current;
    if (p && p.getCurrentTime() > 3) { p.seekTo(0, true); return; }
    const ni = (index - 1 + queue.length) % queue.length;
    setIndex(ni);
    wantsPlayRef.current = true;
    playerRef.current?.loadVideoById(queue[ni].id);
  }, [queue, index]);


  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  const seek = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true);
    setProgress(time);
  }, []);

  // MediaSession API — lockscreen / notification controls
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: "Premium Music",
      artwork: [
        { src: current.cover, sizes: "480x360", type: "image/jpeg" },
        { src: current.cover, sizes: "1280x720", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.setActionHandler("play", () => {
      wantsPlayRef.current = true;
      silentRef.current?.play().catch(() => { /* ignore */ });
      playerRef.current?.playVideo();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      wantsPlayRef.current = false;
      playerRef.current?.pauseVideo();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("seekto", (e) => {
      if (e.seekTime != null) seek(e.seekTime);
    });
  }, [current, next, prev, seek]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!duration || !isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({ duration, position: progress, playbackRate: 1 });
    } catch { /* ignore */ }
  }, [duration, progress]);

  const value = useMemo<Ctx>(() => ({
    current, queue, index, isPlaying, progress, duration, ready,
    playFromQueue, toggle, next, prev, seek,
  }), [current, queue, index, isPlaying, progress, duration, ready,
      playFromQueue, toggle, next, prev, seek]);

  return (
    <MusicCtx.Provider value={value}>
      {children}
      {/* Hidden YouTube audio host — plays sound only, no visible video */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <div ref={hostRef} />
      </div>
      {/* Silent looping audio keeps the media session alive on locked screens */}
      <audio ref={silentRef} src={SILENT_WAV} loop playsInline aria-hidden style={{ display: "none" }} />
    </MusicCtx.Provider>
  );
}


export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used within MusicPlayerProvider");
  return ctx;
}

export function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function videoToTrack(v: { id: string; title: string; channel: string; thumbnail: string }): Track {
  return { id: v.id, title: v.title, artist: v.channel, cover: v.thumbnail };
}
