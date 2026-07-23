import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { TRACKS, getTrack, type Track } from "@/lib/music-data";

const PLAYLIST_KEY = "ft-music-playlist-v1";

type Ctx = {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  playlist: string[];
  playFromQueue: (queue: Track[], index: number) => void;
  playTrack: (id: string) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  addToPlaylist: (id: string) => void;
  removeFromPlaylist: (id: string) => void;
  playPlaylist: (startId?: string) => void;
  isInPlaylist: (id: string) => boolean;
};

const MusicCtx = createContext<Ctx | null>(null);

function readPlaylist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState<string[]>([]);

  useEffect(() => setPlaylist(readPlaylist()), []);

  // Initialize audio element (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setProgress(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => nextRef.current?.();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const current = queue[index] ?? null;

  const loadAndPlay = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== track.url) audio.src = track.url;
    audio.play().catch(() => { /* autoplay blocked */ });
  }, []);

  const playFromQueue = useCallback((q: Track[], i: number) => {
    setQueue(q);
    setIndex(i);
    loadAndPlay(q[i]);
  }, [loadAndPlay]);

  const playTrack = useCallback((id: string) => {
    const t = getTrack(id);
    if (!t) return;
    playFromQueue([t], 0);
  }, [playFromQueue]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const ni = (index + 1) % queue.length;
    setIndex(ni);
    loadAndPlay(queue[ni]);
  }, [queue, index, loadAndPlay]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const ni = (index - 1 + queue.length) % queue.length;
    setIndex(ni);
    loadAndPlay(queue[ni]);
  }, [queue, index, loadAndPlay]);

  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  // MediaSession API — lockscreen / notification controls
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: "FakeTube Music",
      artwork: [
        { src: current.cover, sizes: "400x400", type: "image/jpeg" },
        { src: current.cover, sizes: "512x512", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
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

  const persistPlaylist = useCallback((ids: string[]) => {
    setPlaylist(ids);
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(ids));
  }, []);

  const addToPlaylist = useCallback((id: string) => {
    if (playlist.includes(id)) return;
    persistPlaylist([...playlist, id]);
  }, [playlist, persistPlaylist]);

  const removeFromPlaylist = useCallback((id: string) => {
    persistPlaylist(playlist.filter((x) => x !== id));
  }, [playlist, persistPlaylist]);

  const isInPlaylist = useCallback((id: string) => playlist.includes(id), [playlist]);

  const playPlaylist = useCallback((startId?: string) => {
    const tracks = playlist.map((id) => getTrack(id)).filter((t): t is Track => !!t);
    if (tracks.length === 0) return;
    const i = startId ? Math.max(0, tracks.findIndex((t) => t.id === startId)) : 0;
    playFromQueue(tracks, i);
  }, [playlist, playFromQueue]);

  const value = useMemo<Ctx>(() => ({
    current, queue, index, isPlaying, progress, duration, playlist,
    playFromQueue, playTrack, toggle, next, prev, seek,
    addToPlaylist, removeFromPlaylist, playPlaylist, isInPlaylist,
  }), [current, queue, index, isPlaying, progress, duration, playlist,
      playFromQueue, playTrack, toggle, next, prev, seek,
      addToPlaylist, removeFromPlaylist, playPlaylist, isInPlaylist]);

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
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

export { TRACKS };
