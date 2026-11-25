import IndexResultsForm from "./IndexResultsForm";
import type { ResultLink } from "@/lib/index-results/store";
import { teamsIn, uncheckedTeams } from "@/lib/index-results/match";
import { parseIndexSnapshot } from "@/lib/index-results/contract";
import { indexCatalog, indexConfigured, IndexResultsError } from "@/lib/index-results/client";

/** One table's live results: its link, how its teams match, and the tournaments it could use. */
export default async function IndexResultsPanel({ event, table, links, teamIds }: {
  event: { slug: string; status: string }; table: { id: string; name: string };
  /** Every link on the event; null when they can't be read. */
  links: ResultLink[] | null; teamIds: string[];
}) {
  if (links === null) {
    return <section className="ad-card"><p className="ad-alert ad-alert--error">Live results are unavailable. Check that the tier results migration is applied in MGL Supabase.</p></section>;
  }
  const link = links.find(link => link.table_id === table.id);
  const legacy = links.some(link => link.table_id !== null) ? undefined : links.find(link => link.table_id === null && link.enabled);
  let teams = { sent: 0, matched: 0, unchecked: 0 };
  if (link?.snapshot) {
    try {
      const snapshot = parseIndexSnapshot(link.snapshot, link.tournament_id);
      const matches = link.team_matches ?? {};
      const known = new Set(teamIds);
      const sent = teamsIn(snapshot);
      teams = {
        sent: sent.length,
        matched: sent.filter(({ id }) => Object.hasOwn(matches, id) && matches[id] !== null && known.has(matches[id])).length,
        unchecked: uncheckedTeams(snapshot, matches, known).length,
      };
    } catch { /* An unreadable snapshot has no teams to check; syncing replaces it. */ }
  }
  let events: Awaited<ReturnType<typeof indexCatalog>> = [];
  let message: string | undefined;
  if (!indexConfigured()) {
    message = "Set HSE_BASE_URL and MGL_RESULTS_API_KEY in MGL’s server environment.";
  } else {
    try {
      events = await indexCatalog();
      if (!events.length) message = "Heaven Index has no tournaments listed under Major Gaming League yet.";
    } catch (error) {
      message = error instanceof IndexResultsError ? error.message : "Heaven Index returned an invalid tournament list.";
    }
  }
  const saved = (link ?? legacy)?.snapshot;
  return (
    <IndexResultsForm
      key={table.id}
      slug={event.slug}
      tableId={table.id}
      tableName={table.name}
      status={event.status}
      events={events}
      current={link?.tournament_id}
      enabled={link?.enabled ?? false}
      legacy={Boolean(legacy)}
      teams={teams}
      savedName={saved?.event.name}
      savedStatus={saved?.completed ? "Final" : saved?.event.status}
      syncedAt={(link ?? legacy)?.synced_at}
      message={message}
    />
  );
}
