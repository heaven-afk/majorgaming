import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { createFantasySigner } from "../src/lib/fantasy/signing.mjs";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config = { issuer: "https://mgl.example.test", privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) };

test("publishes only RSA public fields and signs the claims required by Core", () => {
  const identity = createFantasySigner(config);
  const token = identity.signManager({ userId: "manager-one", displayName: "Manager One" });
  const [header, body, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(body, "base64url"));
  assert.equal(claims.iss, config.issuer);
  assert.equal(claims.aud, "fantasy-core");
  assert.equal(claims.sub, "manager-one");
  assert.equal(claims.displayName, "Manager One");
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(claims.permissions, undefined);
  const jwk = identity.jwks.keys[0];
  assert.deepEqual(Object.keys(jwk).sort(), ["alg", "e", "kid", "kty", "n", "use"]);
  assert.equal(JSON.parse(Buffer.from(header, "base64url")).kid, jwk.kid);
  assert.ok(verify("RSA-SHA256", Buffer.from(`${header}.${body}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(signature, "base64url")));
  assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.tampered`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(signature, "base64url")), false);
});

test("rejects missing config, insecure issuers, unsupported keys and invalid identities", () => {
  assert.throws(() => createFantasySigner({}));
  assert.throws(() => createFantasySigner({ ...config, issuer: "http://mgl.example.test" }));
  const ed = generateKeyPairSync("ed25519");
  assert.throws(() => createFantasySigner({ ...config, privateKeyPem: ed.privateKey.export({ type: "pkcs8", format: "pem" }) }), /RSA/);
  const identity = createFantasySigner(config);
  for (const manager of [{ userId: "", displayName: "Manager One" }, { userId: "one", displayName: " x " }, { userId: "one", displayName: "<script>" }]) {
    assert.throws(() => identity.signManager(manager));
  }
});
