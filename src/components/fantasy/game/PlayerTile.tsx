import Image from "next/image";

/**
 * A player as a portrait tile, the way a broadcast shows a squad: a tall frame (photo, or a
 * faceless silhouette filling it), the role and captain marks on the frame, the name on a plate
 * below and one line of numbers under that. An empty slot is the same tile with a plus.
 */
export function PlayerTile({
  role,
  name,
  team,
  photo,
  stat,
  captain,
  empty,
  sub,
}: {
  role: string;
  name?: string;
  team?: string;
  photo?: string;
  /** The number under the name: price, points. */
  stat?: string;
  /** "C" or "3×" when this player is captain. */
  captain?: string;
  empty?: boolean;
  sub?: boolean;
}) {
  return (
    <span className="fx-pt" data-empty={empty ? "" : undefined} data-captain={captain ? "" : undefined} data-sub={sub ? "" : undefined}>
      <span className="fx-pt__frame">
        {photo && !empty ? <Image src={photo} alt="" fill sizes="120px" /> : <Silhouette />}
        <span className="fx-pt__role">{role}</span>
        {captain && <span className="fx-pt__cap">{captain}</span>}
        {empty && (
          <span className="fx-pt__plus" aria-hidden>
            +
          </span>
        )}
      </span>
      <span className="fx-pt__name">{name ?? "Pick"}</span>
      <span className="fx-pt__meta">
        <small>{team ?? "Empty"}</small>
        {stat && <b>{stat}</b>}
      </span>
    </span>
  );
}

/** Head and shoulders, filling the frame from the bottom. */
export function Silhouette() {
  return (
    <svg className="fx-pt__ghost" viewBox="0 0 60 80" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <circle cx="30" cy="34" r="13" />
      <path d="M4 80c1.6-17 12-26 26-26s24.4 9 26 26Z" />
    </svg>
  );
}
