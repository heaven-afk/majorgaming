import { currentMatchday, currentTournament, tournamentState, windowActionAllowed } from "./lifecycle.mjs";

/** No caller-supplied identity or permissions. Dependencies are server-owned. */
export async function executeWindowControl(input, { requireAdmin, readCurrent, signAdmin, sendWindow, now = Date.now }) {
  const admin = await requireAdmin();
  if (!admin?.id || !["owner", "editor"].includes(admin.role)) throw new Error("Administrator access is required.");
  if (!input || !/^[\w-]{1,200}$/.test(input.tournamentId ?? "") ||
      !Number.isSafeInteger(input.matchdayNumber) || input.matchdayNumber < 1 ||
      !["open", "lock", "close"].includes(input.action) || input.confirm !== true) {
    throw new Error("Confirm the tournament, matchday and action before continuing.");
  }
  // Always read uncached state after verifying the administrator session.
  const state = await readCurrent();
  if (state.preview) throw new Error("Preview data cannot control a live market.");
  if (!state.configured) throw new Error("Finish the Fantasy Core connection settings before going live.");
  const tournament = currentTournament(state.tournaments);
  const day = currentMatchday(state.matchdays);
  if (!tournament || tournament.id !== input.tournamentId || !day || day.matchdayNumber !== input.matchdayNumber ||
      day.tournamentId !== tournament.id || state.market?.tournamentId !== tournament.id ||
      state.market?.matchdayNumber !== day.matchdayNumber) {
    throw new Error("The current tournament or matchday changed. Refresh before continuing.");
  }
  if (day.marketStatus !== input.expectedStatus || state.market.status !== day.marketStatus ||
      day.submissionDeadline !== input.expectedDeadline) {
    throw new Error("The market or deadline changed. Refresh before continuing.");
  }
  if (!windowActionAllowed(day, input.action, now()) ||
      (input.action === "open" && (tournamentState(tournament) === "done" || state.market.players.filter(p => p.isEligible).length < 5))) {
    throw new Error("That action is unavailable for this matchday. Check its deadline, players and status in Fantasy Core.");
  }
  const token = signAdmin(admin.id);
  const result = await sendWindow(token, tournament.id, day.matchdayNumber, input.action);
  const status = { open: "OPEN", lock: "LOCKED", close: "CLOSED" }[input.action];
  if (result.tournamentId !== tournament.id || result.matchdayNumber !== day.matchdayNumber || result.status !== status || result.success !== true) {
    throw new Error("Fantasy Core did not confirm the requested change. Refresh to check the market.");
  }
  return result;
}
