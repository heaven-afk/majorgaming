"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";

type Item = { href: string; label: string; icon: string };

/** The app's navigation: the sidebar list, or (`tabs`) the phone's bottom tab bar. */
export function ShellNav({ items, signedIn, tabs }: { items: readonly Item[]; signedIn: boolean; tabs?: boolean }) {
  const path = usePathname();
  // Signed out, only the standings are open to look at.
  const shown = signedIn ? items : items.filter((i) => i.href === "/fantasy/standings" || i.href === "/fantasy");
  const current = (href: string) => (href === "/fantasy" ? path === "/fantasy" : path.startsWith(href));
  return (
    <nav className={tabs ? "fx-tabbar" : "fx-side__nav"} aria-label={tabs ? "Fantasy tabs" : "Fantasy"}>
      {shown.map((i) => (
        <Link key={i.href} href={i.href} aria-current={current(i.href) ? "page" : undefined}>
          <Icon name={i.icon} size={tabs ? 21 : 18} />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
