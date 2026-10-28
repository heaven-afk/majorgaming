"use client";

import { useDeferredValue, useState } from "react";
import type { DirectoryTeam } from "@/lib/league";
import { teamsPage } from "@/content/teams";
import { Icon } from "../Icons";
import { TeamCard } from "./TeamCard";

const normalise = (text: string) => text.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/** The registered squads, searchable by name or tag, filterable by tier and grouped by tier. */
export default function TeamDirectory({ teams }: { teams: DirectoryTeam[] }) {
  const copy = teamsPage;
  const tiers = [...new Set(teams.map((t) => t.tier))];
  const options = [null, ...tiers];
  const [tier, setTier] = useState<(typeof options)[number]>(null);
  const [query, setQuery] = useState("");
  const q = normalise(useDeferredValue(query));
  const at = options.indexOf(tier);

  const groups = tiers
    .filter((t) => tier === null || t === tier)
    .map((t) => ({
      tier: t,
      teams: teams.filter((x) => x.tier === t && (!q || normalise(x.name).includes(q) || normalise(x.tag ?? "").startsWith(q))),
    }))
    .filter((g) => g.teams.length);
  const count = groups.reduce((n, g) => n + g.teams.length, 0);

  return (
    <section className="tm-dir" aria-label={copy.label}>
      <div className="tile tm-tools">
        <label className="tm-search">
          <Icon name="search" size={18} className="tm-search__icon" />
          <span className="sr-only">{copy.tools.search}</span>
          <input type="search" value={query} placeholder={copy.tools.search} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} />
          {query && (
            <button type="button" className="tm-search__clear" onClick={() => setQuery("")} aria-label={copy.tools.clear}>
              <Icon name="close" size={16} />
            </button>
          )}
        </label>
        {tiers.length > 1 && (
          <div className="tier-switch tm-tables" role="group" aria-label={copy.tools.tiers} style={{ "--n": options.length, "--at": at } as React.CSSProperties}>
            <span className="tier-switch__glide" aria-hidden />
            {options.map((t) => (
              <button key={t ?? "all"} type="button" aria-pressed={t === tier} onClick={() => setTier(t)}>
                {t === null ? copy.tools.all : copy.tier(t)}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="tm-count" aria-live="polite">
        {copy.count(count)}
      </p>

      {groups.length ? (
        groups.map((g) => (
          <section className="tm-group" key={`${g.tier}-${q}`} aria-labelledby={`tm-tier-${g.tier ?? "open"}`}>
            <header className="tm-group__head">
              <h2 id={`tm-tier-${g.tier ?? "open"}`}>{copy.tier(g.tier)}</h2>
              <span>{g.teams.length}</span>
            </header>
            <ul className="tm-grid">
              {g.teams.map((t, i) => (
                <li key={t.slug}>
                  <TeamCard team={t} style={{ "--i": i } as React.CSSProperties} />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <div className="tile tm-empty">
          <Icon name="search" size={22} />
          <strong>{copy.empty.title}</strong>
          <p>{copy.empty.body(query.trim())}</p>
          <button type="button" className="btn-ghost" onClick={() => setQuery("")}>
            {copy.tools.clear}
          </button>
        </div>
      )}
    </section>
  );
}
