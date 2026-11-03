/**
 * Where an event's registration stands right now. Set in the admin per event; once it has
 * dates, they open and close it by themselves: "Opening soon" before the open date, "Open" until
 * the close date (inclusive), "Closed" after. "Full" set by hand always wins. Only upcoming
 * events take registrations. Dates are days in the league's time zone.
 */

import { league } from "@/content/site";

export type RegistrationState = "closed" | "soon" | "open" | "full";

/** Today as YYYY-MM-DD in the league's time zone. */
export function today(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: league.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function registrationOf(event: { status: string; registration?: RegistrationState; registrationOpens?: string; registrationCloses?: string }, day: string): RegistrationState {
  if (event.status !== "upcoming") return "closed";
  if (event.registration === "full") return "full";
  const opens = event.registrationOpens?.slice(0, 10);
  const closes = event.registrationCloses?.slice(0, 10);
  if (!opens && !closes) return event.registration ?? "closed";
  if (opens && day < opens) return "soon";
  if (closes && day > closes) return "closed";
  return "open";
}
