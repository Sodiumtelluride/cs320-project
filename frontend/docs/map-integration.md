# Campus map / Victor handoff

Branch: `frontend-campus-map`, based on main `0c69b63`. Frontend-only; no backend routes or migrations added.

## Frontend

- Leaflet 1.9.4 renders the interactive map, zoom, dining markers and menu popups.
- Loads Leaflet inside a browser effect; server rendering never imports its browser runtime.
- Uses OpenStreetMap tiles with attribution. An internet connection is required for tiles.
- Requests location only after **Use my location**. Denied/unavailable location keeps the campus map and alphabetical list.
- Consented coordinates are sent to the map endpoint, not stored in browser storage. Backend distances are meters, straight-line, not walking routes.
- List and menu links remain available alongside the map. Unknown backend names get markers without invented menu links.
- With location shared, selecting a marker or list item draws one dashed straight line to that destination and fits both endpoints into view. Changing the selection replaces the line; clearing location removes it. This is a straight-line connection, not walking directions.
- The new `/api/map/:path*` rewrite uses the existing `BACKEND_URL` setting (default `http://127.0.0.1:3001`).

## Request / response contract

`POST /api/map/locations`, JSON body `{}` or:

```json
{ "userLocation": { "latitude": 42.388, "longitude": -72.526 } }
```

Expected response is an array:

```json
[
  {
    "name": "berkshire",
    "coords": { "latitude": 42.381917508362285, "longitude": -72.5299664858773 },
    "distance": 820
  }
]
```

`distance` is optional without location. A stable `id` matching menu location IDs is supported and preferred. Existing four dining hall IDs are recognized as names for compatibility with #42. Hours/openStatus are deliberately not shown because #42 supplies temporary values.

## Backend integration status (November 18)

Victor's #42 is merged in main `1651f24`, and that main commit is merged into this frontend branch. The documented POST route, clean install/startup, opening-hour boundary and reviewed input cases were fixed before the merge.

- Local frontend-to-backend requests now return eight locations, with distances when coordinates are supplied. Preview mode is disabled for the connected launch.
- No location is requested on page load. Missing location (`{}` or `userLocation: null`) returns locations without distances; invalid coordinate types/ranges return 400.
- The backend still uses hardcoded coordinates and placeholder hours. Hours/open status stay hidden in this frontend. Stable IDs, verified coordinates (including Morrill), real hours and broader backend route tests remain follow-up work.

The frontend uses POST directly; no GET fallback or additional API route is introduced.

## Run locally

Normal backend connection: `npm run dev -- --port 3142`, then visit `/map`. Configure/start the backend separately. API errors stay visible; fixture data never silently replaces backend responses.

Optional sample-data UI preview:

```sh
NEXT_PUBLIC_MAP_PREVIEW=1 npm run dev -- --port 3142
```

Preview shows four sample dining locations and does not call the map endpoint or display distance rankings. Restart without that variable to use the backend. The preview banner is omitted from the UI at the user's request.

## Research

- [Leaflet documentation](https://leafletjs.com/reference-1.9.4.html): map layers, markers, popups and cleanup.
- [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading): browser library imports.
- Direct Leaflet keeps the dependency small; no additional React map wrapper is needed for this component.

## Checks

Run `npm run test:menus`, `npm run lint`, `npm run typecheck`, and `npm run build -- --webpack`.
The map tests cover the API contract, malformed responses, permission denial, distance ordering, clearing location, retry and explicit preview mode. Local integration uses the actual merged backend; hosted deployment and verified location/hours data are separate follow-up work.

Initial verification: 70 component/unit tests (12 new map tests), lint, TypeScript and the production Webpack build passed. Preview browser checks verified real tile loading, four markers, marker/list selection, menu links and no horizontal overflow at 320px. Earlier production-mode browser checks used controlled API responses and simulated coordinates to verify consent, denial, distance ordering, clearing location and retry.

Connected local verification (November 18): actual POST requests through the frontend proxy return all eight backend locations, and consented test coordinates return numeric distances. Browser checks verified closest-first ordering, marker popups, clearing location back to A–Z, and no horizontal overflow at 320px. No browser response mocks are used for this integration check; coordinates are simulated. All 70 frontend tests, seven backend map tests, lint, frontend TypeScript and backend build pass after the merge. The map API currently needs no database queries; placeholder Supabase settings allow local startup without accessing a hosted database. Account features and database-backed menus require separate valid configuration.

Next.js 16.4.2 emitted an existing-version security advisory during verification. No framework upgrade was included in this frontend map change.

Line-drawing verification (November 18): browser checks against the running backend confirmed no line without shared location, a visible line after selection, replacement on destination change, removal on clearing location, and no horizontal overflow at 320px. Simulated coordinates were used. Zoom animations are disabled and pending pan animations are stopped on map cleanup to avoid Leaflet callbacks running after a map is removed. Production build passes.
