/** Words used across the admin dashboard. */

export const statusOptions = [
  { value: "upcoming", label: "Upcoming", hint: "Not started. Can take registrations." },
  { value: "live", label: "Live", hint: "Being played. Standings show as live." },
  { value: "final", label: "Finished", hint: "Over. Listed under past events." },
] as const;

export const registrationOptions = [
  { value: "closed", label: "Closed" },
  { value: "soon", label: "Opening soon" },
  { value: "open", label: "Open" },
  { value: "full", label: "Full" },
] as const;

export const formatOptions = [
  { value: "tiers", label: "By tier", hint: "A standings table for each tier" },
  { value: "single", label: "One table", hint: "Every team in one standings table" },
] as const;

export const kindOptions = [
  { value: "season", label: "Ranked season", hint: "Decides each team's tier and the Teams page" },
  { value: "other", label: "Special event", hint: "Cups, mixed and partner events. Tiers stay as they are." },
] as const;

/** What the site shows for each registration state, in a sentence. */
export const registrationShown = {
  closed: "Registration closed. No register buttons.",
  soon: "Opening soon. Buttons say registration opens soon.",
  open: "Open. Register buttons are live across the site.",
  full: "Full. Buttons say the event is full.",
} as const;

/**
 * Squads that move up and down between tiers each season. Switched off for now (owner,
 * 2026-10-29): teams keep their tier until it's changed by hand. The numbers stay on each season
 * in the database; set `enabled` to bring the setting back.
 */
export const PROMOTION = { enabled: false, promote: 3, relegate: 3 } as const;

/** The categories and groups the database allows (check constraints in the migrations). */
export const STORY_CATEGORIES = ["Announcement", "Season recap", "Feature", "Update"] as const;
export const STAFF_GROUPS = ["Leadership", "Operations", "Media", "Community"] as const;

export const adminCopy = {
  brand: "MGL Admin",
  nav: [
    { href: "/admin", label: "Dashboard", icon: "home" },
    { href: "/admin/events", label: "Events", icon: "calendar" },
    { href: "/admin/fantasy", label: "Fantasy", icon: "fantasy" },
    { href: "/admin/teams", label: "Teams", icon: "squad" },
    { href: "/admin/people", label: "Players", icon: "crosshair" },
    { href: "/admin/news", label: "News", icon: "news" },
    { href: "/admin/staff", label: "Staff", icon: "people" },
    { href: "/admin/media", label: "Media", icon: "image" },
    { href: "/admin/settings", label: "Settings", icon: "settings" },
  ],
  viewSite: "View site",
  failed: {
    title: "This page didn't load",
    lede: "Usually the connection to the database dropped for a moment. Check you're online, then try again. Nothing you saved before this was lost.",
    retry: "Try again",
    home: "Back to the dashboard",
  },
  signOut: "Sign out",
  login: {
    title: "Sign in",
    lede: "For MGL staff. Your account is added by the owner.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    pending: "Signing in…",
  },
  events: {
    title: "Events",
    lede: "Everything an event page shows: dates, registration, poster and write-up. Changes go live within seconds.",
    create: "New event",
    empty: "No events yet. Create the first one.",
    deleted: "Event deleted.",
  },
} as const;
