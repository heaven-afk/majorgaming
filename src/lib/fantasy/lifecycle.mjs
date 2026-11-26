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

const lagosTime = iso => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(iso)) + " Lagos time";

/**
 * What the squad screen says up top when something is closed, or null when everything is open.
 * `tone`: "locked" when the squad can't change at all, "info" when only transfers are closed.

 * @returns {{ tone: "locked" | "info"; title: string; body: string } | null}
 */
export function squadNotice(open, day, hasSquad, now = Date.now()) {
  const n = day.matchdayNumber;
  if (!open) {
    const started = day.matchesPlayed > 0 || day.marketStatus === "LOCKED" || Boolean(day.matchdayStartsAt && Date.parse(day.matchdayStartsAt) <= now);
    if (["COMPLETED", "PROCESSING", "PROCESSED"].includes(day.fantasyStatus)) {
      return { tone: "locked", title: `Matchday ${n} is over`, body: "The next matchday’s market isn’t open yet. Check back soon to pick for it." };
    }
    if (started) {
      return { tone: "locked", title: `Matchday ${n} is under way`, body: hasSquad
        ? "Squads are locked while it’s played. Yours shows below as it was locked in; changes open again for the next matchday."
        : "Squads are locked while it’s played. You can pick a squad once the next market opens." };
    }
    return { tone: "locked", title: "The market isn’t open yet", body: day.matchdayStartsAt
      ? `Picks for Matchday ${n} open before it starts on ${lagosTime(day.matchdayStartsAt)}. Check back soon.`
      : `Picks for Matchday ${n} open once its start time is set. Check back soon.` };
  }
  if (!canManageSquad(open, day, hasSquad, now)) {
    if (n !== 1) return { tone: "locked", title: "New squads are closed", body: "Squads can only be built before Matchday 1 starts, so this tournament isn’t taking new managers." };
    if (!day.buildSquadDeadline) return { tone: "locked", title: "Squad building isn’t open yet", body: "It opens once the deadline for building squads is set. Check back soon." };
    return { tone: "locked", title: "Squad building has closed", body: `The deadline was ${lagosTime(day.buildSquadDeadline)}.` };
  }
  const transfers = hasSquad ? transferBlockReason(open, day, now) : null;
  if (transfers) return { tone: "info", title: "Transfers are closed", body: transfers + " You can still change roles, your captain and your chip." };
  return null;
}

/**
 * Where the current matchday stands, for the status pill. With split windows the market being
 * open isn't enough for "Transfers open": the transfer window MGL schedules must be open too.
 * @returns {{ tone: "open" | "soon" | "live" | "done"; key: "open" | "building" | "transfersSoon" | "transfersClosed" | "unpublished" | "notStarted" | "locked" | "scored" }}
 */
export function matchdayStatus(open, marketStatus, day, now = Date.now()) {
  if (open) {
    if (!day.splitWindows || transferWindowIsOpen(open, day, now)) return { tone: "open", key: "open" };
    if (day.matchdayNumber === 1 && day.buildSquadDeadline && Date.parse(day.buildSquadDeadline) > now) return { tone: "open", key: "building" };
    if (day.transfersOpenAt && Date.parse(day.transfersOpenAt) > now) return { tone: "soon", key: "transfersSoon" };
    return { tone: "soon", key: "transfersClosed" };
  }
  if (marketStatus === "UNPUBLISHED" || marketStatus === "DRAFT") return { tone: "soon", key: "unpublished" };
  if (["COMPLETED", "PROCESSING", "PROCESSED"].includes(day.fantasyStatus)) return { tone: "done", key: "scored" };
  const started = day.matchesPlayed > 0 || day.marketStatus === "LOCKED" || Boolean(day.matchdayStartsAt && Date.parse(day.matchdayStartsAt) <= now);
  return started ? { tone: "live", key: "locked" } : { tone: "soon", key: "notStarted" };
}
