import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { Mark } from "@/components/brand/Mark";
import { Icon } from "@/components/Icons";
import { adminCopy as copy } from "@/content/admin";
import { requireAdmin } from "@/lib/admin/session";

/**
 * The frame of every signed-in admin page: a sidebar on wide screens, a top bar with a
 * scrolling nav on phones. Sends anyone not on the admin list to sign in.
 */
export default async function AdminShell({ active, children }: { active?: string; children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="ad-shell">
      <header className="ad-bar">
        <Link href="/admin" className="ad-bar__brand">
          <Mark size={26} tone="#f4f2ee" />
          <span>{copy.brand}</span>
        </Link>
        <nav className="ad-bar__nav" aria-label="Admin">
          {copy.nav.map((item) => (
            <Link key={item.label} href={item.href} className="ad-bar__link" aria-current={active === item.label ? "page" : undefined}>
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ad-bar__me">
          <span className="ad-bar__email">{admin.email}</span>
          <a href="/" target="_blank" rel="noreferrer" className="ad-btn ad-btn--quiet">
            {copy.viewSite}
          </a>
          <form action={signOut}>
            <button className="ad-btn ad-btn--quiet" title={admin.email}>
              {copy.signOut}
            </button>
          </form>
        </div>
      </header>
      <main className="ad-main">{children}</main>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="ad-loading" role="status">
      <span />
      <span className="sr-only">Loading</span>
    </div>
  );
}
