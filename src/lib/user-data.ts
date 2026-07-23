import { useCallback, useEffect, useState } from "react";
import { VIDEOS, type Video } from "./faketube-data";

const LIKES_KEY = "faketube:likes";
const PLAYLIST_KEY = "faketube:playlist";
const RECENT_KEY = "faketube:recent";
const RECENT_MAX = 30;

function readSet(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSet(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(`ft:${key}`));
}

function useIdList(key: string): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readSet(key));
    const handler = () => setIds(readSet(key));
    window.addEventListener(`ft:${key}`, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(`ft:${key}`, handler);
      window.removeEventListener("storage", handler);
    };
  }, [key]);
  const update = useCallback(
    (next: string[]) => {
      writeSet(key, next);
      setIds(next);
    },
    [key],
  );
  return [ids, update];
}

export function useLikes() {
  const [ids, setIds] = useIdList(LIKES_KEY);
  return {
    ids,
    isLiked: (id: string) => ids.includes(id),
    toggle: (id: string) =>
      setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids]),
  };
}

export function usePlaylist() {
  const [ids, setIds] = useIdList(PLAYLIST_KEY);
  return {
    ids,
    isSaved: (id: string) => ids.includes(id),
    toggle: (id: string) =>
      setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids]),
  };
}

export function useRecent() {
  const [ids, setIds] = useIdList(RECENT_KEY);
  const record = useCallback(
    (id: string) => {
      const next = [id, ...readSet(RECENT_KEY).filter((x) => x !== id)].slice(
        0,
        RECENT_MAX,
      );
      writeSet(RECENT_KEY, next);
    },
    [],
  );
  const clear = useCallback(() => writeSet(RECENT_KEY, []), []);
  return { ids, record, clear, setIds };
}

export function videosByIds(ids: string[]): Video[] {
  return ids
    .map((id) => VIDEOS.find((v) => v.id === id))
    .filter((v): v is Video => Boolean(v));
}
