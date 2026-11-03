# Fantasy Core contract snapshot

Copied on 2026-11-03 from the actual sibling project:
`C:/Users/USER/Documents/Projects/Heaven_fantasy_codm/docs/integrations/`.
No changes were made to that project. These files replace the assumptions in
MGL's original v1 API document and proposed partner handover.

- `openapi.yaml`: current machine-readable contract, version 1.3.0.
- `WEBSITE_API_MANAGEMENT.md`: website isolation, credentials and identity trust.
- `TRANSFER_RULES_V1.md`: transfers, immutable prices, chips and safe retries.
- `WEBSITE_TRANSFER_WINDOWS.md`: delegated website admin window operations.
- `environments.json`: latest recorded deployment state from that checkout.

Some narrative documents still describe older rollout blockers. The latest
environment record says the database upgrade was applied and verified on
2026-11-02, a production URL exists, environment classification is pending, and
MGL access remains closed. Staging is recorded as not provisioned. These are
repository records, not independently verified live deployment results.

Relative references inside the copied documents may point to files in the source
project. Follow MGL's `../fantasy-connection-guide.md` for the website setup.
