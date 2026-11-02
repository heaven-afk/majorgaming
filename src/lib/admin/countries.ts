import { countries } from "country-flag-icons";

// MGL plays in Africa: those countries come first, then everyone else.
const AFRICA = "DZ AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW".split(" ");
const name = new Intl.DisplayNames(["en"], { type: "region" });
const byName = (a: string, b: string) => (name.of(a) ?? a).localeCompare(name.of(b) ?? b);

const codes = [...AFRICA.sort(byName), ...countries.filter((c) => /^[A-Z]{2}$/.test(c) && !AFRICA.includes(c)).sort(byName)];

/** The country picker's options, named on the server so the page and the browser agree. */
export const countryCodes = codes.map((code) => ({ code, name: name.of(code) ?? code }));
