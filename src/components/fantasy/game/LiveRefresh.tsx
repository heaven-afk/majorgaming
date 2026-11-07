"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Read-only screens refresh while visible; squad drafts and account forms are untouched. */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return null;
}
