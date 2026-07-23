import { useEffect, useState, useCallback } from "react";

export type Profile = { id: string; name: string; photo: string | null };

const KEY = "ft-profiles-v1";
const ACTIVE_KEY = "ft-active-profile-v1";
export const MAX_PROFILES = 3;

const DEFAULT: Profile = { id: "default", name: "You", photo: null };

function read(): Profile[] {
  if (typeof window === "undefined") return [DEFAULT];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [DEFAULT];
    const arr = JSON.parse(raw) as Profile[];
    return Array.isArray(arr) && arr.length ? arr : [DEFAULT];
  } catch {
    return [DEFAULT];
  }
}
function readActive(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_KEY) || "default";
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>(() => read());
  const [activeId, setActiveId] = useState<string>(() => readActive());

  useEffect(() => {
    const sync = () => {
      setProfiles(read());
      setActiveId(readActive());
    };
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const persist = useCallback((next: Profile[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setProfiles(next);
    emit();
  }, []);

  const addProfile = useCallback((name: string, photo: string | null) => {
    const cur = read();
    if (cur.length >= MAX_PROFILES) return null;
    const p: Profile = { id: crypto.randomUUID(), name: name.trim() || "New profile", photo };
    persist([...cur, p]);
    return p;
  }, [persist]);

  const updateProfile = useCallback((id: string, patch: Partial<Omit<Profile, "id">>) => {
    persist(read().map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, [persist]);

  const removeProfile = useCallback((id: string) => {
    const cur = read().filter((p) => p.id !== id);
    const next = cur.length ? cur : [DEFAULT];
    persist(next);
    if (readActive() === id) {
      localStorage.setItem(ACTIVE_KEY, next[0].id);
      setActiveId(next[0].id);
      emit();
    }
  }, [persist]);

  const switchProfile = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
    emit();
  }, []);

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  return { profiles, active, activeId: active?.id, addProfile, updateProfile, removeProfile, switchProfile };
}
