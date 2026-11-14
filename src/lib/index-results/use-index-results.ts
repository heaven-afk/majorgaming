"use client";

import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PublicIndexResults } from "./contract";

let realtime: SupabaseClient | undefined;
function resultsRealtime() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;
  return realtime ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function useIndexResults(slug: string, live: boolean, refreshKey?: number) {
  const [shown, setShown] = useState<{ slug: string; data: PublicIndexResults | null }>();
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    let pending = false;
    async function load() {
      if (controller.signal.aborted || document.hidden) return;
      if (busy) {
        pending = true;
        return;
      }
      busy = true;
      try {
        const url = "/api/events/" + encodeURIComponent(slug) + "/index-results";
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as PublicIndexResults | null;
          if (!controller.signal.aborted) setShown({ slug, data });
        }
      } catch {
        // Leave the last known results on screen while the connection recovers.
      } finally {
        busy = false;
        if (pending) {
          pending = false;
          void load();
        }
      }
    }

    const client = live ? resultsRealtime() : undefined;
    const channel = client?.channel("event-results:" + slug + ":" + crypto.randomUUID())
      .on("postgres_changes", {
        event: "*", schema: "public", table: "event_results_revisions", filter: "slug=eq." + slug,
      }, () => { void load(); })
      .subscribe(status => {
        // Catch updates that arrived while connecting or reconnecting.
        if (status === "SUBSCRIBED") void load();
      });
    const fallback = live ? setInterval(load, 30_000) : undefined;
    document.addEventListener("visibilitychange", load);
    void load();
    return () => {
      controller.abort();
      if (fallback !== undefined) clearInterval(fallback);
      document.removeEventListener("visibilitychange", load);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [slug, live, refreshKey]);
  return shown?.slug === slug ? shown.data : null;
}
