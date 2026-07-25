import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useVideoPlayer } from "@/lib/video-player-context";

/**
 * Cross-platform TV remote key codes.
 * Different TV OSes send different KeyboardEvent.key / keyCode values for
 * the same physical remote button.
 *
 * Sources: Samsung Tizen, LG webOS, Android TV / Google TV, Amazon Fire TV,
 * Panasonic/Hisense/Vizio browsers.
 */
const KEYCODE = {
  // Back button
  BACK: new Set<number>([
    8,      // Backspace (most browsers, Android TV)
    27,     // Escape
    10009,  // Tizen (Samsung) RETURN
    461,    // webOS (LG) BACK
    166,    // Some Panasonic remotes
  ]),
  // D-pad
  UP: new Set<number>([38]),
  DOWN: new Set<number>([40]),
  LEFT: new Set<number>([37]),
  RIGHT: new Set<number>([39]),
  ENTER: new Set<number>([13, 32]), // Enter + Space (OK button)
  // Media keys (let the YouTube iframe handle them; we just don't hijack)
  MEDIA: new Set<number>([
    179,    // Play/Pause
    178,    // Stop
    176,    // Next
    177,    // Previous
    413,    // Tizen STOP
    415,    // Tizen PLAY
    417,    // Tizen FF
    412,    // Tizen REWIND
    19,     // Tizen PAUSE
  ]),
};

const BACK_KEY_STRINGS = new Set([
  "Escape",
  "GoBack",
  "BrowserBack",
  "XF86Back",
  "Back",
]);


/**
 * TV remote + keyboard navigation.
 *
 * - Arrow keys move focus spatially to the nearest visible focusable element
 *   in that direction (uses element centers and a directional cone).
 * - Enter / Space activate the focused element (browser default).
 * - Escape / Backspace / BrowserBack behave as "back":
 *     * If a menu/dialog is open, let it handle it (we ignore when focus is
 *       inside an element with [data-tv-back-ignore]).
 *     * If on /watch/*, navigate back to the previous route (or "/").
 *     * Otherwise, if a floating mini player is open, close it.
 * - Media keys on TV remotes (MediaPlayPause / MediaStop) are forwarded to
 *   the browser (YouTube iframe handles them natively).
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "[data-tv-focusable]",
].join(",");

function isVisible(el: Element): boolean {
  const rect = (el as HTMLElement).getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  if (rect.right < 0 || rect.left > window.innerWidth) return false;
  const style = window.getComputedStyle(el as HTMLElement);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return true;
}

function focusableElements(): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter(isVisible);
}

type Dir = "up" | "down" | "left" | "right";

function pickNext(current: HTMLElement, dir: Dir): HTMLElement | null {
  const currRect = current.getBoundingClientRect();
  const cx = currRect.left + currRect.width / 2;
  const cy = currRect.top + currRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of focusableElements()) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;

    // Directional filter with slight tolerance to allow near-aligned items.
    const tolerance = 8;
    if (dir === "right" && dx <= tolerance) continue;
    if (dir === "left" && dx >= -tolerance) continue;
    if (dir === "down" && dy <= tolerance) continue;
    if (dir === "up" && dy >= -tolerance) continue;

    // Primary axis distance weighted less than perpendicular deviation.
    const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
    const perp = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    // Prefer items whose perpendicular distance is small (closer to a straight line).
    const score = primary + perp * 2;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function focusInitial(): HTMLElement | null {
  const first = focusableElements()[0];
  if (first) {
    first.focus();
    return first;
  }
  return null;
}

export function useTvNavigation() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { current, closeVideo } = useVideoPlayer();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing inside inputs/textareas/contenteditable.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (target as any)?.isContentEditable;

      const key = e.key;
      const code = (e as any).keyCode as number | undefined;

      // Media keys (Play/Pause/Stop/FF/RW) — let the browser/iframe handle.
      if (code != null && KEYCODE.MEDIA.has(code)) return;

      // Back handling — matches keyboard Escape, TV remote Back on all major
      // TV OSes (Tizen 10009, webOS 461, Fire TV/Android TV Backspace, etc).
      const isBackKey =
        BACK_KEY_STRINGS.has(key) ||
        (code != null && KEYCODE.BACK.has(code) && (code !== 8 || !editing)) ||
        (!editing && key === "Backspace");

      if (isBackKey) {
        // Allow menus/dialogs marked with [data-tv-back-ignore] to handle it.
        if (target?.closest("[data-tv-back-ignore]")) return;

        if (pathname.startsWith("/watch/")) {
          e.preventDefault();
          if (window.history.length > 1) window.history.back();
          else navigate({ to: "/" });
          return;
        }
        if (current) {
          e.preventDefault();
          closeVideo();
          return;
        }
        // At root on Tizen/webOS: signal the platform to exit the app.
        const w = window as any;
        if (w.tizen?.application?.getCurrentApplication) {
          e.preventDefault();
          try { w.tizen.application.getCurrentApplication().exit(); } catch {}
          return;
        }
        if (w.webOS?.platformBack) {
          e.preventDefault();
          try { w.webOS.platformBack(); } catch {}
          return;
        }
        return;
      }

      if (editing) return;

      // Spatial arrow navigation — accept both key strings and numeric keyCodes
      // (older TV browsers only send keyCode).
      const dir: Dir | null =
        key === "ArrowUp" || (code != null && KEYCODE.UP.has(code))
          ? "up"
          : key === "ArrowDown" || (code != null && KEYCODE.DOWN.has(code))
            ? "down"
            : key === "ArrowLeft" || (code != null && KEYCODE.LEFT.has(code))
              ? "left"
              : key === "ArrowRight" || (code != null && KEYCODE.RIGHT.has(code))
                ? "right"
                : null;

      // OK/Enter with no focused element → focus first focusable.
      if (!dir) {
        const isEnter = key === "Enter" || (code != null && KEYCODE.ENTER.has(code));
        if (isEnter) {
          const active = document.activeElement as HTMLElement | null;
          if (!active || active === document.body) {
            e.preventDefault();
            focusInitial();
          }
        }
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      const hasFocus =
        active && active !== document.body && active.matches(FOCUSABLE_SELECTOR);
      if (!hasFocus) {
        e.preventDefault();
        focusInitial();
        return;
      }
      const next = pickNext(active!, dir);
      if (next) {
        e.preventDefault();
        next.focus();
        next.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    };

    // Register Tizen (Samsung) remote keys — must be opted into per key.
    const w = window as any;
    try {
      const keys = [
        "MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop",
        "MediaFastForward", "MediaRewind", "MediaTrackNext", "MediaTrackPrevious",
        "ChannelUp", "ChannelDown",
        "ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue",
      ];
      keys.forEach((k) => {
        try { w.tizen?.tvinputdevice?.registerKey?.(k); } catch {}
      });
    } catch {}

    // Detect TV platform and add a class hook for CSS (overscan, larger UI).
    const ua = navigator.userAgent || "";
    const isTv =
      /SMART-TV|SmartTV|Tizen|Web0S|WebOS|NetCast|VIERA|BRAVIA|GoogleTV|Google TV|AppleTV|AFT[A-Z0-9]|;\s?TV;|CrKey|Roku|Hisense|HbbTV/i.test(ua) ||
      !!w.tizen ||
      !!w.webOS ||
      !!w.webOSSystem;
    if (isTv) document.documentElement.classList.add("tv");

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, current, closeVideo, navigate]);
}
