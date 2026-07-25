import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useVideoPlayer } from "@/lib/video-player-context";

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

      // Back handling (TV remote Back = "GoBack"/"BrowserBack"; keyboard = Escape).
      // Backspace is only treated as Back when NOT typing in a field.
      const isBackKey =
        key === "Escape" ||
        key === "GoBack" ||
        key === "BrowserBack" ||
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
        return;
      }

      if (editing) return;

      // Spatial arrow navigation.
      const dir: Dir | null =
        key === "ArrowUp"
          ? "up"
          : key === "ArrowDown"
            ? "down"
            : key === "ArrowLeft"
              ? "left"
              : key === "ArrowRight"
                ? "right"
                : null;
      if (!dir) return;

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

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, current, closeVideo, navigate]);
}
