/**
 * News stories, hand-entered until the admin exists. SAMPLE stories: they only repeat what the
 * rest of the site already says (five tiers of 25, Discord registration, placement and kill
 * points, the sample Season 10 results). The newest story leads the News page.
 */

import type { StoryRecord } from "./types";

const staff = { name: "MGL Staff", role: "Competitions" };
const wide = { width: 1600, height: 900 };
const crop = { width: 1086, height: 679 };

export const stories: StoryRecord[] = [
  {
    slug: "season-11-registration-is-open",
    title: "Season 11 registration is open",
    category: "Announcement",
    date: "2026-10-26",
    author: staff,
    excerpt: "The registration threads for Season 11 are live on the MGL Discord. Here is what managers need ready before they post.",
    cover: { src: "/images/news/season-11-registration.webp", ...wide, alt: "A player parachutes towards a sunlit island chain, with teammates far below." },
    body: [
      { p: "Registration for Season 11 is open. Every squad registers through its tier’s registration thread on the MGL Discord, and staff review each post before the thread is locked." },
      { p: "MGL runs 5 tiers of 25 squads. Squads are placed in their designated tier, so every match is played against teams at your level." },
      { h: "Before you post" },
      { list: ["Team name, clan name and team tag", "A team manager and a team captain", "All four players, each with their professional name, in-game name, UID, Discord, country and device"] },
      { p: "Post once, in the format pinned in the thread. Edits after a thread is locked go through staff." },
      { quote: "Post early, post complete. A clean registration is the first thing a good season needs.", by: "MGL Competitions" },
    ],
  },
  {
    slug: "season-10-final-kyzon-esport",
    title: "Kyzon Esport close out Season 10 on top",
    category: "Season recap",
    date: "2026-10-20",
    author: staff,
    excerpt: "Kyzon Esport finish Season 10 first in Tier 1 with 598 points, ahead of Vortex One and Goat Esport.",
    cover: { src: "/images/news/season-10-recap.webp", ...wide, alt: "Two teammates on a ridge look out over the island inside the final circle." },
    body: [
      { p: "Season 10 is in the books. Kyzon Esport finish first in Tier 1 with 598 points: 286 from placements and 312 from kills." },
      { p: "The final Tier 1 and Tier 2 tables are on the Events page, alongside the other events on record." },
      { h: "How the points add up" },
      { p: "Each match earns placement points for where a squad finishes and kill points for every elimination. The season total decides the standings, so consistency counts as much as the big games." },
      { quote: "Every match moves the rankings. That is the whole point of a season.", by: "MGL Competitions" },
    ],
  },
  {
    slug: "season-10-honours",
    title: "Season 10’s finest: the top three players",
    category: "Feature",
    date: "2026-10-22",
    author: staff,
    excerpt: "Sable, Havoc and Juno led the season’s player honours. A look at how they carried their squads.",
    cover: { src: "/images/news/season-10-honours.webp", ...crop, alt: "A four-player squad stands together in front of a transport plane at sunset." },
    body: [
      { p: "Season 10’s player honours go to Sable of Kyzon Esport, Havoc of Vortex One and Juno of Goat Esport, the three highest-rated players of the season." },
      { p: "Sable takes Season MVP. Havoc finishes as runner-up and Juno third. Their cards, with kills, average damage and MVPs, are on the Home page." },
      { h: "Three roles, one standard" },
      { p: "A fragger, an in-game leader and an anchor: three different jobs, each done at the top of the league." },
    ],
  },
  {
    slug: "how-the-five-tiers-work",
    title: "Five tiers, one ladder: how MGL is organised",
    category: "Feature",
    date: "2026-10-14",
    author: staff,
    excerpt: "Why MGL runs five tiers of 25 squads, and what that means for the matches your squad plays.",
    cover: { src: "/images/news/five-tiers.webp", ...wide, alt: "A squad of three looks out over a chain of islands at sunrise." },
    body: [
      { p: "MGL runs five tiers, each a full lobby of 25 squads. Every registered squad is placed in its designated tier, so matches are played against teams at the same level." },
      { p: "Each tier keeps its own standings. Placement points and kill points from every match add up across the season." },
      { h: "Where to follow it" },
      { list: ["Live standings on the Events page while a season runs", "Results announced in the Discord after every match day", "Past events’ final tables in the Events archive"] },
    ],
  },
  {
    slug: "mgl-fantasy-is-coming",
    title: "MGL Fantasy is on the way",
    category: "Update",
    date: "2026-10-08",
    author: staff,
    excerpt: "Pick four ranked players and a sub, choose a captain, and score from their real matches. Here is the idea.",
    cover: { src: "/images/news/fantasy-coming.webp", ...wide, alt: "Three operators in light gear stand on a terrace above a coastal city." },
    body: [
      { p: "MGL Fantasy is a fantasy game for fans and managers, built on real MGL results." },
      { list: ["Pick four ranked players and a sub inside a 100-credit budget", "Name a captain, who scores double", "Score from your players’ real performances every matchday"] },
      { p: "It is coming soon. The Discord will hear first when it opens." },
    ],
  },
  {
    slug: "registration-format-guide",
    title: "A manager’s guide to the registration format",
    category: "Update",
    date: "2026-09-30",
    author: staff,
    excerpt: "Team details first, then one line per player. The format every registration thread uses, explained.",
    cover: { src: "/images/news/registration-guide.webp", ...crop, alt: "Four squadmates in full kit look out at an island at sunset." },
    body: [
      { p: "Every registration thread uses the same format, so staff can check each squad quickly and fairly." },
      { h: "Team details" },
      { list: ["Team Name", "Clan Name", "Team Manager", "Team Captain", "Team Tag"] },
      { h: "Players" },
      { p: "Then P1 to P4, one line each: professional name, in-game name, UID, Discord, country and device." },
      { p: "Once staff confirm the post, the bot replies and the thread locks." },
    ],
  },
];
