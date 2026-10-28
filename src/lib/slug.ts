/** "Kyzon Esport" → "kyzon-esport": the web address form of a name. */
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** "Kyzon  Esport!" and "kyzon esport" compare equal: for matching names from sheets. */
export function nameKey(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}
