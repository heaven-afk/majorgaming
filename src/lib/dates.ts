/** Event dates are plain ISO days (YYYY-MM-DD), read and shown in UTC so every page renders the same. */

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "12 Jan 2027". */
export function formatDate(iso: string) {
  return day.format(parse(iso));
}

/** "12 Jan – 2 Feb 2027", "12 – 20 Jan 2027", or one date when only one is known. */
export function dateRange(from?: string, to?: string) {
  if (!from || !to) return from || to ? formatDate((from ?? to)!) : undefined;
  return day.formatRange(parse(from), parse(to));
}
