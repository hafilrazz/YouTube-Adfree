import { useCallback, useEffect, useState } from "react";

export type Subscription = {
  channelId: string;
  name: string;
  avatar: string;
};

const KEY = "faketube:subscriptions";
const EVT = `ft:${KEY}`;

function read(): Subscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Subscription[]) : [];
  } catch {
    return [];
  }
}

function write(list: Subscription[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);

  useEffect(() => {
    setSubs(read());
    const handler = () => setSubs(read());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isSubscribed = useCallback(
    (channelId: string) => !!channelId && subs.some((s) => s.channelId === channelId),
    [subs],
  );

  const subscribe = useCallback((sub: Subscription) => {
    if (!sub.channelId) return;
    const cur = read();
    if (cur.some((s) => s.channelId === sub.channelId)) return;
    write([sub, ...cur]);
  }, []);

  const unsubscribe = useCallback((channelId: string) => {
    write(read().filter((s) => s.channelId !== channelId));
  }, []);

  const toggle = useCallback((sub: Subscription) => {
    const cur = read();
    if (cur.some((s) => s.channelId === sub.channelId)) {
      write(cur.filter((s) => s.channelId !== sub.channelId));
    } else if (sub.channelId) {
      write([sub, ...cur]);
    }
  }, []);

  return { subs, isSubscribed, subscribe, unsubscribe, toggle };
}
