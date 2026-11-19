/** Conservative, one-time registry matching. No fantasy data or runtime dependencies. */
export const normalizedName = value => typeof value === "string"
  ? value.normalize("NFKC").replace(/\p{Cf}/gu, "").trim().replace(/\s+/g, " ").toLowerCase() : "";
const list = value => Array.isArray(value) ? value.filter(x => typeof x === "string") : [];
const intersects = (a, b) => a.some(x => b.includes(x));
const names = values => [...new Set(values.map(normalizedName).filter(Boolean))];

export function planMedia(snapshot, { confirmedTeams = [] } = {}) {
  if (!Array.isArray(confirmedTeams) || confirmedTeams.some(x => !x || typeof x.id !== "string" || typeof x.sourceId !== "string") ||
      new Set(confirmedTeams.map(x => x.id)).size !== confirmedTeams.length ||
      new Set(confirmedTeams.map(x => x.sourceId)).size !== confirmedTeams.length) throw Error("Invalid or duplicate confirmed team identities.");
  for (const item of confirmedTeams) {
    if (!snapshot.teams.some(x => x.id === item.id) || !snapshot.indexTeams.some(x => x.id === item.sourceId)) throw Error("Confirmed team identity is missing from the snapshot.");
  }
  const plans = [], skipped = [];
  for (const kind of ["team", "person"]) {
    const target = kind === "team" ? snapshot.teams : snapshot.people;
    const source = kind === "team" ? snapshot.indexTeams : snapshot.indexPlayers;
    const imageField = kind === "team" ? "logo_url" : "photo_url";
    const targetNames = row => names([row.name, ...snapshot.aliases
      .filter(a => a.kind === kind && a.target_id === row.id).map(a => a.alias)]);
    const sourceNames = row => kind === "team"
      ? names([row.team_name, ...list(row.identityNames), ...list(row.teamNameAliases)])
      : names([row.professional_name, ...list(row.professionalNameAliases)]);
    const pending = [];
    for (const row of target) {
      const skip = reason => skipped.push({ kind, id: row.id, name: row.name, reason });
      if (row.archived_at) { skip("archived"); continue; }
      if (row[imageField]) { skip("existing MGL image preserved"); continue; }
      // Search the full source registry, including records without photos, to detect ambiguity.
      let matches = source.filter(s => intersects(targetNames(row), sourceNames(s)));
      let evidence = "unique professional name or recorded alias";
      if (kind === "team") evidence = "unique team name or recorded alias";
      const confirmed = kind === "team" && confirmedTeams.find(x => x.id === row.id);
      if (confirmed) {
        // An explicit reviewed ID resolves duplicate source records, but still needs a matching name/alias.
        matches = matches.filter(x => x.id === confirmed.sourceId);
        if (matches.length !== 1) throw Error("Confirmed team names do not corroborate the selected identity.");
        evidence = "explicitly reviewed team identity and matching recorded name/alias";
      }
      if (kind === "person" && matches.length > 1) {
        const ign = normalizedName(row.ign);
        const exactIgn = ign ? matches.filter(s => names([s.ign, s.current_ign, ...list(s.ign_history)]).includes(ign)) : [];
        if (exactIgn.length === 1) { matches = exactIgn; evidence = "professional name and exact current/historical IGN"; }
      }
      if (matches.length !== 1) { skip(matches.length ? "ambiguous source identity" : "no matching identity"); continue; }
      const [match] = matches;
      if (!match[imageField]) { skip("matched identity has no image"); continue; }
      pending.push({ kind, id: row.id, slug: row.slug, name: row.name,
        sourceId: match.id, sourceName: match.team_name || match.professional_name,
        sourceImage: match[imageField], imageField, previousImage: row[imageField],
        expectedUpdatedAt: row.updated_at, evidence });
    }
    // One source identity must never be assigned to two MGL records automatically.
    for (const item of pending) {
      if (pending.filter(p => p.sourceId === item.sourceId).length !== 1) {
        skipped.push({ kind, id: item.id, name: item.name, reason: "duplicate MGL identity" });
      } else plans.push(item);
    }
  }
  return { plans, skipped };
}
