import { createHmac, timingSafeEqual } from "node:crypto";

export function validResultsSignature({ secret, timestamp, nonce, tournamentId, signature, now = Date.now() }) {
  if (!secret || secret.length < 32 || !/^\d{10}$/.test(timestamp ?? "") ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(nonce ?? "") ||
      !/^[a-f0-9]{64}$/.test(signature ?? "") || Math.abs(now - Number(timestamp) * 1000) > 300_000) return false;
  const expected = createHmac("sha256", secret).update([timestamp, nonce, tournamentId].join(".")).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
