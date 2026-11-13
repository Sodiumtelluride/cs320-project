import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

/** An unset var and an empty one are the same thing to us (dotenv leaves `KEY=` as ""). */
function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

const supabaseUrl = env("SUPABASE_URL");
const supabaseKey = env("SUPABASE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in environment");
}

/**
 * The publishable (anon) key client: the public menu data only.
 *
 * This key is public on purpose — anyone can copy it out of a browser request — so
 * it is used for nothing that has to stay private. anon still has SELECT on the menu,
 * location and meal tables, and since
 * supabase/migrations/20261113080358_lock_account_data_to_backend.sql it has no
 * privilege at all on the account tables and no execute on the account RPCs. A
 * stranger holding this key can read menus and sign up through our API, and can do
 * nothing else to our data.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * The server-only (service-role) key client: all account access — login lookups,
 * profile reads, signup and the two profile-write RPCs.
 *
 * Two reasons the account data goes out on this key. First, require_profile_owner()
 * in supabase/migrations/20261113073554_verify_caller_identity.sql decides whether a
 * profile edit is allowed by looking at the key the request carried, because that is
 * the part of a REST call the caller cannot forge: only a request carrying the secret
 * key counts as "our backend", and a publishable-key request is refused even when
 * p_caller_id matches p_user_id, since anybody can write the victim's id into both
 * arguments. Second, the reads are private too (usernames, allergies, favorite foods
 * and password hashes), so anon is not allowed to run them at all.
 *
 * Set SUPABASE_SECRET_KEY (SUPABASE_SERVICE_ROLE_KEY is accepted too) in .env. The
 * value comes from Dashboard -> Project Settings -> API Keys -> Secret key, or
 * `supabase projects api-keys --project-ref <ref> --reveal`. Without it the backend
 * falls back to the publishable key and the database refuses everything account
 * related, so say so at startup rather than let it look like a broken login.
 */
const secretKey = env("SUPABASE_SECRET_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY");

if (!secretKey) {
  console.warn(
    "SUPABASE_SECRET_KEY is not set: the database will refuse every account query " +
      "(login, signup, GET/PUT/DELETE /api/users*), because anon no longer has any " +
      "privilege on the account tables. Set it to the project's secret (service-role) key."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, secretKey ?? supabaseKey);
