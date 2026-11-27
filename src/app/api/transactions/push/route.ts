import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getValidAccessToken,
  fetchQBOAccounts,
  QBOAccount,
} from '@/lib/qbo'

const QBO_BASE_URL =
  process.env.QBO_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

/**
 * Fuzzy match a category name against QBO accounts.
 * Strategy:
 *   1. Exact match (case-insensitive)
 *   2. Category is a substring of QBO name (or vice versa)
 *   3. Any word in the category matches any word in QBO name
 *   4. Fall back to "Uncategorized Expense" or "Ask My Accountant"
 */
function resolveAccount(category: string, accounts: QBOAccount[]): QBOAccount | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const cat = normalize(category)

  // 1. Exact match
  let match = accounts.find(a => normalize(a.name) === cat)
  if (match) return match

  // 2. Substring match
  match = accounts.find(
    a => normalize(a.name).includes(cat) || cat.includes(normalize(a.name))
  )
  if (match) return match

  // 3. Word-level match — any word in category appears in account name
  const catWords = cat.split(' ').filter(w => w.length > 2)
  if (catWords.length > 0) {
    match = accounts.find(a => {
      const aName = normalize(a.name)
      return catWords.some(w => aName.includes(w))
    })
    if (match) return match
  }

  // 4. Fallback accounts
  const FALLBACKS = ['uncategorized expense', 'ask my accountant', 'miscellaneous']
  for (const fb of FALLBACKS) {
    match = accounts.find(a => normalize(a.name).includes(fb))
    if (match) return match
  }

  return null
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
  },
  accounts: QBOAccount[]
): Promise<{ success: boolean; qbo_id?: string; error?: string }> {
  const account = resolveAccount(tx.final_category, accounts)

  if (!account) {
    return {
      success: false,
      error: `No matching QBO account for category: "${tx.final_category}"`,
    }
  }

  const purchasePayload = {
    PaymentType: 'Cash',
    AccountRef: {
      value: account.id,
      name: account.name,
    },
    TxnDate: tx.date,
    PrivateNote: tx.description,
    Line: [
      {
        Amount: tx.amount,
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: account.id,
            name: account.name,
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

    // Fetch actual QBO accounts once and reuse for all transactions
    let qboAccounts: QBOAccount[] = []
    try {
      qboAccounts = await fetchQBOAccounts(accessToken, realm_id)
    } catch (err) {
      console.error('Failed to fetch QBO accounts:', err)
      return NextResponse.json(
        { error: 'Failed to fetch QBO chart of accounts' },
        { status: 502 }
      )
    }

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

      // Credits are income — not yet supported as QBO purchases
      if (tx.type === 'credit') {
        await supabase
          .from('transactions')
          .update({
            status: 'push_failed',
            push_error: 'Income transactions not yet supported — coming soon',
          })
          .eq('id', tx.id)
        results.push({
          id: tx.id,
          success: false,
          error: 'Income transactions not yet supported — coming soon',
        })
        continue
      }

      const result = await pushPurchaseToQBO(accessToken, realm_id, {
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        final_category: category,
      }, qboAccounts)

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

    return NextResponse.json({ pushed, failed, results })
  } catch (err) {
    console.error('Push error:', err)
    return NextResponse.json({ error: 'Push to QuickBooks failed' }, { status: 500 })
  }
}
