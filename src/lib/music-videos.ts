import { useCallback, useEffect, useState } from "react";

const KEY = "ft-music-video-playlist-v1";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function useMusicVideos() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(read()), []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const add = useCallback((id: string) => {
    setIds((cur) => {
      if (cur.includes(id)) return cur;
      const next = [...cur, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setIds((cur) => {
      const next = cur.filter((x) => x !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, add, remove, toggle, has, persist };
}
