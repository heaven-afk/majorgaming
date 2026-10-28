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

export const adminCopy = {
  brand: "MGL Admin",
  nav: [
    { href: "/admin", label: "Events" },
    { href: "#", label: "Results", soon: true },
    { href: "#", label: "Teams", soon: true },
    { href: "#", label: "News", soon: true },
    { href: "#", label: "Staff", soon: true },
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
