import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// The local preview stores snapshots in memory and never connects to Supabase.
const supabaseUrl = process.env.SUPABASE_URL || (process.env.LOCAL_MENU_PREVIEW === "1" ? "https://example.invalid" : "");
const supabaseKey = process.env.SUPABASE_KEY || (process.env.LOCAL_MENU_PREVIEW === "1" ? "local-preview" : "");

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
