import { fantasy } from "@/content/site";
import Link from "next/link";
import MeshGradient from "../hero/MeshGradient";
import { Icon } from "../Icons";
import Scene from "../motion/Scene";
import SquadBoard from "./SquadBoard";

/** Fantasy teaser: the pitch on a light mesh panel, with a live squad board to play with. */
export default function Fantasy() {
  return (
    <Scene className="mesh-panel fantasy" id="fantasy" aria-labelledby="fantasy-title">
      <MeshGradient />
      <div className="grain" aria-hidden />

      <div className="fantasy__copy" data-rise>
        <div className="fantasy__labels">
          <span className="label label--ink">
            <i />
            {fantasy.label}
          </span>
          <span className="soon">{fantasy.status}</span>
        </div>
        <h2 className="fantasy__title" id="fantasy-title">
          <span>{fantasy.title.before}</span> <em>{fantasy.title.accent}</em>
        </h2>
        <p className="fantasy__lede">{fantasy.lede}</p>
        <ul className="fantasy__features">
          {fantasy.features.map((f) => (
            <li key={f.title}>
              <span className="fantasy__icon">
                <Icon name={f.icon} size={18} />
              </span>
              <span>
                <strong>{f.title}</strong>
                {f.body}
              </span>
            </li>
          ))}
        </ul>
        <Link className="btn-dark" href={fantasy.cta.href}>
          {fantasy.cta.label}
        </Link>
      </div>

      <div className="fantasy__board" data-rise={2}>
        <SquadBoard />
      </div>
    </Scene>
  );
}
