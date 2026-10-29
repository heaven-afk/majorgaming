"use client";

import Link from "next/link";
import { useEffect } from "react";
import { adminCopy } from "@/content/admin";

const copy = adminCopy.failed;

/** Any admin page that fails to load, most often a dropped connection to the database. */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="ad-login" role="alert">
      <div className="ad-login__card">
        <h1>{copy.title}</h1>
        <p>{copy.lede}</p>
        <div className="ad-login__form">
          <button type="button" className="ad-btn ad-btn--primary ad-btn--wide" onClick={() => retry()}>
            {copy.retry}
          </button>
          <Link href="/admin" className="ad-btn ad-btn--quiet ad-btn--wide">
            {copy.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
