import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function GET() {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('uploads')
    .select('id, filename, row_count, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 })
  }

  return NextResponse.json({ uploads: data ?? [] })
}
