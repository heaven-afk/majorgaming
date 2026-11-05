import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";

/** No env access here: config is passed by the server-only identity module. */
export function createFantasySigner({ issuer, privateKeyPem }) {
  if (!issuer || !privateKeyPem) throw new Error("Fantasy signing is not configured.");
  const url = new URL(issuer);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Fantasy issuer must be a public HTTPS URL.");
  }
  let privateKey;
  try {
    privateKey = createPrivateKey(privateKeyPem.replaceAll("\\n", "\n"));
  } catch {
    throw new Error("Fantasy signing private key is invalid.");
  }
  if (privateKey.asymmetricKeyType !== "rsa" || privateKey.asymmetricKeyDetails.modulusLength < 2048) {
    throw new Error("Fantasy signing requires an RSA key of at least 2048 bits.");
  }
  const publicKey = createPublicKey(privateKey);
  const { kty, n, e } = publicKey.export({ format: "jwk" });
  const kid = createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("base64url");
  const jwks = { keys: [{ kty, n, e, kid, alg: "RS256", use: "sig" }] };
  function signIdentity(userId, displayName, permissions) {
    if (typeof userId !== "string" || !userId.trim() || userId.length > 200 ||
        typeof displayName !== "string" || displayName !== displayName.trim() || !/^[A-Za-z0-9 _-]{3,20}$/.test(displayName)) {
      throw new Error("A verified identity and valid display name are required.");
    }
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ iss: issuer, aud: "fantasy-core", sub: userId, displayName, iat: now, exp: now + 300, ...(permissions ? { permissions } : {}) })).toString("base64url");
    const message = `${header}.${payload}`;
    return `${message}.${sign("RSA-SHA256", Buffer.from(message), privateKey).toString("base64url")}`;
  }
  return {
    jwks,
    // Accept only identity already verified against MGL's auth provider and profile.
    // Do not expose this function as a browser-accessible token issuance endpoint.
    signManager({ userId, displayName }) {
      return signIdentity(userId, displayName);
    },
    // Called only by the server-only admin controller after requireAdmin().
    signWindowAdmin({ userId }) {
      return signIdentity(userId, "MGL Admin", ["fantasy:windows:manage"]);
    },
  };
}
