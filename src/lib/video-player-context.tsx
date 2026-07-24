import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type VideoRef = {
  id: string;
  title: string;
  channel?: string;
  thumbnail?: string;
};

type Ctx = {
  current: VideoRef | null;
  openVideo: (v: VideoRef) => void;
  closeVideo: () => void;
  slotRef: React.MutableRefObject<HTMLDivElement | null>;
  setSlot: (el: HTMLDivElement | null) => void;
  slotVersion: number;
};

const VideoPlayerCtx = createContext<Ctx | null>(null);

export function VideoPlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<VideoRef | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [slotVersion, setSlotVersion] = useState(0);

  const openVideo = useCallback((v: VideoRef) => {
    setCurrent((prev) => (prev && prev.id === v.id ? { ...prev, ...v } : v));
  }, []);
  const closeVideo = useCallback(() => setCurrent(null), []);
  const setSlot = useCallback((el: HTMLDivElement | null) => {
    slotRef.current = el;
    setSlotVersion((v) => v + 1);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ current, openVideo, closeVideo, slotRef, setSlot, slotVersion }),
    [current, openVideo, closeVideo, setSlot, slotVersion],
  );

  return <VideoPlayerCtx.Provider value={value}>{children}</VideoPlayerCtx.Provider>;
}

export function useVideoPlayer() {
  const ctx = useContext(VideoPlayerCtx);
  if (!ctx) throw new Error("useVideoPlayer must be used inside VideoPlayerProvider");
  return ctx;
}
