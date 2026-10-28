import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin · MGL",
  robots: { index: false, follow: false },
};

/** The admin has its own chrome: no site nav, footer or smooth scroll. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="ad">{children}</div>;
}
