"use client";

import type { ReactNode } from "react";
import { fantasyCards, type FantasyCardPlayer } from "@/content/fantasy-cards";
import { PlayerPortrait } from "./PlayerPortrait";
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
      data-captain={captain ? "" : undefined}
      aria-pressed={captain}
      aria-label={`${player.name}, ${labels.currentId} ${player.ign || labels.missingId}, ${player.team}, ${player.role ?? ""}, ${player.price?.toFixed(1) ?? ""} ${labels.credits}. ${captain ? labels.captain : labels.makeCaptain}`}
      onClick={onSelect}
    >
      <PlayerCardContent player={player}>
        <span className="fantasy-player__action">
          <span>{captain ? labels.captain : labels.makeCaptain}{captain && <b> ×2</b>}</span>
          <span className="fantasy-player__points"><Ticker value={points} instant={instant} /> <small>{labels.points}</small></span>
        </span>
      </PlayerCardContent>
      {event && <span className="fantasy-player__pop" key={event.key}>+{event.points} · {event.label}</span>}
    </button>
  );
}

/** Content only, so game screens retain their existing buttons, links and actions. */
export function PlayerCardContent({ player, children }: { player: FantasyCardPlayer; children?: ReactNode }) {
  return <>
    <PlayerPortrait player={player} />
    <span className="fantasy-player__body">
      <strong className="fantasy-player__name">{player.name}</strong>
      <span className="fantasy-player__id"><small>{fantasyCards.labels.currentId}</small> {player.ign || fantasyCards.labels.missingId}</span>
      <span className="fantasy-player__team">{player.team}{player.role && <> <span aria-hidden="true">·</span> {player.role}</>}</span>
      {children}
    </span>
  </>;
}
