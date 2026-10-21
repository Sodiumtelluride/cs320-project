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
