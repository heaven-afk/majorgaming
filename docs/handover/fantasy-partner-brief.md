# Fantasy: Partner Handover Brief

**For:** the partner who runs Heaven Index and Fantasy Core
**From:** the MGL website team
**Status:** Proposed. Items marked **[Decision]** need agreement before we build against them.

---

## 1. How the three systems fit together

| System | Owner | Job |
|---|---|---|
| **Heaven Index** | Partner | Records every event: kills, team placements, players. Source of truth. |
| **Fantasy Core** | Partner | Reads selected data from Heaven Index. Calculates fantasy points, player prices, manager budgets and matchday status. Holds the admin for all of this. |
| **MGL website** | MGL | Manager accounts, names, and every screen managers and fans see. Shows numbers from Fantasy Core. Calculates nothing. |

**Ownership split:**
- **Partner:** all game logic and game admin. This includes completing events, updating prices, running scoring, and manually triggering completion when needed.
- **MGL:** user accounts and logins, manager display names, the squad builder and leaderboard screens, the fantasy pages, and the content admin (news, staff, teams).

---

## 2. What MGL will do

1. **Manager accounts live on MGL.** Managers sign up and log in on the MGL site. We are the only place passwords are stored.
2. **Each manager picks a display name** when they register. That name is shown everywhere on the MGL site, including leaderboards. Managers are not shown as raw IDs.
3. **MGL calls Fantasy Core from its own server.** The partner API key is never sent to a browser.
4. **MGL tells Fantasy Core who the manager is** on every request that involves a manager (see section 3).
5. **MGL caches** market and leaderboard data to stay within the rate limit.

---

## 3. What we need from you

### A. Trusting managers who log in on MGL **[Decision]**

We propose: **MGL issues a signed login token for each manager. Fantasy Core checks the signature using a key MGL shares with you.**

- **Token contents:** the manager's MGL user ID, and their display name.
- **Token signing:** MGL signs tokens with a secret key. We'll share the matching public key (or a shared secret, your choice) through a secure channel, never in the repo or in chat.
- **Your task:** make `POST /api/v1/squads` and `GET /api/v1/squads/me` accept these tokens. Reject tokens with a bad signature or an expired date.

*If you prefer that Fantasy Core runs its own login instead, tell us, and we'll reconsider. Either way, we need one agreed method before we build the squad screens.*

### B. Display names on the leaderboard

- The leaderboard must return the **display name** for each manager, not just their internal ID.
- Preferred: MGL sends each manager's display name to Fantasy Core when they register or change it (a `PUT` endpoint, e.g. `PUT /api/v1/managers/:id/profile`), and the leaderboard returns it.
- Fallback: the leaderboard returns the manager's MGL user ID, and we map IDs to names on our side.

### C. Environment access

- A **staging** base URL and a **staging** API key, for building and testing.
- The **production** URL and key later, once we're ready to go live.
- A higher request limit if needed for the leaderboard during live events. Currently 120 per minute per key.

### D. Fill the gaps in the current spec

Please confirm or define these, so the screens can be built correctly:

1. **Transfers:** how many free transfers per window, and what the penalty is for extra transfers.
2. **Chips:** the full list of `activeChip` values, when each can be used, and how many times.
3. **Role rules:** whether each squad needs exactly one of each role, or can repeat roles.
4. **Season standings:** an overall season leaderboard, not just per matchday. Or confirm we can sum matchdays ourselves.
5. **Scoring inputs:** confirm the exact stats used for points: player kills, team placement, kill share, and kill contribution. Confirm the examples in the spec are complete.
6. **Price timing:** confirm when prices change. Is it once per matchday, or after each event? Which is the lock time?
7. **Completion:** how a matchday moves through `READY`, `PROCESSING`, `COMPLETED` and `PROCESSED`, and whether completion can be triggered manually.
8. **Player history:** `GET /api/v1/players/history` (no player ID) is listed as implemented but not documented. Please document it.
9. **Missing example:** the response example for `GET /api/v1/squads/me` is cut off with `...`. Please provide the full response.
10. **Live base URL:** the spec uses an example address. Please give us the real one.

### E. Later, not blocking us now

- Private leagues (`POST /api/v1/leagues/private`).
- Webhooks, so we get told when prices change or results are ready, instead of polling every 5 to 15 minutes.

---

## 4. What we don't need from you

- We don't need admin access. Deadlines, completion, pricing and scoring stay on your side.
- We don't need manager emails or phone numbers. Our site already has them, and we don't want them returned by the API.

---

## 5. Before we start building the fantasy screens

We need these agreed first:
- Section 3A (how managers are trusted)
- Section 3B (how display names reach the leaderboard)
- Section 3C (a staging URL and key)

Everything else can come in order, as long as we have a way to test the API with real data.
