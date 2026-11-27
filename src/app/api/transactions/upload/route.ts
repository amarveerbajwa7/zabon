import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  raw: string
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

/**
 * Detect and parse RBC bank statement CSV format.
 * RBC Chequing/Savings: Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$
 * RBC Credit Card: Transaction Date,Description 1,Description 2,CAD$,USD$
 */
function detectAndParseCSV(csvText: string): ParsedTransaction[] {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase()
  const dataLines = lines.slice(1)

  // RBC Bank (chequing/savings) format
  if (header.includes('account type') && header.includes('transaction date')) {
    return dataLines.flatMap(line => {
      const cols = parseCSVLine(line)
      // cols: AccountType, AccountNumber, Date, ChequeNum, Desc1, Desc2, CAD, USD
      if (cols.length < 7) return []
      const date = cols[2]?.trim()
      const desc = [cols[4], cols[5]].filter(Boolean).join(' ').trim()
      const cadRaw = cols[6]?.trim().replace(/,/g, '')
      const amount = parseFloat(cadRaw)
      if (!date || !desc || isNaN(amount)) return []

      return [{
        date: normalizeDate(date),
        description: desc,
        amount: Math.abs(amount),
        type: amount < 0 ? 'debit' : 'credit',
        raw: line,
      }]
    })
  }

  // RBC Credit Card format
  if (header.includes('transaction date') && !header.includes('account type')) {
    return dataLines.flatMap(line => {
      const cols = parseCSVLine(line)
      // cols: Date, Desc1, Desc2, CAD, USD
      if (cols.length < 4) return []
      const date = cols[0]?.trim()
      const desc = [cols[1], cols[2]].filter(Boolean).join(' ').trim()
      const cadRaw = cols[3]?.trim().replace(/,/g, '')
      const amount = parseFloat(cadRaw)
      if (!date || !desc || isNaN(amount)) return []

      return [{
        date: normalizeDate(date),
        description: desc,
        amount: Math.abs(amount),
        // Credit card: positive = charge (debit), negative = payment/credit
        type: amount > 0 ? 'debit' : 'credit',
        raw: line,
      }]
    })
  }

  // Generic fallback: Date, Description, Amount
  return dataLines.flatMap(line => {
    const cols = parseCSVLine(line)
    if (cols.length < 3) return []
    const date = cols[0]?.trim()
    const desc = cols[1]?.trim()
    const amountRaw = cols[2]?.trim().replace(/[$,]/g, '')
    const amount = parseFloat(amountRaw)
    if (!date || !desc || isNaN(amount)) return []

    return [{
      date: normalizeDate(date),
      description: desc,
      amount: Math.abs(amount),
      type: amount < 0 ? 'debit' : 'credit',
      raw: line,
    }]
  })
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function normalizeDate(raw: string): string {
  // Handle MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return raw.slice(0, 10)

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return raw
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploadId = (formData.get('upload_id') as string) || crypto.randomUUID()

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported at this time. PDF support coming soon.' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const transactions = detectAndParseCSV(text)

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found. Check the file format.' },
        { status: 422 }
      )
    }

    const supabase = getSupabaseClient()

    // Store the upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        id: uploadId,
        filename: file.name,
        row_count: transactions.length,
        status: 'parsed',
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Upload record error:', uploadError)
      return NextResponse.json({ error: 'Failed to save upload' }, { status: 500 })
    }

    // Store transactions
    const rows = transactions.map((tx, i) => ({
      upload_id: uploadRecord.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      raw: tx.raw,
      status: 'pending',
      sort_order: i,
    }))

    const { error: txError } = await supabase
      .from('transactions')
      .insert(rows)

    if (txError) {
      console.error('Transaction insert error:', txError)
      return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
    }

    return NextResponse.json({
      upload_id: uploadRecord.id,
      filename: file.name,
      count: transactions.length,
      transactions,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Unexpected error during upload' }, { status: 500 })
  }
}
