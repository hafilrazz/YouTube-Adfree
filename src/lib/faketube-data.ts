export type Video = {
  id: string; // YouTube video ID
  title: string;
  channel: string;
  channelAvatar: string;
  views: string;
  posted: string;
  duration: string;
  thumbnail: string;
  description: string;
};

const avatar = (seed: string) => `https://i.pravatar.cc/80?u=${encodeURIComponent(seed)}`;
const yt = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const CATEGORIES = [
  "All", "Music", "Gaming", "News", "Live", "Coding", "Comedy",
  "Sports", "Podcasts", "Cooking", "Movies", "Travel", "Science", "Fashion",
];

// Real YouTube video IDs (public, widely known videos)
const RAW: Array<[string, string, string, string, string, string]> = [
  // [ytId, title, channel, views, posted, duration]
  ["dQw4w9WgXcQ", "Rick Astley - Never Gonna Give You Up (Official Video)", "Rick Astley", "1.6B", "16 years ago", "3:33"],
  ["9bZkp7q19f0", "PSY - GANGNAM STYLE (강남스타일) M/V", "officialpsy", "5.1B", "13 years ago", "4:13"],
  ["kJQP7kiw5Fk", "Luis Fonsi - Despacito ft. Daddy Yankee", "Luis Fonsi", "8.7B", "9 years ago", "4:42"],
  ["JGwWNGJdvx8", "Ed Sheeran - Shape of You (Official Music Video)", "Ed Sheeran", "6.4B", "9 years ago", "4:24"],
  ["RgKAFK5djSk", "Wiz Khalifa - See You Again ft. Charlie Puth", "Wiz Khalifa", "6.3B", "11 years ago", "3:58"],
  ["OPf0YbXqDm0", "Mark Ronson - Uptown Funk ft. Bruno Mars", "Mark Ronson", "5.7B", "11 years ago", "4:31"],
  ["fLexgOxsZu0", "The Beatles - Hey Jude", "The Beatles", "410M", "10 years ago", "7:11"],
  ["hT_nvWreIhg", "OneRepublic - Counting Stars", "OneRepublic", "4.2B", "13 years ago", "4:44"],
  ["YQHsXMglC9A", "Adele - Hello", "Adele", "3.5B", "10 years ago", "6:07"],
  ["CevxZvSJLk8", "Katy Perry - Roar (Official)", "Katy Perry", "4.1B", "12 years ago", "4:29"],
  ["09R8_2nJtjg", "Maroon 5 - Sugar (Official Music Video)", "Maroon 5", "4.0B", "10 years ago", "5:02"],
  ["ktvTqknDobU", "Imagine Dragons - Radioactive", "Imagine Dragons", "2.4B", "13 years ago", "3:07"],
  ["fJ9rUzIMcZQ", "Queen - Bohemian Rhapsody (Official Video)", "Queen Official", "2.1B", "17 years ago", "5:59"],
  ["60ItHLz5WEA", "Alan Walker - Faded", "Alan Walker", "4.0B", "10 years ago", "3:32"],
  ["nfWlot6h_JM", "Taylor Swift - Shake It Off", "Taylor Swift", "3.7B", "11 years ago", "4:03"],
  ["pRpeEdMmmQ0", "Shakira - Waka Waka (This Time for Africa)", "shakiraVEVO", "4.2B", "15 years ago", "3:31"],
  ["JZjAg6fK-BQ", "Coldplay - Something Just Like This (Lyric)", "Coldplay", "2.7B", "8 years ago", "4:07"],
  ["djV11Xbc914", "a-ha - Take On Me (Official 4K Music Video)", "a-ha", "2.0B", "15 years ago", "3:50"],
  ["y6120QOlsfU", "Darude - Sandstorm", "Darude", "410M", "13 years ago", "3:44"],
  ["L_jWHffIx5E", "Smash Mouth - All Star (Official Music Video)", "SmashMouthVEVO", "800M", "15 years ago", "3:22"],
];

export const VIDEOS: Video[] = RAW.map(([id, title, channel, views, posted, duration]) => ({
  id,
  title,
  channel,
  channelAvatar: avatar(channel),
  views,
  posted,
  duration,
  thumbnail: yt(id),
  description:
    "Official upload embedded on FakeTube via YouTube. FakeTube does not host this video — all rights belong to the original creator.",
}));

export const getVideo = (id: string) => VIDEOS.find((v) => v.id === id);

export const relatedVideos = (id: string) => {
  const current = getVideo(id);
  const others = VIDEOS.filter((v) => v.id !== id);
  if (!current) return others.slice(0, 12);
  const sameChannel = others.filter((v) => v.channel === current.channel);
  const rest = others.filter((v) => v.channel !== current.channel);
  // deterministic pseudo-shuffle so SSR + client match
  const seeded = [...rest].sort((a, b) => (a.id + id).localeCompare(b.id + id));
  return [...sameChannel, ...seeded].slice(0, 12);
};

export const searchVideos = (query: string, limit = 8): Video[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return VIDEOS.filter(
    (v) =>
      v.title.toLowerCase().includes(q) ||
      v.channel.toLowerCase().includes(q),
  ).slice(0, limit);
};
