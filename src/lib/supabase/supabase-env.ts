/**
 * Supabase env: use ANON_KEY or PUBLISHABLE_DEFAULT_KEY for compatibility.
 */
function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!key) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env"
    );
  }
  return key;
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env");
  }
  return url;
}

export { getSupabaseAnonKey };
