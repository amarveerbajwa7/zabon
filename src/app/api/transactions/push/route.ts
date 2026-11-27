import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const QBO_BASE_URL = process.env.QBO_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

async function getValidAccessToken(supabase: ReturnType<typeof getSupabaseClient>, realmId: string): Promise<string> {
  const { data: conn, error } = await supabase
    .from('qbo_connections')
    .select('*')
    .eq('realm_id', realmId)
    .single()

  if (error || !conn) throw new Error('QBO connection not found')

  const now = new Date()
  const expiresAt = new Date(conn.expires_at)

  // Refresh if within 5 minutes of expiry
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
    const newRefreshExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString()

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

/**
 * Map our chart of accounts to QBO account names.
 * These should match the actual account names in the QBO company file.
 */
function mapCategoryToQBOAccount(category: string): string {
  const map: Record<string, string> = {
    'Revenue': 'Sales',
    'COGS': 'Cost of Goods Sold',
    'Advertising & Marketing': 'Advertising',
    'Bank Charges & Fees': 'Bank Charges',
    'Insurance': 'Insurance',
    'Meals & Entertainment': 'Meals and Entertainment',
    'Office Supplies': 'Office Supplies',
    'Payroll & Wages': 'Payroll Expenses',
    'Professional Fees': 'Professional Fees',
    'Rent & Utilities': 'Rent or Lease',
    'Software & Subscriptions': 'Software',
    'Travel': 'Travel',
    "Owner's Draw": "Owner's Draw",
    'Miscellaneous': 'Miscellaneous',
  }
  return map[category] || 'Miscellaneous'
}

async function pushPurchaseToQBO(
  accessToken: string,
  realmId: string,
  tx: {
    id: string
    date: string
    description: string
    amount: number
    final_category: string
  }
): Promise<{ success: boolean; qbo_id?: string; error?: string }> {
  const accountName = mapCategoryToQBOAccount(tx.final_category)

  // First, look up the account ref by name
  const queryUrl = `${QBO_BASE_URL}/v3/company/${realmId}/query?query=${encodeURIComponent(
    `SELECT Id, Name FROM Account WHERE Name = '${accountName}'`
  )}&minorversion=65`

  const queryRes = await fetch(queryUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!queryRes.ok) {
    return { success: false, error: `Account lookup failed: ${queryRes.status}` }
  }

  const queryData = await queryRes.json()
  const accounts = queryData.QueryResponse?.Account || []
  const account = accounts[0]

  if (!account) {
    return { success: false, error: `Account not found in QBO: ${accountName}` }
  }

  const purchasePayload = {
    PaymentType: 'Cash',
    AccountRef: {
      value: account.Id,
      name: account.Name,
    },
    TxnDate: tx.date,
    PrivateNote: tx.description,
    Line: [
      {
        Amount: tx.amount,
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: account.Id,
            name: account.Name,
          },
        },
        Description: tx.description,
      },
    ],
  }

  const pushUrl = `${QBO_BASE_URL}/v3/company/${realmId}/purchase?minorversion=65`
  const pushRes = await fetch(pushUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(purchasePayload),
  })

  if (!pushRes.ok) {
    const errText = await pushRes.text()
    return { success: false, error: `QBO push failed: ${errText}` }
  }

  const pushData = await pushRes.json()
  return {
    success: true,
    qbo_id: pushData.Purchase?.Id,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transaction_ids, realm_id } = body as {
      transaction_ids: string[]
      realm_id: string
    }

    if (!transaction_ids?.length) {
      return NextResponse.json({ error: 'No transaction IDs provided' }, { status: 400 })
    }

    if (!realm_id) {
      return NextResponse.json({ error: 'realm_id is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    const accessToken = await getValidAccessToken(supabase, realm_id)

    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, date, description, amount, type, final_category, suggested_category, status')
      .in('id', transaction_ids)
      .eq('status', 'approved')

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    if (!transactions?.length) {
      return NextResponse.json({ error: 'No approved transactions found' }, { status: 404 })
    }

    const results: Array<{
      id: string
      success: boolean
      qbo_id?: string
      error?: string
    }> = []

    for (const tx of transactions) {
      const category = tx.final_category || tx.suggested_category || 'Miscellaneous'

      // Skip credits (revenue) unless specifically handled
      if (tx.type === 'credit') {
        await supabase
          .from('transactions')
          .update({ status: 'pushed', qbo_id: null, push_error: 'Skipped: credit transaction' })
          .eq('id', tx.id)
        results.push({ id: tx.id, success: true, qbo_id: 'skipped_credit' })
        continue
      }

      const result = await pushPurchaseToQBO(accessToken, realm_id, {
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        final_category: category,
      })

      if (result.success) {
        await supabase
          .from('transactions')
          .update({ status: 'pushed', qbo_id: result.qbo_id, push_error: null })
          .eq('id', tx.id)
      } else {
        await supabase
          .from('transactions')
          .update({ status: 'push_failed', push_error: result.error })
          .eq('id', tx.id)
      }

      results.push({ id: tx.id, ...result })
    }

    const pushed = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      pushed,
      failed,
      results,
    })
  } catch (err) {
    console.error('Push error:', err)
    return NextResponse.json({ error: 'Push to QuickBooks failed' }, { status: 500 })
  }
}
