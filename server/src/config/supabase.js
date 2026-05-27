import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.warn("Supabase credentials are missing. Add them to server/.env for live database and OTP calls.");
}

export const supabaseAuth = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null;

export const supabaseAdmin =
  supabaseUrl && (serviceRoleKey || anonKey)
    ? createClient(supabaseUrl, serviceRoleKey || anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

export function requireSupabase() {
  if (!supabaseAdmin) {
    const error = new Error("Supabase is not configured");
    error.status = 503;
    throw error;
  }
  return supabaseAdmin;
}
