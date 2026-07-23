export type Track = {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover: string;
  duration?: number;
};

// Curated royalty-free tracks (SoundHelix samples — CORS-enabled, direct MP3)
const raw: Array<Omit<Track, "cover">> = [
  { id: "sh1", title: "Neon Skyline", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "sh2", title: "Midnight Drive", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "sh3", title: "Sunset Boulevard", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "sh4", title: "Electric Dream", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "sh5", title: "Ocean Pulse", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "sh6", title: "Silver Rain", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  { id: "sh7", title: "Golden Hour", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
  { id: "sh8", title: "Deep Horizon", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { id: "sh9", title: "Velvet Night", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
  { id: "sh10", title: "Crystal Waves", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
  { id: "sh11", title: "Lunar Echoes", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
  { id: "sh12", title: "Retrograde", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
  { id: "sh13", title: "Solar Flare", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
  { id: "sh14", title: "Nebula", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
  { id: "sh15", title: "Aurora", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" },
  { id: "sh16", title: "Zero Gravity", artist: "SoundHelix", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
];

export const TRACKS: Track[] = raw.map((t, i) => ({
  ...t,
  cover: `https://picsum.photos/seed/music-${i}/400/400`,
}));

export function getTrack(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}
