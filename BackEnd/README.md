# Menu refresh

Apply the `menu_snapshots` migration to the intended Supabase database before enabling live menus. Configure `SUPABASE_URL` and `SUPABASE_KEY` for a service-role client in the refresh process; keep the service key on the server. The API may use a read-only key. Existing normalized menu tables are not modified or cleaned by this migration and legacy endpoints continue to use them.

Build with `npm run build`, then run `npm run refresh:menus` for a single refresh. Run `npm run refresh:menus:watch` as **one supervised worker** for continuous refresh. The worker starts immediately and repeats every 60 minutes by default; `MENU_REFRESH_MINUTES` can set an interval of at least five minutes. It logs individual failures, continues other locations and dates, and prevents overlapping runs within the process. Monitor logs and process health. Do not run multiple workers against the same database without external leader election.

Each successful feed replaces one location/day snapshot in one upsert, including menus and food details. FoodPro's successful empty array means no menu was published for that selection; it becomes an empty snapshot. Failed or malformed responses do not overwrite the last good snapshot. Today is processed before the following 13 days, with four concurrent upstream requests. The API returns 404 when no snapshot is available, and includes the last successful update time. Old snapshots remain stored; establish an appropriate retention policy before long-term deployment.

The configured foodpro feeds cover the commons and frontend locations with known machine-readable feed IDs. Argo Tea and Terrace do not have known supported foodpro IDs in the current scraper, so they cannot be refreshed by this worker. Other image/external menu formats require separate parsers. Snapshot data is public; unknown allergen information remains unknown.

For local development without a snapshot database, `LOCAL_MENU_PREVIEW=1` enables a temporary in-memory snapshot store. It fetches real upstream data, warms today's supported locations in the background, and reuses in-flight and completed requests for 30 minutes. The data disappears when the server stops. This mode is for local preview only; it does not populate the production snapshot table.

In PowerShell, run `npm run build`, then set `$env:LOCAL_MENU_PREVIEW='1'`, `$env:SESSION_SECRET='local-development-only'`, `$env:SUPABASE_URL='https://example.invalid'`, and `$env:SUPABASE_KEY='local-preview'` before `npm start`. The placeholder Supabase settings satisfy the existing authentication module but do not connect to a real database. In another terminal under `frontend`, set `$env:NEXT_PUBLIC_MENU_API_BASE_URL='/api'` before `npm run dev`. Configure the normal backend separately to test login.

## Supabase keys and account data

`SUPABASE_KEY` is the publishable (anon) key — public by design, and anyone can copy it out of a browser request. Since `supabase/migrations/20261113080358_lock_account_data_to_backend.sql`, `anon` has no privilege on the account tables and no execute on the account RPCs, so this key only serves the public menu data.

`SUPABASE_SECRET_KEY` (the secret / service-role key) is server-only and is required: every account login lookup, profile read, signup and profile edit goes out on it. `require_profile_owner()` accepts a profile edit only when the request carried that key, or a user token whose subject owns the profile, and it still requires `p_caller_id` — which the backend fills in from its own session. Set it from Dashboard -> Project Settings -> API Keys -> Secret key, or `supabase projects api-keys --project-ref <ref> --reveal`. Without it the backend warns at startup and `/api/users*` answers 403.
