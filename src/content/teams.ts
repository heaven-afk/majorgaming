/**
 * Copy for the Teams pages. Teams, people and registrations live in `src/data/teams.ts` and are
 * read through `src/lib/league.ts`. The Teams page is a directory of the squads registered for
 * the newest event, not a ranking: results stay on the Events page.
 */

export const teamsPage = {
  label: "Teams",
  title: { before: "Meet the", accent: "squads." },
  lede: (season: string) => `The ranked teams of ${season}, tier by tier. Open one for its roster, its manager and the events it has played.`,
  facts: { squads: "Registered squads", tiers: "Tiers", players: "Players", countries: "Countries", events: "Events on record" },
  tools: {
    search: "Search squads or tags",
    clear: "Clear search",
    tiers: "Filter by tier",
    all: "All",
  },
  tier: (tier?: number) => (tier ? `Tier ${tier}` : "Open"),
  /** The word before a tier's number in the directory's group headings ("Tier 1", the number in the serif accent). */
  tierWord: "Tier",
  count: (n: number) => `${n} ${n === 1 ? "squad" : "squads"}`,
  players: (n: number) => `${n} players`,
  empty: {
    title: "No squads found",
    body: (q: string) => `Nothing matches “${q}”. Check the spelling, or try a team tag.`,
  },
  team: {
    back: "All teams",
    facts: { tier: "Tier", players: "Players", events: "Events played", manager: "Manager", unranked: "Not ranked yet" },
    roster: {
      label: "Roster",
      title: { before: "The", accent: "roster." },
      players: (n: number) => `${n} ${n === 1 ? "player" : "players"}`,
      captain: "Captain",
      /** The in-game name, under the professional name when they differ. */
      ign: (ign: string) => `IGN ${ign}`,
      current: "Current roster",
    },
    history: {
      label: "Events",
      title: { before: "Where they’ve", accent: "played." },
      open: "Open the event",
      /** Special events have tiers of their own, never MGL tiers. */
      special: (tier?: number) => (tier ? `Special event · Tier ${tier}` : "Special event"),
    },
    more: (tier?: number) => (tier ? `More from Tier ${tier}` : "More squads"),
  },
};
