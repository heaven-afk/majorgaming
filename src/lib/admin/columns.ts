/**
 * Makes sense of a sheet whatever its layout: finds the header row, works out which column is
 * which from the header words, and reads numbers loosely. Used in the browser for the upload
 * preview, so the admin can correct any guess before saving.
 */

export type Sheet = { name: string; rows: string[][] };

export type Role = "team" | "tag" | "tier" | "placement" | "killpts" | "kills" | "bonus" | "total" | "wins" | "matches" | "move" | "player" | "ign" | "group";

export const ROLE_LABELS: Record<Role, string> = {
  team: "Team",
  tag: "Team tag",
  tier: "Tier",
  placement: "Placement pts",
  killpts: "Kill pts",
  kills: "Kills",
  bonus: "Bonus / penalty",
  total: "Total pts",
  wins: "Wins",
  matches: "Matches",
  move: "Movement",
  player: "Player",
  ign: "In-game name",
  group: "Group",
};

/** Averages and rates ("Avg Pts / Match", "Kills / Event", "Win Rate", "(KPM)") are never a column we want. */
const DERIVED = /avg|average|\bper\b|\/|rate|ratio|ppm|kpm|%|damage|accuracy/;

/** Header words for each column, most specific first. Checked against the lower-cased header. */
const PATTERNS: [Role, RegExp][] = [
  ["tag", /\btag\b/],
  ["ign", /\bign\b|in\W*game|gamer ?tag|\buid\b|codm name/],
  ["killpts", /kill.*(pt|point|score)|frag.*(pt|point)|elim.*(pt|point)|^kp$/],
  ["placement", /place|placing|position|rank.*(pt|point)|^pp$|^pos/],
  ["bonus", /bonus|adjust|penalt|deduct|extra/],
  ["kills", /kill|frag|finish|elim/],
  ["matches", /match|games?|played|^mp$|^gp$/],
  ["total", /total|overall|^points?$|^pts$|grand/],
  ["wins", /\bwins?\b|wwcd|booyah|chicken|^w$/],
  ["move", /move|change|\+\/-|trend/],
  ["tier", /\btier\b|division|\bdiv\b/],
  ["group", /group|gender|category|\bsex\b/],
  ["team", /team|squad|\borg\b/],
  ["player", /player|professional|pro.?name|^name$|nick|handle/],
];

export function roleOf(header: string): Role | undefined {
  const h = header.toLowerCase().replace(/\s+/g, " ").trim();
  if (!h || DERIVED.test(h)) return undefined;
  for (const [role, re] of PATTERNS) if (re.test(h)) return role;
  return undefined;
}

/**
 * The header row: of the first 20 rows, the one whose cells name the most known columns
 * (at least two). `undefined` when the sheet has no header, e.g. pasted rows of numbers.
 */
export function findHeader(rows: string[][]) {
  let best: { index: number; score: number } | undefined;
  rows.slice(0, 20).forEach((row, index) => {
    const roles = new Set(row.map(roleOf).filter(Boolean));
    if (roles.size >= 2 && (!best || roles.size > best.score)) best = { index, score: roles.size };
  });
  return best?.index;
}

/** Column number for each role, from the header; the first column with each role wins. */
export function guessColumns(header: string[] | undefined, wanted: Role[], fallback: Role[]): Partial<Record<Role, number>> {
  const map: Partial<Record<Role, number>> = {};
  if (header) {
    header.forEach((h, i) => {
      let role = roleOf(h);
      if (role === "kills" && /pt|point/.test(h.toLowerCase())) role = "killpts";
      if (role && wanted.includes(role) && map[role] === undefined) map[role] = i;
    });
    return map;
  }
  fallback.forEach((role, i) => (map[role] = i));
  return map;
}

/** "1,024", " 12 ", "—" and "" all read sensibly. `undefined` when there's no number at all. */
export function num(v: string | undefined) {
  if (v === undefined) return undefined;
  const s = v.replace(/[,\s]/g, "").replace(/[–—]/g, "-");
  if (!s || s === "-") return undefined;
  const n = Number(s.replace(/^\+/, ""));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** The tier a sheet's name points at ("TIER 2", "T3", "Tier1 Collation"), if any. */
export function tierOfName(name: string) {
  const m = name.match(/(?:tier|\bt|div(?:ision)?)\s*-?\s*(\d+)/i) ?? name.match(/^\s*(\d+)\s*$/);
  return m ? Number(m[1]) : undefined;
}

/** Names compare equal however they're spaced, punctuated or capitalised. */
export function key(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

/** Close spellings ("Ravengers" / "Revengers"): edit distance, for suggestions only. */
export function distance(a: string, b: string) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export type Candidate = { id: string; keys: string[] };

/**
 * The record a name from a sheet belongs to: an exact match on any of its keys (name, tag,
 * old names), else the single close spelling, else nothing. `close` says it was a guess.
 */
export function match(name: string, candidates: Candidate[]): { id: string; close?: boolean } | undefined {
  const k = key(name);
  if (!k) return undefined;
  const exact = candidates.filter((c) => c.keys.includes(k));
  if (exact.length === 1) return { id: exact[0].id };
  if (exact.length > 1) return undefined;
  // Prefix or a small typo, only when it's unambiguous.
  const limit = k.length <= 5 ? 1 : 2;
  const close = candidates.filter((c) => c.keys.some((ck) => ck.length > 2 && (distance(ck, k) <= limit || (k.length >= 5 && (ck.startsWith(k) || k.startsWith(ck))))));
  return close.length === 1 ? { id: close[0].id, close: true } : undefined;
}
