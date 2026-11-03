import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createFantasySigner } from "../src/lib/fantasy/signing.mjs";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());

try {
  const path = new URL("../.env.local", import.meta.url);
  if (process.env.FANTASY_JWT_PRIVATE_KEY) {
    throw new Error("A signing key is already configured. This utility does not rotate or overwrite it.");
  }
  const issuer = process.env.FANTASY_JWT_ISSUER || process.env.NEXT_PUBLIC_SITE_URL;
  if (!issuer) throw new Error("Set FANTASY_JWT_ISSUER to the MGL deployment's HTTPS address first.");
  let contents;
  try { contents = readFileSync(path, "utf8"); }
  catch { throw new Error("Create the repository's .env.local first, preserving your existing site configuration."); }
  if (/^\s*FANTASY_JWT_PRIVATE_KEY\s*=\s*\S/m.test(contents)) {
    throw new Error("The local file already has a signing-key assignment. Review it locally before proceeding.");
  }
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
  createFantasySigner({ issuer, privateKeyPem });
  function assign(name, value) {
    const line = `${name}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    contents = pattern.test(contents) ? contents.replace(pattern, () => line) : `${contents.trimEnd()}\n${line}\n`;
  }
  assign("FANTASY_JWT_ISSUER", issuer);
  assign("FANTASY_JWT_PRIVATE_KEY", privateKeyPem);
  writeFileSync(path, contents, { mode: 0o600 });
  console.log("Signing identity saved in ignored .env.local. No private key is printed.");
  console.log("Restart the local server. Configure the same issuer/key on its matching hosted MGL environment.");
  console.log("Register the public issuer and /.well-known/jwks.json URL in Fantasy Core Website APIs.");
} catch (error) {
  console.error(`Setup stopped: ${error.message}`);
  process.exitCode = 1;
}
