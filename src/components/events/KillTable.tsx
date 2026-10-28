"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { eventsPage } from "@/content/site";
import type { Fragger, KillTable as KillTableData } from "@/lib/league";
import { Crest, initials } from "../about/Crest";
import { Flag } from "../Flag";
import Scene from "../motion/Scene";

function TeamLink({ team }: { team: Fragger["team"] }) {
  return (
    <Link className="kt__team" href={`/teams/${team.slug}`}>
      {team.name}
    </Link>
  );
}

/** A player's name, with their in-game name beside it when it differs. */
function Name({ player }: { player: Fragger }) {
  return (
    <strong>
      {player.name}
      {player.ign && <small className="kt__ign">{player.ign}</small>}
    </strong>
  );
}

function Board({ rows }: { rows: Fragger[] }) {
  const copy = eventsPage.event.kills;
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="kt__board">
      <ol className="kt__top">
        {top.map((p, i) => (
          <li key={p.slug} className="kt-pod" data-pos={p.rank <= 3 ? p.rank : undefined} style={{ "--i": i } as React.CSSProperties}>
            <span className="kt-pod__photo">
              {p.photo ? (
                <Image src={p.photo} alt="" width={480} height={480} sizes="(min-width: 760px) 30vw, 96px" />
              ) : (
                <span className="kt-pod__mono" aria-hidden>
                  {initials(p.name)}
                </span>
              )}
            </span>
            <span className="kt-pod__info">
              <span className="kt-pod__rank">
                <span className="ladder__pos">{p.rank}</span>
                <small>{copy.podium[p.rank - 1] ?? ""}</small>
              </span>
              <Name player={p} />
              <span className="kt-pod__meta">
                {p.country && <Flag code={p.country} className="tm-flag" />}
                <TeamLink team={p.team} />
              </span>
              <span className="kt-pod__kills">
                <b>{p.kills}</b>
                <small>{copy.unit}</small>
              </span>
            </span>
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <ol className="kt__rest" aria-label={copy.rest} style={{ "--rows": Math.ceil(rest.length / 2) } as React.CSSProperties}>
          {rest.map((p, i) => (
            <li key={p.slug} className="kt-row" style={{ "--i": i + 3 } as React.CSSProperties}>
              <span className="kt-row__rank">{p.rank}</span>
              <span className="kt-row__face">
                {p.photo ? <Image src={p.photo} alt="" width={64} height={64} sizes="32px" /> : <Crest name={p.name} size={32} tone={4} />}
              </span>
              <span className="kt-row__who">
                <Name player={p} />
                <TeamLink team={p.team} />
              </span>
              <span className="kt-row__kills">
                {p.kills}
                <small>{copy.unit}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * An event's kill tables, one per tier behind the same quiet switch as the standings: the top
 * three as cards with medal-tinted ranks, then places 4 to 20 in a list (two columns on wide
 * screens). Players are shown with the team they played for in that event.
 */
export default function KillTable({ event, tables }: { event: string; tables: KillTableData[] }) {
  const copy = eventsPage.event.kills;
  const [index, setIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!tables.length) return null;
  const table = tables[index];
  const many = tables.length > 1;
  const longest = Math.max(...tables.map((t) => t.rows.length));

  const pick = (i: number) => {
    const next = (i + tables.length) % tables.length;
    setIndex(next);
    tabs.current[next]?.focus();
  };

  return (
    <Scene className="tile kt" aria-labelledby="kills-title">
      <header className="tm-section__head" data-rise>
        <div>
          <span className="label">
            <i />
            {copy.label}
          </span>
          <h2 className="sec-title" id="kills-title">
            {copy.title.before} <em>{copy.title.accent}</em>
          </h2>
        </div>
        <span className="tm-section__meta">{copy.meta(longest, event, many)}</span>
      </header>

      <div className="tier-tables" data-rise="1">
        {many && (
          <div
            className="tier-switch"
            role="tablist"
            aria-label={copy.tablesLabel}
            style={{ "--n": tables.length, "--at": index } as React.CSSProperties}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") pick(index + 1);
              else if (e.key === "ArrowLeft") pick(index - 1);
              else if (e.key === "Home") pick(0);
              else if (e.key === "End") pick(tables.length - 1);
              else return;
              e.preventDefault();
            }}
          >
            <span className="tier-switch__glide" aria-hidden />
            {tables.map((t, i) => (
              <button
                key={t.name}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`kt-tab-${i}`}
                aria-selected={i === index}
                aria-controls="kt-panel"
                tabIndex={i === index ? 0 : -1}
                onClick={() => setIndex(i)}
              >
                <span className="tier-switch__long">{t.name}</span>
                <span className="tier-switch__short" aria-hidden>
                  {t.short}
                </span>
              </button>
            ))}
          </div>
        )}
        <div id="kt-panel" {...(many ? { role: "tabpanel", "aria-labelledby": `kt-tab-${index}` } : {})}>
          <Board key={table.name} rows={table.rows} />
        </div>
      </div>
    </Scene>
  );
}
