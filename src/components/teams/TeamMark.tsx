import Image from "next/image";
import { Crest } from "../about/Crest";

/** A team's mark: its logo once the admin has one, else the generated initials crest. */
export function TeamMark({ name, logo, size }: { name: string; logo?: string; size: number }) {
  if (!logo) return <Crest name={name} size={size} />;
  return (
    <span className="tm-mark" style={{ "--s": `${size}px` } as React.CSSProperties}>
      <Image src={logo} alt="" width={size * 2} height={size * 2} sizes={`${size}px`} />
    </span>
  );
}
