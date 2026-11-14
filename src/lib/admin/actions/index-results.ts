"use server";

import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "../session";
import { getEvent } from "../events";
import { indexSnapshot, IndexResultsError } from "@/lib/index-results/client";
import { eventSlug, indexId } from "@/lib/index-results/contract";
import { getAdminLinks, saveIndexRefresh, setIndexLink, useManualResults } from "@/lib/index-results/store";
import { DbError } from "../supabase";
import type { FormState } from "@/components/admin/Form";

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
      if (existing?.enabled) await useManualResults(existing);
      return { saved: Date.now(), notice: "Manual results are now displayed for this table." };
    }
    if (action === "manual-legacy") {
      const legacy = links.find(link => link.table_id === null);
      if (legacy?.enabled) await useManualResults(legacy);
      return { saved: Date.now(), notice: "Manual results are now displayed." };
    }
    if (action !== "link" && action !== "sync") return { error: "Choose a results action." };
    const link = action === "sync" ? existing : undefined;
    if (action === "sync" && !link?.enabled) return { error: "Link a Heaven Index tournament before syncing." };
    const id = link?.tournament_id ?? form.get("tournament");
    if (typeof id !== "string" || !indexId.test(id)) return { error: "Choose a Heaven Index tournament." };
    const snapshot = await indexSnapshot(id);
    if (link) {
      const saved = await saveIndexRefresh(link, snapshot, link.attempt_at);
      if (!saved) return { error: "The results source changed or a sync started. Refresh and try again." };
    } else {
      await setIndexLink(event.id, tableId, snapshot);
    }
    return { saved: Date.now(), notice: "The Heaven Index results were saved." };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof IndexResultsError || error instanceof DbError ? error.message : "Could not save the Heaven Index results. Try again." };
  }
}
