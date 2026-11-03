import { connection } from "next/server";
import { fantasyIdentity } from "@/lib/fantasy/identity";

export async function GET() {
  await connection();
  try {
    return Response.json(fantasyIdentity().jwks, {
      headers: { "Cache-Control": "public, max-age=300, must-revalidate" },
    });
  } catch {
    return Response.json({ error: "Fantasy public keys are not configured." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
