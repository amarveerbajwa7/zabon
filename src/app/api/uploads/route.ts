export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase config')
  return createClient(url, key)
}

function getUserId(request: NextRequest): string | null {
  try {
    const auth = request.headers.get('authorization')
    const token = auth?.replace('Bearer ', '') ||
      [...request.cookies.getAll()].find(c => c.name.includes('-auth-token'))?.value
    if (!token) return null
    const decoded = jwtDecode<{ sub?: string }>(token)
    return decoded.sub ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const supabase = getSupabaseClient()

  let query = supabase
    .from('uploads')
    .select('id, filename, row_count, status, created_at')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 })
  }

  return NextResponse.json({ uploads: data ?? [] })
}
