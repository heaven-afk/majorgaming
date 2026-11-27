import { Icon } from "@/components/Icons";
import TransferWindow from "@/components/admin/TransferWindow";
import FantasyLaunch from "@/components/admin/FantasyLaunch";
import { fantasyAdminCopy as copy } from "@/content/fantasy-admin";
import { currentTournament, currentMatchday } from "@/lib/fantasy/lifecycle.mjs";
import type { FantasyMarket, FantasyMatchday, FantasyTournament } from "@/lib/fantasy/client";

export type FantasyAdminState = {
  configuration: Record<"core" | "site" | "api" | "profile" | "signing", boolean>;
  configured: boolean;
  preview: boolean;
  tournaments: FantasyTournament[];
  matchdays: FantasyMatchday[];
  market?: FantasyMarket;
};

type Tone = "ok" | "amber" | "live" | "muted" | "error";

const lagos = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
const when = (iso?: string | null) => (iso && Number.isFinite(Date.parse(iso)) ? lagos.format(new Date(iso)) : null);

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="ad-fx-pill" data-tone={tone}>
      <i aria-hidden />
      {children}
    </span>
  );
}

/** Where a matchday stands, in a word and a colour. */
function dayState(day: FantasyMatchday, now: number): { label: string; tone: Tone } {
  if (day.fantasyStatus === "FAILED") return { label: copy.scoringStates.FAILED, tone: "error" };
  if (day.fantasyStatus === "PROCESSED") return { label: copy.scoringStates.PROCESSED, tone: "ok" };
  if (day.fantasyStatus === "PROCESSING" || day.fantasyStatus === "COMPLETED") return { label: copy.scoringStates[day.fantasyStatus], tone: "amber" };
  const started = day.matchesPlayed > 0 || day.marketStatus === "LOCKED" || Boolean(day.matchdayStartsAt && Date.parse(day.matchdayStartsAt) <= now);
  if (started) return { label: copy.inPlay, tone: "live" };
  if (day.marketStatus === "OPEN") return { label: copy.marketOpen, tone: "amber" };
  if (day.marketStatus === "CLOSED") return { label: copy.marketStates.CLOSED, tone: "muted" };
  return { label: copy.notPublished, tone: "muted" };
}

/** The transfer window MGL set for a matchday, in a word. */
function windowState(day: FantasyMatchday, now: number) {
  if (!day.splitWindows) return copy.window.notSplit;
  const opens = Date.parse(day.transfersOpenAt ?? "");
  const closes = Math.min(Date.parse(day.transfersCloseAt ?? ""), Date.parse(day.matchdayStartsAt ?? ""));
  if (!Number.isFinite(opens)) return copy.window.unset;
  if (now < opens) return copy.window.scheduled;
  return Number.isFinite(closes) && now < closes ? copy.window.open : copy.window.closed;
}

/**
 * Admin → Fantasy, laid out to be worked with: the tournament and its launch checklist up top,
 * the current matchday, transfer windows, then every matchday and the connection. Data and
 * actions come from the page; this only lays them out.
 */
export default function FantasyAdminView({ state, live, canLaunch, now }: { state: FantasyAdminState; live: boolean; canLaunch: boolean; now: number }) {
  const tournament = currentTournament(state.tournaments) as FantasyTournament | undefined;
  const day = currentMatchday(state.matchdays, now) as FantasyMatchday | undefined;
  const first = state.matchdays.find((m) => m.matchdayNumber === 1);
  const eligible = state.market?.players.filter((p) => p.isEligible).length ?? 0;
  const published = Boolean(state.market && state.market.status !== "DRAFT");
  const firstDeadline = first ? (first.splitWindows ? first.buildSquadDeadline : first.submissionDeadline) : null;
  const timesSet = live || Boolean(firstDeadline && first?.matchdayStartsAt && Date.parse(firstDeadline) > now);
  const steps = [
    { label: copy.steps.assigned, done: Boolean(tournament) },
    { label: copy.steps.published, done: published || live },
    { label: copy.steps.times, done: timesSet },
    { label: copy.steps.live, done: live },
  ];
  const next = steps.findIndex((s) => !s.done);
  const transferDays = state.matchdays.filter(
    (m) => m.splitWindows && m.marketStatus === "OPEN" && m.fantasyStatus === "DISCOVERED" && !m.matchesPlayed && Date.parse(m.matchdayStartsAt ?? "") > now,
  );
  const config = Object.keys(state.configuration) as (keyof FantasyAdminState["configuration"])[];
  const ready = config.filter((k) => state.configuration[k]).length;
  const days = [...state.matchdays].sort((a, b) => a.matchdayNumber - b.matchdayNumber);

  return (
    <div className="ad-fx">
      {state.preview && (
        <p className="ad-fx-banner" role="status">
          <Icon name="warning" size={16} />
          {copy.preview}
        </p>
      )}

      {/* The tournament and what's left before managers can play */}
      <section className="ad-fx-hero" aria-labelledby="ad-fx-tournament">
        <div className="ad-fx-hero__top">
          <span className="ad-fx-eyebrow">{copy.current}</span>
          {tournament && <Pill tone={live ? "ok" : "muted"}>{live ? copy.liveOnMgl : copy.notLive}</Pill>}
        </div>
        <h2 id="ad-fx-tournament">{tournament ? tournament.name : copy.none}</h2>
        {!tournament && <p className="ad-fx-hero__lede">{copy.empty}</p>}
        <ol className="ad-fx-steps" aria-label={copy.stepsLabel}>
          {steps.map((s, i) => (
            <li key={s.label} data-done={s.done ? "" : undefined} data-next={i === next ? "" : undefined}>
              <span className="ad-fx-steps__dot" aria-hidden>
                {s.done ? <Icon name="check" size={13} /> : i + 1}
              </span>
              <span>
                {s.label}
                <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
              </span>
            </li>
          ))}
        </ol>
        {tournament && !live && (
          <div className="ad-fx-hero__launch">
            <FantasyLaunch tournamentId={tournament.id} live={live} ready={canLaunch} />
          </div>
        )}
      </section>

      {/* The matchday being played now */}
      {tournament && (
        <section className="ad-fx-card" aria-labelledby="ad-fx-md">
          <header className="ad-fx-card__head">
            <div>
              <span className="ad-fx-eyebrow">{copy.currentMatchday}</span>
              <h2 id="ad-fx-md">{day ? `${copy.matchday} ${day.matchdayNumber}` : copy.noMatchdayTitle}</h2>
            </div>
            {day && <Pill tone={dayState(day, now).tone}>{dayState(day, now).label}</Pill>}
          </header>
          {day ? (
            <>
              <dl className="ad-fx-tiles">
                <div>
                  <dt>
                    <Icon name="image" size={14} />
                    {copy.pool}
                  </dt>
                  <dd data-tone={published ? undefined : "amber"}>{published ? copy.published : copy.awaitingPublication}</dd>
                  {published && when(day.pricesPublishedAt || state.market?.pricesFrozenAt) && <small>{when(day.pricesPublishedAt || state.market?.pricesFrozenAt)}</small>}
                </div>
                <div>
                  <dt>
                    <Icon name="people" size={14} />
                    {copy.players}
                  </dt>
                  <dd>{eligible}</dd>
                  <small>{copy.canBePicked}</small>
                </div>
                <div>
                  <dt>
                    <Icon name="chart" size={14} />
                    {copy.scoring}
                  </dt>
                  <dd>{copy.scoringStates[day.fantasyStatus]}</dd>
                  <small>
                    {day.matchesPlayed} {copy.of} {day.expectedMatches} {copy.matchesPlayed}
                  </small>
                </div>
                <div>
                  <dt>
                    <Icon name="squad" size={14} />
                    {copy.buildSquadDeadline}
                  </dt>
                  <dd>{when(day.splitWindows ? day.buildSquadDeadline : day.submissionDeadline) ?? copy.missingDeadline}</dd>
                  <small>{copy.lagos}</small>
                </div>
                <div>
                  <dt>
                    <Icon name="lock" size={14} />
                    {copy.matchdayStart}
                  </dt>
                  <dd>{when(day.matchdayStartsAt) ?? copy.missingDeadline}</dd>
                  <small>{copy.lagos}</small>
                </div>
                <div>
                  <dt>
                    <Icon name="undo" size={14} />
                    {copy.transfers}
                  </dt>
                  <dd>{windowState(day, now)}</dd>
                  {day.transfersOpenAt && <small>{when(day.transfersOpenAt)} – {when(day.transfersCloseAt)}</small>}
                </div>
              </dl>
              {!state.market && (
                <p className="ad-fx-note" data-tone="amber">
                  <Icon name="warning" size={15} />
                  {copy.noMarket}
                </p>
              )}
            </>
          ) : (
            <p className="ad-fx-empty">{copy.noMatchday}</p>
          )}
        </section>
      )}

      {/* Transfer windows MGL schedules */}
      {tournament && (
        <section className="ad-fx-card" aria-labelledby="ad-fx-transfers">
          <header className="ad-fx-card__head">
            <div>
              <span className="ad-fx-eyebrow">{copy.transfersEyebrow}</span>
              <h2 id="ad-fx-transfers">{copy.transfers}</h2>
            </div>
          </header>
          <p className="ad-fx-note">
            <Icon name="lock" size={15} />
            {copy.transferRule}
          </p>
          {transferDays.length ? (
            <div className="ad-fx-windows">
              {transferDays.map((m) => (
                <TransferWindow key={[m.tournamentId, m.matchdayNumber, m.transfersOpenAt, m.transfersCloseAt].join(":")} day={m} disabled={!state.configured || state.preview} now={now} />
              ))}
            </div>
          ) : (
            <p className="ad-fx-empty">{copy.transfersUnavailable}</p>
          )}
        </section>
      )}

      <div className="ad-fx-pair">
        {days.length > 0 && (
          <section className="ad-fx-card" aria-labelledby="ad-fx-days">
            <header className="ad-fx-card__head">
              <h2 id="ad-fx-days">{copy.matchdays}</h2>
            </header>
            <ol className="ad-fx-days">
              {days.map((m) => {
                const s = dayState(m, now);
                return (
                  <li key={m.matchdayNumber} data-current={m.matchdayNumber === day?.matchdayNumber ? "" : undefined}>
                    <b>MD{m.matchdayNumber}</b>
                    <span>
                      <Pill tone={s.tone}>{s.label}</Pill>
                      <small>{when(m.splitWindows ? m.matchdayStartsAt : m.submissionDeadline) ?? "—"}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section className="ad-fx-card" aria-labelledby="ad-fx-conn">
          <header className="ad-fx-card__head">
            <h2 id="ad-fx-conn">{copy.connection}</h2>
            <Pill tone={ready === config.length ? "ok" : "error"}>
              {ready === config.length ? copy.allReady(config.length) : copy.someMissing(config.length - ready)}
            </Pill>
          </header>
          <ul className="ad-fx-checks">
            {config.map((k) => (
              <li key={k} data-ready={state.configuration[k] ? "" : undefined}>
                <span aria-hidden>{state.configuration[k] ? <Icon name="check" size={13} /> : <Icon name="close" size={12} />}</span>
                {copy.config[k]}
                <small>{state.configuration[k] ? copy.ready : copy.missing}</small>
              </li>
            ))}
          </ul>
          <p className="ad-fx-small">{copy.configHint}</p>
        </section>
      </div>

      <details className="ad-fx-flow">
        <summary>
          <span>{copy.flowTitle}</span>
          <Icon name="chevron" size={14} />
        </summary>
        <ol>
          {copy.flow.map((step, i) => (
            <li key={step}>
              <b>{i + 1}</b>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
