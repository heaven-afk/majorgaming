/**
 * The one reader of staff records. Pages and components ask here, never `src/data/staff.ts`,
 * so moving staff into the database (and the admin) only changes this file.
 */

import { staff as records, type StaffGroup, type StaffRecord } from "@/data/staff";

export type { StaffGroup };
export type StaffMember = StaffRecord;

/** Groups in the order the page shows them. */
export const groupOrder: StaffGroup[] = ["Leadership", "Operations", "Media", "Community"];

/** Everyone, group by group, then by their order within the group. */
export const staff = [...records].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || a.order - b.order);

/** The groups that have people, with their members. */
export const staffGroups = groupOrder.map((group) => ({ group, people: staff.filter((s) => s.group === group) })).filter((g) => g.people.length);

export const leadership = staff.filter((s) => s.group === "Leadership");

/** The featured profile at the top of Leadership (the founder), when there is one. */
export const founder = staff.find((s) => s.spotlight);

/** Leadership cards under the founder's profile. */
export const leaders = leadership.filter((s) => s !== founder);

/** Every group except Leadership, which the page shows on its own. */
export const otherGroups = staffGroups.filter((g) => g.group !== "Leadership");

export const staffCountries = new Set(staff.flatMap((s) => s.country ?? []));
