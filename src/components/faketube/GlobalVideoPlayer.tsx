import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouterState, useNavigate, useSearch } from "@tanstack/react-router";
import { X, Maximize2, Minimize2, Captions, Check } from "lucide-react";
import { useVideoPlayer } from "@/lib/video-player-context";
import { getProgress, saveProgress } from "@/lib/user-data";
import { z } from "zod";

// ---- YT iframe API loader ----
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

type Rect = { top: number; left: number; width: number; height: number };
const MINI_WIDTH = 340;
const MINI_HEIGHT = Math.round(MINI_WIDTH * 9 / 16);
const MINI_MARGIN = 16;

type CaptionTrack = { languageCode: string; languageName?: string; displayName?: string };

export function GlobalVideoPlayer() {
  const { current, closeVideo, slotRef, slotVersion } = useVideoPlayer();
  const navigate = useNavigate();
  const search = useSearch({ from: "__root" }) as { sp?: string };
  const sp = search.sp || "";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isWatchRoute = current ? pathname === `/watch/${current.id}` : false;
  const mode: "inline" | "mini" | "hidden" = !current ? "hidden" : isWatchRoute ? "inline" : "mini";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const placeholderRef = useRef<HTMLDivElement | null>(null);

  const [rect, setRect] = useState<Rect | null>(null);
  const [isFs, setIsFs] = useState(false);
  const [tracks, setTracks] = useState<CaptionTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null); // languageCode, or null = off
  const [ccMenuOpen, setCcMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [miniPos, setMiniPos] = useState<{ left: number; top: number } | null>(null);
  const dragState = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);


  // Recompute rect from slot in inline mode
  useLayoutEffect(() => {
    if (mode !== "inline") {
      setRect(null);
      return;
    }
    const compute = () => {
      const el = slotRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    compute();
    const el = slotRef.current;
    const ro = el ? new ResizeObserver(compute) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    const raf = requestAnimationFrame(compute);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
      cancelAnimationFrame(raf);
    };
  }, [mode, slotRef, slotVersion, current?.id]);

  // Create / update YT player
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const id = current.id;
    const start = Math.floor(getProgress(id));

    const pollTracks = (p: any) => {
      try {
        const list = p.getOption?.("captions", "tracklist") as CaptionTrack[] | undefined;
        if (list && list.length) {
          setTracks(list);
          const active = p.getOption?.("captions", "track");
          setCurrentTrack(active && active.languageCode ? active.languageCode : null);
        }
      } catch {}
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById?.({ 
            videoId: id, 
            startSeconds: start,
            suggestedQuality: 'hd720'
          });
          setTracks([]);
          setCurrentTrack(null);
          return;
        } catch {}
      }
      playerRef.current = new YT.Player(mountRef.current, {
        videoId: id,
        playerVars: { 
          autoplay: 1, 
          rel: 0, 
          start, 
          playsinline: 1, 
          fs: 1,
          disablekb: current.isShort ? 1 : 0,
          controls: current.isShort ? 0 : 1
        },
        events: {
          onReady: (e: any) => {
            e.target.playVideo();
            
            // Force disable PiP on the underlying video element if it's a short
            if (current.isShort) {
              try {
                const iframe = mountRef.current?.querySelector('iframe') || document.querySelector(`iframe[src*="${current.id}"]`);
                if (iframe) {
                   // Note: Direct access to iframe video is blocked by CORS usually, 
                   // but we can try to send a postMessage if YT API supports it or use attribute hints.
                   // The best way for YT Embed is the disablekb and controls=0 which we already have.
                }
              } catch(err) {}
            }

            interval = setInterval(() => {
              const p = playerRef.current;
              if (!p?.getCurrentTime) return;
              const t = p.getCurrentTime();
              const d = p.getDuration();
              if (d > 0 && current) saveProgress(current.id, t, d);
              pollTracks(p);
            }, 3000);
          },
          onStateChange: (e: any) => {
            const p = playerRef.current;
            if (!p) return;
            setPlaying(e.data === YT.PlayerState.PLAYING);
            const d = p.getDuration?.() ?? 0;
            const t = p.getCurrentTime?.() ?? 0;
            if (d > 0 && current) saveProgress(current.id, t, d);
            if (e.data === YT.PlayerState.ENDED && d > 0 && current) saveProgress(current.id, d, d);
            pollTracks(p);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [current?.id]);

  // Destroy player when video is closed entirely
  useEffect(() => {
    if (current) return;
    const p = playerRef.current;
    if (p) {
      try { p.destroy?.(); } catch {}
      playerRef.current = null;
      setTracks([]);
      setCurrentTrack(null);
    }
  }, [current]);

  const setCaption = (langCode: string | null) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (langCode) {
        p.loadModule?.("captions");
        p.setOption?.("captions", "track", { languageCode: langCode });
        setCurrentTrack(langCode);
      } else {
        p.setOption?.("captions", "track", {});
        p.unloadModule?.("captions");
        setCurrentTrack(null);
      }
    } catch {}
    setCcMenuOpen(false);
  };

  // Fullscreen handling
  useEffect(() => {
    const onFsChange = async () => {
      const fs = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFs(!!fs);
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (!isMobile) return;
      const orientation = (screen as any).orientation;
      try {
        if (fs && orientation?.lock) await orientation.lock("landscape");
        else if (!fs && orientation?.unlock) orientation.unlock();
      } catch {}
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as any);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as any);
      try { (screen as any).orientation?.unlock?.(); } catch {}
    };
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current as any;
    if (!el) return;
    const doc = document as any;
    const fs = doc.fullscreenElement || doc.webkitFullscreenElement;
    
    try {
      if (!fs) {
        // Fallback for Android WebView where requestFullscreen might not be reliable
        // We ensure we try all variants
        const iframe = el.querySelector("iframe") as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (iframe?.webkitEnterFullscreen) iframe.webkitEnterFullscreen();
        else if (iframe?.requestFullscreen) await iframe.requestFullscreen();
        
        // If still not in fullscreen (check after a short delay), we might be in a restricted environment
        // The CSS-based :fullscreen styles already handle the "virtual" fullscreen if the browser
        // thinks it is in fullscreen.
      } else {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
      // Fallback: manually toggle a class to force fixed full-viewport if API fails
      if (!fs) {
        el.classList.add("force-fullscreen");
      } else {
        el.classList.remove("force-fullscreen");
      }
    }
  };


  const miniTotalHeight = MINI_HEIGHT + 44;

  // Initialize / clamp mini position
  useEffect(() => {
    if (mode !== "mini") return;
    const clamp = (p: { left: number; top: number }) => {
      const maxLeft = Math.max(0, window.innerWidth - MINI_WIDTH - 4);
      const maxTop = Math.max(0, window.innerHeight - miniTotalHeight - 4);
      return {
        left: Math.min(Math.max(4, p.left), maxLeft),
        top: Math.min(Math.max(4, p.top), maxTop),
      };
    };
    setMiniPos((prev) => {
      if (prev) return clamp(prev);
      return clamp({
        left: window.innerWidth - MINI_WIDTH - MINI_MARGIN,
        top: window.innerHeight - miniTotalHeight - MINI_MARGIN,
      });
    });
    const onResize = () => setMiniPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode, miniTotalHeight]);

  if (!current) return null;

  const onMiniPointerDown = (e: React.PointerEvent) => {
    if (mode !== "mini") return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragState.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMiniPointerMove = (e: React.PointerEvent) => {
    const s = dragState.current;
    if (!s) return;
    s.moved = true;
    const maxLeft = Math.max(0, window.innerWidth - MINI_WIDTH - 4);
    const maxTop = Math.max(0, window.innerHeight - miniTotalHeight - 4);
    setMiniPos({
      left: Math.min(Math.max(4, e.clientX - s.dx), maxLeft),
      top: Math.min(Math.max(4, e.clientY - s.dy), maxTop),
    });
  };
  const onMiniPointerUp = (e: React.PointerEvent) => {
    if (dragState.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
      dragState.current = null;
    }
  };

  // Compute container style
  let style: React.CSSProperties;
  if (isFs) {
    style = { position: "fixed", inset: 0, zIndex: 2147483647, borderRadius: 0 };
  } else if (mode === "inline" && rect) {
    style = {
      position: "fixed",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      zIndex: 40,
      borderRadius: 12,
    };
  } else if (mode === "mini") {
    style = {
      position: "fixed",
      left: miniPos?.left ?? (typeof window !== "undefined" ? window.innerWidth - MINI_WIDTH - MINI_MARGIN : MINI_MARGIN),
      top: miniPos?.top ?? (typeof window !== "undefined" ? window.innerHeight - miniTotalHeight - MINI_MARGIN : MINI_MARGIN),
      width: MINI_WIDTH,
      height: miniTotalHeight,
      zIndex: 60,
      borderRadius: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      overflow: "hidden",
      background: "#000",
      touchAction: "none",
      cursor: dragState.current ? "grabbing" : "grab",
    };
  } else {
    // inline mode but slot not measured yet — hide off-screen (keep iframe alive)
    style = { position: "fixed", top: -9999, left: -9999, width: 640, height: 360, zIndex: -1 };
  }

  const showControlStrip = mode === "mini" && !isFs;

  const dragHandlers = mode === "mini"
    ? {
        onPointerDown: onMiniPointerDown,
        onPointerMove: onMiniPointerMove,
        onPointerUp: onMiniPointerUp,
        onPointerCancel: onMiniPointerUp,
      }
    : {};

  const handleMiniTap = () => {
    if (dragState.current?.moved) return;
    navigate({ to: "/watch/$id", params: { id: current.id } });
  };

  return (
    <div
      ref={containerRef}
      style={style}
      className="bg-black overflow-hidden"
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: showControlStrip ? MINI_HEIGHT : "100%",
        }}
      >
        <div
          ref={mountRef}
          className="h-full w-full origin-center"
          style={isFs ? { transform: "scale(1.34)" } : undefined}
          title={current.title}
        />

        {/* Drag / tap overlay above iframe in mini mode (iframes swallow touch events).
            Also a focusable "button" for TV remote / keyboard: Enter expands to watch. */}
        {mode === "mini" && (
          <div
            {...dragHandlers}
            onClick={handleMiniTap}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate({ to: "/watch/$id", params: { id: current.id } });
              }
            }}
            role="button"
            tabIndex={0}
            className="absolute inset-0 z-[5] focus:outline-none"
            style={{ touchAction: "none", cursor: dragState.current ? "grabbing" : "grab" }}
            aria-label={`Expand mini player: ${current.title}`}
          />
        )}

        {/* Overlay controls */}
        <div className={`absolute top-2 right-2 z-10 flex gap-1 ${current.isShort ? "opacity-0 pointer-events-none" : ""}`}>
          {tracks.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setCcMenuOpen((v) => !v)}
                className={`p-2 rounded-full ${currentTrack ? "bg-white text-black" : "bg-black/60 text-white"} hover:bg-black/80 hover:text-white`}
                aria-label="Captions"
                title="Captions"
              >
                <Captions className="h-4 w-4" />
              </button>
              {ccMenuOpen && (
                <div className="absolute right-0 mt-1 min-w-[180px] max-h-64 overflow-auto rounded-lg bg-neutral-900 text-white text-sm shadow-2xl border border-white/10">
                  <button
                    onClick={() => setCaption(null)}
                    className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2"
                  >
                    {!currentTrack && <Check className="h-3.5 w-3.5" />}
                    <span className={currentTrack ? "pl-5" : ""}>Off</span>
                  </button>
                  {tracks.map((t) => {
                    const active = currentTrack === t.languageCode;
                    return (
                      <button
                        key={t.languageCode}
                        onClick={() => setCaption(t.languageCode)}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center gap-2"
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        <span className={active ? "" : "pl-5"}>
                          {t.displayName || t.languageName || t.languageCode}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {mode === "mini" && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate({ to: "/watch/$id", params: { id: current.id } }); }}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Expand"
                title="Expand"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeVideo(); }}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {mode === "inline" && !current.isShort && (
          <div className="absolute bottom-2 right-2 z-10 flex gap-1 md:hidden">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>

      {showControlStrip && (
        <div
          {...dragHandlers}
          onClick={handleMiniTap}
          role="button"
          className="w-full text-left px-3 py-2 bg-neutral-900 text-white hover:bg-neutral-800 select-none"
          style={{ touchAction: "none", cursor: dragState.current ? "grabbing" : "grab" }}
        >
          <p className="text-xs font-medium line-clamp-1">{current.title || "Playing"}</p>
          {current.channel && <p className="text-[10px] text-neutral-400 line-clamp-1">{current.channel}</p>}
        </div>
      )}
    </div>
  );
}
