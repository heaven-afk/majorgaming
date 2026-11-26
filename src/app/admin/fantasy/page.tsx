import Link from "next/link";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import AdminShell, { AdminLoading, OwnerOnly } from "@/components/admin/AdminShell";
import { isOwner, requireAdmin } from "@/lib/admin/session";
import { Section } from "@/components/admin/Form";
import TransferWindow from "@/components/admin/TransferWindow";
import FantasyLaunch from "@/components/admin/FantasyLaunch";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import { getFantasyAdminOverview } from "@/lib/fantasy/admin";
import { getFantasyLiveAt } from "@/lib/fantasy/launch";
import { currentTournament, currentMatchday, launchReady } from "@/lib/fantasy/lifecycle.mjs";
import type { FantasyMatchday } from "@/lib/fantasy/client";
import "./fantasy-admin.css";

const date = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(iso)) : copy.missingDeadline;

async function Overview() {
  if (!isOwner(await requireAdmin())) return <OwnerOnly />;
  let state;
  try { state = await getFantasyAdminOverview(); }
  catch (err) { unstable_rethrow(err); return <p className="ad-alert ad-alert--error" role="alert">{copy.unavailable}</p>; }
  const tournament = currentTournament(state.tournaments);
  const liveAt = tournament && !state.preview ? await getFantasyLiveAt(tournament.id).catch(() => null) : null;
  const first = state.matchdays.find(day => day.matchdayNumber === 1);
  const canLaunch = state.configured && !state.preview && launchReady(tournament, first, state.market);
  const day = currentMatchday(state.matchdays) as FantasyMatchday | undefined;
  const eligible = state.market?.players.filter(p => p.isEligible).length ?? 0;
  const transferDays = state.matchdays.filter(day => day.splitWindows && day.marketStatus === "OPEN" &&
    day.fantasyStatus === "DISCOVERED" && !day.matchesPlayed && Date.parse(day.matchdayStartsAt ?? "") > Date.now());
  return <div className="ad-fx">
    <p className="ad-fx-mode">{state.preview ? copy.preview : copy.live}</p>
    <Section title={copy.current}>
      {tournament ? <>
        <h3>{tournament.name}</h3>
        {day ? <>
          <p>{copy.matchday} {day.matchdayNumber}</p>
          <dl className="ad-fx-facts">
            <div><dt>{copy.matchdayStatus}</dt><dd>{day.matchdayStartsAt && Date.parse(day.matchdayStartsAt) <= Date.now() ? copy.marketStates.LOCKED : day.marketStatus === "OPEN" ? copy.scheduled : day.marketStatus ? copy.marketStates[day.marketStatus] : "—"}</dd></div>
            <div><dt>{copy.scoring}</dt><dd>{copy.scoringStates[day.fantasyStatus]}</dd></div>
            <div><dt>{copy.pool}</dt><dd>{state.market && state.market.status !== "DRAFT" ? (day.pricesPublishedAt || state.market.pricesFrozenAt ? copy.published + " · " + date(day.pricesPublishedAt || state.market.pricesFrozenAt) : copy.published) : copy.awaitingPublication}</dd></div>
            <div><dt>{copy.buildSquadDeadline}</dt><dd>{date(day.splitWindows ? day.buildSquadDeadline ?? null : day.submissionDeadline)}</dd></div>
            <div><dt>{copy.matchdayStart}</dt><dd>{date(day.matchdayStartsAt ?? null)}</dd></div>
            <div><dt>{copy.players}</dt><dd>{eligible}</dd></div>
          </dl>
          {!state.market && <p>{copy.noMarket}</p>}

        </> : <p>{copy.noMatchday}</p>}
      </> : <><h3>{copy.none}</h3><p>{copy.empty}</p></>}
    </Section>
    {tournament && <Section title={copy.launchTitle}>
      <FantasyLaunch tournamentId={tournament.id} live={Boolean(liveAt)} ready={canLaunch} />
    </Section>}
    {tournament && <Section title={copy.transfers}>
      <p>{copy.transferRule}</p>
      {transferDays.map(day =>
        <TransferWindow key={[day.tournamentId, day.matchdayNumber, day.transfersOpenAt, day.transfersCloseAt].join(":")} day={day} disabled={!state.configured || state.preview}/>)}
      {!transferDays.length && <p>{copy.transfersUnavailable}</p>}
    </Section>}
    {state.matchdays.length > 0 && <Section title={copy.matchdays}>
      <div className="ad-fx-days">{state.matchdays.map((m: FantasyMatchday) => <div key={m.matchdayNumber}><strong>{copy.matchday} {m.matchdayNumber}</strong><span>{m.marketStatus ? copy.marketStates[m.marketStatus] : "—"} · {copy.scoringStates[m.fantasyStatus]}</span><small>{date(m.splitWindows ? m.matchdayStartsAt ?? null : m.submissionDeadline)}</small></div>)}</div>
    </Section>}
    <Section title={copy.connection} lede={copy.configHint}>
      <dl className="ad-fx-config">{(Object.keys(state.configuration) as (keyof typeof state.configuration)[]).map(key => <div key={key}><dt>{copy.config[key]}</dt><dd data-ready={state.configuration[key] ? "" : undefined}>{state.configuration[key] ? copy.ready : copy.missing}</dd></div>)}</dl>
    </Section>
    <Section title={copy.flowTitle}><ol className="ad-fx-flow">{copy.flow.map(step => <li key={step}>{step}</li>)}</ol></Section>
  </div>;
}

export default function FantasyAdminPage() {
  return <Suspense fallback={<AdminLoading />}><AdminShell active="Fantasy">
    <header className="ad-head"><div><h1>{copy.title}</h1><p>{copy.lede}</p></div><div className="ad-fx-actions"><a className="ad-btn" href="/admin/fantasy">{copy.refresh}</a><Link className="ad-btn ad-btn--quiet" href="/fantasy">{copy.view}</Link></div></header>
    <Suspense fallback={<AdminLoading />}><Overview /></Suspense>
  </AdminShell></Suspense>;
}
