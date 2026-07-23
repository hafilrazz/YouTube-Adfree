import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, Search, Mic, Video, Bell, User, Home, Flame, Music2, Gamepad2, Newspaper, Trophy, Lightbulb, Clapperboard, History, ThumbsUp, Clock, ListVideo, Crown, Check } from "lucide-react";
import { CATEGORIES } from "@/lib/faketube-data";
import { usePremium } from "@/lib/use-premium";


export function FakeTubeLayout({ children, activeCategory, onCategoryChange }: {
  children: ReactNode;
  activeCategory?: string;
  onCategoryChange?: (c: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex pt-14">
        <Sidebar open={sidebarOpen} />
        <main className={`flex-1 ${sidebarOpen ? "md:ml-60" : "md:ml-20"} transition-all`}>
          {onCategoryChange && (
            <CategoryBar active={activeCategory ?? "All"} onChange={onCategoryChange} />
          )}
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { premium } = usePremium();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 h-14 flex items-center justify-between px-4">

      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-neutral-100">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex items-center gap-1">
          <div className="flex items-center justify-center h-6 w-9 rounded-md bg-red-600">
            <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-1" />
          </div>
          <span className="text-xl font-bold tracking-tight">FakeTube</span>
          <span className="ml-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Premium</span>
        </Link>

      </div>
      <div className="flex-1 max-w-2xl mx-4 hidden sm:flex items-center">
        <div className="flex flex-1">
          <input
            className="flex-1 border border-neutral-300 rounded-l-full px-4 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="Search"
          />
          <button className="px-5 border border-l-0 border-neutral-300 rounded-r-full bg-neutral-50 hover:bg-neutral-100">
            <Search className="h-4 w-4" />
          </button>
        </div>
        <button className="ml-2 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200">
          <Mic className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-full hover:bg-neutral-100"><Video className="h-5 w-5" /></button>
        <button className="p-2 rounded-full hover:bg-neutral-100"><Bell className="h-5 w-5" /></button>
        <button className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function Sidebar({ open }: { open: boolean }) {
  const items = [
    { icon: Home, label: "Home" },
    { icon: Flame, label: "Trending" },
    { icon: ListVideo, label: "Subscriptions" },
    { icon: History, label: "History" },
    { icon: Clock, label: "Watch later" },
    { icon: ThumbsUp, label: "Liked videos" },
    { icon: Music2, label: "Music" },
    { icon: Gamepad2, label: "Gaming" },
    { icon: Newspaper, label: "News" },
    { icon: Trophy, label: "Sports" },
    { icon: Lightbulb, label: "Learning" },
    { icon: Clapperboard, label: "Movies" },
  ];
  return (
    <aside className={`fixed left-0 top-14 bottom-0 z-40 bg-white ${open ? "w-60" : "w-20"} hidden md:block overflow-y-auto`}>
      <nav className="py-2">
        {items.map(({ icon: Icon, label }) => (
          <Link
            key={label}
            to="/"
            className={`flex ${open ? "flex-row items-center gap-6 px-6 py-2" : "flex-col items-center gap-1 py-4"} hover:bg-neutral-100 mx-2 rounded-lg`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={open ? "text-sm" : "text-[10px]"}>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function CategoryBar({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return (
    <div className="sticky top-14 z-30 bg-white border-b border-neutral-200 px-4 py-3 flex gap-3 overflow-x-auto">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
            active === c ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
