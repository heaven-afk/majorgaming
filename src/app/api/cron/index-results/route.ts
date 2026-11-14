import { timingSafeEqual } from "node:crypto";
import { syncLiveIndexResults } from "@/lib/index-results/store";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || !auth) return new Response(null, { status: 401 });
  const expected = Buffer.from("Bearer " + secret);
  const actual = Buffer.from(auth);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return new Response(null, { status: 401 });
  try {
    const result = await syncLiveIndexResults();
    return Response.json(result, { status: result.failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Results sync is unavailable." }, { status: 503 });
  }
}
