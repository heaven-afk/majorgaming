/**
 * Copy for the Teams pages. Teams, people and registrations live in `src/data/teams.ts` and are
 * read through `src/lib/league.ts`. The Teams page is a directory of the squads registered for
 * the newest event, not a ranking: results stay on the Events page.
 */

export const teamsPage = {
  label: "Teams",
  title: { before: "Meet the", accent: "squads." },
  lede: (event: string) => `The squads registered for ${event}, tier by tier. Open one for its lineup, its manager and the events it has played.`,
  facts: { squads: "Registered squads", tiers: "Tiers", players: "Players", countries: "Countries", events: "Events on record" },
  tools: {
    search: "Search squads or tags",
    clear: "Clear search",
    tiers: "Filter by tier",
    all: "All",
  },
  tier: (tier?: number) => (tier ? `Tier ${tier}` : "Open"),
  count: (n: number) => `${n} ${n === 1 ? "squad" : "squads"}`,
  players: (n: number) => `${n} players`,
  empty: {
    title: "No squads found",
    body: (q: string) => `Nothing matches “${q}”. Check the spelling, or try a team tag.`,
  },
  team: {
    back: "All teams",
    facts: { tier: "Tier", players: "Players", events: "Events played", since: "First event on record" },
    roster: {
      label: "Roster",
      title: { before: "The", accent: "roster." },
      players: (n: number) => `${n} ${n === 1 ? "player" : "players"}`,
      captain: "Captain",
      /** The in-game name, under the professional name when they differ. */
      ign: (ign: string) => `IGN ${ign}`,
      for: (event: string) => `Registered for ${event}`,
    },
    staff: { manager: "Manager", captain: "Captain", clan: "Clan", tag: "Team tag" },
    history: {
      label: "Events",
      title: { before: "Where they’ve", accent: "played." },
      open: "Open the event",
    },
    more: (tier?: number) => (tier ? `More from Tier ${tier}` : "More squads"),
  },
};
