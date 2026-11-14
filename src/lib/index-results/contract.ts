export const organizer = "Major Gaming League";
export const indexId = /^[A-Za-z0-9_-]{1,200}$/;
export const eventSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type IndexEvent = { id: string; name: string; status: string; startDate: string | null };
export type TeamResult = {
  id: string; rank: number; name: string; logo: string | null; matches: number; events: number;
  kills: number; placementPoints: number; totalPoints: number;
};
export type PlayerResult = {
  id: string; rank: number; name: string; team: string | null; matches: number; events: number; kills: number;
};
export type ResultTable = { id: string | null; name: string; teams: TeamResult[]; players: PlayerResult[] };
export type IndexSnapshot = { version: 1; organizer: string; event: IndexEvent; completed: boolean; tables: ResultTable[] };
export type PublicIndexResults = { snapshot: IndexSnapshot | null; syncedAt: string | null; refresh: boolean };

const fail = (): never => { throw new Error("Heaven Index returned invalid results."); };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function label(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 300 ? value : fail();
}
function id(value: unknown): string {
  return typeof value === "string" && indexId.test(value) ? value : fail();
}
function count(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fail();
}
function points(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fail();
}
function list<T>(value: unknown, read: (row: unknown, index: number) => T, max = 5000): T[] {
  if (!Array.isArray(value) || value.length > max) return fail();
  return value.map(read);
}
function image(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("data:")) {
    return value.length <= 200_000 && /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
  }
  if (value.length > 4096) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function envelope(value: unknown) {
  const row = record(value);
  if (row.version !== 1 || row.organizer !== organizer) return fail();
  return row;
}
function event(value: unknown): IndexEvent {
  const row = record(value);
  return { id: id(row.id), name: label(row.name), status: label(row.status), startDate: row.startDate === null ? null : label(row.startDate) };
}
function distinct<T extends {id: string | null}>(rows: T[]) {
  if (new Set(rows.map(row => row.id)).size !== rows.length) return fail();
  return rows;
}
function ranking(row: Record<string, unknown>, index: number) {
  if (row.rank !== index + 1) return fail();
  return { rank: index + 1, name: label(row.name), matches: count(row.matches), events: count(row.events), kills: count(row.kills) };
}

export function parseIndexCatalog(value: unknown) {
  return distinct(list(envelope(value).events, event));
}

export function parseIndexSnapshot(value: unknown, expectedId: string): IndexSnapshot {
  const row = envelope(value);
  const source = event(row.event);
  if (source.id !== expectedId || typeof row.completed !== "boolean") return fail();
  return {
    version: 1, organizer, event: source, completed: row.completed,
    tables: distinct(list(row.tables, value => {
      const table = record(value);
      return {
        id: table.id === null ? null : id(table.id),
        name: label(table.name),
        teams: distinct(list(table.teams, (value, i) => {
          const team = record(value);
          return { id: id(team.id), ...ranking(team, i), logo: image(team.logo), placementPoints: points(team.placementPoints), totalPoints: points(team.totalPoints) };
        })),
        players: distinct(list(table.players, (value, i) => {
          const player = record(value);
          return { id: label(player.id), ...ranking(player, i), team: player.team === null ? null : label(player.team) };
        })),
      };
    }, 200)),
  };
}
