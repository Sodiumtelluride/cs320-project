import { CAMPUS_LOCATIONS } from "@/lib/menus/campus-locations";
import { DEMO_DINING_HALLS } from "@/lib/menus/dining-halls";

export interface Coordinates { latitude: number; longitude: number }
export interface MapLocation {
  id: string;
  name: string;
  coords: Coordinates;
  menuId?: string;
  distance?: number;
}

const knownLocations = [...DEMO_DINING_HALLS, ...CAMPUS_LOCATIONS];
const aliases: Record<string, string> = {
  "MORRILL LIFE AND EARTH CAFÉ": "morrill-cafe",
};

export function isCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const { latitude, longitude } = value as Coordinates;
  return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

// Adapt Victor's {name, coords, distance, hours, openStatus} response. We deliberately
// omit hours/openStatus: #42 currently supplies placeholder hours, not verified data.
export function parseLocations(value: unknown): MapLocation[] {
  if (!Array.isArray(value)) throw new Error("Invalid map response");
  const seen = new Set<string>();
  return value.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("Invalid map location");
    const item = row as Record<string, unknown>;
    if (typeof item.name !== "string" || !item.name.trim() || !isCoordinates(item.coords)) {
      throw new Error("Invalid map location");
    }
    const id = typeof item.id === "string" && item.id ? item.id : item.name;
    if (seen.has(id)) throw new Error("Duplicate map location");
    seen.add(id);
    const known = knownLocations.find(location => location.id === id || location.name === item.name
      || location.id === aliases[item.name as string]);
    return {
      id, name: known?.name ?? item.name, coords: item.coords,
      ...(known ? { menuId: known.id } : {}),
      ...(typeof item.distance === "number" && Number.isFinite(item.distance) && item.distance >= 0
        ? { distance: item.distance } : {}),
    };
  });
}

export async function fetchLocations(userLocation?: Coordinates, signal?: AbortSignal): Promise<MapLocation[]> {
  const response = await fetch("/api/map/locations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userLocation ? { userLocation } : {}), signal,
  });
  if (!response.ok) throw new Error("Dining locations could not be loaded. Please try again.");
  return parseLocations(await response.json());
}
