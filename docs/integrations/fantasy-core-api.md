# Fantasy Core integration contract

The original v1.0.0 document here is superseded by the implemented website API in
`C:/Users/USER/Documents/Projects/Heaven_fantasy_codm`.

MGL now retains a [contract snapshot](fantasy-core/README.md), including
[OpenAPI 1.3.0](fantasy-core/openapi.yaml), [website API management](fantasy-core/WEBSITE_API_MANAGEMENT.md),
and [Transfer Rules V1](fantasy-core/TRANSFER_RULES_V1.md). Use the
[connection walkthrough](fantasy-connection-guide.md) to configure MGL.

Important corrections from the original document:

- Send `X-Fantasy-Site` and that website's API credential on reads and manager operations.
- Profile sync uses a separate PROFILE credential in `X-Fantasy-Service-Key`.
- MGL issues RS256/EdDSA manager tokens; Core already implements verification.
- Scoring chips are `null`, `triple_captain`, `bench_boost`.
- Markets include `DRAFT`; matchdays include `FAILED` and `submissionDeadline`.
- Prices freeze for the tournament. Replacements use the transfer endpoint,
  with an idempotency key; Core calculates all penalties and totals.
- Public website data uses short, website-scoped server caching (5s leaderboard,
  15s other reads); private manager reads are uncached on MGL.
- Display-name sync, seasonal standings and paginated leaderboards are implemented.

See the snapshot's environment record for deployment status. A deployed URL alone
does not establish active MGL access or completed acceptance checks.
