import type { MapLocation } from "./locations";

// Opt-in development fixtures, based on the four dining commons coordinates in #42.
// This module is never used as an automatic fallback for a failed API request.
export const PREVIEW_LOCATIONS: MapLocation[] = [
  { id: "berkshire", menuId: "berkshire", name: "Berkshire", coords: { latitude: 42.381917508362285, longitude: -72.5299664858773 } },
  { id: "worcester", menuId: "worcester", name: "Worcester", coords: { latitude: 42.39359520483907, longitude: -72.52429636540208 } },
  { id: "franklin", menuId: "franklin", name: "Franklin", coords: { latitude: 42.38946133095276, longitude: -72.52264346008035 } },
  { id: "hampshire", menuId: "hampshire", name: "Hampshire", coords: { latitude: 42.38385258250406, longitude: -72.53052322175817 } },
];
