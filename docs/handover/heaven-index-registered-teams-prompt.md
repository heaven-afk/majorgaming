# Prompt for the Heaven Index agent: send registered teams to MGL

Copy everything below the line into the coding agent working on Heaven Index.

---

You are working in the Heaven Index codebase. Make one small, additive change to the existing MGL results feed, `GET /api/v1/mgl/results?tournamentId=<id>`.

## Why

When an MGL admin links an MGL event to a Heaven Index tournament, MGL now shows every Heaven Index team beside its MGL team so the admin can confirm the matches before linking. MGL can only read teams from `tables[].teams`. A tournament that has not recorded results can return `"tables": []`, so MGL has nothing to check.

Real example: on 25 November 2026 the tournament "MOCK TEST" (`2b30cd4b-9cd6-47f0-a002-7e28bbdd28c3`, status `setup`) returned `"tables": []`.

## First, look and report

Before editing, read the endpoint and tell me:

1. Where a tournament's registered teams are stored, and whether MOCK TEST has any. If it has none, say so: the admin must add them in Heaven Index.
2. Why MOCK TEST returns no tables: no teams entered, no results recorded, or something else.
3. What `tables[].teams[].id` is. Is it the team's permanent registry ID, the same in every tournament, or an ID that belongs to one tournament?

## The change

Add a top-level `registeredTeams` array to the single-tournament response:

```json
{
  "version": 1,
  "organizer": "Major Gaming League",
  "event": { "id": "…", "name": "MOCK TEST", "status": "setup", "startDate": "2026-11-25T00:00:00+00:00" },
  "completed": false,
  "registeredTeams": [
    { "id": "xJxtUKNTUpNmChdrdvDv", "name": "Primal Packs" },
    { "id": "another-team-id", "name": "Vortex One" }
  ],
  "tables": []
}
```

Rules:

- List every team currently entered in that tournament, in every group, whatever the tournament's status and whether or not the team has played. Leave out teams that were withdrawn or removed.
- `id` must be the same ID the team has in `tables[].teams[].id`. MGL saves each match against this ID, so it must not change when a team is renamed or when results come in. It should also be the same in every tournament. If the IDs you use today belong to one tournament only, do not change `tables`: use the same IDs here and tell me.
- `id` must match `^[A-Za-z0-9_-]{1,200}$`. `name` is the team's current name: 1 to 300 characters, not blank.
- Each ID appears once, even if the team is in several groups. At most 5,000 teams. Sort by name, then ID.
- No teams entered: send `[]`. Never send `null`.
- Send only `id` and `name`. No players, contact details or other fields.

Do not change:

- `version` stays `1`. Every existing field keeps its name, type, order and ranking rules.
- The list response (no `tournamentId`) stays as it is.
- Authentication (`x-mgl-results-key`), the organizer check and the error codes stay as they are. A tournament that is not MGL's must still return `MGL_TOURNAMENT_NOT_FOUND` with no team names.
- Scoring, standings, the push notifications and their signature stay as they are. MGL fetches the feed when an admin presses Check teams, so a new notification is not needed.

If reading registered teams fails, fail the request as the endpoint does for other read errors. Do not send a partial list.

## Tests

Cover at least:

- A tournament in setup with teams and no results: `registeredTeams` is filled and `tables` is `[]`.
- A tournament with results: every ID in `tables[].teams` that is still entered is also in `registeredTeams`, with the same ID.
- A team in two groups appears once. A removed team does not appear. A renamed team keeps its ID.
- No teams entered returns `[]`.
- A tournament owned by another organizer, and a missing or wrong key, are refused exactly as before.
- Everything else in the response is identical to before the change.

## Done means

Tests, types and build pass, and the change is deployed to the Heaven Index that MGL reads. Then report:

- the answers to the three questions above;
- how many registered teams MOCK TEST now returns;
- anything you could not check.

Do not print or share the results key. MGL ignores a missing `registeredTeams`, so this can be deployed before or after MGL's own update.
