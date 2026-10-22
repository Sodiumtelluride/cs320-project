import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";
import { parseMenuQuery } from "@/lib/menus/validation";

const source = createMockMenuDataSource({ latencyMs: 0 });

export async function GET(request: Request, { params }: { params: Promise<{ foodId: string }> }) {
  let query;
  try {
    query = parseMenuQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ error: "A dining hall, ISO date, and valid meal are required." }, { status: 400 });
  }
  try {
    const { foodId } = await params;
    return Response.json(await source.getFoodDetails({ ...query, foodId }, request.signal), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "This food is not on the selected sample menu." }, { status: 404 });
  }
}
