/**
 * Kill tables: every player's kills in an event, one row per player, as the owner's kill sheets
 * list them. Pages show the top 20 of each tier. Hand-entered until the one-time import and the
 * admin.
 *
 * Season 10 is real (`season-10.ts`). PLACEHOLDER: the other events' rows are generated from
 * their made-up rosters with a fixed seed.
 */

import { events } from "./events";
import { hashOf, random, shuffle } from "./sample";
import { season10Kills } from "./season-10";
import { entries } from "./teams";
import type { KillRecord } from "./types";

/** How many players each tier's kill table shows. */
export const KILL_TABLE_SIZE = 20;

const placeholder: KillRecord[] = events
  .filter((e) => e.slug !== "season-10")
  .flatMap((e) => {
    const rand = random(hashOf(`${e.slug} kills`));
    const players = shuffle(
      entries.filter((r) => r.event === e.slug).flatMap((r) => r.lineup.map((l) => ({ player: l.player, team: r.team }))),
      rand,
    );
    let count = 110 + Math.floor(rand() * 30);
    return players.map((p, i): KillRecord => {
      if (i > 0) count = Math.max(0, count - Math.floor(rand() * 4));
      return { event: e.slug, ...p, kills: count };
    });
  });

export const kills: KillRecord[] = [...season10Kills, ...placeholder];
