import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { Mark } from "@/components/brand/Mark";
import { adminCopy as copy } from "@/content/admin";
import { requireAdmin } from "@/lib/admin/session";

/** Top bar for every signed-in admin page. Sends anyone not on the admin list to sign in. */
export default async function AdminShell({ active, children }: { active?: string; children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <header className="ad-bar">
        <Link href="/admin" className="ad-bar__brand">
          <Mark size={26} tone="#f4f2ee" />
          <span>{copy.brand}</span>
        </Link>
        <nav className="ad-bar__nav" aria-label="Admin">
          {copy.nav.map((item) =>
            "soon" in item ? (
              <span key={item.label} className="ad-bar__link" aria-disabled>
                {item.label}
                <small>Soon</small>
              </span>
            ) : (
              <Link key={item.label} href={item.href} className="ad-bar__link" aria-current={active === item.label ? "page" : undefined}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ad-bar__me">
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
    </>
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
