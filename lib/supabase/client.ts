import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"

// Universal Supabase client that works in both server and client.
// We use custom auth (cookies set by /api/auth/login) rather than Supabase Auth,
// so RLS is disabled and we can safely reuse the same anon-key client everywhere.
let cached: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (cached) return cached
  cached = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    },
  )
  return cached
}
