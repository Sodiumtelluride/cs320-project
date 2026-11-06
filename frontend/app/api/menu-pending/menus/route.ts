import { findCampusLocation } from "@/lib/menus/campus-locations";
import { parseMenuQuery } from "@/lib/menus/validation";

export async function GET(request: Request) {
  let query;
  try {
    query = parseMenuQuery(new URL(request.url).searchParams);
  } catch {
    return Response.json({ error: "A location, valid date and menu section are required." }, { status: 400 });
  }
  const location = findCampusLocation(query.diningHallId);
  if (!location || !location.meals?.includes(query.meal)) {
    return Response.json({ error: "This location or menu section is not available." }, { status: 404 });
  }
  return Response.json({ ...query, stations: [], updatedAt: null }, { headers: { "Cache-Control": "no-store" } });
}
