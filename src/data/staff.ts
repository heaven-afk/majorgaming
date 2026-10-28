/**
 * MGL's own people: the organization's staff, not players or team managers.
 *
 * PLACEHOLDER: every handle, role, country, link and the founder's quote and bio below are
 * invented for layout. Portraits are
 * the decorative character avatars, not photos of staff; people without one show their initials.
 * Replace with the real staff list (later managed in the admin); pages need no changes.
 */

import { additionalCommunityAvatars, communityAvatars } from "@/content/visual-assets";

export type StaffGroup = "Leadership" | "Operations" | "Media" | "Community";

/** One staff member. Shaped like a future database table. */
export type StaffRecord = {
  slug: string;
  /** Display name or handle, shown everywhere. */
  name: string;
  role: string;
  group: StaffGroup;
  /** ISO 3166 two-letter code. */
  country?: string;
  /** Portrait image path. */
  photo?: string;
  socials?: { x?: string; instagram?: string; discord?: string };
  /** Position within the group, lowest first. */
  order: number;
  /** A featured profile (the founder): a short quote, a few paragraphs of bio, the year they started. */
  spotlight?: { quote?: string; bio: string[]; since?: number };
};

const [farah, ghost, price, soap] = communityAvatars;
const [mantaRay, urbanTracker, nikto, krueger] = additionalCommunityAvatars;

export const staff: StaffRecord[] = [
  {
    slug: "oracle",
    name: "Oracle",
    role: "Founder",
    group: "Leadership",
    country: "NG",
    photo: ghost.original,
    socials: { x: "#", instagram: "#", discord: "#" },
    order: 1,
    spotlight: {
      quote: "Every squad deserves a table that tells the truth about how good they are.",
      bio: [
        "Oracle started MGL as a weekend scrim for a handful of squads in one Discord server, keeping the points in a shared sheet by hand.",
        "It grew into a ranked league with five tiers, a registration process and a season every few months, run by a crew across the AF region. Oracle still sets the rules, signs off every final table and talks to every new partner.",
      ],
      since: 2021,
    },
  },
  { slug: "meridian", name: "Meridian", role: "League Director", group: "Leadership", country: "GH", photo: price.original, socials: { x: "#", discord: "#" }, order: 2 },
  { slug: "kestrel", name: "Kestrel", role: "Head of Operations", group: "Leadership", country: "KE", photo: farah.original, socials: { x: "#" }, order: 3 },

  { slug: "bastion", name: "Bastion", role: "Tournament Admin", group: "Operations", country: "NG", socials: { discord: "#" }, order: 1 },
  { slug: "quill", name: "Quill", role: "Tournament Admin", group: "Operations", country: "ZA", photo: soap.original, socials: { discord: "#" }, order: 2 },
  { slug: "atlas", name: "Atlas", role: "Results Officer", group: "Operations", country: "EG", order: 3 },
  { slug: "tempo", name: "Tempo", role: "Registration Lead", group: "Operations", country: "NG", photo: urbanTracker.original, socials: { discord: "#" }, order: 4 },

  { slug: "halo", name: "Halo", role: "Media Lead", group: "Media", country: "KE", photo: mantaRay.original, socials: { x: "#", instagram: "#" }, order: 1 },
  { slug: "echo", name: "Echo", role: "Caster", group: "Media", country: "GH", photo: nikto.original, socials: { x: "#" }, order: 2 },
  { slug: "vesper", name: "Vesper", role: "Caster", group: "Media", country: "ZA", socials: { x: "#", instagram: "#" }, order: 3 },
  { slug: "lumen", name: "Lumen", role: "Graphic Designer", group: "Media", country: "NG", socials: { instagram: "#" }, order: 4 },

  { slug: "ember", name: "Ember", role: "Community Manager", group: "Community", country: "TZ", photo: krueger.original, socials: { discord: "#", x: "#" }, order: 1 },
  { slug: "drift", name: "Drift", role: "Community Moderator", group: "Community", country: "RW", socials: { discord: "#" }, order: 2 },
];
