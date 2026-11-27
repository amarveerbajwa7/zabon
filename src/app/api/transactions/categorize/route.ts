import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import {
  getValidAccessToken,
  fetchQBOAccounts,
} from '@/lib/qbo'

const FALLBACK_CHART_OF_ACCOUNTS = [
  'Revenue',
  'COGS',
  'Advertising & Marketing',
  'Bank Charges & Fees',
  'Insurance',
  'Meals & Entertainment',
  'Office Supplies',
  'Payroll & Wages',
  'Professional Fees',
  'Rent & Utilities',
  'Software & Subscriptions',
  'Travel',
  "Owner's Draw",
  'Miscellaneous',
] as const

export type AccountCategory = (typeof FALLBACK_CHART_OF_ACCOUNTS)[number]

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
}

interface CategorizedTransaction extends Transaction {
  suggested_category: AccountCategory
  confidence: number  // 0–100
  reasoning: string
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

function buildSystemPrompt(accountNames: string[]): string {
  const list = accountNames.map(c => `- ${c}`).join('\n')
  return `You are an expert bookkeeper AI. You will receive a list of bank/credit card transactions and must categorize each one into the most appropriate account category.

Chart of Accounts (use EXACTLY one of these names, spelling must match exactly):
${list}

Rules:
- Credits (money coming in) should map to an Income account if one exists, otherwise best guess
- Bank fees, NSF fees, wire fees → closest bank charges/fees account
- AWS, Vercel, GitHub, Figma, Notion, Slack, etc → closest software/subscriptions account
- Facebook Ads, Google Ads, marketing agencies → closest advertising account
- Restaurants, coffee shops, bars → closest meals/entertainment account
- Airlines, hotels, Airbnb, Uber/Lyft (travel context) → closest travel account
- Payroll processors (Gusto, ADP, Wagepoint) → closest payroll account
- Lawyers, accountants, consultants → closest professional fees account
- Rent, hydro, gas, internet → closest rent/utilities account
- If genuinely ambiguous → pick the most generic expense account available

Respond ONLY with a valid JSON array matching this structure:
[
  {
    "id": "<transaction_id>",
    "suggested_category": "<exact account name from the list above>",
    "confidence": <integer 0–100 — your certainty in this categorization (0=no idea, 100=absolutely certain)>,
    "reasoning": "<one sentence explanation>"
  }
]`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { upload_id, transaction_ids, realm_id } = body as {
      upload_id?: string
      transaction_ids?: string[]
      realm_id?: string
    }

    if (!upload_id && !transaction_ids?.length) {
      return NextResponse.json(
        { error: 'Provide either upload_id or transaction_ids' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Try to fetch real QBO account names for better categorization
    let accountNames: string[] = [...FALLBACK_CHART_OF_ACCOUNTS]
    if (realm_id) {
      try {
        const accessToken = await getValidAccessToken(supabase, realm_id)
        const qboAccounts = await fetchQBOAccounts(accessToken, realm_id)
        if (qboAccounts.length > 0) {
          accountNames = qboAccounts.map(a => a.name)
        }
      } catch (err) {
        console.warn('Could not fetch QBO accounts for categorization, using fallback:', err)
      }
    } else {
      // Try to get realm_id from the first active QBO connection
      try {
        const { data: conn } = await supabase
          .from('qbo_connections')
          .select('realm_id')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()
        if (conn?.realm_id) {
          const accessToken = await getValidAccessToken(supabase, conn.realm_id)
          const qboAccounts = await fetchQBOAccounts(accessToken, conn.realm_id)
          if (qboAccounts.length > 0) {
            accountNames = qboAccounts.map(a => a.name)
          }
        }
      } catch (err) {
        console.warn('Could not auto-detect QBO realm for categorization:', err)
      }
    }

    const SYSTEM_PROMPT = buildSystemPrompt(accountNames)

    let query = supabase
      .from('transactions')
      .select('id, date, description, amount, type')
      .eq('status', 'pending')

    if (upload_id) {
      query = query.eq('upload_id', upload_id)
    } else if (transaction_ids) {
      query = query.in('id', transaction_ids)
    }

    const { data: transactions, error: fetchError } = await query.order('sort_order')

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ error: 'No pending transactions found' }, { status: 404 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

    // Batch in chunks of 50 to stay within token limits
    const BATCH_SIZE = 50
    let categorizedCount = 0
    const results: CategorizedTransaction[] = []

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)

      const userContent = JSON.stringify(
        batch.map(tx => ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
        }))
      )

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content || '{}'

      let parsed: { results?: CategorizedTransaction[] } | CategorizedTransaction[]
      try {
        parsed = JSON.parse(raw)
      } catch {
        console.error('Failed to parse OpenAI response:', raw)
        continue
      }

      const categorized: CategorizedTransaction[] = Array.isArray(parsed)
        ? parsed
        : (parsed as { results?: CategorizedTransaction[] }).results || []

      results.push(...categorized)

      // Update Supabase with suggestions
      for (const item of categorized) {
        const confidence = typeof item.confidence === 'number'
          ? Math.min(100, Math.max(0, item.confidence))
          : null
        await supabase
          .from('transactions')
          .update({
            suggested_category: item.suggested_category,
            ai_confidence: confidence,
            ai_reasoning: item.reasoning,
            status: 'categorized',
          })
          .eq('id', item.id)
        categorizedCount++
      }
    }

    // Mark upload as done
    if (upload_id) {
      await supabase
        .from('uploads')
        .update({ status: 'done' })
        .eq('id', upload_id)
    }

    return NextResponse.json({
      categorized: results.length,
      results,
    })
  } catch (err) {
    console.error('Categorize error:', err)
    return NextResponse.json({ error: 'Categorization failed' }, { status: 500 })
  }
}
