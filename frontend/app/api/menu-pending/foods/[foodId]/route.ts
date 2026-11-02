import { parseMenuQuery } from "@/lib/menus/validation";

export async function GET(request: Request) {
  try {
    parseMenuQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ error: "A location, valid date and menu section are required." }, { status: 400 });
  }
  return Response.json({ error: "Food details are not available." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
