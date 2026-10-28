/**
 * Teams, people and event registrations, generated from the owner's sheets into `generated/` by
 * `scripts/league-data.py`, until the one-time import and the admin.
 *
 * Players are listed by professional name. Only the Mixed Event sheets have countries, so most
 * players have none yet and pages hide the flag; nobody has a photo, so pages show initials.
 */

import { results } from "./events";
import { personRecords } from "./generated/people";
import { teamRecords } from "./generated/teams";
import type { EntryRecord, PersonRecord, TeamRecord } from "./types";

export const teams: TeamRecord[] = teamRecords;
export const people: PersonRecord[] = personRecords;

/** One registration per squad per event. Season 9 and the Carry1st Event have no rosters on record. */
export const entries: EntryRecord[] = results.flatMap((r) => r.entries.map((e) => ({ event: r.event, ...e })));
