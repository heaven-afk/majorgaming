"use server";

import { updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/admin/Form";
import { TAGS } from "@/lib/db";
import { resolvePeople, resolveTeam } from "../ids";
import { league } from "@/content/site";
import { insertMany, listEntries, previousEntry, resultsOf } from "../league";
import { readRoster, teamSlots } from "../roster";
import { requireAdmin } from "../session";
import { DbError, db } from "../supabase";

function failed(err: unknown): FormState {
  unstable_rethrow(err);
  if (err instanceof DbError && /entry_players_event_id_person_id_key|duplicate key.*person/.test(err.message)) return { error: "A player on this roster was just added to another squad in this event. Reload and save again." };
  if (err instanceof DbError && /entries_event_id_team_id_key/.test(err.message)) return { error: "That team is already registered for this event." };
  return { error: err instanceof Error ? err.message : "Something went wrong. Try again." };
}

/**
 * Saves one registration: the team (picked or new), its tier and manager, and the roster in
 * order with roles and one captain. New players typed into the roster are created. A player is on
 * one squad per event, so anyone already on another squad here moves to this one (their kills
 * there stay with the squad they scored them for).
 */
export async function saveEntry(eventSlug: string, eventId: string, entryId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const fields: Record<string, string> = {};
  const team = String(form.get("team") ?? "");
  if (!team) fields.team = "Pick a team, or type a new one.";
  const tierRaw = String(form.get("tier") ?? "");
  const tier = tierRaw ? Number(tierRaw) : null;
  const manager = String(form.get("manager") ?? "").trim().replace(/\s+/g, " ") || null;
  if (manager && manager.length > 80) fields.manager = "Keep the manager's name under 80 characters.";
  const filled = readRoster(form);
  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };

  try {
    // Someone can only be on the roster once.
    if (new Set(filled.map((x) => x.p)).size !== filled.length) return { error: "The same player is on the roster twice." };

    const teamId = await resolveTeam(admin.token, team, String(form.get("tag") ?? "").trim() || null);
    const ids = await resolvePeople(admin.token, filled.map((x) => x.p));
    const [t] = await db<{ name: string; tag: string | null; slug: string }[]>(admin.token, `teams?id=eq.${teamId}&select=name,tag,slug`);

    // The name and tag are kept as they are when registering; editing an old event's squad later
    // keeps the name it had then (unless the squad itself is changed to another team).
    const [was] = entryId ? await db<{ team_id: string }[]>(admin.token, `entries?id=eq.${entryId}&select=team_id`) : [];
    const body = { event_id: eventId, team_id: teamId, tier, manager, ...(!was || was.team_id !== teamId ? { team_name: t.name, team_tag: t.tag } : {}) };
    const [entry] = entryId
      ? await db<{ id: string }[]>(admin.token, `entries?id=eq.${entryId}`, { method: "PATCH", body, prefer: "return=representation" })
      : await db<{ id: string }[]>(admin.token, "entries", { method: "POST", body, prefer: "return=representation" });

    // Players coming over from another squad in this event leave it first.
    const moving = ids.length
      ? await db<{ id: string; entry: { team_name: string }; person: { name: string } }[]>(
          admin.token,
          `entry_players?event_id=eq.${eventId}&entry_id=neq.${entry.id}&person_id=in.(${ids.join(",")})&select=id,entry:entries(team_name),person:people(name)`,
        )
      : [];
    if (moving.length) await db(admin.token, `entry_players?id=in.(${moving.map((m) => m.id).join(",")})`, { method: "DELETE" });

    // The roster is written again in its new order.
    await db(admin.token, `entry_players?entry_id=eq.${entry.id}`, { method: "DELETE" });
    if (ids.length) {
      await insertMany(
        admin.token,
        "entry_players",
        ids.map((person_id, i) => ({ entry_id: entry.id, event_id: eventId, person_id, sort: i, role: filled[i].role, captain: filled[i].captain })),
        "return=minimal",
      );
    }
    updateTag(TAGS.league);
    // "team" goes to the team's own page, whose address is only known now.
    const back = String(form.get("back") ?? "");
    if (!entryId) redirect(back === "team" ? `/admin/teams/${t.slug}?saved=1` : back.startsWith("/admin/") ? `${back}?saved=1` : `/admin/events/${eventSlug}/squads/${t.slug}?saved=1`);
    return { saved: Date.now(), notice: moving.length ? `Saved. Moved here: ${moving.map((m) => `${m.person.name} (from ${m.entry.team_name})`).join(", ")}.` : undefined };
  } catch (err) {
    return failed(err);
  }
}

/** The roster from the team's last registration before this event, to pre-fill a new one. */
export async function lastRoster(eventSort: number, teamId: string) {
  const admin = await requireAdmin();
  if (!teamId || teamId.startsWith("new:")) return null;
  const prev = await previousEntry(admin.token, teamId, eventSort);
  if (!prev) return null;
  return {
    event: prev.event.name,
    manager: prev.manager,
    players: prev.entry_players.map((p) => ({ value: p.person_id, label: p.person.name, role: p.role ?? "", captain: p.captain })),
  };
}

/**
 * Takes a squad out of an event. Refused once the squad has results there, so standings and kill
 * rows are never lost by accident: clear them on the Results tab first if it really must go.
 */
export async function removeEntry(eventSlug: string, entryId: string, back?: string): Promise<FormState> {
  const admin = await requireAdmin();
  const has = await resultsOf(admin.token, entryId);
  if (has.standings || has.kills) {
    return { error: `This squad has results in this event (${[has.standings && "standings", has.kills && `${has.kills} kill rows`].filter(Boolean).join(" and ")}), so it can't be removed without losing them. If it really shouldn't be there, upload the corrected sheets without it on the Results tab (that can be undone), then remove it.` };
  }
  await db(admin.token, `entries?id=eq.${entryId}`, { method: "DELETE" });
  updateTag(TAGS.league);
  redirect(back ? `${back}${back.includes("?") ? "&" : "?"}removed=1` : `/admin/events/${eventSlug}/squads?removed=1`);
}

/**
 * Locks in an event's teams: the ticked ones, each in the tier picked for it. New ones are
 * registered with their name, manager and current roster copied; ones moved to another tier are
 * moved; unticked ones leave the event, unless they already have results there. In a ranked
 * season each team's current tier becomes the one it was locked into. A tier holds at most a
 * full tier of teams in an event.
 */
export async function lockLineup(eventSlug: string, eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    const [event] = await db<{ kind: string; status: string }[]>(admin.token, `events?id=eq.${eventId}&select=kind,status`);
    const picks = new Map(
      form
        .getAll("pick")
        .map(String)
        .map((v) => v.split(":") as [string, string])
        .map(([team, tier]) => [team, tier && tier !== "0" ? Number(tier) : null] as const),
    );
    const perTier = new Map<number, number>();
    for (const tier of picks.values()) if (tier) perTier.set(tier, (perTier.get(tier) ?? 0) + 1);
    const over = [...perTier].filter(([, n]) => n > league.squadsPerTier);
    if (over.length) return { error: over.map(([t, n]) => `Tier ${t} has ${n} teams ticked; an event takes ${league.squadsPerTier} per tier.`).join(" ") };

    const here = await listEntries(admin.token, eventId);
    const leaving = here.filter((e) => !picks.has(e.team_id));
    const stuck: string[] = [];
    for (const e of leaving) {
      const has = await resultsOf(admin.token, e.id);
      if (has.standings || has.kills) stuck.push(e.team.name);
    }
    if (stuck.length) return { error: `${stuck.join(", ")} ${stuck.length === 1 ? "has" : "have"} results in this event, so ${stuck.length === 1 ? "it stays" : "they stay"}. Tick ${stuck.length === 1 ? "it" : "them"} again, or upload corrected sheets without ${stuck.length === 1 ? "it" : "them"} first.` };
    if (leaving.length) await db(admin.token, `entries?id=in.(${leaving.map((e) => e.id).join(",")})`, { method: "DELETE" });

    const byTeam = new Map(here.map((e) => [e.team_id, e]));
    for (const e of here) {
      const tier = picks.get(e.team_id);
      if (tier !== undefined && tier !== e.tier) await db(admin.token, `entries?id=eq.${e.id}`, { method: "PATCH", body: { tier } });
    }

    const fresh = [...picks].filter(([team]) => !byTeam.has(team));
    if (fresh.length) {
      const teams = await db<{ id: string; name: string; tag: string | null; manager: string | null }[]>(admin.token, `teams?id=in.(${fresh.map(([t]) => t).join(",")})&select=id,name,tag,manager`);
      const info = new Map(teams.map((t) => [t.id, t]));
      const made = await insertMany<{ id: string; team_id: string }>(
        admin.token,
        "entries",
        fresh.map(([team, tier]) => ({ event_id: eventId, team_id: team, tier, manager: info.get(team)?.manager ?? null, team_name: info.get(team)?.name ?? "", team_tag: info.get(team)?.tag ?? null })),
      );
      // Each brings its current roster; a player already on a squad in this event stays there.
      const taken = new Set(here.filter((e) => picks.has(e.team_id)).flatMap((e) => e.entry_players.map((p) => p.person_id)));
      const players = [];
      for (const m of made) {
        for (const [i, s] of (await teamSlots(admin.token, m.team_id)).entries()) {
          if (taken.has(s.person_id)) continue;
          taken.add(s.person_id);
          players.push({ entry_id: m.id, event_id: eventId, person_id: s.person_id, sort: i, role: s.role, captain: s.captain });
        }
      }
      if (players.length) await insertMany(admin.token, "entry_players", players, "return=minimal");
    }

    // A ranked season sets where each team plays now.
    if (event?.kind === "season") {
      const byTier = new Map<number | null, string[]>();
      for (const [team, tier] of picks) byTier.set(tier, [...(byTier.get(tier) ?? []), team]);
      for (const [tier, teams] of byTier) if (tier) await db(admin.token, `teams?id=in.(${teams.join(",")})`, { method: "PATCH", body: { tier } });
    }
    updateTag(TAGS.league);
    return { saved: Date.now(), notice: `Saved. ${picks.size} ${picks.size === 1 ? "team" : "teams"} taking part${fresh.length ? `, ${fresh.length} joined` : ""}${leaving.length ? `, ${leaving.length} left` : ""}.` };
  } catch (err) {
    return failed(err);
  }
}
