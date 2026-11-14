import { indexId } from "@/lib/index-results/contract";
import { acceptIndexNotification, releaseIndexNotification, syncIndexTournament } from "@/lib/index-results/store";
import { validResultsSignature } from "@/lib/index-results/webhook-auth.mjs";

export const maxDuration = 30;

export async function POST(request: Request) {
  const secret = process.env.MGL_RESULTS_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  const timestamp = request.headers.get("x-results-timestamp");
  const nonce = request.headers.get("x-results-nonce");
  const signature = request.headers.get("x-results-signature");
  if (!timestamp || !nonce || !signature) return new Response(null, { status: 401 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(Buffer.from(value));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const id: unknown = body?.tournamentId;
    if (typeof id !== "string" || !indexId.test(id)) return new Response(null, { status: 400 });
    if (!validResultsSignature({ secret, timestamp, nonce, tournamentId: id, signature })) return new Response(null, { status: 401 });
    try {
      if (!await acceptIndexNotification(nonce)) return new Response(null, { status: 204 });
      try {
        await syncIndexTournament(id);
      } catch (error) {
        await releaseIndexNotification(nonce).catch(() => {});
        throw error;
      }
      return new Response(null, { status: 204 });
    } catch {
      return new Response(null, { status: 503 });
    }
  } catch {
    return new Response(null, { status: 400 });
  }
}
