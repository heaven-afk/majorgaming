"""
Turn an event's Excel sheets into `src/data/<event>.ts`, until the database import exists.

Reads two workbooks, one sheet per tier ("TIER 1" ... "TIER 5"):
  - the team collation: Rank, Team, Total Pts, ..., Wins, Matches, Place Pts, Kills, Kill Pts, Bonus Pts
  - the player kill data: Team Name, Professional Name, IGN, D1..Dn, Matches, Events, Kills / Event, Total Kills
Columns are found by header name, so extra or reordered columns don't matter.

The kill sheet lists every registered player, so it gives each squad's roster as well as the
kill table. Players are shown by their professional name; the in-game name is kept beside it.

Usage (standard library only; run with -I as the sheets are downloaded files):
  python -I scripts/season-sheets.py <event-slug> <team-collation.xlsx> <player-kills.xlsx> <out.ts>
"""

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
INVISIBLE = re.compile(r"[​-‏⁠﻿]")

# The same squad written two ways across the sheets (kill sheet name -> team sheet name).
TEAM_ALIASES = {
    "21 RAVENGERS": "21 REVENGERS",
    # One misfiled .VNG player with no matches; the squad is Vanguard Esports.
    "VANGUARD": "VANGUARD ESPORTS",
}

# Words kept in capitals when team names are set in title case.
ACRONYMS = {"X", "OG", "ZL", "MC", "YR", "B2M", "TEF", "DFL", "HIM", "GITG", "DNA", "MGL"}


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
    return int(re.search(r"\d+", sheet).group(0))


def header_row(rows, needle):
    for i, r in enumerate(rows):
        cols = [clean(c) for c in r]
        if needle in cols:
            return i, cols
    raise ValueError(f"no header with {needle!r}")


def main(event, teams_path, kills_path, out_path):
    team_sheets = read_xlsx(teams_path)
    kill_sheets = read_xlsx(kills_path)

    teams = {}  # key -> {slug, name, tier}
    tables = {}  # tier -> rows
    for sheet, rows in team_sheets.items():
        tier = tier_of(sheet)
        h, cols = header_row(rows, "Team")
        col = {name: cols.index(name) for name in cols if name}
        table = []
        for r in rows[h + 1:]:
            if len(r) <= col["Team"] or not clean(r[col["Team"]]):
                continue
            raw = clean(r[col["Team"]])
            name = title(raw)
            teams[key(raw)] = {"slug": slug_of(name), "name": name, "tier": tier}
            g = lambda c: number(r[col[c]]) if c in col and col[c] < len(r) else 0
            row = {"team": slug_of(name), "placement": g("Place Pts"), "kills": g("Kill Pts")}
            if g("Bonus Pts"):
                row["bonus"] = g("Bonus Pts")
            row["wins"], row["matches"] = g("Wins"), g("Matches")
            if row["placement"] + row["kills"] + row.get("bonus", 0) != g("Total Pts"):
                print("total mismatch:", sheet, raw, file=sys.stderr)
            table.append(row)
        tables[tier] = table

    people = {}  # slug -> {slug, name, ign}
    rosters = {}  # team slug -> [player slugs]
    kills = []
    for sheet, rows in kill_sheets.items():
        tier = tier_of(sheet)
        h, cols = header_row(rows, "Professional Name")
        ti, pi, ii, ki, mi = (cols.index(c) for c in ("Team Name", "Professional Name", "IGN", "Total Kills", "Matches"))
        for r in rows[h + 1:]:
            if len(r) <= max(ti, pi) or not clean(r[ti]) or not clean(r[pi]):
                continue
            raw_team = TEAM_ALIASES.get(clean(r[ti]), clean(r[ti]))
            team = teams.get(key(raw_team))
            if not team:
                name = title(raw_team)
                team = teams[key(raw_team)] = {"slug": slug_of(name), "name": name, "tier": tier, "unranked": True}
            name, ign = clean(r[pi]), clean(r[ii]) if ii < len(r) else ""
            roster = rosters.setdefault(team["slug"], [])
            # The same professional name on two squads is two players; give the second a team suffix.
            slug = slug_of(name) or slug_of(ign)
            if slug in people and people[slug]["team"] != team["slug"]:
                slug = f"{slug}-{team['slug']}"
            if slug in roster:
                continue  # listed twice on one squad
            people[slug] = {"slug": slug, "name": name, **({"ign": ign} if ign and ign != name else {}), "team": team["slug"]}
            roster.append(slug)
            kills.append({"player": slug, "team": team["slug"], "kills": number(r[ki]) if ki < len(r) else 0,
                          "matches": number(r[mi]) if mi < len(r) else 0})

    unranked = [t["name"] for t in teams.values() if t.get("unranked")]
    if unranked:
        print("on the kill sheet but not the team sheet (registered, no standings):", unranked, file=sys.stderr)

    var = re.sub(r"-(\w)", lambda m: m.group(1).upper(), event)
    js = lambda o: json.dumps(o, ensure_ascii=False)
    team_list = sorted(teams.values(), key=lambda t: (t["tier"], t["name"]))
    out = [
        "/**",
        f" * {event}: real results, rosters and kills, generated from the owner's Excel sheets by",
        " * `scripts/season-sheets.py`. Don't edit by hand; fix the sheet and run the script again.",
        " * Players are listed by professional name, with their in-game name where it differs.",
        " */",
        "",
        'import type { EntryRecord, KillRecord, PersonRecord, TableRecord, TeamRecord } from "./types";',
        "",
        f'const EVENT = "{event}";',
        "",
        f"export const {var}Teams: TeamRecord[] = [",
        *[f"  {{ slug: {js(t['slug'])}, name: {js(t['name'])} }}," for t in team_list],
        "];",
        "",
        f"export const {var}Tables: TableRecord[] = [",
    ]
    for tier in sorted(tables):
        out.append(f'  {{ name: "Tier {tier}", tier: {tier}, rows: [')
        for row in tables[tier]:
            out.append("    { " + ", ".join(f"{k}: {js(v)}" for k, v in row.items()) + " },")
        out.append("  ] },")
    out += ["];", "", f"export const {var}People: PersonRecord[] = ["]
    for p in people.values():
        out.append("  { " + ", ".join(f"{k}: {js(v)}" for k, v in p.items() if k != "team") + " },")
    out += ["];", "", "/** One registration per squad, its roster in the order the sheet lists it. */",
            f"export const {var}Entries: EntryRecord[] = ["]
    for t in team_list:
        players = ", ".join(f"{{ player: {js(p)} }}" for p in rosters.get(t["slug"], []))
        out.append(f"  {{ event: EVENT, team: {js(t['slug'])}, tier: {t['tier']}, lineup: [{players}] }},")
    out += ["];", "", "/** Every player's kills across the event; pages show the top 20 per tier. */",
            f"export const {var}Kills: KillRecord[] = ["]
    for k in kills:
        out.append(f"  {{ event: EVENT, player: {js(k['player'])}, team: {js(k['team'])}, kills: {k['kills']}, matches: {k['matches']} }},")
    out += ["];", ""]
    open(out_path, "w", encoding="utf-8", newline="\n").write("\n".join(out))
    print(f"wrote {out_path}: {len(team_list)} teams, {sum(len(t) for t in tables.values())} standings rows, "
          f"{len(people)} players, {len(kills)} kill rows", file=sys.stderr)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main(*sys.argv[1:5])
