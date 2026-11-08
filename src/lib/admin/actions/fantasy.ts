"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireOwner } from "../session";
import { readCurrentFantasy } from "@/lib/fantasy/admin";
import { fantasyIdentity } from "@/lib/fantasy/identity";
import { setFantasyWindow, FantasyCoreError } from "@/lib/fantasy/client";
import { executeWindowControl } from "@/lib/fantasy/window-control.mjs";
import { fantasyAdminCopy } from "@/content/fantasy-admin";

export type WindowActionState = { error?: string; notice?: string; saved?: number };

export async function manageFantasyWindow(_: WindowActionState, form: FormData): Promise<WindowActionState> {
  try {
    await executeWindowControl({
      tournamentId: String(form.get("tournamentId") ?? ""),
      matchdayNumber: Number(form.get("matchdayNumber")),
      action: String(form.get("action") ?? ""),
      expectedStatus: String(form.get("expectedStatus") ?? ""),
      expectedDeadline: form.get("expectedDeadline") ? String(form.get("expectedDeadline")) : null,
      confirm: form.get("confirm") === "yes",
    }, {
      // Going live, locking the market and closing a matchday are owner-only.
      requireAdmin: requireOwner,
      readCurrent: readCurrentFantasy,
      signAdmin: (userId: string) => fantasyIdentity().signWindowAdmin({ userId }),
      sendWindow: setFantasyWindow,
    });
    updateTag("fantasy-core");
    revalidatePath("/admin/fantasy");
    revalidatePath("/fantasy", "layout");
    return { saved: Date.now(), notice: fantasyAdminCopy.saved };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof FantasyCoreError) {
      if (err.status === 409 || err.status === 422) return { error: fantasyAdminCopy.rejected };
      return { error: fantasyAdminCopy.unavailable };
    }
    return { error: err instanceof Error ? err.message : fantasyAdminCopy.unavailable };
  }
}
