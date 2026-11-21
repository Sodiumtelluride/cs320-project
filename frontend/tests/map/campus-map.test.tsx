import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CampusMap } from "@/components/map/campus-map";

vi.mock("@/components/map/leaflet-map", () => ({ LeafletMapView: () => <div>Interactive map</div> }));
const coords = { latitude: 42.38, longitude: -72.53 };
const rows = [{ name: "berkshire", coords, distance: 600 }, { name: "worcester", coords, distance: 100 }];
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function api() {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
it("starts alphabetically without requesting geolocation or showing distances", async () => {
  api(); const getCurrentPosition = vi.fn();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  render(<CampusMap />);
  await screen.findByRole("button", { name: "Berkshire" });
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect(screen.queryByText(/away/)).toBeNull();
  expect(screen.getAllByRole("button", { name: /Berkshire|Worcester/ })[0].textContent).toBe("Berkshire");
  expect(screen.getByRole("link", { name: "View Berkshire menu" }).getAttribute("href")).toBe("/menus?hall=berkshire");
});
it("handles permission denial while leaving locations available", async () => {
  api();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_ok: unknown, fail: (error: { code: number }) => void) => fail({ code: 1 }) } });
  render(<CampusMap />);
  await screen.findByRole("button", { name: "Berkshire" });
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(screen.getByText(/Location access was declined/)).toBeTruthy();
  expect(screen.queryByText(/Closest first/)).toBeNull();
});
it("refreshes with consented coordinates, sorts by distance, and clears the location", async () => {
  const fetch = api();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (ok: (position: { coords: typeof coords }) => void) => ok({ coords }) } });
  render(<CampusMap />);
  await screen.findByRole("button", { name: "Berkshire" });
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  await screen.findByText(/Closest first/);
  expect(fetch).toHaveBeenLastCalledWith("/api/map/locations", expect.objectContaining({ body: JSON.stringify({ userLocation: coords }) }));
  expect(screen.getAllByRole("button", { name: /Berkshire|Worcester/ })[0].textContent).toContain("Worcester");
  fireEvent.click(screen.getByRole("button", { name: "Clear my location" }));
  await waitFor(() => expect(fetch).toHaveBeenLastCalledWith("/api/map/locations", expect.objectContaining({ body: "{}" })));
  expect(screen.queryByText(/away/)).toBeNull();
});
it("supports retry after a backend failure", async () => {
  const fetch = api(); fetch.mockResolvedValueOnce({ ok: false });
  render(<CampusMap />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry locations" }));
  await screen.findByRole("button", { name: "Berkshire" });
});
it("uses the four preview fixtures without calling the map backend", async () => {
  const fetch = api();
  await act(async () => { render(<CampusMap preview />); });
  expect(screen.getAllByRole("link", { name: /View .* menu/ })).toHaveLength(4);
  expect(fetch).not.toHaveBeenCalled();
});
