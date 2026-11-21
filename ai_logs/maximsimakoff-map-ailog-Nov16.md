Task Title: Build a Frontend Campus Dining Map
Contributor: Maxim Simakoff
Branch: frontend-campus-map

## Main takeaways

How to build a reliable frontend map and how to request locations from chrome browser users and how to display it on the map.


## Implementation record

- Created a frontend branch from main 0c69b63 and researched Leaflet and browser-only library loading in Next.js.
- Added an interactive campus map with dining markers, popups, menu links, and a selectable location list.
- Added optional browser geolocation, a user-position marker, location clearing, permission-denial handling, and distance sorting when backend distances are available.
- Added the frontend adapter and proxy for Victor's documented POST /api/map/locations endpoint. No backend routes, database migrations, or authentication changes were made.
- Added an opt-in local preview with four sample locations. Backend errors do not silently fall back to sample data. Live integration is still pending fixes to Victor's PR #42.
- Added 12 map tests. All 70 component/unit tests, lint, and TypeScript passed, including after the requested text removals. The production build passed before those two text removals.
- Browser checks covered real tile loading, markers, menu links, mobile layout, and API/location flows with controlled responses and simulated coordinates. They do not verify the user's physical location or a live connection to Victor's backend.
- Added the API contract and handoff documentation. Removed the preview banner and introductory subtitle as requested.
- The existing Next.js version emitted a security advisory; no framework upgrade was included. Nothing has been pushed and no PR has been opened.

## Resource Usage

Tool and Model(s) Used: OpenAI Codex desktop app; recorded model(s): gpt-6.1-sol. Tools included Git, npm, TypeScript, ESLint, Vitest, Playwright CLI, web research, and local file/app tools.

Recorded token-counter difference for the requested conversation segment:
- Input tokens: 9,080,516
- Cached input tokens (included above): 8,864,256
- Output tokens: 22,342
- Total tokens: 9,102,858

Dollar Equivalent / Allocation Used: Unavailable.

## Chat Log

User:

OK&#x20;

This is my goal for this week


Leaflet/Map research, What I need to pass to Victor? Implement the map and connect to his backend. Map should be working.

Assistant:

I’ll start a frontend map branch from the latest `main`, check Victor’s current API, and build the Leaflet map around that contract. I’ll keep backend changes out of your branch and identify anything Victor still needs to fix for the connection to work.

Assistant:

Victor’s PR is still unchanged and unmerged. I’m adding the map, markers, menu links, and location controls on your branch, with a connection to his documented POST endpoint. I’ll also add an explicit preview mode so you can test the frontend while his route is being fixed; it won’t silently substitute mock data for a failed backend request.

Assistant:

The map and API client are in place. Location sharing is optional, menu links use the existing routes, and distance sorting only appears when location data is available. I also wrote a handoff for Victor covering the request format and remaining route/data issues. Next I’m checking the map in the browser and testing permission denial, retries, and distance sorting.

Assistant:

The browser checks passed: Leaflet tiles and markers render, menu links work, and the 320px layout has no horizontal overflow. Tests also passed for consent, denial, distance sorting, and retries using simulated API responses. Live integration is still blocked by #42’s route mismatch. Next.js also reported an advisory for the project’s existing version; I haven’t changed framework versions in this map branch.

Assistant:

Built on **`frontend-campus-map`** from current `main`.

[Open the local map](http://127.0.0.1:3142/map)

- Leaflet map, markers, popups, and menu links.
- Optional location sharing and backend distance sorting.
- **70 tests**, lint, TypeScript, and production build pass.
- [Victor handoff and API contract](/Users/maximsimakoff/Documents/Codex/2026-10-01/website-version-of-the-umass-dining/frontend-campus-map/frontend/docs/map-integration.md).

**Live connection is still pending Victor’s #42 fixes.** The running preview explicitly uses four sample locations.

Saved locally as `31d90f5`. Nothing pushed; no PR opened. The existing Next.js security advisory remains.