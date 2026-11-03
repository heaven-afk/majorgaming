# Transfer windows managed on the esports website

Partner esports website administrators use their own website admin panel. They do not log in to the Heaven Fantasy Core dashboard and must never receive the platform admin key.

The website backend calls POST /api/v1/markets/{tournamentId}/window with X-Fantasy-Site, its server-side X-Fantasy-Api-Key and a Bearer token signed by the website's registered issuer/key. The token uses the existing fantasy-core audience and required identity claims, includes permissions: ["fantasy:windows:manage"], and expires within 15 minutes of issuance. The website backend must verify its own administrator session before minting that claim; never copy permissions from browser input. Normal Manager tokens lack this permission. Tokens for another website are rejected.

Body: {"matchdayNumber":1,"action":"open"}. Actions are open, lock or close. Tournament ownership is taken from the URL and registered website assignment. The endpoint cannot configure website credentials, assign tournaments or access platform administration. Opening publishes/fixes official player prices; locking or closing prevents squad and transfer changes. Existing repository/database rules still prevent reopening played, expired or finalized matchdays and require valid deadlines and markets. The response includes success, tournamentId, matchdayNumber and status.

This API requires the Core schema upgrade, a correctly classified deployment environment, and the website's registered credentials/trust/tournament ownership. It does not create those settings or enable production access automatically.
