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
  ign?: string;
  team: string;
  logo?: string;
  photo?: string;
  role: string;
  price: number;
  theme: { light: string; dark: string };
};
