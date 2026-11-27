import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * Server-side client using service role key — bypasses RLS.
 * Use in API routes; always manually filter by user_id.
 */
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

/**
 * Browser-side client using anon key — RLS enforces data isolation.
 * Use in client components; Supabase auth session is handled via cookies.
 */
export function createBrowserClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, anonKey)
}
