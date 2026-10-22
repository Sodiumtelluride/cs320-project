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

The default data source uses the included sample API. No external backend or environment file is needed for local verification. Sample menus and food details are labeled in the interface. Shared authentication, Map, and Profile interfaces are preserved. Database and authentication service integration remain pending.

Set `NEXT_PUBLIC_MENU_API_BASE_URL` to connect a compatible backend. See `docs/menu-api.md` for the proposed response contract and identifier mapping requirements.

## Browser tests (Playwright)

Run from `frontend/` using Node.js 24:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The runner builds and starts its own production server at `127.0.0.1:3171`, with a separate `.next-playwright` directory. Leave that port free. It stops the server when finished; no manually started server or backend is needed. The test server forces the built-in sample menu API even if a live API URL is set in your environment.

The same 14 scenarios run in Chromium at desktop size and a 320px mobile viewport:

- Guest navigation, dining hall/meal/date selection, and URL persistence.
- Food nutrition/allergen details, missing information, keyboard dismissal, and focus restoration.
- Empty menus, unavailable dining halls, and retrying failed menu/detail requests.
- Login/signup validation, the current unconnected-auth message, and guest mode.
- Menu-page overflow and food-dialog viewport fit.

Tests pin menu dates and use local sample data. The two failure/retry scenarios intercept one API request with a 503, then allow the retry to reach the actual sample endpoint. Authentication assertions reflect the existing placeholder adapter; they do not prove a real login or database connection. A mobile viewport is not a physical-device or Safari test.

```sh
npm run test:e2e:headed  # Watch the browser clicks
npm run test:e2e:ui      # Interactive runner
npx playwright show-report
```

Failures retain a screenshot and trace in `test-results/`. Browser output, build output, and the HTML report are ignored by Git. Existing component tests remain available through `npm run test:menus`.
