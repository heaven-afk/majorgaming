# Fantasy acceptance record

Updated 2026-11-05. Deliver on `feature/fantasy-integration`; hosted account changes
and production data mutations are outside this session's branch-only delivery.

## Local checks

- Automated tests: transport isolation and retry behavior, short-lived manager/admin
  tokens, admin-only window control, stale/cross-tournament rejection, missing/expired
  deadlines, response validation, squad/transfer structural validation.
- TypeScript, production build and browser checks are recorded in AGENTS.md after
  completion. Browser preview uses sample data, not a real manager account.
- Local browser preview: saved a complete squad with Triple Captain, made one
  Free Transfer and then a paid transfer, and verified the used chip and 4-point
  adjustment on the dashboard and embedded standings (142 → 138). Anonymous
  admin access redirects to login; confirmation controls checked at mobile and
  desktop sizes. No live window action was submitted.
- Core's isolated memory-adapter window suite and 24 transfer/chip tests passed;
  these exercise service behavior without changing hosted data.
- Final checks: all 27 MGL fantasy tests pass, TypeScript passes and the production
  build generates 270 pages. Existing `metadataBase` warning remains.

## Real end-to-end acceptance: pending in the approved environment

Use an explicitly disposable test tournament and a dedicated manager account. Keep
production scoring/participants untouched while testing. Record the deployment SHA,
Core origin/environment, assigned tournament ID and test time without credentials.

| Check | Required evidence |
| --- | --- |
| Readiness | Correct MGL issuer/JWKS and API/PROFILE credentials accepted; tournament visible only to MGL. |
| Sign-up/login | Real sign-up creates the manager profile; logout/login restores it; a wrong password is rejected. |
| Name sync | The same display name appears on MGL and Core's standings; name conflicts and failed sync retries are handled. |
| Admin launch | A verified owner/editor opens the draft from Admin → Fantasy; Core confirms OPEN for that exact tournament/matchday. A manager/anonymous caller is rejected. |
| Squad save | Five valid selections save to Core and survive reload; duplicate players/roles, over-budget squads and ineligible players are rejected. |
| Deadline | At the deadline, UI and Core reject changes; an already-open form cannot save after closure. |
| Transfers | Paid transfer receipt shows Core's penalty; Free Transfer is used once; retrying the same request/key cannot charge twice. |
| Chips | Triple Captain and Bench Boost follow Core's once-per-tournament state; repeated/invalid uses fail. |
| Processing | Feed disposable match results through the actual approved Heaven Index/Core pipeline. Core processes the matchday without MGL calculating points. |
| Updates | Dashboard points and standings refresh to Core's published totals; captain/chip/transfer adjustments match Core. |
| Isolation | A second manager cannot read/change the first manager's squad; another website's data is inaccessible. |
| Failure recovery | Timeout, 429, invalid/expired token and malformed upstream responses show safe errors without losing drafts or duplicating transfers. |
| Password reset | Email arrives, callback preserves the verified user session and new password works. SMTP/delivery limits are checked separately. |

Until these rows have real evidence, report the integration as implemented and
locally verified, with live acceptance pending. Do not describe preview activity,
a catalog read or a passing build as 100% live integration.
