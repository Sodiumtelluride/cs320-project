# UMass Dining frontend

Next.js frontend with a four-location dining hall directory, menu browser, food details, and an About page. The directory is the home page. The interface uses the shared maroon theme, buttons, and dialogs.

Validated with Node.js 24.19.0.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Select a dining hall to open its menu. The About page is available at `/about`.

```sh
npm run typecheck
npm run lint
npm run test:menus
npm run build
```

After building, run `npm run start` to use the production server.

The menu browser defaults to the included sample API — no external backend or environment file is needed for local verification — and the four sample dining halls use the same snapshot preload and cache as the live data source, with other sample locations still pending. Sample menus and food details are labeled in the interface. Sign-up, login, session restoration, logout, and the Profile page's allergy and favorite-food edits do talk to the Express backend in `BackEnd/` (port 3001, forwarded by the rewrites in `next.config.ts`): see `docs/login-request.md` for the backend setup, the migrations it needs, and who is allowed to read or edit which account. The Map interface is unchanged.

Set `NEXT_PUBLIC_MENU_API_BASE_URL=/api` and `BACKEND_URL` to the Express server to enable live snapshots through the same-origin rewrite. The browser starts loading today's location snapshots after rendering, then the following 13 days, with four background requests at a time. On browsers that report data saver or a 2G connection, only today is preloaded; other dates still load on demand. A selected location/date starts immediately and shares any existing request. Results are held in memory for five minutes. The current scraper fetches today and future dates; other dates are fetched on demand if a snapshot exists. Special source menus remain unavailable. See `BackEnd/README.md` for migration and refresh setup.

## Browser tests (Playwright)

Run from `frontend/` using Node.js 24:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The runner builds and starts its own production server at `127.0.0.1:3171`, with a separate `.next-playwright` directory. Leave that port free. It stops the server when finished; no manually started server or backend is needed. The test server forces the built-in sample menu API even if a live API URL is set in your environment.

The same 15 scenarios — ten menu, five authentication — run in Chromium at desktop size and a 320px mobile viewport:

- Guest navigation, dining hall/meal/date selection, and URL persistence.
- Food nutrition/allergen details, missing information, keyboard dismissal, and focus restoration.
- Empty menus, unavailable dining halls, and retrying failed menu/detail requests.
- Login and signup validation and guest mode, plus a verified login that opens Profile, a logout that clears it, and a reload that restores the session.
- Menu-page overflow and food-dialog viewport fit.

Tests pin menu dates and use local sample data. The two failure/retry scenarios intercept one API request with a 503, then allow the retry to reach the actual sample endpoint. Authentication scenarios stub the account endpoints (`/api/authenticate`, `/api/auth/me`, `/api/auth/logout`, and `POST /api/users` with a 409 taken email), so they check how the interface reacts to each response and do not prove a live login; `BackEnd/src/tests/users.integration.test.ts` covers the live-database side. A mobile viewport is not a physical-device or Safari test.

```sh
npm run test:e2e:headed  # Watch the browser clicks
npm run test:e2e:ui      # Interactive runner
npx playwright show-report
```

Failures retain a screenshot and trace in `test-results/`. Browser output, build output, and the HTML report are ignored by Git. Existing component tests remain available through `npm run test:menus`.
