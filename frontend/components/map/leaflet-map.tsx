"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates, MapLocation } from "@/lib/map/locations";
import { menuHref } from "@/lib/menus/links";

interface Props { locations: MapLocation[]; userLocation?: Coordinates; selectedId: string | null; onSelect: (id: string) => void }

export function LeafletMapView({ locations, userLocation, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [error, setError] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    let instance: LeafletMap | null = null;
    const currentMarkers = markers.current;
    void import("leaflet").then(L => {
      if (disposed || !container.current) return;
      instance = L.map(container.current, { scrollWheelZoom: false, zoomAnimation: false }).setView([42.388, -72.5265], 15);
      map.current = instance;
      leaflet.current = L;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).on("tileerror", () => { if (!disposed) setTilesUnavailable(true); }).addTo(instance);
      for (const location of locations) {
        const content = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = location.name;
        content.append(title);
        if (location.menuId) {
          const link = document.createElement("a");
          link.href = menuHref(location.menuId);
          link.textContent = "View menu →";
          link.className = "block mt-2 underline";
          content.append(link);
        }
        const marker = L.marker([location.coords.latitude, location.coords.longitude], {
          title: location.name, alt: location.name,
          icon: L.divIcon({ className: "", html: '<span style="display:block;width:24px;height:24px;background:#881c1b;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #555"></span>', iconSize: [24, 24], iconAnchor: [12, 12] }),
        }).bindPopup(content).addTo(instance);
        marker.on("click", () => select.current(location.id));
        currentMarkers.set(location.id, marker);
      }
      if (userLocation) L.circleMarker([userLocation.latitude, userLocation.longitude], {
        radius: 8, color: "white", weight: 3, fillColor: "#2563eb", fillOpacity: 1,
      }).bindPopup("Your location").addTo(instance);
      const points: [number, number][] = locations.map(l => [l.coords.latitude, l.coords.longitude]);
      if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);
      if (points.length) instance.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 16 });
      const observer = new ResizeObserver(() => instance?.invalidateSize());
      observer.observe(container.current);
      instance.on("unload", () => observer.disconnect());
      setMapInstance(instance);
    }).catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true;
      instance?.stop();
      instance?.remove();
      if (map.current === instance) map.current = null;
      currentMarkers.clear();
    };
  }, [locations, userLocation]);

  useEffect(() => {
    if (!selectedId || !mapInstance || mapInstance !== map.current) return;
    const marker = markers.current.get(selectedId);
    const L = leaflet.current;
    if (!marker || !L) return;
    const destination = marker.getLatLng();
    if (!userLocation) {
      mapInstance.panTo(destination, { animate: false });
      marker.openPopup();
      return;
    }
    const origin = L.latLng(userLocation.latitude, userLocation.longitude);
    const line = L.polyline([origin, destination], {
      color: "#881c1b", weight: 3, opacity: 0.85, dashArray: "7 7",
      interactive: false, className: "dining-connection-line",
    }).addTo(mapInstance);
    mapInstance.fitBounds(L.latLngBounds([origin, destination]), { padding: [70, 70], maxZoom: 17, animate: false });
    marker.openPopup();
    return () => { line.remove(); };
  }, [selectedId, userLocation, mapInstance]);

  const selectedLocation = locations.find(location => location.id === selectedId);

  return <div className="relative isolate overflow-hidden rounded-xl border bg-muted">
    <div ref={container} role="region" aria-label="Interactive campus dining map" className="h-[360px] w-full sm:h-[480px]" />
    {error && <p role="alert" className="absolute inset-x-4 top-4 z-[1000] rounded bg-background p-3">The interactive map could not load. Use the location list below.</p>}
    {!error && tilesUnavailable && <p role="status" className="absolute inset-x-12 bottom-7 z-[1000] rounded bg-background p-2 text-sm">Some map tiles could not load. You can still use the location list.</p>}
    {userLocation && selectedLocation && <p role="status" className="border-t bg-background px-3 py-2 text-sm text-muted-foreground">Straight-line connection to {selectedLocation.name}.</p>}
  </div>;
}
