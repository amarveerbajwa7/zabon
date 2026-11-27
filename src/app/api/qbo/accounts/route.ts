import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const QBO_BASE_URL =
  process.env.QBO_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

const EXPENSE_ACCOUNT_TYPES = new Set([
  'Expense',
  'Cost of Goods Sold',
  'Other Expense',
  'Income',
])

export interface QBOAccount {
  id: string
  name: string
  accountType: string
  accountSubType: string
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function getValidAccessToken(
  supabase: ReturnType<typeof getSupabaseClient>,
  realmId: string
): Promise<string> {
  const { data: conn, error } = await supabase
    .from('qbo_connections')
    .select('*')
    .eq('realm_id', realmId)
    .single()

  if (error || !conn) throw new Error('QBO connection not found')

  const now = new Date()
  const expiresAt = new Date(conn.expires_at)

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const clientId = process.env.QBO_CLIENT_ID!
    const clientSecret = process.env.QBO_CLIENT_SECRET!
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refresh_token,
      }).toString(),
    })

    if (!res.ok) throw new Error('Token refresh failed')

    const tokens = await res.json()
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const newRefreshExpiresAt = new Date(
      Date.now() + tokens.x_refresh_token_expires_in * 1000
    ).toISOString()

    await supabase
      .from('qbo_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: newExpiresAt,
        refresh_expires_at: newRefreshExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('realm_id', realmId)

    return tokens.access_token
  }

  return conn.access_token
}

export async function fetchQBOAccounts(
  accessToken: string,
  realmId: string
): Promise<QBOAccount[]> {
  const query = encodeURIComponent(
    'SELECT * FROM Account WHERE Active = true MAXRESULTS 200'
  )
  const url = `${QBO_BASE_URL}/v3/company/${realmId}/query?query=${query}&minorversion=65`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QBO accounts fetch failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const accounts: QBOAccount[] = (data.QueryResponse?.Account || [])
    .filter((a: { Classification?: string; AccountType?: string }) =>
      EXPENSE_ACCOUNT_TYPES.has(a.AccountType ?? '')
    )
    .map((a: { Id: string; Name: string; AccountType: string; AccountSubType: string }) => ({
      id: a.Id,
      name: a.Name,
      accountType: a.AccountType,
      accountSubType: a.AccountSubType,
    }))

  return accounts
}

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
