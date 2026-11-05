import "server-only";
import { requireAdmin } from "@/lib/admin/session";
import { getFantasyTournaments, getFantasyMatchdays, getFantasyMarket, FantasyCoreError } from "./client";
import { fantasyIdentity } from "./identity";
import { currentTournament, currentMatchday } from "./lifecycle.mjs";
import { preview } from "./preview";
import { getGame } from "./game";

/** Presence only; no credential value is returned to a component or browser. */
export function fantasyConfiguration() {
  let signing = false;
  try { fantasyIdentity(); signing = true; } catch { /* Report configuration, never PEM errors. */ }
  return {
    core: Boolean(process.env.FANTASY_CORE_URL?.trim()),
    site: Boolean(process.env.FANTASY_SITE_SLUG?.trim()),
    api: Boolean(process.env.FANTASY_PARTNER_API_KEY?.trim()),
    profile: Boolean(process.env.FANTASY_PROFILE_API_KEY?.trim()),
    signing,
  };
}

/** Used by both the page and action. The action never trusts a rendered snapshot. */
export async function readCurrentFantasy() {
  const configuration = fantasyConfiguration();
  const configured = Object.values(configuration).every(Boolean);
  if (preview) {
    const game = await getGame();
    const market = game.state === "ready" && game.market.status !== "UNPUBLISHED" ? {
      tournamentId: game.tournament.id, matchdayNumber: game.current.matchdayNumber, status: game.market.status,
      pricingVersion: "preview", lockTime: null, pricesFrozenAt: null,
      players: game.market.players.map(p => ({ playerId: p.id, playerName: p.name, ign: p.ign, teamIdAtLock: p.team.key, price: p.price, isEligible: p.eligible })),
    } : undefined;
    return { configuration, configured, preview: true, tournaments: game.state === "ready" ? game.tournaments : [], matchdays: game.state === "ready" ? game.matchdays : [], market };
  }
  if (!configuration.core || !configuration.site || !configuration.api) return { configuration, configured, preview: false, tournaments: [], matchdays: [], market: undefined };
  const { tournaments } = await getFantasyTournaments(true);
  const tournament = currentTournament(tournaments);
  const matchdays = tournament ? (await getFantasyMatchdays(tournament.id, true)).matchdays : [];
  const day = currentMatchday(matchdays);
  let market;
  if (tournament && day) {
    try { market = await getFantasyMarket(tournament.id, day.matchdayNumber, true); }
    catch (err) { if (!(err instanceof FantasyCoreError && err.status === 404)) throw err; }
  }
  return { configuration, configured, preview: false, tournaments, matchdays, market };
}

export async function getFantasyAdminOverview() {
  await requireAdmin();
  return readCurrentFantasy();
}
