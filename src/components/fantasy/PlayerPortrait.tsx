"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { fantasyCards, fantasyTeamTheme, type FantasyCardPlayer } from "@/content/fantasy-cards";
import { initials } from "../about/Crest";
import "./player-card.css";

/** Shared across full cards and compact squad/transfer previews. */
export function PlayerPortrait({ player, badges = true }: { player: Pick<FantasyCardPlayer, "team" | "photo" | "logo" | "price" | "theme">; badges?: boolean }) {
  const theme = player.theme ?? fantasyTeamTheme(player.team);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const [failedLogo, setFailedLogo] = useState<string>();
  const photo = player.photo !== failedPhoto ? player.photo : undefined;
  const logo = player.logo !== failedLogo ? player.logo : undefined;
  return (
    <span className="fantasy-player__portrait" style={{ "--team-light": theme.light, "--team-dark": theme.dark } as CSSProperties}>
      <Image className="fantasy-player__headshot" data-placeholder={photo ? undefined : ""} src={photo || fantasyCards.silhouette} alt="" fill sizes="(min-width: 900px) 240px, 45vw" unoptimized={Boolean(photo)} onError={photo ? () => setFailedPhoto(photo) : undefined} />
      {badges && <span className="fantasy-player__logo" aria-hidden="true">{logo ? <Image src={logo} alt="" width={28} height={28} unoptimized onError={() => setFailedLogo(logo)} /> : initials(player.team)}</span>}
      {badges && player.price !== undefined && <span className="fantasy-player__price">{player.price.toFixed(1)} <small>{fantasyCards.labels.credits}</small></span>}
    </span>
  );
}
