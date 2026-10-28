import type { StoryRecord } from "@/data/types";

export const categories: StoryRecord["category"][] = ["Announcement", "Season recap", "Feature", "Update"];

/** Copy for the News pages. Stories live in `src/data/news.ts`. */
export const newsPage = {
  label: "News",
  title: { before: "From the", accent: "league." },
  lede: "Announcements, season recaps and features from MGL. Results go up on the Events page; the stories behind them go here.",
  filter: { label: "Filter stories", all: "All" },
  latest: "Latest",
  read: "Read the story",
  minutes: (n: number) => `${n} min read`,
  empty: { title: "Nothing here yet", body: "No stories in this category so far. The Discord hears first when there are." },
  story: { back: "All news", share: "Share", copy: "Copy link", copied: "Link copied", more: { before: "Keep", accent: "reading." }, discord: "Talk about it on Discord" },
};
