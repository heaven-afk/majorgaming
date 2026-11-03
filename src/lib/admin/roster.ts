/**
 * A team's current roster and how it reaches events. Teams own their roster; a registration
 * keeps its own copy, kept in step while its event is upcoming or live and frozen once final.
 * A player is on one team at a time, and on one squad per event. Server only.
 */

import { insertMany, openEventIds } from "./league";
import { db } from "./supabase";

export const ROLES = ["IGL", "Fragger", "Support", "Anchor"];

export type RosterSlot = { person_id: string; role: string | null; captain: boolean };

/** The roster fields of a team or squad form: players in order, roles, one captain. */
export function readRoster(form: FormData) {
  const players = form.getAll("player").map(String);
  const roles = form.getAll("role").map(String);
  const captain = Number(form.get("captain") ?? -1);
  return players.map((p, i) => ({ p, role: ROLES.includes(roles[i]) ? roles[i] : null, captain: i === captain })).filter((x) => x.p);
}

/**
 * Writes a team's roster. Players coming from another team leave it (and its squads in open
 * events), and every open-event squad of this team gets the new roster. Returns who moved.
 */
export async function writeTeamRoster(token: string, teamId: string, slots: RosterSlot[]) {
  const ids = slots.map((s) => s.person_id);
  const moving = ids.length
    ? await db<{ id: string; person_id: string; team: { name: string }; person: { name: string } }[]>(
        token,
        `team_players?person_id=in.(${ids.join(",")})&team_id=neq.${teamId}&select=id,person_id,team:teams(name),person:people(name)`,
      )
    : [];
  if (moving.length) await db(token, `team_players?id=in.(${moving.map((m) => m.id).join(",")})`, { method: "DELETE" });
  await db(token, `team_players?team_id=eq.${teamId}`, { method: "DELETE" });
  if (slots.length) await insertMany(token, "team_players", slots.map((s, i) => ({ team_id: teamId, person_id: s.person_id, sort: i, role: s.role, captain: s.captain })), "return=minimal");

  const open = await openEventIds(token);
  if (open.length) {
    const entries = await db<{ id: string; event_id: string }[]>(token, `entries?team_id=eq.${teamId}&event_id=in.(${open.join(",")})&select=id,event_id`);
    // Players who left their old team leave its open-event squads too.
    const left = moving.map((m) => m.person_id);
    if (left.length) await db(token, `entry_players?person_id=in.(${left.join(",")})&event_id=in.(${open.join(",")})`, { method: "DELETE" });
    for (const e of entries) await copyRoster(token, e.id, e.event_id, slots);
  }
  return moving.map((m) => ({ name: m.person.name, from: m.team.name }));
}

/** Puts a roster onto one registration, taking each player off any other squad in that event. */
export async function copyRoster(token: string, entryId: string, eventId: string, slots: RosterSlot[]) {
  const ids = slots.map((s) => s.person_id);
  if (ids.length) await db(token, `entry_players?event_id=eq.${eventId}&person_id=in.(${ids.join(",")})&entry_id=neq.${entryId}`, { method: "DELETE" });
  await db(token, `entry_players?entry_id=eq.${entryId}`, { method: "DELETE" });
  if (slots.length) await insertMany(token, "entry_players", slots.map((s, i) => ({ entry_id: entryId, event_id: eventId, person_id: s.person_id, sort: i, role: s.role, captain: s.captain })), "return=minimal");
}

/** A team's current roster, ready to copy onto a registration. */
export async function teamSlots(token: string, teamId: string): Promise<RosterSlot[]> {
  const rows = await db<{ person_id: string; role: string | null; captain: boolean }[]>(token, `team_players?team_id=eq.${teamId}&select=person_id,role,captain&order=sort.asc`);
  return rows;
}
