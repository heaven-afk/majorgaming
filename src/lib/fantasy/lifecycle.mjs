/** Presentation guards. Core still authorizes every transition and gameplay write. */
export function tournamentState(t) {
  if (/complete|conclud|finish|archiv|final|ended/i.test(t.status)) return "done";
  if (/upcoming|draft|scheduled|pending|soon/i.test(t.status)) return "soon";
  return "live";
}

export function currentTournament(tournaments) {
  return tournaments.find(t => tournamentState(t) === "live") ?? tournaments.find(t => tournamentState(t) === "soon") ?? tournaments[0];
}

export function currentMatchday(matchdays) {
  const sorted = [...matchdays].sort((a, b) => a.matchdayNumber - b.matchdayNumber);
  return sorted.find(m => m.marketStatus === "OPEN") ??
    sorted.filter(m => m.marketStatus === "LOCKED" && m.fantasyStatus !== "PROCESSED").at(-1) ??
    sorted.find(m => ["DISCOVERED", "READY"].includes(m.fantasyStatus)) ?? sorted.at(-1);
}

export function marketIsOpen(market, day, now = Date.now()) {
  return market?.status === "OPEN" && day.marketStatus === "OPEN" &&
    ["DISCOVERED", "READY"].includes(day.fantasyStatus) &&
    Boolean(day.submissionDeadline && Date.parse(day.submissionDeadline) > now);
}

export function windowActionAllowed(day, action, now = Date.now()) {
  if (!day || !["open", "lock", "close"].includes(action)) return false;
  if (action === "open") return day.marketStatus === "DRAFT" &&
    ["DISCOVERED", "READY"].includes(day.fantasyStatus) && day.matchesPlayed === 0 &&
    Boolean(day.submissionDeadline && Date.parse(day.submissionDeadline) > now);
  if (action === "lock") return day.marketStatus === "OPEN";
  return ["OPEN", "LOCKED"].includes(day.marketStatus);
}
