"use server";

import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "../session";
import { keysOf } from "../columns";
import { getEvent } from "../events";
import { aliasesOf, listEntries, teamsIndex } from "../league";
import { indexSnapshot, IndexResultsError } from "@/lib/index-results/client";
import { eventSlug, indexId } from "@/lib/index-results/contract";
import { checkTeams, parseMatches, teamsIn, type TeamCheck } from "@/lib/index-results/match";
import { confirmedMatches, getAdminLinks, saveIndexRefresh, setIndexLink, switchToManualResults } from "@/lib/index-results/store";
import { DbError } from "../supabase";
import type { FormState } from "@/components/admin/Form";

/** A tournament's teams beside the MGL teams they look like, to confirm before linking. Saves nothing. */
export async function checkIndexTeams(slug: string, tableId: string, tournament: string): Promise<{ check?: TeamCheck; error?: string }> {
  const admin = await requireAdmin();
  if (!eventSlug.test(slug) || slug.length > 180) return { error: "Invalid event." };
  if (typeof tournament !== "string" || !indexId.test(tournament)) return { error: "Choose a Heaven Index tournament." };
  try {
    const event = await getEvent(admin.token, slug);
    const table = event?.event_tables.find(table => table.id === tableId);
    if (!event || !table) return { error: "This results table does not belong to the event." };
    const [snapshot, teams, aliases, entries, saved] = await Promise.all([
      indexSnapshot(tournament),
      teamsIndex(admin.token),
      aliasesOf(admin.token, "team"),
      listEntries(admin.token, event.id),
      confirmedMatches(admin.token),
    ]);
    const here = new Set(entries.filter(entry => table.tier === null || entry.tier === table.tier).map(entry => entry.team_id));
    const mgl = teams.map(team => ({ id: team.id, name: team.name, here: here.has(team.id), keys: keysOf(team.id, [team.name, team.tag], aliases) }));
    return {
      check: {
        tournament: { id: snapshot.event.id, name: snapshot.event.name, status: snapshot.event.status },
        teams: checkTeams(teamsIn(snapshot), mgl, saved),
        options: mgl.map(({ id, name, here }) => ({ id, name, here })),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof IndexResultsError || error instanceof DbError ? error.message : "Could not check the teams. Try again." };
  }
}

export async function updateIndexResults(slug: string, tableId: string, _previous: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!eventSlug.test(slug) || slug.length > 180) return { error: "Invalid event." };
  try {
    const event = await getEvent(admin.token, slug);
    if (!event) return { error: "Event not found." };
    if (!event.event_tables.some(table => table.id === tableId)) return { error: "This results table does not belong to the event." };
    const action = form.get("operation");
    const links = await getAdminLinks(admin.token, event.id);
    const existing = links.find(link => link.table_id === tableId);
    if (action === "manual") {
      if (existing?.enabled) await switchToManualResults(existing);
      return { saved: Date.now(), notice: "Manual results are now displayed for this table." };
    }
    if (action === "manual-legacy") {
      const legacy = links.find(link => link.table_id === null);
      if (legacy?.enabled) await switchToManualResults(legacy);
      return { saved: Date.now(), notice: "Manual results are now displayed." };
    }
    if (action !== "link" && action !== "sync") return { error: "Choose a results action." };
    const link = action === "sync" ? existing : undefined;
    if (action === "sync" && !link?.enabled) return { error: "Link a Heaven Index tournament before syncing." };
    const id = link?.tournament_id ?? form.get("tournament");
    if (typeof id !== "string" || !indexId.test(id)) return { error: "Choose a Heaven Index tournament." };
    const matches = link ? undefined : parseMatches(form.get("matches"), new Set((await teamsIndex(admin.token)).map(team => team.id)));
    if (!link && !matches) return { error: "Check the teams again before linking. Each MGL team can be matched once." };
    const snapshot = await indexSnapshot(id);
    if (link) {
      const saved = await saveIndexRefresh(link, snapshot, link.attempt_at);
      if (!saved) return { error: "The results source changed or a sync started. Refresh and try again." };
    } else {
      // Relinking the same tournament keeps earlier choices for teams it isn't sending right now.
      const earlier = existing?.tournament_id === id ? existing.team_matches : undefined;
      await setIndexLink(event.id, tableId, snapshot, { ...earlier, ...matches });
      const matched = Object.values(matches ?? {}).filter(Boolean).length;
      return { saved: Date.now(), notice: `${snapshot.event.name} is linked${matched ? `, with ${matched} ${matched === 1 ? "team" : "teams"} matched` : ""}.` };
    }
    return { saved: Date.now(), notice: "The Heaven Index results were synced." };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof IndexResultsError || error instanceof DbError ? error.message : "Could not save the Heaven Index results. Try again." };
  }
}
