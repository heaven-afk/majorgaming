/**
 * Kill tables: every player's kills in an event, one row per player, generated from the owner's
 * kill sheets into `generated/` by `scripts/league-data.py`. Pages show the top 20 of each tier
 * (or of each group, like the Mixed Event's men and women). The Carry1st Event has no kill sheet.
 */

import { results } from "./events";
import type { KillRecord } from "./types";

/** How many players a kill table shows, unless the event sets its own. */
export const KILL_TABLE_SIZE = 20;

export const kills: KillRecord[] = results.flatMap((r) => r.kills.map((k) => ({ event: r.event, ...k })));
