import "server-only";
import { createFantasySigner } from "./signing.mjs";

export function fantasyIdentity() {
  return createFantasySigner({
    issuer: process.env.FANTASY_JWT_ISSUER,
    privateKeyPem: process.env.FANTASY_JWT_PRIVATE_KEY,
  });
}
