import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Check, X, Play, Download, Music, MonitorSmartphone, Sparkles } from "lucide-react";
import { FakeTubeLayout } from "@/components/faketube/Layout";
import { usePremium } from "@/lib/use-premium";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "FakeTube Premium — Unlock everything" },
      { name: "description", content: "Ad-free playback, background play, offline pretending — one fake click away." },
      { property: "og:title", content: "FakeTube Premium" },
      { property: "og:description", content: "Unlock every premium feature of FakeTube. Free, because none of this is real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PremiumPage,
});

const FEATURES = [
  { icon: X, title: "Ad-free videos", desc: "Watch millions of videos with no ads. No banners, no pre-rolls, no interruptions." },
  { icon: Download, title: "Offline downloads", desc: "Save videos to watch when you're offline. Perfect for pretend flights." },
  { icon: Play, title: "Background play", desc: "Keep videos playing while you use other apps or your screen is off." },
  { icon: Music, title: "FakeTube Music Premium", desc: "Ad-free listening, offline songs, and no interruptions between tracks." },
  { icon: MonitorSmartphone, title: "Picture-in-picture", desc: "Watch in a floating window while you scroll through more fake content." },
  { icon: Sparkles, title: "Higher quality", desc: "1080p Premium Enhanced Bitrate for videos that are already fake." },
];

function PremiumPage() {
  const { premium, unlock, cancel } = usePremium();
  return (
    <FakeTubeLayout>
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-black text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold tracking-widest uppercase">
              <Crown className="h-3.5 w-3.5" /> Premium
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
              Unlock everything on <span className="text-amber-400">FakeTube</span>
            </h1>
            <p className="mt-4 text-neutral-300 max-w-xl">
              Enjoy ad-free playback, background play, offline downloads and more.
              It's fake, so it's completely free — just click unlock.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {premium ? (
                <>
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-amber-400 text-neutral-900 font-semibold">
                    <Check className="h-5 w-5" /> Premium is active
                  </div>
                  <button
                    onClick={cancel}
                    className="px-5 py-3 rounded-full border border-white/20 hover:bg-white/10 text-sm"
                  >
                    Cancel plan
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={unlock}
                    className="px-6 py-3 rounded-full bg-amber-400 text-neutral-900 font-semibold hover:bg-amber-300"
                  >
                    Unlock Premium — Free
                  </button>
                  <Link to="/" className="px-5 py-3 rounded-full border border-white/20 hover:bg-white/10 text-sm">
                    Maybe later
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-neutral-200 p-5">
              <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-neutral-600">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-500">
          Not a real subscription. No card required. Nothing is actually unlocked — this is a demo.
        </p>
      </div>
    </FakeTubeLayout>
  );
}
