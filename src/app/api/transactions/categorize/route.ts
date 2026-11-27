import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const CHART_OF_ACCOUNTS = [
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

export type AccountCategory = (typeof CHART_OF_ACCOUNTS)[number]

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
}

interface CategorizedTransaction extends Transaction {
  suggested_category: AccountCategory
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

const SYSTEM_PROMPT = `You are an expert bookkeeper AI. You will receive a list of bank/credit card transactions and must categorize each one into the most appropriate account category.

Chart of Accounts (use EXACTLY one of these):
${CHART_OF_ACCOUNTS.map(c => `- ${c}`).join('\n')}

Rules:
- Credits (money coming in) are almost always "Revenue" unless it's a refund
- Bank fees, NSF fees, wire fees → "Bank Charges & Fees"
- AWS, Vercel, GitHub, Figma, Notion, Slack, etc → "Software & Subscriptions"
- Facebook Ads, Google Ads, marketing agencies → "Advertising & Marketing"
- Restaurants, coffee shops, bars → "Meals & Entertainment"
- Airlines, hotels, Airbnb, Uber/Lyft (travel context) → "Travel"
- Payroll processors (Gusto, ADP, Wagepoint) → "Payroll & Wages"
- Lawyers, accountants, consultants → "Professional Fees"
- Rent, hydro, gas, internet → "Rent & Utilities"
- If genuinely ambiguous → "Miscellaneous"

Respond ONLY with a valid JSON array matching this structure:
[
  {
    "id": "<transaction_id>",
    "suggested_category": "<exact category name>",
    "confidence": "high" | "medium" | "low",
    "reasoning": "<one sentence explanation>"
  }
]`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { upload_id, transaction_ids } = body as {
      upload_id?: string
      transaction_ids?: string[]
    }

    if (!upload_id && !transaction_ids?.length) {
      return NextResponse.json(
        { error: 'Provide either upload_id or transaction_ids' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

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
        await supabase
          .from('transactions')
          .update({
            suggested_category: item.suggested_category,
            ai_confidence: item.confidence,
            ai_reasoning: item.reasoning,
            status: 'categorized',
          })
          .eq('id', item.id)
      }
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
