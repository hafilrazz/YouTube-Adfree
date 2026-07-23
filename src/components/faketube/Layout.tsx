import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, Search, Mic, Video, Bell, Home, Flame, Music2, Gamepad2, Newspaper, Trophy, Lightbulb, Clapperboard, History, ThumbsUp, Clock, ListVideo, Loader2, CheckCircle2, Film, Radio, X } from "lucide-react";
import { CATEGORIES, type Video as VideoT } from "@/lib/faketube-data";
import { searchYouTube } from "@/lib/youtube.functions";
import { ProfileMenu } from "@/components/faketube/ProfileMenu";
import { useSearchHistory } from "@/lib/user-data";


export function FakeTubeLayout({ children, activeCategory, onCategoryChange }: {
  children: ReactNode;
  activeCategory?: string;
  onCategoryChange?: (c: string) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
  };
  return (
    <div className="min-h-screen bg-white text-neutral-900 overflow-x-hidden">
      <Header onToggleSidebar={toggle} />
      <div className="flex pt-14">
        <Sidebar open={sidebarOpen} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <main className={`flex-1 min-w-0 ${sidebarOpen ? "md:ml-60" : "md:ml-20"} transition-all`}>
          {onCategoryChange && (
            <CategoryBar active={activeCategory ?? "All"} onChange={onCategoryChange} />
          )}
          <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 md:p-6 pb-28">{children}</div>
        </main>
      </div>
    </div>
  );
}



function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 h-14 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-1.5 gap-1 sm:flex sm:justify-between sm:px-4 sm:gap-2">
      <div className="flex min-w-0 items-center gap-1 sm:gap-4 shrink-0">
        <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-neutral-100" aria-label="Toggle sidebar">
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="flex min-w-0 items-center gap-1" aria-label="Premium home">
          <svg viewBox="0 0 90 20" className="h-5 sm:h-6 w-auto" aria-hidden="true">
            <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" fill="#FF0000"/>
            <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
            <text x="32" y="15.5" fontFamily="'Roboto','Arial',sans-serif" fontSize="15" fontWeight="700" letterSpacing="-0.9" fill="currentColor">Premium</text>
          </svg>
          <sup className="hidden sm:inline text-[10px] font-medium text-neutral-500 -ml-0.5">IN</sup>
        </Link>

      </div>
      <SearchBox />
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button className="p-2 rounded-full hover:bg-neutral-100 hidden sm:inline-flex"><Video className="h-5 w-5" /></button>
        <button className="p-2 rounded-full hover:bg-neutral-100 hidden sm:inline-flex"><Bell className="h-5 w-5" /></button>
        <ProfileMenu />
      </div>
    </header>
  );
}


function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function SearchBox() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(q, 300);
  const searchFn = useServerFn(searchYouTube);

  const { data, isFetching } = useQuery<{ items: VideoT[]; nextPageToken?: string }>({
    queryKey: ["yt-search", debounced],
    queryFn: () => searchFn({ data: { q: debounced, limit: 8 } }),
    enabled: debounced.trim().length > 0,
    staleTime: 60_000,
  });
  const results = data?.items ?? [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setActive(0), [debounced]);

  const go = (id: string) => {
    setOpen(false);
    setQ("");
    navigate({ to: "/watch/$id", params: { id } });
  };
  const submitSearch = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate({ to: "/search", search: { q: term } });
  };

  return (
    <div ref={wrapRef} className="min-w-0 w-full flex-1 max-w-2xl mx-1 sm:mx-4 flex items-center relative">


      <div className="flex min-w-0 flex-1">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (open && results.length > 0 && active > 0) go(results[active].id);
              else submitSearch();
              return;
            }
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="flex-1 min-w-0 border border-neutral-300 rounded-l-full px-2.5 sm:px-4 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="Search"
        />
        <button
          onClick={submitSearch}
          className="shrink-0 px-3 sm:px-5 border border-l-0 border-neutral-300 rounded-r-full bg-neutral-50 hover:bg-neutral-100"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      <button className="ml-2 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 hidden sm:inline-flex" aria-label="Voice search">
        <Mic className="h-4 w-4" />
      </button>


      {open && q.trim() && (
        <div className="absolute top-full left-0 right-0 sm:right-14 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto">

          {isFetching && results.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching YouTube…
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">No videos match “{q}”.</div>
          ) : (
            results.map((v, i) => (
              <button
                key={v.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(v.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left ${
                  i === active ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
              >
                <img src={v.thumbnail} alt="" className="h-12 w-20 object-cover rounded-md shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-1">{v.title}</p>
                  <p className="text-xs text-neutral-600 line-clamp-1">
                    {v.channel} · {v.views} views
                  </p>
                </div>
                <Search className="h-4 w-4 text-neutral-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar({ open, mobileOpen, onCloseMobile }: { open: boolean; mobileOpen: boolean; onCloseMobile: () => void }) {
  const items = [
    { icon: Home, label: "Home", to: "/" as const },
    { icon: Film, label: "Reels", to: "/reels" as const },
    { icon: Radio, label: "Live", to: "/live" as const },
    { icon: Flame, label: "Trending", to: "/trending" as const },


    { icon: ListVideo, label: "Playlist", to: "/playlist" as const },
    { icon: History, label: "History", to: "/history" as const },
    { icon: CheckCircle2, label: "Completed", to: "/completed" as const },

    { icon: Clock, label: "Watch later", to: "/playlist" as const },
    { icon: ThumbsUp, label: "Liked videos", to: "/liked" as const },
    { icon: Music2, label: "Music", to: "/music" as const },
    { icon: Gamepad2, label: "Gaming", to: "/" as const },
    { icon: Newspaper, label: "News", to: "/" as const },
    { icon: Trophy, label: "Sports", to: "/" as const },
    { icon: Lightbulb, label: "Learning", to: "/" as const },
    { icon: Clapperboard, label: "Movies", to: "/" as const },
  ];
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 top-14 z-40 bg-black/40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={`fixed left-0 top-14 bottom-0 z-50 bg-white overflow-y-auto transition-transform
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          w-60 ${open ? "md:w-60" : "md:w-20"}`}
      >
        <nav className="py-2">
          {items.map(({ icon: Icon, label, to }) => {
            const desktopLayout = open
              ? "md:flex-row md:items-center md:gap-6 md:px-6 md:py-2"
              : "md:flex-col md:items-center md:gap-1 md:py-4 md:px-0";
            const desktopText = open ? "md:text-sm" : "md:text-[10px]";
            return (
              <Link
                key={label}
                to={to}
                onClick={onCloseMobile}
                className={`flex flex-row items-center gap-6 px-6 py-2 ${desktopLayout} hover:bg-neutral-100 mx-2 rounded-lg`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`text-sm ${desktopText}`}>{label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
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
