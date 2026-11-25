import { key, match, type Candidate } from "@/lib/admin/columns";
import { indexId, type IndexSnapshot, type IndexTeam } from "./contract";

/** Heaven Index team id to MGL team id. `null`: an admin checked it and it has no MGL team. */
export type TeamMatches = Record<string, string | null>;

/** An MGL team a Heaven Index team can be matched to. `here`: registered for the table being linked. */
export type MglTeam = Candidate & { name: string; here: boolean };
export type CheckedTeam = IndexTeam & { teamId: string | null; how: "saved" | "name" | "close" | "none" };
export type TeamCheck = {
  tournament: { id: string; name: string; status: string };
  teams: CheckedTeam[];
  options: { id: string; name: string; here: boolean }[];
};

/** Every team a tournament has sent: its registered teams, then any that only appear in results. */
export function teamsIn(snapshot: Pick<IndexSnapshot, "registeredTeams" | "tables">): IndexTeam[] {
  const teams = new Map<string, IndexTeam>();
  for (const { id, name } of [...(snapshot.registeredTeams ?? []), ...snapshot.tables.flatMap((table) => table.teams)]) {
    if (!teams.has(id)) teams.set(id, { id, name });
  }
  return [...teams.values()];
}

/**
 * Suggests an MGL team for each Heaven Index team: a confirmed match first, then the exact name
 * (or tag, or an old name), then a close spelling. Teams registered for the table win over the
 * rest of the league, and no MGL team is suggested twice.
 */
export function checkTeams(teams: IndexTeam[], mgl: MglTeam[], saved: TeamMatches = {}): CheckedTeam[] {
  const result: CheckedTeam[] = teams.map((team) => ({ ...team, teamId: null, how: "none" }));
  const known = new Set(mgl.map((team) => team.id));
  const taken = new Set<string>();

  function assign(how: "saved" | "name" | "close", find: (team: IndexTeam) => string | undefined) {
    const found = result.filter((row) => row.teamId === null).map((row) => ({ row, id: find(row) }));
    for (const { row, id } of found) {
      // Two teams pointing at one record is a question for the admin, not a guess.
      if (!id || taken.has(id) || found.filter((other) => other.id === id).length > 1) continue;
      row.teamId = id;
      row.how = how;
    }
    for (const row of result) if (row.teamId) taken.add(row.teamId);
  }
  const free = (pool: MglTeam[]) => pool.filter((team) => !taken.has(team.id));
  const exact = (name: string, pool: MglTeam[]) => {
    const k = key(name);
    const hits = k ? pool.filter((team) => team.keys.includes(k)) : [];
    return hits.length === 1 ? hits[0].id : undefined;
  };

  assign("saved", (team) => {
    const id = Object.hasOwn(saved, team.id) ? saved[team.id] : null;
    return id && known.has(id) ? id : undefined;
  });
  const pools = [mgl.filter((team) => team.here), mgl];
  // A full name beats a tag or an old name that happens to read the same.
  for (const pool of pools) assign("name", (team) => exact(team.name, free(pool).map((t) => ({ ...t, keys: [key(t.name)] }))));
  for (const pool of pools) assign("name", (team) => exact(team.name, free(pool)));
  for (const pool of pools) assign("close", (team) => match(team.name, free(pool))?.id);
  return result;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The matches the browser confirmed, or undefined if they aren't usable. */
export function parseMatches(text: unknown, mglIds: Set<string>): TeamMatches | undefined {
  if (typeof text !== "string" || text.length > 500_000) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const rows = Object.entries(value);
  if (rows.length > 5000) return undefined;
  for (const [id, team] of rows) {
    if (!indexId.test(id)) return undefined;
    if (team !== null && (typeof team !== "string" || !UUID.test(team) || !mglIds.has(team))) return undefined;
  }
  const picked = rows.map(([, team]) => team).filter(Boolean);
  if (new Set(picked).size !== picked.length) return undefined;
  return Object.fromEntries(rows) as TeamMatches;
}

/** Teams in a saved snapshot that no admin has checked yet (or whose MGL team is gone). */
export function uncheckedTeams(snapshot: IndexSnapshot, matches: TeamMatches, mglIds: Set<string>) {
  return teamsIn(snapshot).filter(({ id }) => {
    if (!Object.hasOwn(matches, id)) return true;
    const team = matches[id];
    return team !== null && !mglIds.has(team);
  });
}
