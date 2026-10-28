# Fantasy Core API — Partner Integration Specification

**Document Version:** 1.0.0  
**Target Audience:** External Partner Platforms & Third-Party Technical Teams  
**Protocol:** HTTPS / REST / JSON  
**Base Path:** `/api/v1`

---

## 1. System Overview

**Fantasy Core** is an independent, API-driven fantasy sports infrastructure designed for competitive Call of Duty: Mobile esports. It delivers a complete, turn-key backend for roster building, credit-based player trading, matchday scoring, and leaderboard rankings.

This specification enables any authorized **External Partner Platform** (media hub, tournament organizer, or esports web application) to integrate fantasy gaming into their frontend or mobile applications.

```
┌─────────────────────────────────┐
│ External Partner Platform       │
│ (Server-to-Server Backend)      │
└────────────────┬────────────────┘
                 │
                 │ Authenticated REST Requests (`x-fantasy-api-key`)
                 ▼
┌────────────────────────────────────────────────────────┐
│                   FANTASY CORE API                     │
│  - Tournaments & Matchday Schedules                    │
│  - Credit Markets with Published Player Valuations    │
│  - Finalized Fantasy Performance Scores                │
│  - Ranked Leaderboard Standings                        │
│  - Squad Composition & Budget Validation               │
└────────────────────────────────────────────────────────┘
```

---

## 2. Terminology

To ensure consistency across technical specifications and client integrations, the following terms are used:

- **Fantasy Core API:** The centralized backend service that computes and manages fantasy competitions, player markets, matchday results, and standings.
- **External Partner Platform:** Any authorized third-party organization, website, or mobile application connecting to Fantasy Core to present fantasy gameplay to users.
- **API Consumer:** Any server-side application or service holding authorized credentials to query the Fantasy Core API.
- **Fantasy Manager:** An authenticated end user participating in a fantasy tournament, creating squads, selecting captains, and earning points.
- **Platform Administrator:** The authorized operator managing tournament catalogs, synchronizing official match statistics, and finalizing competition states.

---

## 3. Partner Authentication & Security

All API Consumers must authenticate their requests using a dedicated API key.

### 3.1 Authentication Header

Every partner request to the Fantasy Core API must include the following HTTP header:

```http
x-fantasy-api-key: your_partner_api_key_here
```

### 3.2 Obtaining & Managing Credentials

1. **Credential Provisioning:** API keys are provisioned directly by the Platform Administrator during partner onboarding through a secure out-of-band channel.
2. **Environment Separation:** Separate API keys are issued for staging/sandbox environments and production environments.
3. **Key Rotation & Revocation:** If an API key is compromised, notify the Platform Administrator immediately. The compromised key will be revoked and a replacement credential issued with zero downtime.

### 3.3 Security Invariants

- **Server-to-Server Only:** Partner API keys grant read-only access to published tournament, market, and scoring data. They **must remain on your server backend** and must never be exposed in client-side JavaScript, mobile app bundles, or public version control.
- **End-User Isolation:** End-user operations (such as saving or retrieving a user's private squad) use verified end-user authentication tokens (`Authorization: Bearer <token>`) rather than partner API keys.
- **No Administrative Capabilities:** Partner API keys cannot trigger market locks, recalculate valuations, or modify competition states.

---

## 4. API Stability & Error Handling

### 4.1 Base URL & Content Type

All requests must use HTTPS and specify standard JSON headers:

```http
Accept: application/json
Content-Type: application/json
```

### 4.2 Standard Error Response Schema

When a request cannot be fulfilled, the Fantasy Core API returns an error response with an appropriate HTTP status code and a JSON body:

```json
{
  "error": "Human-readable description of the error",
  "details": ["Optional array of specific field validation errors"],
  "status": 400
}
```

### 4.3 HTTP Status Codes

| Status Code | Meaning | Common Cause |
| :--- | :--- | :--- |
| `200 OK` | Success | Request completed successfully. |
| `400 Bad Request` | Invalid Request | Missing required parameters, invalid formats, or array limit exceeded. |
| `401 Unauthorized` | Authentication Failed | Missing or invalid `x-fantasy-api-key`, or expired session token. |
| `403 Forbidden` | Access Denied | Consumer or user does not have permission to access the target resource. |
| `404 Not Found` | Resource Unavailable | The requested tournament, matchday, or market has not yet been published. |
| `409 Conflict` | State Conflict | Market is `LOCKED` or `CLOSED`; roster modifications or mutations rejected. |
| `422 Unprocessable Entity` | Validation Failed | Semantic validation error (e.g., squad violates budget or roster rules). |
| `429 Too Many Requests` | Rate Limit Exceeded | Exceeded allowed requests per minute at the API gateway layer. |
| `500 Server Error` | Internal Error | Unexpected server error. Retry with exponential backoff. |

### 4.4 Rate Limits & Quotas

- **Standard Partner Tier:** 120 requests per minute per API key enforced at the API gateway layer.
- **Header Feedback:** Standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are attached to responses.
- **Burst Handling:** Brief bursts up to 30 requests above threshold are buffered before `429 Too Many Requests` is returned. Contact platform administrators for enterprise or high-volume event increases.

---

## 5. Endpoints Reference

### 5.1 Tournament Catalog

#### `GET /api/v1/tournaments`
Lists all active, upcoming, and past tournaments registered in Fantasy Core.

**Headers:**
```http
x-fantasy-api-key: your_partner_api_key_here
```

**Response `200 OK`:**
```json
{
  "count": 2,
  "tournaments": [
    {
      "id": "tournament_spring_2026",
      "name": "Spring Masters 2026",
      "status": "active",
      "createdAt": "2026-03-01T00:00:00.000Z"
    },
    {
      "id": "tournament_fall_2025",
      "name": "Fall Invitational 2025",
      "status": "completed",
      "createdAt": "2025-10-15T00:00:00.000Z"
    }
  ]
}
```

---

### 5.2 Matchday Calendar & Status

#### `GET /api/v1/tournaments/:tournamentId/matchdays`
Retrieves the matchday sequence, progress, and market status for a specific tournament.

**Path Parameters:**
- `tournamentId` *(string, required)*: The tournament identifier (e.g., `tournament_spring_2026`).

**Headers:**
```http
x-fantasy-api-key: your_partner_api_key_here
```

**Response `200 OK`:**
```json
{
  "tournamentId": "tournament_spring_2026",
  "count": 2,
  "matchdays": [
    {
      "tournamentId": "tournament_spring_2026",
      "matchdayNumber": 1,
      "expectedMatches": 3,
      "matchesPlayed": 3,
      "fantasyStatus": "PROCESSED",
      "marketStatus": "CLOSED",
      "processedAt": "2026-03-10T18:30:00.000Z"
    },
    {
      "tournamentId": "tournament_spring_2026",
      "matchdayNumber": 2,
      "expectedMatches": 3,
      "matchesPlayed": 0,
      "fantasyStatus": "READY",
      "marketStatus": "OPEN",
      "processedAt": null
    }
  ]
}
```

**Lifecycle Values:**
- `fantasyStatus`: `DISCOVERED` | `READY` | `COMPLETED` | `PROCESSING` | `PROCESSED`
- `marketStatus`: `OPEN` (transfers permitted) | `LOCKED` (transfers frozen) | `CLOSED` (matchday concluded)

---

### 5.3 Player Market & Published Prices

#### `GET /api/v1/markets/:tournamentId?matchday=:matchdayNumber`
Retrieves the published transfer market for a matchday, including all participating players and their official credit prices.

**Path Parameters:**
- `tournamentId` *(string, required)*: Tournament identifier.

**Query Parameters:**
- `matchday` *(number, optional)*: Specific matchday number. Defaults to the tournament's active matchday if omitted.

**Headers:**
```http
x-fantasy-api-key: your_partner_api_key_here
```

**Response `200 OK`:**
```json
{
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 2,
  "status": "OPEN",
  "pricingVersion": "V1.0",
  "lockTime": "2026-03-17T13:45:00.000Z",
  "players": [
    {
      "playerId": "ply_101",
      "playerName": "Alex",
      "ign": "Striker",
      "teamIdAtLock": "team_alpha",
      "price": 26.5,
      "isEligible": true
    },
    {
      "playerId": "ply_102",
      "playerName": "Jordan",
      "ign": "Viper",
      "teamIdAtLock": "team_alpha",
      "price": 21.0,
      "isEligible": true
    },
    {
      "playerId": "ply_103",
      "playerName": "Taylor",
      "ign": "Sentinel",
      "teamIdAtLock": "team_beta",
      "price": 18.0,
      "isEligible": true
    },
    {
      "playerId": "ply_104",
      "playerName": "Morgan",
      "ign": "Ghost",
      "teamIdAtLock": "team_beta",
      "price": 17.5,
      "isEligible": true
    },
    {
      "playerId": "ply_105",
      "playerName": "Casey",
      "ign": "Apex",
      "teamIdAtLock": "team_gamma",
      "price": 14.0,
      "isEligible": true
    }
  ]
}
```

**Field Descriptions:**
- `price`: Official player acquisition cost in Fantasy Credits (bounded between `12.0` and `30.0`, rounded in `0.5` credit increments).
- `lockTime`: ISO 8601 timestamp at which market transfers will lock for this matchday.
- `isEligible`: Indicates whether the player is available for squad selection.

---

### 5.4 Finalized Matchday Scoring Results

#### `GET /api/v1/scoring/matchday?tournamentId=:tournamentId&matchday=:matchdayNumber`
Retrieves finalized, official fantasy scores for all players in a completed matchday.

**Query Parameters:**
- `tournamentId` *(string, required)*: Tournament identifier.
- `matchday` *(number, required)*: Matchday number.

**Headers:**
```http
x-fantasy-api-key: your_partner_api_key_here
```

**Response `200 OK`:**
```json
{
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 1,
  "scoringVersion": "1.0",
  "persistedAt": "2026-03-10T18:30:00.000Z",
  "status": "FINALIZED",
  "playerScores": [
    {
      "playerId": "ply_101",
      "displayMeta": {
        "playerName": "Alex",
        "team": "team_alpha"
      },
      "roleScores": {
        "Fragger": {
          "role": "Fragger",
          "kills": 16,
          "killPoints": 15.5,
          "baseFantasyPoints": 9.84,
          "finalFantasyPoints": 9.84,
          "modifier": "none"
        },
        "Support": {
          "role": "Support",
          "kills": 16,
          "killPoints": 15.5,
          "baseFantasyPoints": 11.56,
          "finalFantasyPoints": 11.56,
          "modifier": "none"
        }
      }
    }
  ]
}
```

**Scoring V1.0 Diminishing Returns Invariant:**
Under the frozen Fantasy Scoring V1.0 specification, player kills accumulate at 1.0 Kill Point per kill up to the threshold of 15 kills, and 0.5 Kill Points per kill thereafter:
$$\text{Kill Points}(16) = 15 + (16 - 15) \times 0.5 = 15.5$$
Role scores and calibrations are computed server-side and outputted directly as `baseFantasyPoints` and `finalFantasyPoints`. Proprietary role weights, calibration multipliers, and intermediate raw formulas are omitted from partner payloads.

**Field Descriptions:**
- `killPoints`: Diminishing-returns kill score (1.0 pt/kill for first 15 kills; 0.5 pt/kill thereafter).
- `baseFantasyPoints`: Finalized base points awarded under the specified role before multipliers.
- `finalFantasyPoints`: Points awarded after applying active modifier (`captain` = 2x, `tripleCaptain` = 3x, or `none`).
- `modifier`: Active modifier applied to the player (`captain`, `tripleCaptain`, or `none`).

---

### 5.5 Official Matchday Leaderboard

#### `GET /api/v1/leaderboards/:tournamentId?matchday=:matchdayNumber`
Retrieves ranked fantasy standings for a matchday. 

**Path Parameters:**
- `tournamentId` *(string, required)*: Tournament identifier.

**Query Parameters:**
- `matchday` *(number, optional)*: Matchday number. Defaults to the active matchday if omitted.
- `includeBreakdown` *(boolean, optional)*: Defaults to `false`. When set to `true`, includes sanitized starter points breakdowns.

**Headers:**
```http
x-fantasy-api-key: your_partner_api_key_here
```

**Standard Response `200 OK` (Default Privacy-Preserving View):**
```json
{
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 1,
  "count": 1,
  "leaderboard": [
    {
      "rank": 1,
      "managerId": "usr_mgr_alice",
      "totalScore": 29.46
    }
  ]
}
```

**Detailed Breakdown Response `200 OK` (`?includeBreakdown=true`):**
```json
{
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 1,
  "count": 1,
  "leaderboard": [
    {
      "rank": 1,
      "managerId": "usr_mgr_alice",
      "totalScore": 29.46,
      "breakdown": {
        "totalFantasyPoints": 29.46,
        "benchBoostActive": false,
        "starters": [
          {
            "playerId": "ply_101",
            "role": "Fragger",
            "kills": 16,
            "killPoints": 15.5,
            "baseFantasyPoints": 9.84,
            "modifier": "captain",
            "multiplier": 2,
            "finalFantasyPoints": 19.69
          },
          {
            "playerId": "ply_102",
            "role": "Support",
            "kills": 8,
            "killPoints": 8.0,
            "baseFantasyPoints": 9.77,
            "modifier": "none",
            "multiplier": 1,
            "finalFantasyPoints": 9.77
          }
        ],
        "substituteResult": null
      }
    }
  ]
}
```

**Leaderboard Privacy Protections:**
- **Manager Privacy:** Personal manager details (emails, phone numbers) are stripped; only public manager handles or anonymized identifiers are exposed.
- **Roster Privacy:** Internal squad database identifiers (`squadId`) are withheld entirely. Detailed squad starter choices are omitted by default to prevent competitor scraping.

---

### 5.6 Player Historical Observations

#### `GET /api/v1/players/:playerId/history`
Retrieves chronological fantasy career observations for a specific player across all completed tournaments.

**Path Parameters:**
- `playerId` *(string, required)*: Player identifier.

**Query Parameters:**
- `excludeTournament` *(string, optional)*: Excludes observations from a designated tournament (used internally to prevent statistical leakage into active competitions).

**Headers:**
```http
x-fantasy-api-key: your_partner_api_key_here
```

**Response `200 OK`:**
```json
{
  "playerId": "ply_101",
  "count": 2,
  "observations": [
    {
      "playerId": "ply_101",
      "tournamentId": "tournament_fall_2025",
      "matchdayNumber": 1,
      "fantasyPoints": 8.1250,
      "scoringVersion": "1.0"
    },
    {
      "playerId": "ply_101",
      "tournamentId": "tournament_fall_2025",
      "matchdayNumber": 2,
      "fantasyPoints": 7.8500,
      "scoringVersion": "1.0"
    }
  ]
}
```

---

### 5.7 Squad Rule Validation (Authoritative & Sandbox)

#### `POST /api/v1/squads/validate`
Validates a squad composition against fantasy roster rules and credit budget constraints without saving to the database.

Fantasy Core provides two distinct validation workflows:
1. **Authoritative Server-Side Validation (Recommended for official roster submission flows):** Validates against official published market prices stored on Fantasy Core.
2. **Client-Supplied Sandbox Validation (For offline roster builder previews & dry-runs):** Validates against custom player and price arrays with strict computational abuse protections.

**Headers:**
```http
Content-Type: application/json
x-fantasy-api-key: your_partner_api_key_here (optional for client builders, verified if present)
```

#### Mode A: Authoritative Server-Side Validation (Official)

**Request Body:**
```json
{
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 2,
  "squad": {
    "starters": [
      { "playerId": "ply_101", "role": "Fragger", "isCaptain": true },
      { "playerId": "ply_102", "role": "Support" },
      { "playerId": "ply_103", "role": "Anchor" },
      { "playerId": "ply_104", "role": "IGL" }
    ],
    "substitute": { "playerId": "ply_105", "role": "Support" }
  }
}
```

**Success Response `200 OK`:**
```json
{
  "valid": true,
  "validationMode": "authoritative",
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 2,
  "marketStatus": "OPEN",
  "totalCost": 97.0,
  "remainingBudget": 3.0,
  "errors": []
}
```

#### Mode B: Client-Supplied Sandbox Validation (Dry-Run)

**Request Body:**
```json
{
  "squad": {
    "starters": [
      { "playerId": "ply_101", "role": "Fragger", "isCaptain": true },
      { "playerId": "ply_102", "role": "Support" },
      { "playerId": "ply_103", "role": "Anchor" },
      { "playerId": "ply_104", "role": "IGL" }
    ],
    "substitute": { "playerId": "ply_105", "role": "Support" }
  },
  "market": {
    "players": [
      { "playerId": "ply_101", "teamId": "team_alpha", "price": 26.5 },
      { "playerId": "ply_102", "teamId": "team_alpha", "price": 21.0 },
      { "playerId": "ply_103", "teamId": "team_beta", "price": 18.0 },
      { "playerId": "ply_104", "teamId": "team_beta", "price": 17.5 },
      { "playerId": "ply_105", "teamId": "team_gamma", "price": 14.0 }
    ]
  }
}
```

**Success Response `200 OK`:**
```json
{
  "valid": true,
  "validationMode": "sandbox",
  "totalCost": 97.0,
  "remainingBudget": 3.0,
  "errors": []
}
```

**Validation Failure Response `422 Unprocessable Entity`:**
```json
{
  "valid": false,
  "totalCost": 103.5,
  "remainingBudget": -3.5,
  "errors": [
    "Total squad cost (103.5 credits) exceeds 100.0 credit budget limit"
  ]
}
```

**Sandbox Abuse Protections:**
- **Market Array Bound:** Maximum 250 players in `market.players`. Larger arrays are rejected with `400 Bad Request`.
- **Starters Array Bound:** Maximum 10 players in `squad.starters`. Larger arrays are rejected with `400 Bad Request`.
- **Zero Side-Effects:** No manager or squad records are written during validation.

---

### 5.8 Manager Squad Submission (Authenticated)

#### `POST /api/v1/squads`
Submits or modifies a Fantasy Manager's squad for an upcoming matchday.

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <manager_user_jwt>
```

**Request Body:**
```json
{
  "tournamentId": "tournament_spring_2026",
  "matchdayNumber": 2,
  "activeChip": "none",
  "squad": {
    "starters": [
      { "playerId": "ply_101", "role": "Fragger", "isCaptain": true },
      { "playerId": "ply_102", "role": "Support" },
      { "playerId": "ply_103", "role": "Anchor" },
      { "playerId": "ply_104", "role": "IGL" }
    ],
    "substitute": { "playerId": "ply_105", "role": "Support" },
    "captainPlayerId": "ply_101"
  }
}
```

**Roster Rules:**
- **Total Budget:** Maximum `100.0` credits across all 5 players.
- **Starters:** Exactly 4 players with designated roles (`Fragger`, `IGL`, `Support`, `Anchor`).
- **Substitute:** Exactly 1 bench player.
- **Captain:** Exactly 1 starter selected as captain (`2x` point multiplier).
- **Team Limit:** Maximum 2 players from any single esports team.
- **Transfer Window:** Squad modifications are accepted only while the matchday market is `OPEN`. Attempts to submit against a `LOCKED` or `CLOSED` market return `409 Conflict`.

**Success Response `200 OK`:**
```json
{
  "success": true,
  "squadId": "squad_usr_mgr_alice_tournament_spring_2026_md2",
  "totalCost": 97.0,
  "squad": {
    "id": "squad_usr_mgr_alice_tournament_spring_2026_md2",
    "manager_id": "usr_mgr_alice",
    "tournament_id": "tournament_spring_2026",
    "matchday_number": 2,
    "active_chip": "none",
    "total_cost": 97.0
  }
}
```

---

### 5.9 View Authenticated Manager Squad

#### `GET /api/v1/squads/me?tournamentId=:tournamentId&matchday=:matchdayNumber`
Retrieves the authenticated Fantasy Manager's active squad for a matchday.

**Headers:**
```http
Authorization: Bearer <manager_user_jwt>
```

**Response `200 OK`:**
```json
{
  "managerId": "usr_mgr_alice",
  "squad": {
    "id": "squad_usr_mgr_alice_tournament_spring_2026_md2",
    "managerId": "usr_mgr_alice",
    "tournamentId": "tournament_spring_2026",
    "matchdayNumber": 2,
    "totalCost": 97.0,
    "captainPlayerId": "ply_101",
    "activeChip": "none",
    "starters": [ ... ],
    "substitute": { ... }
  }
}
```

---

## 6. Integration Examples

### 6.1 cURL Examples

#### Example 1: Discover Active Tournaments
```bash
curl -X GET "https://api.fantasycore.example.com/api/v1/tournaments" \
  -H "x-fantasy-api-key: your_partner_api_key_here" \
  -H "Accept: application/json"
```

#### Example 2: Retrieve Player Market & Prices
```bash
curl -X GET "https://api.fantasycore.example.com/api/v1/markets/tournament_spring_2026?matchday=2" \
  -H "x-fantasy-api-key: your_partner_api_key_here" \
  -H "Accept: application/json"
```

#### Example 3: Retrieve Final Matchday Leaderboard
```bash
curl -X GET "https://api.fantasycore.example.com/api/v1/leaderboards/tournament_spring_2026?matchday=1" \
  -H "x-fantasy-api-key: your_partner_api_key_here" \
  -H "Accept: application/json"
```

---

### 6.2 JavaScript / Node.js Examples

The following utility demonstrates how an External Partner Platform can consume published Fantasy Core data from their backend service:

```javascript
// fantasyCoreClient.js (Server-side service)
const FANTASY_BASE_URL = process.env.FANTASY_CORE_URL || 'https://api.fantasycore.example.com';
const FANTASY_API_KEY = process.env.FANTASY_PARTNER_API_KEY;

/**
 * Fetch published market players with credit prices.
 */
export async function getMatchdayMarket(tournamentId, matchdayNumber) {
  const url = new URL(`/api/v1/markets/${encodeURIComponent(tournamentId)}`, FANTASY_BASE_URL);
  if (matchdayNumber) {
    url.searchParams.set('matchday', matchdayNumber);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-fantasy-api-key': FANTASY_API_KEY,
      'Accept': 'application/json',
    },
    // Ensure fresh market data
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`Fantasy Core API Error (${response.status}): ${errorBody.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch official matchday leaderboard standings.
 */
export async function getMatchdayLeaderboard(tournamentId, matchdayNumber) {
  const url = new URL(`/api/v1/leaderboards/${encodeURIComponent(tournamentId)}`, FANTASY_BASE_URL);
  if (matchdayNumber) {
    url.searchParams.set('matchday', matchdayNumber);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-fantasy-api-key': FANTASY_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(`Leaderboard fetch failed (${response.status}): ${errorBody.error || response.statusText}`);
  }

  return response.json();
}
```

---

## 7. Step-by-Step Onboarding Guide

Follow these steps to complete integration with Fantasy Core:

1. **Obtain Credentials:** Contact the Platform Administrator to receive your unique partner API key and designated staging URL.
2. **Configure Environment Secrets:** Store your credential as `FANTASY_PARTNER_API_KEY` in your backend secret manager. **Never expose this key in client-side code.**
3. **Verify Connectivity:** Issue a test `GET /api/v1/tournaments` call using your API key. Confirm you receive a `200 OK` response.
4. **Synchronize Tournament Calendars:** Query `GET /api/v1/tournaments/:id/matchdays` to monitor competition schedules and detect when matchdays transition to `READY` or `COMPLETED`.
5. **Render the Player Market:** Ingest `GET /api/v1/markets/:id` to display participating players, roles, and credit prices in your roster builder. Respect the `lockTime` timestamp to inform users when the transfer window closes.
6. **Implement Squad Validation:** Use `POST /api/v1/squads/validate` to provide instantaneous, real-time client-side budget and roster feedback while users build squads.
7. **Publish Scores & Leaderboards:** When a matchday concludes, query `GET /api/v1/scoring/matchday` and `GET /api/v1/leaderboards/:id` to display verified manager rankings and points.
8. **Handle Polling & Caching:**
   - **Market data:** Cache during `OPEN` state; revalidate every 5–15 minutes.
   - **Locked market data:** Fully cacheable once `marketStatus` is `LOCKED` (player prices are strictly immutable once locked).
   - **Scores & Leaderboards:** Read once matchday reaches `PROCESSED`. Results are frozen and versioned.

---

## 8. Endpoint Coverage & Permission Matrix

| Endpoint Path | HTTP Method | Access Level | Status |
| :--- | :--- | :--- | :--- |
| `/api/v1/tournaments` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/tournaments/:id/matchdays` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/markets/:id` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/scoring/matchday` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/leaderboards/:id` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/players/:id/history` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/players/history` | `GET` | Partner API (`x-fantasy-api-key`) | **Verified / Implemented** |
| `/api/v1/squads/validate` | `POST` | Dual Mode: Authoritative & Sandbox (`x-fantasy-api-key` / Public) | **Verified / Implemented** |
| `/api/v1/squads` | `POST` | Manager Auth (`Bearer <jwt>`) | **Verified / Implemented** |
| `/api/v1/squads/me` | `GET` | Manager Auth (`Bearer <jwt>`) | **Verified / Implemented** |
| `/api/v1/pricing/calculate` | `POST` | Platform Administrator Only | **Restricted / Internal** |
| `/api/v1/admin/*` | All | Platform Administrator Only | **Restricted / Admin** |
| `/api/v1/leagues/private` | `POST` | Custom Private Leagues | *Planned / Roadmap* |
| `/api/v1/webhooks/subscribe` | `POST` | Event Webhooks (Market Lock, Scores Ready) | *Planned / Roadmap* |

---

## 9. Intellectual Property & Formula Protection Notice

Fantasy Core employs proprietary economic algorithms and role-scoring models to balance competitive fairness across esports seasons. 

In accordance with our intellectual property protections:
- The exact weights, calibration multipliers, piecewise price curves, and Bayesian hyperparameters governing player valuations and performance calculations are computed server-side and are **not disclosed in API responses**.
- API Consumers receive official published credit prices and finalized fantasy point totals.
- No client-side mathematical emulation of the scoring or pricing engines is required or supported.
