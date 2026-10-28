"""
Build every event's records from the owner's sheets into `src/data/generated/`, until the database
import exists. All events are built in one run so they share one list of teams and one list of
players: the same squad or player in two events is one record.

Sources (paths in a JSON file, since the sheets live outside the repo):
  {
    "season-10": {"teams": "MGL S10 TEAM COLLATION.xlsx", "kills": "MGL S10 PLAYER KILL DATA.xlsx"},
    "carry1st-event": {"tiers": {"1": "...TIER 1....xlsx", "2": "...TIER 2....xlsx"}},
    "mixed-event-season-4": {"standings": "MGL MIXED EVENT - Top Teams by Points.xlsx",
                             "players": "MGL MIXED EVENT SEASON 4 PLAYER STATS UPDATED.xlsx"},
    "season-9": {"transcription": "scripts/sources/season-9.py"}
  }
  - Team collations ("TIER n" sheets, or one file per tier): Rank, Team, Total Pts, Wins, Matches,
    Place Pts, Kill Pts, Bonus Pts. Columns are found by header name.
  - Season kill sheets: Team Name, Professional Name, IGN, Matches, Total Kills. They list every
    registered player, so they give each squad's roster too.
  - Mixed Event (two men and two women per squad): one collation of the top 10 squads, and player
    stats in MALE and FEMALE sheets (PROFESSIONAL, IN - GAME, TEAM NAME, COUNTRY, MATCHES, TOTAL
    KILLS), which become two kill tables, Men and Women.
  - Season 9 exists only as images; `scripts/sources/season-9.py` is their transcription.

Events are read newest first, so names come from the newest sheet. Players are matched across
events by professional name when that name belongs to one player (or to one on the same squad);
anything else becomes a new player. Fix mistakes in the sheet (or the aliases below) and rerun.

Usage (standard library only; run with -I as the sheets are downloaded files):
  python -I scripts/league-data.py <sources.json> src/data/generated
"""

import importlib.util
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
INVISIBLE = re.compile(r"[​-‏⁠﻿]")

EVENTS = ["season-10", "carry1st-event", "mixed-event-season-4", "season-9"]

# One squad written different ways (as written -> the name to use).
TEAM_ALIASES = {
    "21 RAVENGERS": "21 REVENGERS",  # Season 10 kill sheet
    "VANGUARD": "VANGUARD ESPORTS",  # one misfiled Season 10 player with no matches
    "PREACHERS ESPORTS": "PREACHER ESPORTS",  # Season 9 kill table
    "PPREACHER X": "PREACHER X",  # Season 9 collation
    "NB STRICKERS": "NB STRIKERS",  # Season 9 kill table
    # Season 9 spellings of squads that play on under a Season 10 name.
    "THE 21ST CENTURY": "21ST CENTURY",
    "7 SIN ESPORTS": "7 SIN ESPORT",
    "ETERNAL LEGIONS": "ETERNAL LEGION",
    "MARAB ESPORTS": "MARAB ESPORT",
    "NARCISSISTS": "NARCISSIST",
}

# Words kept in capitals when team names are set in title case.
ACRONYMS = {"X", "OG", "ZL", "MC", "YR", "B2M", "TEF", "DFL", "HIM", "GITG", "DNA", "MGL", "OTF", "NB", "ZN", "IVT", "VNG"}

COUNTRIES = {
    "NIGERIA": "NG", "GHANA": "GH", "KENYA": "KE", "SOUTH AFRICA": "ZA", "EGYPT": "EG", "MOROCCO": "MA",
    "TANZANIA": "TZ", "UGANDA": "UG", "CAMEROON": "CM", "IVORY COAST": "CI", "COTE D'IVOIRE": "CI",
    "SENEGAL": "SN", "RWANDA": "RW", "ZAMBIA": "ZM", "ZIMBABWE": "ZW", "BOTSWANA": "BW", "NAMIBIA": "NA",
    "ETHIOPIA": "ET", "ALGERIA": "DZ", "TUNISIA": "TN", "LIBYA": "LY", "SUDAN": "SD", "ANGOLA": "AO",
    "MALAWI": "MW", "MOZAMBIQUE": "MZ", "BENIN": "BJ", "TOGO": "TG", "LIBERIA": "LR", "SIERRA LEONE": "SL",
    "GAMBIA": "GM", "MAURITIUS": "MU", "TURKEY": "TR", "SWEDEN": "SE", "FRANCE": "FR",
    "UNITED KINGDOM": "GB", "UK": "GB", "ENGLAND": "GB", "UNITED STATES": "US", "USA": "US",
    "GERMANY": "DE", "NETHERLANDS": "NL", "BELGIUM": "BE", "SPAIN": "ES", "ITALY": "IT", "CANADA": "CA",
    "UNITED ARAB EMIRATES": "AE", "UAE": "AE", "SAUDI ARABIA": "SA", "QATAR": "QA", "IRAQ": "IQ",
    "JORDAN": "JO", "LEBANON": "LB", "PAKISTAN": "PK", "INDIA": "IN", "DENMARK": "DK", "GEORGIA": "GE",
    "IRELAND": "IE", "UKRAINE": "UA",
}


# ---------- Reading sheets ----------

def read_xlsx(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = {r.get("Id"): r.get("Target") for r in rels}
    sheets = {}
    for s in wb.find("m:sheets", NS):
        t = target[s.get("{%s}id" % NS["r"])].lstrip("/")
        t = t if t.startswith("xl/") else "xl/" + t
        rows = []
        for row in ET.fromstring(z.read(t)).iter("{%s}row" % NS["m"]):
            cells = {}
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                typ = c.get("t")
                if typ == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                elif v is None:
                    continue
                elif typ == "s":
                    val = shared[int(v.text)]
                else:
                    val = v.text
                letters = re.match(r"[A-Z]+", c.get("r")).group(0)
                idx = 0
                for ch in letters:
                    idx = idx * 26 + ord(ch) - 64
                cells[idx - 1] = val
            if cells:
                rows.append([cells.get(i, "") for i in range(max(cells) + 1)])
        sheets[s.get("name")] = rows
    return sheets


def clean(s):
    return re.sub(r"\s+", " ", INVISIBLE.sub("", str(s))).strip()


def key(s):
    return re.sub(r"[^a-z0-9]", "", clean(s).lower())


def slug_of(s):
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", clean(s).lower()))


def number(s):
    s = clean(s)
    if s in ("", "—", "-"):
        return 0
    f = float(s)
    return int(f) if f.is_integer() else f


def title(name):
    """Sheet names are mostly in capitals; set them in title case, keeping acronyms and names
    that already use mixed case (they were typed that way on purpose)."""
    if name != name.upper():
        return name
    words = []
    for w in name.split(" "):
        if w in ACRONYMS:
            words.append(w)
        elif re.fullmatch(r"\d+(ST|ND|RD|TH)", w):
            words.append(w.lower())
        elif re.search(r"\d", w):
            words.append(w)
        else:
            words.append("-".join(p[:1] + p[1:].lower() for p in w.split("-")))
    return " ".join(words)


def tier_of(sheet):
    m = re.search(r"\d+", sheet)
    return int(m.group(0)) if m else None


def table(rows, needle):
    """The rows under the header that contains `needle`, as dicts keyed by header name."""
    for i, r in enumerate(rows):
        cols = [clean(c) for c in r]
        if needle in cols:
            out = []
            for row in rows[i + 1:]:
                out.append({c: row[j] if j < len(row) else "" for j, c in enumerate(cols) if c})
            return out
    raise ValueError(f"no header with {needle!r}")


# ---------- One league of teams and players ----------

class League:
    def __init__(self):
        self.teams = {}  # key -> {slug, name}
        self.people = {}  # slug -> {slug, name, ign?, country?}
        self.by_name = {}  # key(name) -> [slugs]
        self.played = {}  # person slug -> {team slugs}
        self.reused = 0
        self.countries = set()

    def team(self, raw):
        raw = clean(raw)
        raw = TEAM_ALIASES.get(raw.upper(), raw)
        k = key(raw)
        if k not in self.teams:
            name = title(raw)
            self.teams[k] = {"slug": slug_of(name), "name": name}
        return self.teams[k]["slug"]

    def person(self, name, team, used, ign="", country=""):
        """The player called `name` on `team` in this event; `used` holds the event's players so far."""
        name = clean(name)
        k = key(name)
        known = self.by_name.get(k, [])
        free = [s for s in known if s not in used]
        same_team = [s for s in free if team in self.played.get(s, ())]
        pick = same_team[0] if same_team else free[0] if len(known) == 1 and free else None
        if pick:
            self.reused += 1
        else:
            base = slug_of(name) or slug_of(ign)
            pick = base if base not in self.people else f"{base}-{team}"
            n = 2
            while pick in self.people:
                pick, n = f"{base}-{team}-{n}", n + 1
            self.people[pick] = {"slug": pick, "name": name}
            self.by_name.setdefault(k, []).append(pick)
        p = self.people[pick]
        ign = clean(ign)
        if ign and ign != name and "ign" not in p:
            p["ign"] = ign
        country = "" if clean(country) in ("0", "-", "—") else clean(country)
        code = COUNTRIES.get(country.upper()) if country else None
        if country and not code:
            self.countries.add(clean(country))
        if code and "country" not in p:
            p["country"] = code
        self.played.setdefault(pick, set()).add(team)
        used.add(pick)
        return pick


def standing(league, raw, placement, kill_pts, bonus=0, wins=None, matches=None):
    row = {"team": league.team(raw), "placement": placement, "kills": kill_pts}
    if bonus:
        row["bonus"] = bonus
    if wins is not None:
        row["wins"] = wins
    if matches is not None:
        row["matches"] = matches
    return row


def collation(league, path, tier=None):
    """Tier tables from a team collation workbook: one sheet per tier, or one file for `tier`."""
    tables = {}
    for sheet, rows in read_xlsx(path).items():
        t = tier if tier is not None else tier_of(sheet)
        out = []
        for r in table(rows, "Team"):
            if not clean(r.get("Team", "")):
                continue
            g = lambda c: number(r.get(c, ""))
            row = standing(league, r["Team"], g("Place Pts"), g("Kill Pts"), g("Bonus Pts"), g("Wins"), g("Matches"))
            if row["placement"] + row["kills"] + row.get("bonus", 0) != g("Total Pts"):
                print(f"total mismatch: {path} {sheet} {r['Team']}", file=sys.stderr)
            out.append(row)
        tables[t] = out
    return tables


def finish(tables, rosters, tiers, kills, matches=None):
    """An event's records: its tables, a registration per squad, and its kill rows."""
    teams = list(dict.fromkeys([r["team"] for t in sorted(tables) for r in tables[t]] + list(rosters) + [k["team"] for k in kills]))
    entries = [{"team": t, **({"tier": tiers[t]} if tiers.get(t) else {}), "lineup": rosters.get(t, [])} for t in teams]
    most = max([r.get("matches", 0) for t in tables.values() for r in t] + [k.get("matches", 0) for k in kills] + [0])
    return {
        "matches": matches or most or None,
        "tables": [{"name": f"Tier {t}" if t else "Overall", **({"tier": t} if t else {}), "rows": tables[t]} for t in sorted(tables, key=lambda t: t or 0)],
        "entries": entries,
        "kills": kills,
    }


# ---------- Each event's sources ----------

def season_sheets(league, src):
    """A season with a team collation and a full kill sheet (Season 10's format)."""
    tables = collation(league, src["teams"])
    tiers = {r["team"]: t for t, rows in tables.items() for r in rows}
    rosters, kills, used = {}, [], set()
    for sheet, rows in read_xlsx(src["kills"]).items():
        for r in table(rows, "Professional Name"):
            if not clean(r.get("Team Name", "")) or not clean(r.get("Professional Name", "")):
                continue
            team = league.team(r["Team Name"])
            tiers.setdefault(team, tier_of(sheet))
            roster = rosters.setdefault(team, [])
            if any(key(league.people[p]["name"]) == key(r["Professional Name"]) for p in roster):
                continue  # listed twice on one squad
            p = league.person(r["Professional Name"], team, used, r.get("IGN", ""))
            roster.append(p)
            kills.append({"player": p, "team": team, "kills": number(r.get("Total Kills", "")), "matches": number(r.get("Matches", ""))})
    return finish(tables, rosters, tiers, kills)


def tier_files(league, src):
    """One collation file per tier and no kill sheet (the Carry1st Event)."""
    tables = {}
    for t, path in src["tiers"].items():
        tables.update(collation(league, path, int(t)))
    tiers = {r["team"]: t for t, rows in tables.items() for r in rows}
    return finish(tables, {}, tiers, [])


def player_stats(league, src):
    """The Mixed Event: a collation of its top squads, and player stats split into MALE and FEMALE
    sheets, which give every squad's roster and a kill table for each."""
    tables = collation(league, src["standings"])
    rosters, kills, used = {}, [], set()
    groups = {"MALE": "Men", "FEMALE": "Women"}
    for sheet, rows in read_xlsx(src["players"]).items():
        if sheet.upper() not in groups:
            continue
        for r in table(rows, "PROFESSIONAL"):
            if not clean(r.get("TEAM NAME", "")) or not clean(r.get("PROFESSIONAL", "")):
                continue
            team = league.team(r["TEAM NAME"])
            p = league.person(r["PROFESSIONAL"], team, used, r.get("IN - GAME", ""), r.get("COUNTRY", ""))
            rosters.setdefault(team, []).append(p)
            kills.append({"player": p, "team": team, "kills": number(r.get("TOTAL KILLS", "")), "matches": number(r.get("MATCHES", "")),
                          "group": groups[sheet.upper()]})
    return finish(tables, rosters, {}, kills)


def transcription(league, src):
    """A season known only from images (Season 9): kill points are 2 per kill, and the gap between
    the published total and placement + kill points is kept as an adjustment."""
    spec = importlib.util.spec_from_file_location("transcription", src["transcription"])
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    tables = {t: [standing(league, team, p, 2 * k, total - p - 2 * k) for team, p, k, total in rows] for t, rows in m.COLLATION.items()}
    tiers = {r["team"]: t for t, rows in tables.items() for r in rows}
    kills, used = [], set()
    for t, rows in m.KILLS.items():
        for name, raw, k in rows:
            team = league.team(raw)
            tiers.setdefault(team, t)
            kills.append({"player": league.person(name, team, used), "team": team, "kills": k})
    # The kill tables list only each tier's top 20, so rosters stay empty rather than partial.
    return finish(tables, {}, tiers, kills)


BUILD = {"season-10": season_sheets, "carry1st-event": tier_files, "mixed-event-season-4": player_stats, "season-9": transcription}


# ---------- Writing ----------

def js(o):
    return json.dumps(o, ensure_ascii=False)


def obj(d):
    return "{ " + ", ".join(f"{k}: {js(v)}" for k, v in d.items()) + " }"


HEAD = ["/**", " * Generated by `scripts/league-data.py` from the owner's sheets. Don't edit by hand; fix the", " * sheet (or the script's aliases) and run it again.", " */", ""]


def write(path, lines):
    open(path, "w", encoding="utf-8", newline="\n").write("\n".join(HEAD + lines) + "\n")


def main(sources_path, out_dir):
    sources = json.load(open(sources_path, encoding="utf-8"))
    league = League()
    results = {e: BUILD[e](league, sources[e]) for e in EVENTS if e in sources}
    os.makedirs(out_dir, exist_ok=True)

    teams = sorted(league.teams.values(), key=lambda t: t["name"].lower())
    write(os.path.join(out_dir, "teams.ts"), ['import type { TeamRecord } from "../types";', "", "export const teamRecords: TeamRecord[] = [",
                                               *[f"  {obj(t)}," for t in teams], "];"])
    write(os.path.join(out_dir, "people.ts"), ['import type { PersonRecord } from "../types";', "", "/** Players by professional name, with their in-game name where it differs. */",
                                                "export const personRecords: PersonRecord[] = [", *[f"  {obj(p)}," for p in league.people.values()], "];"])
    for event, r in results.items():
        var = re.sub(r"-(\w)", lambda m: m.group(1).upper(), event)
        lines = ['import type { EventResults } from "../types";', "", f"export const {var}: EventResults = {{"]
        if r["matches"]:
            lines.append(f"  matches: {r['matches']},")
        lines.append("  tables: [")
        for t in r["tables"]:
            tier = f" tier: {t['tier']}," if "tier" in t else ""
            lines.append(f"    {{ name: {js(t['name'])},{tier} rows: [")
            lines += [f"      {obj(row)}," for row in t["rows"]]
            lines.append("    ] },")
        lines += ["  ],", "  /** One registration per squad; rosters in the order the sheet lists them. */", "  entries: ["]
        for e in r["entries"]:
            lineup = ", ".join(f"{{ player: {js(p)} }}" for p in e["lineup"])
            tier = f" tier: {e['tier']}," if e.get("tier") else ""
            lines.append(f"    {{ team: {js(e['team'])},{tier} lineup: [{lineup}] }},")
        lines += ["  ],", "  kills: ["]
        lines += [f"    {obj(k)}," for k in r["kills"]]
        lines += ["  ],", "};"]
        write(os.path.join(out_dir, f"{event}.ts"), lines)
        print(f"{event}: {sum(len(t['rows']) for t in r['tables'])} standings rows in {len(r['tables'])} tables, "
              f"{len(r['entries'])} squads, {len(r['kills'])} kill rows, matches {r['matches']}", file=sys.stderr)

    print(f"{len(teams)} teams, {len(league.people)} players ({league.reused} matched to a player from a newer event)", file=sys.stderr)
    if league.countries:
        print("countries with no code (add to COUNTRIES):", sorted(league.countries), file=sys.stderr)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main(*sys.argv[1:3])
