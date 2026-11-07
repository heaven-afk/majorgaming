/** Shared by the server-only Next.js client and the terminal connectivity check. */
export class FantasyCoreError extends Error {
  constructor(message, status = 0, retryAfter = null, body = null) {
    super(message);
    this.name = "FantasyCoreError";
    this.status = status;
    this.retryAfter = retryAfter;
    // Core's parsed error body, for the server to pick safe fields from (the reason, or a
    // manager's own carry-forward squad). Never sent to the browser as a whole.
    this.body = body;
  }
}

export function createFantasyTransport({ baseUrl, siteSlug, apiKey, profileKey, fetcher = fetch, timeoutMs = 10000 }) {
  if (!baseUrl || !apiKey?.trim() || !/^[a-z0-9][a-z0-9_-]*$/.test(siteSlug || "")) {
    throw new FantasyCoreError("Set FANTASY_CORE_URL, FANTASY_SITE_SLUG and FANTASY_PARTNER_API_KEY on the server.");
  }
  let origin;
  try {
    origin = new URL(baseUrl);
  } catch {
    throw new FantasyCoreError("FANTASY_CORE_URL must be a valid HTTPS origin.");
  }
  if (origin.protocol !== "https:" || origin.username || origin.password ||
      origin.search || origin.hash || origin.pathname !== "/") {
    throw new FantasyCoreError("FANTASY_CORE_URL must be an HTTPS origin without credentials, path, query or fragment.");
  }

  /**
   * @param {string} path
   * @param {{ query?: Record<string, string | number | boolean | undefined>, body?: unknown, fresh?: boolean, token?: string, profile?: boolean, idempotencyKey?: string }} options
   */
  return async function request(path, { query = {}, body, fresh = false, token, profile = false, idempotencyKey } = {}) {
    // A caller cannot turn this into an arbitrary URL or an admin proxy.
    if (!/^\/api\/v1\/(tournaments(?:\/[\w-]+\/matchdays)?|markets\/[\w-]+(?:\/window)?|scoring\/matchday|leaderboards\/[\w-]+|seasons\/[\w-]+\/leaderboard|players(?:\/[\w-]+)?\/history|squads(?:\/(?:me|chips|validate))?|managers\/(?:me\/points|[\w-]+\/profile)|transfers)$/.test(path)) {
      throw new FantasyCoreError("Unsupported Fantasy Core resource.");
    }
    const isProfile = /^\/api\/v1\/managers\/[\w-]+\/profile$/.test(path);
    if (profile !== isProfile || (profile && !profileKey?.trim())) {
      throw new FantasyCoreError("Profile sync requires the separate FANTASY_PROFILE_API_KEY.");
    }
    const managerOnly = /^\/api\/v1\/(squads(?:\/(?:me|chips))?|managers\/me\/points|transfers)$/.test(path);
    if (managerOnly && !token) throw new FantasyCoreError("A verified MGL manager token is required.");
    if (path.endsWith("/window") && (!token || !body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(key => !["action", "matchdayNumber"].includes(key)) ||
        !["open", "lock", "close"].includes(body.action) || !Number.isSafeInteger(body.matchdayNumber) || body.matchdayNumber < 1)) {
      throw new FantasyCoreError("Window controls require a verified administrator token and valid action.");
    }
    if (path === "/api/v1/transfers" && !/^[a-zA-Z0-9._:-]{8,128}$/.test(idempotencyKey || "")) {
      throw new FantasyCoreError("Transfers require a valid Idempotency-Key.");
    }
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const uncached = body !== undefined || fresh || Boolean(token) || profile;
    const revalidate = /\/leaderboards\/|\/seasons\//.test(path) ? 5 : 15;
    let response;
    try {
      response = await fetcher(url, {
        method: profile ? "PUT" : body === undefined ? "GET" : "POST",
        headers: {
          Accept: "application/json",
          "X-Fantasy-Site": siteSlug,
          ...(profile ? { "x-fantasy-service-key": profileKey } : { "x-fantasy-api-key": apiKey }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        // Never forward the partner key across a redirect.
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        ...(uncached ? { cache: "no-store" } : { next: { revalidate, tags: ["fantasy-core"] } }),
      });
    } catch {
      throw new FantasyCoreError("Fantasy Core could not be reached or timed out.");
    }
    if (!response.ok) {
      // The message never carries the partner's response body, which may contain private data.
      const body = await response.json().catch(() => null);
      throw new FantasyCoreError(
        `Fantasy Core request failed (HTTP ${response.status}).`,
        response.status,
        response.headers.get("Retry-After"),
        body && typeof body === "object" ? body : null,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new FantasyCoreError("Fantasy Core returned invalid JSON.", 502);
    }
  };
}
