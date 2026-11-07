import Link from "next/link";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import AdminShell, { AdminLoading } from "@/components/admin/AdminShell";
import { Section } from "@/components/admin/Form";
import { FantasyControls } from "@/components/admin/FantasyControls";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import { getFantasyAdminOverview } from "@/lib/fantasy/admin";
import { currentTournament, currentMatchday, tournamentState, windowActionAllowed } from "@/lib/fantasy/lifecycle.mjs";
import type { FantasyMatchday } from "@/lib/fantasy/client";
import "./fantasy-admin.css";

const date = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(iso)) : copy.missingDeadline;

async function Overview() {
  let state;
  try { state = await getFantasyAdminOverview(); }
  catch (err) { unstable_rethrow(err); return <p className="ad-alert ad-alert--error" role="alert">{copy.unavailable}</p>; }
  const tournament = currentTournament(state.tournaments);
  const day = currentMatchday(state.matchdays) as FantasyMatchday | undefined;
  const canControl = state.configured && !state.preview && Boolean(state.market);
  const eligible = state.market?.players.filter(p => p.isEligible).length ?? 0;
  const available = {
    open: Boolean(canControl && windowActionAllowed(day, "open") && eligible >= 5 && tournament && tournamentState(tournament) !== "done"),
    lock: Boolean(canControl && windowActionAllowed(day, "lock")),
    close: Boolean(canControl && windowActionAllowed(day, "close")),
  };
  return <div className="ad-fx">
    <p className="ad-fx-mode">{state.preview ? copy.preview : copy.live}</p>
    <Section title={copy.current}>
      {tournament ? <>
        <h3>{tournament.name}</h3>
        {day ? <>
          <p>{copy.matchday} {day.matchdayNumber}</p>
          <dl className="ad-fx-facts">
            <div><dt>{copy.market}</dt><dd>{day.marketStatus ? copy.marketStates[state.market?.status ?? day.marketStatus] : "—"}</dd></div>
            <div><dt>{copy.scoring}</dt><dd>{copy.scoringStates[day.fantasyStatus]}</dd></div>
            <div><dt>{copy.deadline}</dt><dd>{date(day.submissionDeadline)}</dd></div>
            <div><dt>{copy.players}</dt><dd>{eligible}</dd></div>
          </dl>
          {!state.market && <p>{copy.noMarket}</p>}
          <FantasyControls key={`${tournament.id}-${day.matchdayNumber}-${day.marketStatus}-${day.submissionDeadline}`} tournamentId={tournament.id} day={day} available={available} />
        </> : <p>{copy.noMatchday}</p>}
      </> : <><h3>{copy.none}</h3><p>{copy.empty}</p></>}
    </Section>
    {state.matchdays.length > 0 && <Section title={copy.matchdays}>
      <div className="ad-fx-days">{state.matchdays.map((m: FantasyMatchday) => <div key={m.matchdayNumber}><strong>{copy.matchday} {m.matchdayNumber}</strong><span>{m.marketStatus ? copy.marketStates[m.marketStatus] : "—"} · {copy.scoringStates[m.fantasyStatus]}</span><small>{date(m.submissionDeadline)}</small></div>)}</div>
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
