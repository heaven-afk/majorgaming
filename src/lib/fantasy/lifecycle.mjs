/** Presentation guards. Core still authorizes every transition and gameplay write. */
export function tournamentState(t) {
  if (/complete|conclud|finish|archiv|final|ended/i.test(t.status)) return "done";
  if (/upcoming|draft|scheduled|pending|soon/i.test(t.status)) return "soon";
  return "live";
}

export function currentTournament(tournaments) {
  return tournaments.find(t => tournamentState(t) === "live") ?? tournaments.find(t => tournamentState(t) === "soon") ?? tournaments[0];
}

export function currentMatchday(matchdays, now = Date.now()) {
  const sorted = [...matchdays].sort((a, b) => a.matchdayNumber - b.matchdayNumber);
  if (sorted.some(m => m.splitWindows)) {
    const upcoming = sorted.filter(m => m.fantasyStatus === "DISCOVERED" && Date.parse(m.matchdayStartsAt) > now);
    const current = upcoming.find(m => m.marketStatus === "OPEN");
    if (current) return current;
    const started = sorted.filter(m => Date.parse(m.matchdayStartsAt) <= now || m.matchesPlayed > 0).at(-1);
    return started ?? upcoming[0] ?? sorted[0];
  }
  return sorted.find(m => m.marketStatus === "OPEN") ??
    sorted.filter(m => m.marketStatus === "LOCKED" && m.fantasyStatus !== "PROCESSED").at(-1) ??
    sorted.find(m => ["DISCOVERED", "READY"].includes(m.fantasyStatus)) ?? sorted.at(-1);
}

export function marketIsOpen(market, day, now = Date.now()) {
  if (day.splitWindows) return market?.status === "OPEN" && day.marketStatus === "OPEN" &&
    day.fantasyStatus === "DISCOVERED" && day.matchesPlayed === 0 && Date.parse(day.matchdayStartsAt) > now;
  return market?.status === "OPEN" && day.marketStatus === "OPEN" &&
    ["DISCOVERED", "READY"].includes(day.fantasyStatus) &&
    Boolean(day.submissionDeadline && Date.parse(day.submissionDeadline) > now);
}

export function canManageSquad(open, day, hasSquad, now = Date.now()) {
  return open && (!day.splitWindows || hasSquad ||
    (day.matchdayNumber === 1 && Date.parse(day.buildSquadDeadline) > now));
}

export function transferWindowIsOpen(open, day, now = Date.now()) {
  return open && (!day.splitWindows ||
    (Date.parse(day.transfersOpenAt) <= now && Date.parse(day.transfersCloseAt) > now && Date.parse(day.matchdayStartsAt) > now));
}

export function transferBlockReason(open, day, now = Date.now()) {
  if (transferWindowIsOpen(open, day, now)) return null;
  if (!open || (day.matchdayStartsAt && Date.parse(day.matchdayStartsAt) <= now)) return "This matchday is locked. Transfers are closed.";
  if (!day.transfersOpenAt || !day.transfersCloseAt) return "MGL has not scheduled transfers for this matchday.";
  if (Date.parse(day.transfersOpenAt) > now) {
    const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(day.transfersOpenAt));
    return "Transfers open " + time + " Lagos time.";
  }
  return "The transfer window has closed for this matchday.";
}

export function windowActionAllowed(day, action, now = Date.now()) {
  if (!day || !["open", "lock", "close"].includes(action)) return false;
  if (action === "open") return day.marketStatus === "DRAFT" &&
    ["DISCOVERED", "READY"].includes(day.fantasyStatus) && day.matchesPlayed === 0 &&
    Boolean(day.submissionDeadline && Date.parse(day.submissionDeadline) > now);
  if (action === "lock") return day.marketStatus === "OPEN";
  return ["OPEN", "LOCKED"].includes(day.marketStatus);
}
