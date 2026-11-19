export const MGL_ORIGIN = "https://www.majorgamingleague.com";

/**
 * Email callbacks always use MGL's real domain in production, including requests
 * made on a Vercel preview or with stale hosting config. Local development keeps
 * its own loopback/LAN callback so sessions return to the local browser.
 * @param {{nodeEnv?: string, requestOrigin?: string | null, configuredOrigin?: string}} options
 */
export function siteOrigin({ nodeEnv = process.env.NODE_ENV, requestOrigin, configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL } = {}) {
  if (nodeEnv === "production") return MGL_ORIGIN;
  for (const candidate of [requestOrigin, configuredOrigin]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const parts = url.hostname.split(".");
      const ipv4 = parts.length === 4 && parts.every(part => /^\d+$/.test(part) && Number(part) <= 255);
      const privateIPv4 = ipv4 && (parts[0] === "10" ||
        (parts[0] === "192" && parts[1] === "168") ||
        (parts[0] === "172" && Number(parts[1]) >= 16 && Number(parts[1]) <= 31));
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        privateIPv4;
      if (local && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password &&
          url.pathname === "/" && !url.search && !url.hash) return url.origin;
    } catch { /* A malformed origin is never used in an email link. */ }
  }
  return MGL_ORIGIN;
}
