"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireOwner } from "../session";
import { readCurrentFantasy } from "@/lib/fantasy/admin";
import { fantasyIdentity } from "@/lib/fantasy/identity";
import { setFantasyWindow, setTransferWindow, FantasyCoreError } from "@/lib/fantasy/client";
import { executeWindowControl } from "@/lib/fantasy/window-control.mjs";
import { fantasyAdminCopy } from "@/content/fantasy-admin";

export type WindowActionState = { error?: string; notice?: string; saved?: number };

export async function manageTransfers(_: WindowActionState, form: FormData): Promise<WindowActionState> {
  const owner = await requireOwner();
  try {
    const state = await readCurrentFantasy();
    const tournamentId = String(form.get("tournamentId") ?? "");
    const matchday = Number(form.get("matchdayNumber"));
    const day = state.matchdays.find(day => day.tournamentId === tournamentId && day.matchdayNumber === matchday);
    if (!state.configured || state.preview || !day?.splitWindows || !day.matchdayStartsAt) {
      return { error: fantasyAdminCopy.transfersUnavailable };
    }
    const toIso = (value: FormDataEntryValue | null) => {
      if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) throw new Error(fantasyAdminCopy.invalidTimes);
      return new Date(value + ":00+01:00").toISOString();
    };
    const action = form.get("action");
    if (action !== "save" && action !== "close") return { error: fantasyAdminCopy.invalidTimes };
    const schedule = action === "close" ? null : { opensAt: toIso(form.get("opensAt")), closesAt: toIso(form.get("closesAt")) };
    const token = await fantasyIdentity().signWindowAdmin({ userId: owner.id });
    await setTransferWindow(token, tournamentId, matchday, schedule);
    updateTag("fantasy-core");
    revalidatePath("/admin/fantasy");
    revalidatePath("/fantasy", "layout");
    return { saved: Date.now(), notice: fantasyAdminCopy.transfersSaved };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof FantasyCoreError) {
      if (err.status === 409 || err.status === 422) return { error: String(err.body?.error ?? fantasyAdminCopy.rejected) };
      return { error: fantasyAdminCopy.unavailable };
    }
    return { error: err instanceof Error ? err.message : fantasyAdminCopy.unavailable };
  }
}

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
