import "server-only";
import { indexId, parseIndexCatalog, parseIndexSnapshot } from "./contract";

export class IndexResultsError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

export function indexConfigured() {
  return Boolean(process.env.HSE_BASE_URL && process.env.MGL_RESULTS_API_KEY);
}

async function request(id?: string) {
  let origin: URL;
  const key = process.env.MGL_RESULTS_API_KEY?.trim();
  try { origin = new URL(process.env.HSE_BASE_URL ?? ""); }
  catch { throw new IndexResultsError("Configure the Heaven Index results connection first."); }
  if (!key || origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new IndexResultsError("Configure the Heaven Index results connection first.");
  }
  const url = new URL("/api/v1/mgl/results", origin);
  if (id !== undefined) {
    if (!indexId.test(id)) throw new IndexResultsError("Invalid Heaven Index tournament.");
    url.searchParams.set("tournamentId", id);
  }
  const response = await fetch(url, {
    headers: { Accept: "application/json", "x-mgl-results-key": key },
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
  }).catch(() => { throw new IndexResultsError("Heaven Index could not be reached."); });
  if (!response.ok) {
    const rejected = response.status === 404 &&
      (await response.json().catch(() => null))?.code === "MGL_TOURNAMENT_NOT_FOUND";
    throw new IndexResultsError(rejected
      ? "This tournament is no longer available to MGL in Heaven Index."
      : "The Heaven Index results feed could not be read.", rejected ? 404 : undefined);
  }
  return response.json();
}

export async function indexCatalog() {
  return parseIndexCatalog(await request());
}

export async function indexSnapshot(id: string) {
  return parseIndexSnapshot(await request(id), id);
}
