-- ---------- Account data: backend-only reads too ----------
--
-- 20261113073554_verify_caller_identity.sql stopped a stranger from WRITING a
-- profile, but the account tables were still readable with the publishable key, and
-- signup was still callable straight through /rpc. With nothing but the public key:
--
--   GET  /rest/v1/users                                  -> every username and user_id
--   GET  /rest/v1/users?select=*,allergies(allergy_name) -> anyone's allergies and
--                                                        favorite foods, one call
--   GET  /rest/v1/allergies , /favorite_foods            -> the whole tables
--   GET  /rest/v1/passwords                              -> every bcrypt hash, for
--                                                        offline cracking
--   POST /rest/v1/rpc/create_user_with_details           -> insert accounts with any
--                                                        password_hash you like
--
-- This closes that: anon and authenticated keep no privileges on the account tables
-- and no execute on the account RPCs. Every account read and write now goes through
-- the Express API — authenticateUser() in src/db/client.ts, src/handlers/users.ts,
-- src/handlers/auth.ts — which signs with the secret (service-role) key, and whose
-- middleware scopes each query to the caller before the database ever sees it. A
-- caller that skips the backend now reads nothing and writes nothing.
--
-- Menu data is unaffected: anon keeps its privileges on the menu/location/meal
-- tables, which are public, and the frontend never talks to Supabase directly.

REVOKE SELECT ON TABLE
    public.users,
    public.passwords,
    public.favorite_foods,
    public.allergies
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_user_with_details(TEXT, TEXT, TEXT[], TEXT[])
FROM PUBLIC, anon, authenticated;

-- Belt and braces: spell out what the backend's key needs, so the account data does
-- not depend on whatever default privileges this project happens to have.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.users,
    public.passwords,
    public.favorite_foods,
    public.allergies
TO service_role;
GRANT EXECUTE ON FUNCTION
    public.create_user_with_details(TEXT, TEXT, TEXT[], TEXT[]),
    public.update_user_details(UUID, UUID, TEXT[], TEXT[]),
    public.delete_user_details(UUID, UUID, TEXT, TEXT)
TO service_role;

NOTIFY pgrst, 'reload schema';
