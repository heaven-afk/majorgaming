const validId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const label = (value) => typeof value === "string" && value.length <= 4096 ? value.trim() : "";
const identity = (value) => label(value).normalize("NFKC").replace(/\s+/g, " ").toLowerCase();

function publicImage(value) {
  if (typeof value !== "string" || !value) return undefined;
  // Older Index player uploads are embedded raster images. Never accept SVG or HTML data URLs.
  if (value.startsWith("data:")) {
    return value.length <= 2_000_000 && /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : undefined;
  }
  if (value.length > 4096) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch { /* Invalid or relative image references are not public assets. */ }
}

function parseBatch(payload, type, ids) {
  if (payload?.version !== 1 || !Array.isArray(payload.media) || !Array.isArray(payload.missingIds)) return [];
  const expected = new Set(ids);
  const seen = new Set();
  const rows = [];
  for (const id of payload.missingIds) {
    if (!expected.has(id) || seen.has(id)) return [];
    seen.add(id);
  }
  for (const row of payload.media) {
    const id = row?.entityId;
    if (!expected.has(id) || seen.has(id) || row.entityType !== type) return [];
    seen.add(id);
    rows.push([id, row]);
  }
  return seen.size === expected.size ? rows : [];
}

async function records(type, ids, origin, apiKey, fetcher) {
  const unique = [...new Set(ids.filter(validId))].sort();
  const requests = [];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const url = new URL("/api/v1/media", origin);
    url.searchParams.set("entityType", type);
    url.searchParams.set("ids", batch.join(","));
    requests.push((async () => {
      try {
        const response = await fetcher(url, {
          headers: { Accept: "application/json", "x-api-key": apiKey },
          redirect: "error",
          signal: AbortSignal.timeout(3000),
          next: { revalidate: 60, tags: ["fantasy-index-media"] },
        });
        return response.ok ? parseBatch(await response.json(), type, batch) : [];
      } catch { return []; }
    })());
  }
  return new Map((await Promise.all(requests)).flat());
}

function corroborates(market, profile) {
  if (!profile) return false;
  const names = [profile.professionalName, ...(Array.isArray(profile.professionalNameAliases) ? profile.professionalNameAliases : [])].map(identity).filter(Boolean);
  const igns = [profile.ign, ...(Array.isArray(profile.ignHistory) ? profile.ignHistory : [])].map(identity).filter(Boolean);
  const comparable = [[identity(market.playerName), names], [identity(market.ign), igns]].filter(([value, known]) => value && known.length);
  // V1 media-only records have a verified exact ID but no names to corroborate.
  // If the registry supplies labels, allow a known name or IGN (including history).
  return !comparable.length || comparable.some(([value, known]) => known.includes(value));
}

/**
 * Join only stable IDs. Never search by display name or use the player's current team as a fallback.
 * @param {{playerId: string, playerName: string, ign: string | null, teamIdAtLock: string | null}[]} players
 * @param {{baseUrl?: string, apiKey?: string, fetcher?: typeof fetch}} options
 */
export async function loadIndexMedia(players, { baseUrl, apiKey, fetcher = fetch } = {}) {
  const empty = () => ({ players: new Map(), teams: new Map() });
  if (!baseUrl || !apiKey?.trim()) return empty();
  let origin;
  try { origin = new URL(baseUrl); } catch { return empty(); }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return empty();

  const [profiles, teams] = await Promise.all([
    records("players", players.map(p => p.playerId), origin, apiKey, fetcher),
    records("teams", players.map(p => p.teamIdAtLock), origin, apiKey, fetcher),
  ]);
  return {
    players: new Map(players.flatMap(p => {
      const profile = profiles.get(p.playerId);
      return corroborates(p, profile) ? [[p.playerId, { name: label(profile.professionalName), ign: label(profile.ign), photo: publicImage(profile.avatarUrl) }]] : [];
    })),
    teams: new Map([...teams].map(([id, team]) => [id, { name: label(team.teamName), logo: publicImage(team.logoUrl) }])),
  };
}
