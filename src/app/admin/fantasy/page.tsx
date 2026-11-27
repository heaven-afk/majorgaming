import Link from "next/link";
import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import AdminShell, { AdminLoading, OwnerOnly } from "@/components/admin/AdminShell";
import { isOwner, requireAdmin } from "@/lib/admin/session";
import FantasyAdminView from "@/components/admin/FantasyAdminView";
import { Icon } from "@/components/Icons";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import { getFantasyAdminOverview } from "@/lib/fantasy/admin";
import { getFantasyLiveAt } from "@/lib/fantasy/launch";
import { currentTournament, launchReady } from "@/lib/fantasy/lifecycle.mjs";
import "./fantasy-admin.css";

// Read once per request (this page renders after the admin check, never prerendered).
const requestTime = () => Date.now();

async function Overview() {
  if (!isOwner(await requireAdmin())) return <OwnerOnly />;
  let state;
  try { state = await getFantasyAdminOverview(); }
  catch (err) { unstable_rethrow(err); return <p className="ad-alert ad-alert--error" role="alert">{copy.unavailable}</p>; }
  const tournament = currentTournament(state.tournaments);
  const liveAt = tournament && !state.preview ? await getFantasyLiveAt(tournament.id).catch(() => null) : null;
  const first = state.matchdays.find(day => day.matchdayNumber === 1);
  const canLaunch = state.configured && !state.preview && launchReady(tournament, first, state.market);
  return <FantasyAdminView state={state} live={Boolean(liveAt)} canLaunch={canLaunch} now={requestTime()} />;
}

export default function FantasyAdminPage() {
  return <Suspense fallback={<AdminLoading />}><AdminShell active="Fantasy">
    <header className="ad-head">
      <div><h1>{copy.title}</h1><p>{copy.lede}</p></div>
      <div className="ad-fx-actions">
        <a className="ad-btn" href="/admin/fantasy"><Icon name="undo" size={15} />{copy.refresh}</a>
        <Link className="ad-btn ad-btn--quiet" href="/fantasy">{copy.view}<Icon name="arrow" size={15} /></Link>
      </div>
    </header>
    <Suspense fallback={<AdminLoading />}><Overview /></Suspense>
  </AdminShell></Suspense>;
}
