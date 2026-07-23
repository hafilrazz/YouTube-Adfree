import { useEffect, useState } from "react";

const KEY = "faketube-premium";

export function usePremium() {
  const [premium, setPremium] = useState(false);
  useEffect(() => {
    setPremium(localStorage.getItem(KEY) === "1");
    const onChange = () => setPremium(localStorage.getItem(KEY) === "1");
    window.addEventListener("storage", onChange);
    window.addEventListener("faketube-premium-change", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("faketube-premium-change", onChange);
    };
  }, []);
  const set = (v: boolean) => {
    localStorage.setItem(KEY, v ? "1" : "0");
    window.dispatchEvent(new Event("faketube-premium-change"));
    setPremium(v);
  };
  return { premium, unlock: () => set(true), cancel: () => set(false) };
}
