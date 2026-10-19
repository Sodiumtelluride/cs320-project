import { createMockMenuDataSource } from "@/lib/menus/mock-menu-data-source";
import { parseMenuQuery } from "@/lib/menus/validation";

const source = createMockMenuDataSource({ latencyMs: 0 });

export async function GET(request: Request) {
  let query;
  try {
    query = parseMenuQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ error: "A dining hall, ISO date, and valid meal are required." }, { status: 400 });
  }
  try {
    return Response.json(await source.getMenu(query, request.signal), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No sample menu exists for this selection." }, { status: 404 });
  }
}
