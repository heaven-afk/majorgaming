/** Words used across the admin dashboard. */

export const statusOptions = [
  { value: "upcoming", label: "Upcoming", hint: "Shown under Coming up" },
  { value: "live", label: "Live", hint: "Standings show as live" },
  { value: "final", label: "Final", hint: "In the archive" },
] as const;

export const registrationOptions = [
  { value: "closed", label: "Closed" },
  { value: "soon", label: "Opening soon" },
  { value: "open", label: "Open" },
  { value: "full", label: "Full" },
] as const;

export const formatOptions = [
  { value: "tiers", label: "Tiers", hint: "A table per tier" },
  { value: "single", label: "One table", hint: "A single overall table" },
] as const;

export const kindOptions = [
  { value: "season", label: "Ranked season", hint: "Sets the Teams page and tiers" },
  { value: "other", label: "Other event", hint: "Cups, mixed and partner events" },
] as const;

/** Squads that move up and down between tiers each season, unless a season sets its own. */
export const PROMOTION = { promote: 3, relegate: 3 } as const;

/** The categories and groups the database allows (check constraints in the migrations). */
export const STORY_CATEGORIES = ["Announcement", "Season recap", "Feature", "Update"] as const;
export const STAFF_GROUPS = ["Leadership", "Operations", "Media", "Community"] as const;

export const adminCopy = {
  brand: "MGL Admin",
  nav: [
    { href: "/admin", label: "Dashboard", icon: "home" },
    { href: "/admin/events", label: "Events", icon: "calendar" },
    { href: "/admin/teams", label: "Teams", icon: "squad" },
    { href: "/admin/people", label: "Players", icon: "crosshair" },
    { href: "/admin/news", label: "News", icon: "news" },
    { href: "/admin/staff", label: "Staff", icon: "people" },
    { href: "/admin/media", label: "Media", icon: "image" },
  ],
  viewSite: "View site",
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
