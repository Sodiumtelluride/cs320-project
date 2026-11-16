"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchLocations, type Coordinates, type MapLocation } from "@/lib/map/locations";
import { PREVIEW_LOCATIONS } from "@/lib/map/preview-locations";
import { menuHref } from "@/lib/menus/links";
import { LeafletMapView } from "./leaflet-map";

export function CampusMap({ preview = false }: { preview?: boolean }) {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  const locationRequest = useRef(0);
  useEffect(() => { mounted.current = true; locationRequest.current++; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const next = preview ? PREVIEW_LOCATIONS : await fetchLocations(userLocation, controller.signal);
        if (!controller.signal.aborted) { setLocations(next); setSelectedId(null); }
      } catch {
        if (!controller.signal.aborted) { setLocations([]); setError("Dining locations could not be loaded. Please try again."); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [userLocation, attempt, preview]);

  function locate() {
    if (!navigator.geolocation) { setNotice("Location is unavailable in this browser. You can still explore the campus map."); return; }
    const request = ++locationRequest.current;
    setLocating(true); setNotice("");
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current || request !== locationRequest.current) return;
      setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocating(false);
    }, failure => {
      if (!mounted.current || request !== locationRequest.current) return;
      setUserLocation(undefined); setLocating(false);
      setNotice(failure.code === 1 ? "Location access was declined. You can still explore the campus map." : "We couldn’t find your location. You can still explore the campus map.");
    }, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
  }

  const canSort = Boolean(userLocation) && !preview && locations.some(l => l.distance !== undefined);
  const ordered = [...locations].sort((a, b) => canSort
    ? (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name)
    : a.name.localeCompare(b.name));

  return <div className="space-y-5">
    {preview && <p role="status" className="rounded-lg border bg-accent p-3 text-sm">Map preview: four sample dining locations. Backend data is not connected in this mode.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={locate} disabled={locating || loading}><LocateFixed aria-hidden="true" />{locating ? "Finding your location…" : "Use my location"}</Button>
      {userLocation && <Button variant="outline" onClick={() => { locationRequest.current++; setUserLocation(undefined); setLocating(false); setNotice(""); }}>Clear my location</Button>}
      <p className="text-sm text-muted-foreground">Your location is optional. No account needed.</p>
    </div>
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border p-4"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(a => a + 1)}><RefreshCw aria-hidden="true" />Retry locations</Button></div>}
    <LeafletMapView locations={locations} userLocation={userLocation} selectedId={selectedId} onSelect={setSelectedId} />
    <section aria-labelledby="map-locations-title" aria-busy={loading} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="map-locations-title" className="text-xl font-semibold">Dining locations</h2><p className="text-sm text-muted-foreground">{canSort ? "Closest first · straight-line distance" : "A–Z"}</p></div>
      {loading ? <p role="status">Loading dining locations…</p> : !error && !locations.length ? <p>No dining locations are available right now.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {ordered.map(location => <li key={location.id} className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border p-4 ${selectedId === location.id ? "border-primary bg-accent" : ""}`}>
          <button onClick={() => setSelectedId(location.id)} aria-pressed={selectedId === location.id} className="flex min-w-0 items-center gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-ring"><MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="break-words font-medium">{location.name}{userLocation && !preview && location.distance !== undefined && <span className="block text-sm font-normal text-muted-foreground">{location.distance < 1000 ? `${Math.round(location.distance)} m` : `${(location.distance / 1000).toFixed(1)} km`} away</span>}</span></button>
          {location.menuId && <Link href={menuHref(location.menuId)} aria-label={`View ${location.name} menu`} className="shrink-0 rounded text-sm text-primary underline focus-visible:outline-2 focus-visible:outline-ring">View menu</Link>}
        </li>)}
      </ul>
    </section>
  </div>;
}
