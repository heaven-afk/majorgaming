import type { StaffGroup } from "@/lib/staff";

/** Copy for the Staff page. People live in `src/data/staff.ts`. */
export const staffPage = {
  label: "Staff",
  title: { before: "The people behind", accent: "the league." },
  lede: "MGL is run by a small team across the AF region: the people who set the rules, run match days, check every result, cast the games and keep the Discord moving.",
  /** The rest of leadership, as a list under the featured profiles. */
  lead: {
    label: "Leadership",
    title: { before: "Around", accent: "the table." },
  },
  founder: {
    facts: { since: "Started MGL", seasons: "Seasons run", home: "Home" },
  },
  crew: {
    label: "The crew",
    title: { before: "Match day,", accent: "every day." },
  },
  /** What each group looks after, under its name. */
  groups: {
    Leadership: "Direction, rules and partners",
    Operations: "Match days, results and registration",
    Media: "Broadcasts, casting and design",
    Community: "The Discord and every squad in it",
  } satisfies Record<StaffGroup, string>,
  count: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
  /** The portrait lineup at the top of the page. */
  lineup: "The team",
  open: (name: string) => `Read about ${name}`,
  social: { x: "X", instagram: "Instagram", discord: "Discord" },
  on: (name: string, network: string) => `${name} on ${network}`,
  empty: "The staff list is on its way.",
};
