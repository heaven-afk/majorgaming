import type { Metadata } from "next";
import { fantasyPage } from "@/content/fantasy";
import "./fantasy.css";

export const metadata: Metadata = fantasyPage.meta;

/**
 * MGL Fantasy inside the site: the landing page and sign-in screens keep the site's nav (and the
 * landing its footer); signed-in managers get an app shell of their own.
 */
export default function FantasyLayout({ children }: { children: React.ReactNode }) {
  return <div className="fx">{children}</div>;
}
