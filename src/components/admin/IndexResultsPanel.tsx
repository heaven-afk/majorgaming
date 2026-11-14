import { Section } from "./Form";
import IndexResultsForm from "./IndexResultsForm";
import { getAdminLink } from "@/lib/index-results/store";
import { indexCatalog, indexConfigured } from "@/lib/index-results/client";

export default async function IndexResultsPanel({ event, token }: { event: { id: string; slug: string }; token: string }) {
  const link = await getAdminLink(token, event.id).catch(() => null);
  if (link === null) {
    return <Section title="Heaven Index results"><p>The results link is unavailable. Check the database migration and try again.</p></Section>;
  }
  const events = indexConfigured() ? await indexCatalog().catch(() => null) : null;
  const message = !indexConfigured() ? "Configure the Heaven Index connection to link a tournament."
    : events === null ? "The Heaven Index tournament list is unavailable."
    : events.length === 0 ? "Heaven Index has no tournaments listed under Major Gaming League yet." : undefined;
  return (
    <Section title="Heaven Index results" lede="Link the matching tournament to display its results. Manual spreadsheets stay saved and can be displayed again at any time.">
      <IndexResultsForm
        key={link?.synced_at ?? "unlinked"}
        slug={event.slug}
        events={events ?? []}
        current={link?.tournament_id}
        enabled={link?.enabled ?? false}
        savedName={link?.snapshot?.event.name}
        syncedAt={link?.synced_at}
        completed={link?.snapshot?.completed ?? false}
        message={message}
      />
    </Section>
  );
}
