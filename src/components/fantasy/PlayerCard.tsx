"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { fantasyCards, type FantasyCardPlayer } from "@/content/fantasy-cards";
import { initials } from "../about/Crest";
import { Ticker } from "../motion/Ticker";
import "./player-card.css";

/** The same portrait frame accepts a real headshot when one becomes available. */
export default function PlayerCard({ player, captain, points, instant, onSelect, event }: {
  player: FantasyCardPlayer;
  captain: boolean;
  points: number;
  instant: boolean;
  onSelect: () => void;
  event?: { key: number; points: number; label: string } | null;
}) {
  const labels = fantasyCards.labels;
  return (
    <button
      type="button"
      className="fantasy-player"
      style={{ "--team-light": player.theme.light, "--team-dark": player.theme.dark } as CSSProperties}
      data-captain={captain ? "" : undefined}
      aria-pressed={captain}
      aria-label={`${player.name}, ${labels.currentId} ${player.ign || labels.missingId}, ${player.team}, ${player.role}, ${player.price.toFixed(1)} ${labels.credits}. ${captain ? labels.captain : labels.makeCaptain}`}
      onClick={onSelect}
    >
      <span className="fantasy-player__portrait">
        <Image
          className="fantasy-player__headshot"
          src={player.photo || fantasyCards.silhouette}
          alt=""
          fill
          sizes="(min-width: 900px) 240px, 45vw"
        />
        <span className="fantasy-player__logo" aria-hidden="true">
          {player.logo ? <Image src={player.logo} alt="" width={28} height={28} /> : initials(player.team)}
        </span>
        <span className="fantasy-player__price">{player.price.toFixed(1)} <small>{labels.credits}</small></span>
      </span>
      <span className="fantasy-player__body">
        <strong className="fantasy-player__name">{player.name}</strong>
        <span className="fantasy-player__id"><small>{labels.currentId}</small> {player.ign || labels.missingId}</span>
        <span className="fantasy-player__team">{player.team} <span aria-hidden="true">·</span> {player.role}</span>
        <span className="fantasy-player__action">
          <span>{captain ? labels.captain : labels.makeCaptain}{captain && <b> ×2</b>}</span>
          <span className="fantasy-player__points"><Ticker value={points} instant={instant} /> <small>{labels.points}</small></span>
        </span>
      </span>
      {event && <span className="fantasy-player__pop" key={event.key}>+{event.points} · {event.label}</span>}
    </button>
  );
}
