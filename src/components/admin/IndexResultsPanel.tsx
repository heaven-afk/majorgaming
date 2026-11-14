import { Section } from "./Form";
import IndexResultsForm from "./IndexResultsForm";
import { getAdminLinks } from "@/lib/index-results/store";
import { indexCatalog, indexConfigured, IndexResultsError } from "@/lib/index-results/client";

export default async function IndexResultsPanel({ event, table, token }: { event: { id: string; slug: string }; table: { id: string; name: string }; token: string }) {
  const links = await getAdminLinks(token, event.id).catch(() => null);
  const title = "Heaven Index · " + table.name;
  if (links === null) {
    return <Section title={title}><p>The results link is unavailable. Check that the tier results migration is applied in MGL Supabase.</p></Section>;
  }
  const link = links.find(link => link.table_id === table.id);
  const legacy = links.some(link => link.table_id !== null) ? undefined : links.find(link => link.table_id === null && link.enabled);
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
  return (
    <Section title={title} lede={legacy ? "Choosing this tier’s tournament switches the event to per-tier links. Other tiers will show their saved manual sheets until linked." : "Choose the Heaven Index tournament for this table. You can switch back to the saved spreadsheet at any time."}>
      <IndexResultsForm
        key={table.id + (link?.synced_at ?? "")}
        slug={event.slug}
        tableId={table.id}
        events={events}
        current={link?.tournament_id}
        enabled={link?.enabled ?? false}
        legacy={Boolean(legacy)}
        savedName={(link ?? legacy)?.snapshot?.event.name}
        syncedAt={(link ?? legacy)?.synced_at}
        completed={(link ?? legacy)?.snapshot?.completed ?? false}
        message={message}
      />
    </Section>
  );
}
