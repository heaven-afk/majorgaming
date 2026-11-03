import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AppShell from "@/components/fantasy/game/AppShell";
import { NameForm } from "@/components/fantasy/game/AuthForms";
import { fantasyPage } from "@/content/fantasy";
import { signOut } from "@/lib/fantasy/actions";
import { getGame } from "@/lib/fantasy/game";
import { requireManager } from "@/lib/fantasy/session";

export const metadata: Metadata = { title: "Account · MGL Fantasy" };
const copy = fantasyPage.account;

async function Account() {
  const [manager, game] = await Promise.all([requireManager("/fantasy/account"), getGame()]);
  return (
    <AppShell game={game} manager={manager} title={<>{copy.title.before} <em>{copy.title.accent}</em></>}>
      <div className="fx-settings">
        <section className="fx-panel" aria-labelledby="fx-acc-name">
          <div className="fx-panel__head">
            <h2 id="fx-acc-name">{copy.name}</h2>
          </div>
          <NameForm current={manager.displayName} />
        </section>
        <section className="fx-panel" aria-labelledby="fx-acc-login">
          <div className="fx-panel__head">
            <h2 id="fx-acc-login">Sign-in</h2>
          </div>
          <dl className="fx-account">
            <div>
              <dt>{copy.email}</dt>
              <dd>{manager.email}</dd>
            </div>
            <div>
              <dt>{copy.password}</dt>
              <dd>
                <Link className="fx-link" href="/fantasy/forgot">
                  {copy.passwordHint}
                </Link>
              </dd>
            </div>
          </dl>
          <form action={signOut}>
            <button className="fx-btn fx-btn--ghost">{copy.signOut}</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="fx-loading" aria-busy="true">
          <span className="fx-spinner" />
        </div>
      }
    >
      <Account />
    </Suspense>
  );
}
