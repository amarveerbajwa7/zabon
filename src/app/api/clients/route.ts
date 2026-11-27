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

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = jwtDecode<{ sub?: string }>(authHeader.slice(7))
      return decoded.sub ?? null
    }
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      [...request.cookies.getAll()].find(c => c.name.includes('-auth-token'))?.value
    if (cookieToken) {
      const decoded = jwtDecode<{ sub?: string }>(cookieToken)
      return decoded.sub ?? null
    }
  } catch {
    // invalid token
  }
  return null
}

// GET /api/clients — list all clients for the authenticated user
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, qbo_realm_id, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data })
}

// POST /api/clients — create a new client
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; qbo_realm_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, qbo_realm_id } = body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .insert({ user_id: userId, name: name.trim(), qbo_realm_id: qbo_realm_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data }, { status: 201 })
}
