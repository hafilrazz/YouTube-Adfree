import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAudioStream } from "./youtube.functions";

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
  loading: boolean;
  error: string | null;
  playFromQueue: (queue: Track[], index: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
};

const MusicCtx = createContext<Ctx | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wantsPlayRef = useRef(false);
  const loadTokenRef = useRef(0);

  const current = queue[index] ?? null;

  // Resolve audio URL for a track and start playback
  const loadAndPlay = useCallback(async (trackId: string) => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const { url } = await getAudioStream({ data: { id: trackId } });
      if (token !== loadTokenRef.current) return; // superseded
      const a = audioRef.current;
      if (!a) return;
      a.src = url;
      a.load();
      if (wantsPlayRef.current) {
        try { await a.play(); } catch { /* autoplay may need gesture */ }
      }
    } catch (e) {
      if (token === loadTokenRef.current) setError((e as Error).message);
    } finally {
      if (token === loadTokenRef.current) setLoading(false);
    }
  }, []);

  // When the current track changes, load its stream
  useEffect(() => {
    if (!current) return;
    loadAndPlay(current.id);
  }, [current?.id, loadAndPlay]);

  // Bind audio element events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setProgress(a.currentTime || 0);
    const onDur = () => setDuration(a.duration || 0);
    const onEnded = () => nextRef.current?.();
    const onError = () => setError("Playback error");
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, []);

  const playFromQueue = useCallback((q: Track[], i: number) => {
    setQueue(q);
    setIndex(i);
    wantsPlayRef.current = true;
    // loadAndPlay will fire via the current effect
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (isPlaying) {
      wantsPlayRef.current = false;
      a.pause();
    } else {
      wantsPlayRef.current = true;
      if (!a.src) {
        loadAndPlay(current.id);
      } else {
        a.play().catch(() => { /* ignore */ });
      }
    }
  }, [current, isPlaying, loadAndPlay]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const ni = (index + 1) % queue.length;
    setIndex(ni);
    wantsPlayRef.current = true;
  }, [queue, index]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    const a = audioRef.current;
    if (a && a.currentTime > 3) { a.currentTime = 0; return; }
    const ni = (index - 1 + queue.length) % queue.length;
    setIndex(ni);
    wantsPlayRef.current = true;
  }, [queue, index]);

  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  const seek = useCallback((time: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = time;
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
      audioRef.current?.play().catch(() => { /* ignore */ });
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      wantsPlayRef.current = false;
      audioRef.current?.pause();
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
    current, queue, index, isPlaying, progress, duration,
    ready: true, loading, error,
    playFromQueue, toggle, next, prev, seek,
  }), [current, queue, index, isPlaying, progress, duration, loading, error,
      playFromQueue, toggle, next, prev, seek]);

  return (
    <MusicCtx.Provider value={value}>
      {children}
      {/* Native audio element — keeps playing when the mobile screen locks. */}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        aria-hidden
        style={{ display: "none" }}
      />
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
