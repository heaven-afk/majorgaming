import { networkLabels, NETWORKS } from "@/content/settings";
import { getSettings } from "@/lib/settings";
import NavBar, { type SocialLink } from "./NavBar";

/** The social links that are set, in a fixed order. Shared by the nav and the footer. */
export async function socialLinks(): Promise<SocialLink[]> {
  const { socials } = await getSettings();
  return NETWORKS.filter((n) => socials[n]).map((n) => ({ label: networkLabels[n], href: socials[n], icon: n }));
}

export default async function Nav() {
  const [{ discord }, socials] = await Promise.all([getSettings(), socialLinks()]);
  return <NavBar discord={discord} socials={socials} />;
}
