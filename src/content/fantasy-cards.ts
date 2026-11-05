/** Presentation only. Prices and scoring remain owned by Fantasy Core. */
export const fantasyCards = {
  silhouette: "/images/fantasy/player-silhouette.webp",
  labels: {
    currentId: "IGN",
    missingId: "Not provided",
    captain: "Captain",
    makeCaptain: "Set captain",
    points: "pts",
    credits: "cr",
    select: "Select player",
    bringIn: "Bring in",
    chooseReplacement: "Select outgoing player first",
    sample: "Sample squad · Players, prices and points are illustrative",
  },
  /** Example team themes; replace with each team's confirmed branding. */
  themes: {
    gold: { light: "#a99768", dark: "#53482f" },
    blue: { light: "#607da1", dark: "#293e5d" },
    plum: { light: "#946b8b", dark: "#50374e" },
    stone: { light: "#99968b", dark: "#4e4d47" },
  },
};

export type FantasyCardPlayer = {
  name: string;
  ign?: string | null;
  team: string;
  logo?: string;
  photo?: string;
  role?: string;
  price?: number;
  theme?: { light: string; dark: string };
};

/** Stable presentation fallback until teams have their own configured brand palette. */
export function fantasyTeamTheme(team: string) {
  const key = team.trim().toLowerCase();
  if (key.startsWith("kyzon")) return fantasyCards.themes.gold;
  if (key === "vortex one") return fantasyCards.themes.blue;
  if (key === "goat esport") return fantasyCards.themes.plum;
  if (key === "developers") return fantasyCards.themes.stone;
  const themes = Object.values(fantasyCards.themes);
  const hash = [...key].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return themes[hash % themes.length];
}
