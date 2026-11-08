import { staffPage } from "@/content/staff";
import type { StaffMember } from "@/lib/staff";
import { Flag } from "../Flag";
import { Icon } from "../Icons";

const regions = new Intl.DisplayNames(["en"], { type: "region" });
export const NETWORKS = ["x", "instagram", "discord"] as const;

/** "01", "02"… for numbered people. */
export const pad = (n: number) => String(n).padStart(2, "0");

/** The given names, then the surname in the serif accent. One-word names stay whole. */
export function SplitName({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return <>{name}</>;
  const last = words.pop();
  return (
    <>
      <span>{words.join(" ")}</span> <em>{last}</em>
    </>
  );
}

export const hasSocials = (person: StaffMember) => NETWORKS.some((n) => person.socials?.[n]);

export function Socials({ person }: { person: StaffMember }) {
  const links = NETWORKS.flatMap((n) => (person.socials?.[n] ? [{ network: n, href: person.socials[n]! }] : []));
  if (!links.length) return null;
  return (
    <span className="sf-socials">
      {links.map(({ network, href }) => (
        <a key={network} href={href} target="_blank" rel="noreferrer" aria-label={staffPage.on(person.name, staffPage.social[network])}>
          <Icon name={network} size={15} />
        </a>
      ))}
    </span>
  );
}

export function Home({ country }: { country?: string }) {
  if (!country) return null;
  return (
    <span className="sf-home">
      <Flag code={country} className="sf-flag" />
      {regions.of(country)}
    </span>
  );
}
