# Heaven Fantasy Core — Transfer Rules V1.0 (revised implementation contract)

This contract implements the partner's finalized rules and supersedes earlier unconfirmed transfer-policy and price-window descriptions. It does not change Scoring V1.0 or Pricing V1.0 calculations.

## Window and fixed prices

- The actual matchday market must be OPEN when a new transfer commits. LOCKED, CLOSED and unpublished DRAFT markets reject transfers, including Free Transfer requests.
- Existing safeguards also remain: DISCOVERED matchday, zero played matches, configured unexpired submission deadline, and a tournament that is not CONCLUDED.
- Publishing the first market creates one immutable tournament price snapshot. Later matchdays reuse it. Price publication and transfer locking are separate actions: DRAFT -> OPEN -> LOCKED -> CLOSED (OPEN -> CLOSED is also allowed).
- Both sale and purchase resolve from this tournament snapshot, never from historical purchase cost or a client's quote. Prices cannot offset a points penalty. New players without an official frozen tournament price cannot be added through later draft generation.
- Five distinct players, four starters with exactly one of each existing role, one starting captain, one substitute, max two players per real team and a 100-credit budget remain enforced.

## What counts as a replacement

- Initial selection is not a replacement and creates no transfer charge.
- After initial creation, every change to the owned player-ID set must go through the transfer endpoint. A full-squad save cannot bypass charges.
- Carrying a squad into another matchday retains the previous squad's same five player IDs and is free. Create that matchday squad before requesting a transfer.
- Captain, role and scoring-chip changes with the same player IDs are not player replacements. These remain free within the window.
- Each transfer request removes exactly one owned player and buys exactly one unowned player. Multi-player requests are rejected; submit separate transactions for multiple replacements.
- The replacement inherits the outgoing player's slot and role. A transferred captain or vice captain passes that designation to the replacement, preserving a valid captain automatically.

## Penalty accounting

- A successful ordinary replacement records exactly one -4 Manager-level adjustment linked to its transfer ID. A successful waived replacement records an auditable zero adjustment.
- No penalty is applied by, or written into, the player scoring engine, finalized player results or persisted raw Manager matchday score. Those remain unchanged.
- Current tournament total = sum of persisted Manager matchday scoring points + sum of transfer adjustments. An unscored Manager can have a negative total; deductions are never silently floored to zero.
- The transfer belongs to its target OPEN matchday. That matchday leaderboard adds the adjustment to that day's raw score; the season leaderboard adds all adjustments once across the tournament. Before new matchday scoring, the season/Manager summary shows the adjusted points carried forward from earlier matchdays.
- Example: 100 previously scored points, then one paid transfer for the next matchday, immediately gives 96 tournament points. When the next matchday later awards 20 raw points, the total is 116. Reprocessing the raw score never creates another transfer adjustment.

## Free Transfer chip

- Every Manager has one single-replacement waiver per tournament. It is separate from the matchday activeChip field for Triple Captain and Bench Boost, so those existing scoring-chip rules remain unchanged.
- Request the waiver using useFreeTransferChip=true on one valid replacement. It cannot activate on its own, waive several replacements or bypass any eligibility/budget/window rule.
- AVAILABLE becomes USED only when the entire transaction succeeds. A failed or rejected transaction preserves the chip.
- An unused chip becomes EXPIRED when the partner concludes the tournament. A used chip remains USED for historical accuracy. Nothing carries to another tournament.
- Partner-only POST /api/v1/admin/tournaments/{tournamentId}/complete marks CONCLUDED and closes all windows. This does not rewrite final scores.

## Atomicity and safe retries

- A database transaction rechecks the authoritative market/window, existing squad, tournament prices, resulting roster/budget, and chip availability under locks.
- Squad replacement, transfer record, adjustment, optional chip consumption and the saved receipt commit together or roll back together.
- Idempotency-Key is required (8–128 letters/digits/period/underscore/colon/hyphen). Scope is the authenticated Manager and key. Reusing it with a different payload returns 409.
- Identical retries return the original immutable receipt and transfer ID without another replacement, charge or chip use. This remains safe after the window closes, because no new transfer executes.
- The optional expectedSquadUpdatedAt rejects a stale draft. Retrying must preserve the original request body, including that value.
- The returned total is the authoritative snapshot at the transaction, not a client-calculated deduction. Later events may change the live summary; retrieve /managers/me/points for the latest total.

## API

POST /api/v1/transfers, MGL Manager Bearer token, Content-Type: application/json and required Idempotency-Key:

```json
{
  "tournamentId": "mgl-sandbox",
  "matchdayNumber": 2,
  "playerOutId": "sandbox-player-01",
  "playerInId": "sandbox-player-06",
  "useFreeTransferChip": false
}
```

Unknown fields, client-supplied prices, client-supplied Manager identity and replacement arrays are rejected. Manager identity comes from the verified authentication context. Partner read/admin credentials cannot act as a Manager token.

The response contains transferId, playerOutId, playerInId, sellPrice, buyPrice, penaltyApplied (positive 4, or 0), adjustmentId, usedFreeTransferChip, the updated squad and cost, remainingCredits, managerPoints (including totalFantasyPoints and freeTransferChip status), and transferredAt. Manager-level transferAdjustmentPoints is signed (-4, -8, etc.). These conventions prevent confusing a debit amount with the resulting balance.

GET /api/v1/managers/me/points?tournamentId=... returns the latest Manager scoring/adjustment/total summary and chip status. GET /squads/me also includes managerPoints and the confirmed transfer policy, and supplies previousSquad in a 404 response when carry-forward is available. GET /squads/chips adds free_transfer without changing the scoring activeChip enum.

## UI

The Core root is the administrator dashboard. Consuming esports websites own Manager screens, including single-player transfer selection, Free Transfer availability, receipts, remaining credits, and authoritative totals. The API supplies these values. Unknown-outcome retries must reuse the same pending request key and body; carry-forward must be explicit. The former bundled Manager reference UI was replaced during the admin dashboard restructure.

## Deployment

Apply 20261028_transfers_v1.sql after the chip and MGL migrations (or use the updated full schema for a fresh database). Legacy draft OPEN rows are reclassified as unpublished only during first migration; legacy LOCKED rows are not silently opened. Operators must review old LOCKED-as-publication states before using the new lifecycle.

The migration derives the initial tournament snapshot from the earliest published market and stops if other published prices conflict. Resolve those records with the operator before rollout; never rewrite finalized scoring records to resolve a price conflict. Published snapshot mutation is blocked. New tables and RPCs are service-role-only.

Real deployment/migrations and staging acceptance remain pending the previously identified hosting/database connections. Local tests do not claim staging performance or live deployment.
