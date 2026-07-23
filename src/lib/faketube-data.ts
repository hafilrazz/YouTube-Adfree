export type Video = {
  id: string;
  title: string;
  channel: string;
  channelAvatar: string;
  views: string;
  posted: string;
  duration: string;
  thumbnail: string;
  description: string;
};

const thumb = (seed: string, w = 480, h = 270) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;
const avatar = (seed: string) => `https://i.pravatar.cc/80?u=${seed}`;

export const CATEGORIES = [
  "All", "Music", "Gaming", "News", "Live", "Coding", "Comedy",
  "Sports", "Podcasts", "Cooking", "Movies", "Travel", "Science", "Fashion",
];

export const VIDEOS: Video[] = [
  ["Building a YouTube clone in 10 minutes", "CodeWithFake", "1.2M", "2 days ago", "10:24"],
  ["Lo-fi beats to code / relax to", "FakeBeats", "8.4M", "3 months ago", "1:32:10"],
  ["I built the WORLD's largest Lego set", "FakeMaker", "3.9M", "1 week ago", "18:02"],
  ["React 19 changed EVERYTHING", "DevDaily", "540K", "5 days ago", "12:45"],
  ["Speedrunning Minecraft in 8 minutes", "GameGoblin", "2.1M", "4 days ago", "8:14"],
  ["Cooking pasta like an Italian grandma", "FakeKitchen", "980K", "2 weeks ago", "14:20"],
  ["Why the universe might be a simulation", "SpaceNerd", "1.7M", "1 month ago", "22:18"],
  ["Tour of my $10 apartment in Tokyo", "TravelFake", "3.3M", "6 days ago", "16:45"],
  ["Every CSS trick you should know in 2026", "FrontendFuel", "410K", "1 day ago", "19:30"],
  ["I tried EVERY fast food burger", "BurgerBoy", "6.1M", "3 weeks ago", "24:11"],
  ["The FUNNIEST fails of the year", "LOLCentral", "12M", "2 months ago", "11:55"],
  ["Live: Rocket launch from Cape Canaveral", "SpaceLive", "89K watching", "Live now", "LIVE"],
  ["Guitar solo that broke the internet", "FakeMusic", "4.2M", "5 months ago", "4:32"],
  ["Building a PC for $500 in 2026", "TechTuber", "780K", "1 week ago", "17:10"],
  ["Explaining quantum physics with LEGO", "SmartyPants", "2.5M", "2 months ago", "13:47"],
  ["I lived in the arctic for 30 days", "WildFake", "5.6M", "3 weeks ago", "28:03"],
  ["Top 10 movies you MUST watch", "CinemaFake", "1.1M", "4 days ago", "15:22"],
  ["Street fashion in Seoul 2026", "StyleFake", "620K", "1 week ago", "9:48"],
  ["Podcast: The future of AI", "FakeTalks", "310K", "2 days ago", "1:12:34"],
  ["Full football match highlights", "SportsFake", "2.8M", "1 day ago", "10:03"],
].map(([title, channel, views, posted, duration], i) => ({
  id: `v${i + 1}`,
  title: title as string,
  channel: channel as string,
  channelAvatar: avatar(channel as string),
  views: views as string,
  posted: posted as string,
  duration: duration as string,
  thumbnail: thumb(`ft-${i}`),
  description:
    "Welcome to FakeTube! This is a fully fake description for a fully fake video. Like, subscribe, and hit the fake bell icon for more totally-not-real content every day.",
}));

export const getVideo = (id: string) => VIDEOS.find((v) => v.id === id);
export const relatedVideos = (id: string) =>
  VIDEOS.filter((v) => v.id !== id).slice(0, 10);
