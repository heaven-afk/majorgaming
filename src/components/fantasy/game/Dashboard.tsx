import Link from "next/link";
import { fantasyPage } from "@/content/fantasy";
import { BUDGET, getMine, getStandings, type Game } from "@/lib/fantasy/game";
import type { Manager } from "@/lib/fantasy/session";
import { Icon } from "@/components/Icons";
import { Ticker } from "@/components/motion/Ticker";
import { formatDeadline, statusOf, StandingsTable } from "./Chrome";
import { PlayerTile } from "./PlayerTile";
import { Countdown } from "./Countdown";
import { LiveRefresh } from "./LiveRefresh";

const copy = fantasyPage.app;
const hub = fantasyPage.hub;
type Ready = Extract<Game, { state: "ready" }>;

const CHIPS = [
  { key: "triple_captain", name: "Triple Captain", body: "Captain scores 3× for one matchday", icon: "crown" },
  { key: "bench_boost", name: "Bench Boost", body: "Your sub's points count too", icon: "squad" },
  { key: "free_transfer", name: "Free Transfer", body: "One transfer without the −4", icon: "undo" },
] as const;

/**
 * A manager's home, laid out like a dashboard: the matchday and its deadline up top, four
 * numbers, the squad as a team sheet beside the table and chips, then every matchday.
 */
export default async function Dashboard({ manager, game }: { manager: Manager; game: Ready }) {
  if (!manager.displayName)
    return (
      <section className="fx-panel fx-empty-state">
        <span className="fx-empty-state__icon">
          <Icon name="people" size={22} />
        </span>
        <h2>{hub.needName}</h2>
        <Link className="fx-btn fx-btn--primary" href="/fantasy/account">
          Pick a name
        </Link>
      </section>
    );

  const [mine, standings] = await Promise.all([getMine(manager, game), getStandings(game, { me: manager }).catch(() => undefined)]);
  const players = new Map(game.market.players.map((p) => [p.id, p]));
  const me = standings?.rows.find((r) => r.managerId === manager.id);
  const ids = mine.squad ? [...mine.squad.starters.map((s) => s.playerId), mine.squad.sub] : [];
  const left = BUDGET - ids.reduce((n, id) => n + (players.get(id)?.price ?? 0), 0);
  const days = [...game.matchdays].sort((a, b) => a.matchdayNumber - b.matchdayNumber);
  const status = statusOf(game);
  const deadline = game.current.submissionDeadline;
  const top = standings?.rows.slice(0, 5) ?? [];
  const board = me && me.rank > 5 ? [...top, me] : top;
  const cta = !game.open ? { label: "View squad", icon: "squad" } : mine.squad ? { label: hub.edit, icon: "arrow" } : { label: mine.previous ? hub.carry.title : hub.pick, icon: "arrow" };

  const leader = standings?.rows[0];
  const kpis = [
    { icon: "trophy", label: copy.kpis.rank, value: me ? <>#{me.rank.toLocaleString("en-GB")}</> : "—", note: me && standings ? copy.of(standings.totalCount) : copy.unranked },
    { icon: "fantasy", label: copy.kpis.budget, value: (mine.squad ? left : BUDGET).toFixed(1), note: mine.squad ? "in the bank" : "to spend" },
    { icon: "undo", label: copy.kpis.free, value: mine.chips.free_transfer ? "Ready" : "Used", note: mine.chips.free_transfer ? "no −4 on one" : "−4 each", tone: mine.chips.free_transfer ? "amber" : undefined },
  ];
  const SHORT = { Fragger: "FRG", IGL: "IGL", Support: "SUP", Anchor: "ANC" } as const;
  const strip = mine.squad
    ? [
        ...(["Fragger", "IGL", "Support", "Anchor"] as const).map((role) => {
          const id = mine.squad!.starters.find((s) => s.role === role)?.playerId ?? "";
          return { key: role, role: SHORT[role], p: players.get(id), captain: id === mine.squad!.captain, sub: false };
        }),
        { key: "Sub", role: "SUB", p: players.get(mine.squad.sub), captain: false, sub: true },
      ]
    : [];

  return (
    <div className="fx-dash">
      <LiveRefresh />
      <section className="fx-score" data-tone={status.tone} aria-labelledby="fx-score-title">
        <div className="fx-score__top">
          <span className="fx-status" data-tone={status.tone}>
            <i />
            {status.label}
          </span>
          <span className="fx-score__when">{deadline && game.open ? `Deadline ${formatDeadline(deadline)}` : `${game.current.matchesPlayed} of ${game.current.expectedMatches} matches played`}</span>
        </div>
        <div className="fx-score__board">
          <div className="fx-score__side">
            <small>You</small>
            <b>
              <Ticker value={mine.points.total} />
            </b>
            <span>{me ? `#${me.rank.toLocaleString("en-GB")}` : "Unranked"}</span>
          </div>
          <div className="fx-score__mid">
            <h2 id="fx-score-title">MD{game.current.matchdayNumber}</h2>
            {game.open && deadline ? <Countdown to={deadline} compact /> : <small>{status.tone === "done" ? "Scored" : "In play"}</small>}
          </div>
          <div className="fx-score__side fx-score__side--end">
            <small>Leader</small>
            <b>{leader ? leader.total : "—"}</b>
            <span>{leader ? (leader.managerId === manager.id ? hub.you : leader.name ?? hub.unnamed) : "—"}</span>
          </div>
        </div>
        <Link className="fx-btn fx-btn--primary fx-btn--lg fx-score__cta" href="/fantasy/squad">
          {cta.label}
          <Icon name={cta.icon} size={16} />
        </Link>
      </section>

      <section className="fx-kpis" aria-label="Your numbers">
        {kpis.map((k) => (
          <div key={k.label} className="fx-kpi" data-tone={k.tone}>
            <span className="fx-kpi__label">
              <span className="fx-kpi__icon">
                <Icon name={k.icon} size={14} />
              </span>
              {k.label}
            </span>
            <b>{k.value}</b>
            <small>{k.note}</small>
          </div>
        ))}
      </section>

      <div className="fx-dash__main">
        <section className="fx-panel fx-dash__squad" aria-labelledby="fx-dash-squad">
          <div className="fx-panel__head">
            <div>
              <h2 id="fx-dash-squad">Your squad</h2>
              <p>{mine.squad ? `Value ${(BUDGET - left).toFixed(1)} / ${BUDGET} cr` : `Matchday ${game.current.matchdayNumber}`}</p>
            </div>
            {mine.squad && (
              <Link className="fx-btn fx-btn--ghost fx-btn--sm" href="/fantasy/squad">
                {game.open ? hub.edit : "Open"}
                <Icon name="arrow" size={14} />
              </Link>
            )}
          </div>
          {mine.squad ? (
            <Link className="fx-strip fx-strip--link" href="/fantasy/squad" aria-label="Open your squad">
              {strip.map((s) => (
                <span key={s.key} className="fx-strip__item" data-sub={s.sub ? "" : undefined}>
                  <PlayerTile role={s.role} name={s.p?.name ?? "Unknown"} ign={s.p?.ign} team={s.p?.team.name} logo={s.p?.team.logo} photo={s.p?.photo} price={s.p?.price} captain={s.captain ? (mine.squad!.chip === "triple_captain" ? "3×" : "C") : undefined} sub={s.sub} />
                </span>
              ))}
            </Link>
          ) : (
            <div className="fx-empty-state fx-empty-state--inset">
              <span className="fx-empty-state__icon">
                <Icon name="squad" size={22} />
              </span>
              <h3>{mine.previous ? hub.carry.title : hub.noSquad.title}</h3>
              <p>{mine.previous ? hub.carry.body : hub.noSquad.body}</p>
              {game.open && (
                <Link className="fx-btn fx-btn--primary" href="/fantasy/squad">
                  {hub.pick}
                  <Icon name="arrow" size={15} />
                </Link>
              )}
            </div>
          )}
        </section>

        <div className="fx-dash__side">
          <section className="fx-panel" aria-labelledby="fx-dash-table">
            <div className="fx-panel__head">
              <div>
                <h2 id="fx-dash-table">{hub.standings}</h2>
                {standings && <p>{standings.totalCount.toLocaleString("en-GB")} managers</p>}
              </div>
              <Link className="fx-link" href="/fantasy/standings">
                {hub.seeAll}
                <Icon name="arrow" size={14} />
              </Link>
            </div>
            <StandingsTable rows={board} me={manager.id} compact />
          </section>

          <section className="fx-panel" aria-labelledby="fx-dash-chips">
            <div className="fx-panel__head">
              <div>
                <h2 id="fx-dash-chips">{copy.chips}</h2>
                <p>Once each per tournament</p>
              </div>
            </div>
            <ul className="fx-chipcards">
              {CHIPS.map((c) => {
                const on = mine.squad?.chip === c.key;
                return (
                  <li key={c.key} data-used={mine.chips[c.key] || on ? undefined : ""} data-active={on ? "" : undefined}>
                    <span className="fx-chipcards__icon">
                      <Icon name={c.icon} size={16} />
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>{on ? "Active this matchday" : c.body}</small>
                    </span>
                    <em>{on ? "On" : mine.chips[c.key] ? "Ready" : "Used"}</em>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <section className="fx-panel fx-dash__days" aria-labelledby="fx-dash-days">
        <div className="fx-panel__head">
          <div>
            <h2 id="fx-dash-days">{copy.timeline}</h2>
            <p>{game.tournament.name}</p>
          </div>
        </div>
        <div className="fx-days" role="table" aria-labelledby="fx-dash-days">
          <div className="fx-days__row fx-days__row--head" role="row">
            <span role="columnheader">Matchday</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Matches</span>
            <span role="columnheader">Deadline</span>
            <span role="columnheader">
              <span className="sr-only">Table</span>
            </span>
          </div>
          {days.map((d) => {
            const state = d.matchdayNumber === game.current.matchdayNumber ? (game.open ? "open" : "live") : d.fantasyStatus === "PROCESSED" ? "done" : "next";
            const label = { done: "Scored", open: "Transfers open", live: "In play", next: "Coming up" }[state];
            return (
              <div key={d.matchdayNumber} className="fx-days__row" role="row" data-state={state}>
                <span role="cell">
                  <b>MD{d.matchdayNumber}</b>
                </span>
                <span role="cell">
                  <span className="fx-pill" data-state={state}>
                    {label}
                  </span>
                </span>
                <span role="cell">
                  {d.matchesPlayed}/{d.expectedMatches}
                </span>
                <span role="cell">{d.submissionDeadline ? formatDeadline(d.submissionDeadline) : "—"}</span>
                <span role="cell">
                  {state === "done" && (
                    <Link className="fx-icon-link" href={`/fantasy/standings?md=${d.matchdayNumber}`} aria-label={`Matchday ${d.matchdayNumber} table`}>
                      <Icon name="arrow" size={14} />
                    </Link>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
