import { afterEach, expect, it, vi } from "vitest";
import { fetchLocations, isCoordinates, parseLocations } from "@/lib/map/locations";

const row = { name: "berkshire", coords: { latitude: 42.38, longitude: -72.53 }, distance: 200, hours: [7, 20], openStatus: true };
afterEach(() => vi.unstubAllGlobals());

it("maps backend hall names to the existing menu IDs without exposing placeholder hours", () => {
  expect(parseLocations([row])).toEqual([{ id: "berkshire", name: "Berkshire", coords: row.coords, menuId: "berkshire", distance: 200 }]);
});
it("keeps unknown markers without inventing a menu URL", () => {
  expect(parseLocations([{ ...row, name: "New cafe" }])[0].menuId).toBeUndefined();
});
it("rejects invalid coordinates, duplicate locations and malformed responses", () => {
  expect(isCoordinates({ latitude: NaN, longitude: 0 })).toBe(false);
  expect(isCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
  expect(() => parseLocations([{ ...row, coords: { latitude: 0, longitude: 181 } }])).toThrow();
  expect(() => parseLocations([row, row])).toThrow();
  expect(() => parseLocations({})).toThrow();
});
it("does not display invalid distances as valid location data", () => {
  expect(parseLocations([{ ...row, distance: -10 }])[0].distance).toBeUndefined();
});
it("posts an empty JSON body when location is not shared", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [row] });
  vi.stubGlobal("fetch", fetch);
  await fetchLocations();
  expect(fetch).toHaveBeenCalledWith("/api/map/locations", expect.objectContaining({ method: "POST", body: "{}" }));
});
it("only sends coordinates after the caller provides them", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [row] });
  vi.stubGlobal("fetch", fetch);
  await fetchLocations(row.coords);
  expect(fetch).toHaveBeenCalledWith("/api/map/locations", expect.objectContaining({ body: JSON.stringify({ userLocation: row.coords }) }));
});
it("reports API failures rather than silently returning fixture data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchLocations()).rejects.toThrow("Dining locations could not be loaded");
});
