import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ActionForm from "@/components/admin/ActionForm";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import EventTabs from "@/components/admin/EventTabs";
import { Icon } from "@/components/Icons";
import { PROMOTION } from "@/content/admin";
import { carryOver } from "@/lib/admin/actions/entries";
import { getEvent, listEvents } from "@/lib/admin/events";
import { listEntries, standingsOf, type EntryRow } from "@/lib/admin/league";
import { requireAdmin } from "@/lib/admin/session";

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

/**
 * Where each squad from an earlier event should play now: its tier, moved up or down by that
 * event's promotion and relegation numbers, from its place in its tier's final table.
 */
async function carryPlan(token: string, fromSlug: string, maxTier: number) {
  const from = await getEvent(token, fromSlug);
  if (!from) return undefined;
  const [entries, standings] = await Promise.all([listEntries(token, from.id), standingsOf(token, from.id)]);
  const tierCount = Math.max(maxTier, ...from.event_tables.map((t) => t.tier ?? 0));
  // Seasons that never set their numbers use the league default.
  const promote = from.kind === "season" ? (from.promote ?? PROMOTION.promote) : 0;
  const relegate = from.kind === "season" ? (from.relegate ?? PROMOTION.relegate) : 0;
  return {
    from,
    promote,
    relegate,
    rows: entries.map((e) => {
      const table = from.event_tables.find((t) => t.tier === e.tier);
      const rows = table ? standings.filter((s) => s.table_id === table.id) : [];
      const index = rows.findIndex((s) => s.entry_id === e.id);
      const place = index >= 0 ? index + 1 : undefined;
      let tier = e.tier;
      let move: "up" | "down" | undefined;
      if (tier && place) {
        if (promote && tier > 1 && place <= promote) {
          tier -= 1;
          move = "up";
        } else if (relegate && tier < tierCount && place > rows.length - relegate) {
          tier += 1;
          move = "down";
        }
      }
      return { entry: e, place, tier: tier && tier <= maxTier ? tier : null, move };
    }),
  };
}

/** One registered squad. Finished events often have no rosters on record (the sheets never had them), so only current ones flag it. */
function SquadRow({ e, slug, past }: { e: EntryRow; slug: string; past: boolean }) {
  const captain = e.entry_players.find((p) => p.captain);
  return (
    <li>
      <Link href={`/admin/events/${slug}/squads/${e.team.slug}`} className="ad-row">
        <span className="ad-row__crest" aria-hidden>
          {e.team.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
            <img src={e.team.logo_url} alt="" />
          ) : (
            e.team.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="ad-row__main">
          <strong>{e.team.name}</strong>
          <span>
            {e.entry_players.length ? `${e.entry_players.length} ${e.entry_players.length === 1 ? "player" : "players"}` : past ? "Roster not on record" : "No players yet"}
            {captain && ` · Captain ${captain.person.name}`}
            {e.manager && ` · Manager ${e.manager}`}
          </span>
        </span>
        {e.entry_players.length === 0 && !past && (
          <span className="ad-chip" data-tone="upcoming">
            No roster
          </span>
        )}
        <Icon name="chevron" size={16} className="ad-row__go" />
      </Link>
    </li>
  );
}

async function Squads({ params, searchParams }: PageProps<"/admin/events/[slug]/squads">) {
  const [admin, { slug }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  const event = await getEvent(admin.token, slug);
  if (!event) notFound();
  const [entries, events] = await Promise.all([listEntries(admin.token, event.id), listEvents(admin.token)]);
  const maxTier = event.format === "tiers" ? event.event_tables.filter((t) => t.tier !== null).length : 0;

  const byTier = new Map<number | null, EntryRow[]>();
  for (const e of entries) byTier.set(e.tier, [...(byTier.get(e.tier) ?? []), e]);
  const groups = [...byTier].sort(([a], [b]) => (a ?? 99) - (b ?? 99));

  // Earlier events to bring squads from: the one just before this, unless another is picked.
  const older = events.filter((e) => e.sort_order > event.sort_order && (e.entries[0]?.count ?? 0) > 0);
  const fromSlug = typeof query.from === "string" ? query.from : older[0]?.slug;
  const plan = fromSlug ? await carryPlan(admin.token, fromSlug, maxTier) : undefined;
  const here = new Set(entries.map((e) => e.team_id));

  return (
    <>
      <EventTabs slug={slug} name={event.name} active="Squads" note={`${entries.length} squads registered`}>
        <Link href={`/admin/events/${slug}/squads/new`} className="ad-btn ad-btn--primary">
          <Icon name="plus" size={16} /> Add team
        </Link>
      </EventTabs>

      {query.added && (
        <p className="ad-alert ad-alert--ok" role="status">
          {query.added} squads brought over.
        </p>
      )}
      {query.removed && (
        <p className="ad-alert ad-alert--ok" role="status">
          Squad removed from the event.
        </p>
      )}

      {entries.length === 0 ? (
        <p className="ad-empty">No teams yet. Add one, or bring squads over from an earlier event below.</p>
      ) : (
        groups.map(([tier, list]) => (
          <section key={tier ?? "none"} className="ad-group">
            <h2>
              {tier ? `Tier ${tier}` : maxTier ? "No tier yet" : "Squads"} <small>{list.length}</small>
            </h2>
            <ul className="ad-rows">
              {list.map((e) => (
                <SquadRow key={e.id} e={e} slug={slug} past={event.status === "final"} />
              ))}
            </ul>
          </section>
        ))
      )}

      {older.length > 0 && plan && (
        <details className="ad-section ad-carry" open={entries.length === 0}>
          <summary>
            <span>
              <strong>Bring squads over</strong>
              <small>Copy squads, rosters and managers from an earlier event{plan.promote || plan.relegate ? ", with promotion and relegation applied" : ""}.</small>
            </span>
          </summary>
          <form className="ad-carry__from" action={`/admin/events/${slug}/squads`}>
            <label className="ad-field">
              <span>From</span>
              <select name="from" defaultValue={plan.from.slug}>
                {older.map((e) => (
                  <option key={e.id} value={e.slug}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="ad-btn ad-btn--quiet">Show</button>
          </form>
          {plan.from.format === "tiers" && plan.from.kind === "season" && (
            <p className="ad-note">
              {plan.promote || plan.relegate
                ? `From ${plan.from.name}: the top ${plan.promote} of each tier move up and the bottom ${plan.relegate} move down. Change any squad's tier below before bringing them over.`
                : `${plan.from.name} has promotion and relegation set to 0, so every squad keeps its tier.`}{" "}
              <Link className="ad-link" href={`/admin/events/${plan.from.slug}`}>
                Change the numbers
              </Link>
            </p>
          )}
          <ActionForm action={carryOver.bind(null, slug, event.id, plan.from.id)} submit="Bring them over" pending="Bringing over…" className="ad-carry__form">
            <ul className="ad-carry__list">
              {plan.rows.map(({ entry: e, place, tier, move }) => (
                <li key={e.id} data-off={here.has(e.team_id) ? "" : undefined}>
                  <span className="ad-carry__name">
                    <strong>{e.team.name}</strong>
                    <small>
                      {e.tier ? `Tier ${e.tier}` : "No tier"}
                      {place && ` · finished ${ordinal(place)}`} · {e.entry_players.length} players
                    </small>
                  </span>
                  {move && (
                    <span className="ad-chip" data-tone={move === "up" ? "live" : undefined}>
                      {move === "up" ? "↑ Promoted" : "↓ Relegated"}
                    </span>
                  )}
                  {here.has(e.team_id) ? (
                    <span className="ad-note">Already in</span>
                  ) : (
                    <select name="carry" aria-label={`Tier for ${e.team.name}`} defaultValue={`${e.id}:${tier ?? (maxTier ? "" : "0")}`}>
                      <option value={`${e.id}:`}>Don&apos;t bring</option>
                      {maxTier ? (
                        Array.from({ length: maxTier }, (_, i) => (
                          <option key={i} value={`${e.id}:${i + 1}`}>
                            Tier {i + 1}
                          </option>
                        ))
                      ) : (
                        <option value={`${e.id}:0`}>Bring</option>
                      )}
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </ActionForm>
        </details>
      )}
    </>
  );
}

export default function SquadsPage(props: PageProps<"/admin/events/[slug]/squads">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminShell active="Events">
        <Suspense fallback={<AdminLoading />}>
          <Squads {...props} />
        </Suspense>
      </AdminShell>
    </Suspense>
  );
}
