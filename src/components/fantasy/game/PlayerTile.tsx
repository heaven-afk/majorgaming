import type { ReactNode } from "react";
import { PlayerCardContent } from "../PlayerCard";

/** The caller retains selection, navigation and transfer actions. */
export function PlayerTile({ role, name, ign, team, logo, photo, price, captain, empty, sub, action }: {
  role?: string;
  name?: string;
  ign?: string | null;
  team?: string;
  logo?: string;
  photo?: string;
  price?: number;
  captain?: string;
  empty?: boolean;
  sub?: boolean;
  action?: ReactNode;
}) {
  if (empty) return <span className="fantasy-player fx-pt" data-empty="">
    <span className="fx-pt__empty"><span aria-hidden="true">+</span><strong>{name ?? "Pick"}</strong><small>{team}</small></span>
  </span>;
  return <span className="fantasy-player fx-pt" data-captain={captain ? "" : undefined} data-sub={sub ? "" : undefined}>
    <PlayerCardContent player={{ name: name ?? "Unknown", ign, team: team ?? "No team", logo, photo, price }}>
      {(role || captain || sub) && <span className="fx-pt__badges"><span>{sub ? "Sub" : role}</span>{captain && <b>Captain {captain === "C" ? "2×" : captain}</b>}</span>}
      {action}
    </PlayerCardContent>
  </span>;
}
