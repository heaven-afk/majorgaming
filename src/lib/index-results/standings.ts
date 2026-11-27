import type { IndexSnapshot, IndexTeam, ResultTable } from "./contract";

/** A results table plus the entered teams that have no results in it yet. */
export type LiveTable = ResultTable & { waiting: IndexTeam[] };

/**
 * The tables to show for a tournament. Before any results, one table of the teams entered. Once
 * results come in, teams still to play follow the ranked ones, but only in an overall table:
 * with groups, nothing says which group a team is in until it plays. Player kills from Heaven
 * Index are never shown: kill tables come only from the spreadsheets uploaded in the admin.
 */
export function liveTables(snapshot: IndexSnapshot): LiveTable[] {
  const tables = snapshot.tables.filter(table => table.teams.length).map(table => ({ ...table, players: [] }));
  const entered = snapshot.completed ? [] : snapshot.registeredTeams ?? [];
  if (!tables.length) return [{ id: null, name: "Overall", teams: [], players: [], waiting: entered }];
  const overall = tables.length === 1 && snapshot.tables.length === 1 && tables[0].id === null;
  const played = new Set(tables.flatMap(table => table.teams.map(team => team.id)));
  return tables.map(table => ({ ...table, waiting: overall ? entered.filter(team => !played.has(team.id)) : [] }));
}
