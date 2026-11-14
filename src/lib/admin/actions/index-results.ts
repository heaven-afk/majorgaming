"use server";

import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "../session";
import { getEvent } from "../events";
import { indexSnapshot, IndexResultsError } from "@/lib/index-results/client";
import { eventSlug, indexId } from "@/lib/index-results/contract";
import { getAdminLink, saveIndexRefresh, setIndexLink, useManualResults } from "@/lib/index-results/store";
import { DbError } from "../supabase";
import type { FormState } from "@/components/admin/Form";

export async function updateIndexResults(slug: string, _previous: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!eventSlug.test(slug) || slug.length > 180) return { error: "Invalid event." };
  try {
    const event = await getEvent(admin.token, slug);
    if (!event) return { error: "Event not found." };
    const action = form.get("operation");
    if (action === "manual") {
      await useManualResults(event.id);
      return { saved: Date.now(), notice: "Manual results are now displayed." };
    }
    if (action !== "link" && action !== "sync") return { error: "Choose a results action." };
    const link = action === "sync" ? await getAdminLink(admin.token, event.id) : undefined;
    if (action === "sync" && !link?.enabled) return { error: "Link a Heaven Index tournament before syncing." };
    const id = link?.tournament_id ?? form.get("tournament");
    if (typeof id !== "string" || !indexId.test(id)) return { error: "Choose a Heaven Index tournament." };
    const snapshot = await indexSnapshot(id);
    if (link) {
      const saved = await saveIndexRefresh(link, snapshot, link.attempt_at);
      if (!saved) return { error: "The results source changed or a sync started. Refresh and try again." };
    } else {
      await setIndexLink(event.id, snapshot);
    }
    return { saved: Date.now(), notice: "The Heaven Index results were saved." };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof IndexResultsError || error instanceof DbError ? error.message : "Could not save the Heaven Index results. Try again." };
  }
}
