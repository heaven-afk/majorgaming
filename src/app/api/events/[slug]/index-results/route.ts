import { getPublicIndexResults } from "@/lib/index-results/store";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await getPublicIndexResults(slug), { headers });
  } catch {
    return Response.json({ error: "Live results are unavailable." }, { status: 503, headers });
  }
}
