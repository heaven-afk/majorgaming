/**
 * The one reader of staff records, from Supabase (`site_content()`, through `db.ts`), cached
 * until an admin save clears it. Server only.
 */

import { cache } from "react";
import type { StaffGroup, StaffRecord } from "@/data/staff";
import { readContent } from "./db";

export type { StaffGroup };
export type StaffMember = StaffRecord;

/** Groups in the order the page shows them. */
export const groupOrder: StaffGroup[] = ["Leadership", "Operations", "Media", "Community"];

/** The staff for this request, grouped the way the Staff page shows them. */
export const getStaff = cache(async () => {
  const { staff: records } = await readContent();

  /** Everyone, group by group, then by their order within the group. */
  const staff = [...records].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || a.order - b.order);

  /** The groups that have people, with their members. */
  const staffGroups = groupOrder.map((group) => ({ group, people: staff.filter((s) => s.group === group) })).filter((g) => g.people.length);

  const leadership = staff.filter((s) => s.group === "Leadership");

  /** The featured profile at the top of Leadership (the founder), when there is one. */
  const founder = staff.find((s) => s.spotlight);

  return {
    staff,
    staffGroups,
    leadership,
    founder,
    /** Leadership cards under the founder's profile. */
    leaders: leadership.filter((s) => s !== founder),
    /** Every group except Leadership, which the page shows on its own. */
    otherGroups: staffGroups.filter((g) => g.group !== "Leadership"),
    staffCountries: new Set(staff.flatMap((s) => s.country ?? [])),
  };
});
