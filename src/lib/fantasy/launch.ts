import "server-only";
import { publicRpc } from "@/lib/admin/supabase";

export async function getFantasyLiveAt(tournamentId: string) {
  return publicRpc<string | null>("fantasy_live_at", { p_tournament_id: tournamentId });
}
