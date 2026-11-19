import { Crest } from "../about/Crest";
import { LogoPlate } from "../LogoPlate";

/** A team's mark: its logo once the admin has one, else the generated initials crest. */
export function TeamMark({ name, logo, size }: { name: string; logo?: string; size: number }) {
  if (!logo) return <Crest name={name} size={size} />;
  return <LogoPlate src={logo} size={size} className="tm-mark" fallback={<Crest name={name} size={size} />} />;
}
