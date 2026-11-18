## Supabase keys and account data

`SUPABASE_KEY` is the publishable (anon) key — public by design, and anyone can copy it out of a browser request. Since `supabase/migrations/20261113080358_lock_account_data_to_backend.sql`, `anon` has no privilege on the account tables and no execute on the account RPCs, so this key only serves the public menu data.

`SUPABASE_SECRET_KEY` (the secret / service-role key) is server-only and is required: every account login lookup, profile read, signup and profile edit goes out on it. `require_profile_owner()` accepts a profile edit only when the request carried that key, or a user token whose subject owns the profile, and it still requires `p_caller_id` — which the backend fills in from its own session. Set it from Dashboard -> Project Settings -> API Keys -> Secret key, or `supabase projects api-keys --project-ref <ref> --reveal`. Without it the backend warns at startup and `/api/users*` answers 403.
