export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, getValidAccessToken, fetchQBOAccounts } from '@/lib/qbo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const realmId = searchParams.get('realm_id')

    if (!realmId) {
      return NextResponse.json({ error: 'realm_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const accessToken = await getValidAccessToken(supabase, realmId)
    const accounts = await fetchQBOAccounts(accessToken, realmId)

    return NextResponse.json({ accounts })
  } catch (err) {
    console.error('QBO accounts error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
