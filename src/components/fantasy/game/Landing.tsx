import Link from "next/link";
import Footer from "@/components/footer/Footer";
import MeshGradient from "@/components/hero/MeshGradient";
import { Icon } from "@/components/Icons";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import { fantasyPage } from "@/content/fantasy";
import type { Game, Standings } from "@/lib/fantasy/game";
import { getSettings } from "@/lib/settings";
import { statusOf, StandingsTable } from "./Chrome";
import { Countdown } from "./Countdown";
import { Headshot } from "./Headshot";
import { SquadSheet, type CardPlayer } from "./Pieces";

const copy = fantasyPage.landing;

/**
 * Signed out: what MGL Fantasy is, inside the site's own nav and footer so it reads as part of
 * MGL. A hero with a live-looking team sheet, how it works, the rules beside the table, and an
 * invitation for other rankings to run their tournament's fantasy here.
 */
export default async function Landing({ game, cards, board }: { game: Game; cards: CardPlayer[]; board?: Standings }) {
  const { discord } = await getSettings();
  const ready = game.state === "ready" ? game : undefined;
  const status = ready ? statusOf(ready) : undefined;
  const h = copy.hero;

  return (
    <div className="page fx-site">
      <SmoothScroll />
      <Nav />
      <main>
        <section className="fx-hero" aria-labelledby="fx-hero-title">
          <div className="tile fx-hero__copy">
            <div className="fx-hero__top">
              <span className="label">
                <i />
                {copy.label}
              </span>
              <span className="fx-status" data-tone={status?.tone ?? "soon"}>
                <i />
                {status?.label ?? h.offStatus}
              </span>
            </div>
            <div className="fx-hero__body">
              <h1 className="fx-hero__title" id="fx-hero-title">
                {h.title.before} <em>{h.title.accent}</em>
              </h1>
              <p className="fx-hero__lede">{h.lede}</p>
              <div className="fx-cta-row">
                <Link className="fx-btn fx-btn--primary fx-btn--lg" href="/fantasy/join">
                  {h.join}
                  <Icon name="arrow" size={17} />
                </Link>
                <Link className="fx-btn fx-btn--ghost fx-btn--lg" href="/fantasy/login">
                  {h.signIn}
                </Link>
              </div>
            </div>
            {ready && (
              <dl className="fx-hero__facts">
                {ready.open && ready.current.submissionDeadline && (
                  <div className="fx-hero__deadline">
                    <dt>
                      {h.facts.deadline} · Matchday {ready.current.matchdayNumber}
                    </dt>
                    <dd>
                      <Countdown to={ready.current.submissionDeadline} compact />
                    </dd>
                  </div>
                )}
                {board && board.totalCount > 0 && (
                  <div>
                    <dt>{h.facts.managers}</dt>
                    <dd>{board.totalCount.toLocaleString("en-GB")}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="mesh-panel fx-hero__art">
            <MeshGradient />
            <div className="grain" aria-hidden />
            <SquadSheet players={cards} matchday={ready?.current.matchdayNumber} />
          </div>
        </section>

        <section className="fx-steps" aria-labelledby="fx-steps-title">
          <header className="fx-section-head fx-section-head--bare">
            <span className="label">
              <i />
              {copy.steps.label}
            </span>
            <h2 className="fx-display" id="fx-steps-title">
              {copy.steps.title.before} <em>{copy.steps.title.accent}</em>
            </h2>
          </header>
          <ol className="fx-steps__list">
            {copy.steps.items.map((s, i) => (
              <li key={s.n} className="tile fx-step">
                <div className="fx-step__art" aria-hidden>
                  {i === 0 && <PickArt cards={cards} />}
                  {i === 1 && <CaptainArt p={cards[0]} />}
                  {i === 2 && <ClimbArt />}
                </div>
                <span className="fx-step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="fx-duo">
          <div className="tile fx-rules" aria-labelledby="fx-rules-title">
            <span className="label" id="fx-rules-title">
              <i />
              {copy.rules.label}
            </span>
            <ul>
              {copy.rules.items.map((r) => (
                <li key={r.label}>
                  <span className="fx-rules__icon">
                    <Icon name={r.icon} size={17} />
                  </span>
                  <b>{r.value}</b>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="tile fx-board-tile" aria-labelledby="fx-board-title">
            <div className="fx-board-tile__head">
              <div>
                <span className="label">
                  <i />
                  {copy.board.label}
                </span>
                <h2 className="fx-board-tile__title" id="fx-board-title">
                  {copy.board.title.before} <em>{copy.board.title.accent}</em>
                </h2>
              </div>
              {ready && (
                <Link className="fx-link" href="/fantasy/standings">
                  {copy.board.cta}
                  <Icon name="arrow" size={14} />
                </Link>
              )}
            </div>
            {board && board.rows.length ? <StandingsTable rows={board.rows.slice(0, 5)} compact /> : <p className="fx-empty">{copy.board.empty}</p>}
          </div>
        </section>
        <section className="mesh-panel fx-host" aria-labelledby="fx-host-title">
          <MeshGradient />
          <div className="grain" aria-hidden />
          <div className="fx-host__copy">
            <span className="label label--ink">
              <i />
              {copy.host.label}
            </span>
            <h2 className="fx-host__title" id="fx-host-title">
              {copy.host.title.before} <em>{copy.host.title.accent}</em>
            </h2>
            <p>{copy.host.body}</p>
          </div>
          <a className="btn-dark fx-host__cta" href={discord} target="_blank" rel="noreferrer">
            {copy.host.cta}
            <Icon name="arrow" size={16} />
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/** Step one: five slots filling from the market, and the budget they use. */
function PickArt({ cards }: { cards: CardPlayer[] }) {
  const roles = ["FRG", "IGL", "SUP", "ANC", "SUB"];
  return (
    <div className="fx-art-pick">
      <ul>
        {roles.map((r, k) => (
          <li key={r} style={{ "--k": k } as React.CSSProperties}>
            <Headshot src={cards[k]?.photo} size={38} />
            <span>{r}</span>
            {cards[k]?.price !== undefined && <small>{cards[k].price!.toFixed(1)}</small>}
          </li>
        ))}
      </ul>
      <div className="fx-art-pick__meter">
        <span>Budget</span>
        <i />
        <b>100 cr</b>
      </div>
    </div>
  );
}

/** Step two: the captain's points doubling. */
function CaptainArt({ p }: { p?: CardPlayer }) {
  return (
    <div className="fx-art-cap">
      <div className="fx-art-cap__row">
        <Headshot src={p?.photo} size={44} />
        <span>
          <strong>{p?.name ?? "Your captain"}</strong>
          <small>{p?.team ?? "Fragger"}</small>
        </span>
        <span className="fx-cap">C</span>
      </div>
      <div className="fx-art-cap__pts">
        <span>24</span>
        <Icon name="arrow" size={16} />
        <b>48</b>
      </div>
    </div>
  );
}

/** Step three: your row climbing a small table. */
function ClimbArt() {
  return (
    <ol className="fx-art-climb">
      {[0, 1, 2].map((k) => (
        <li key={k} data-you={k === 2 ? "" : undefined} style={{ "--k": k } as React.CSSProperties}>
          <span className="fx-art-climb__rank" />
          {k === 2 ? <strong>You</strong> : <i />}
          <b>{[227, 219, 231][k]}</b>
        </li>
      ))}
    </ol>
  );
}
