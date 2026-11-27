import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { jwtDecode } from 'jwt-decode'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  raw?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function normalizeDate(raw: string): string {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return raw.slice(0, 10)
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return raw
}

interface CSVColumnMap {
  dateCol: number
  descCol: number
  debitCol: number | null
  creditCol: number | null
  amountCol: number | null
  amountIsNegativeForDebits: boolean
}

async function detectCSVColumns(headerAndSampleRows: string): Promise<CSVColumnMap> {
  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a bank statement parser. Identify the column indices (0-based) for transaction fields. Return only valid JSON.',
      },
      {
        role: 'user',
        content: `Given these CSV headers and sample rows from a bank statement, identify the column indices for: date, description, withdrawal/debit amount, deposit/credit amount (or single amount column).

Return JSON: { "dateCol": number, "descCol": number, "debitCol": number|null, "creditCol": number|null, "amountCol": number|null, "amountIsNegativeForDebits": boolean }

Rules:
- If the bank uses separate columns for debits and credits, set debitCol and creditCol; set amountCol to null.
- If the bank uses a single amount column, set amountCol; set debitCol and creditCol to null.
- amountIsNegativeForDebits: true if debits are stored as negative numbers in the amount column.
- descCol: pick the most descriptive column (prefer a "description" or "memo" column over account numbers).

CSV data:
${headerAndSampleRows}`,
      },
    ],
  })

  const content = response.choices[0].message.content ?? '{}'
  return JSON.parse(content) as CSVColumnMap
}

async function parseCSVWithGPT(csvText: string): Promise<ParsedTransaction[]> {
  const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  // Send header + up to 3 sample rows to GPT to identify columns
  const sampleLines = lines.slice(0, 4).join('\n')
  const colMap = await detectCSVColumns(sampleLines)

  const dataLines = lines.slice(1)
  const transactions: ParsedTransaction[] = []

  for (const line of dataLines) {
    const cols = parseCSVLine(line)

    const rawDate = cols[colMap.dateCol]?.trim()
    if (!rawDate) continue

    const date = normalizeDate(rawDate)

    // Build description — if descCol points to a valid col, use it;
    // also try descCol+1 as a secondary description field
    const desc1 = cols[colMap.descCol]?.trim() ?? ''
    const desc2 = cols[colMap.descCol + 1]?.trim() ?? ''
    // Only concat desc2 if it looks like text (not a number or empty)
    const description = (desc2 && isNaN(Number(desc2.replace(/[$,]/g, ''))))
      ? `${desc1} ${desc2}`.trim()
      : desc1
    if (!description) continue

    let amount: number
    let type: 'debit' | 'credit'

    if (colMap.amountCol !== null) {
      const raw = cols[colMap.amountCol]?.trim().replace(/[$,]/g, '') ?? ''
      amount = parseFloat(raw)
      if (isNaN(amount)) continue
      if (colMap.amountIsNegativeForDebits) {
        type = amount < 0 ? 'debit' : 'credit'
        amount = Math.abs(amount)
      } else {
        // Positive = debit (charge), negative = credit (payment)
        type = amount > 0 ? 'debit' : 'credit'
        amount = Math.abs(amount)
      }
    } else if (colMap.debitCol !== null || colMap.creditCol !== null) {
      const debitRaw = colMap.debitCol !== null ? cols[colMap.debitCol]?.trim().replace(/[$,]/g, '') : ''
      const creditRaw = colMap.creditCol !== null ? cols[colMap.creditCol]?.trim().replace(/[$,]/g, '') : ''
      const debit = parseFloat(debitRaw ?? '')
      const credit = parseFloat(creditRaw ?? '')

      if (!isNaN(debit) && debit !== 0) {
        amount = Math.abs(debit)
        type = 'debit'
      } else if (!isNaN(credit) && credit !== 0) {
        amount = Math.abs(credit)
        type = 'credit'
      } else {
        continue
      }
    } else {
      continue
    }

    transactions.push({ date, description, amount, type, raw: line })
  }

  return transactions
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

async function parsePDFWithGPT(pdfBuffer: Buffer): Promise<ParsedTransaction[]> {
  // Dynamically import pdf-parse to avoid issues with Next.js bundling
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(pdfBuffer)
  const text = data.text

  if (!text || text.trim().length === 0) {
    throw new Error('Could not extract text from PDF. The file may be scanned/image-based.')
  }

  const openai = getOpenAIClient()

  // Split into chunks if very long (GPT-4o can handle ~128k tokens but let's be safe)
  const MAX_CHARS = 80_000
  const truncatedText = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a bank statement parser. Extract transactions from statement text and return them as JSON. Only return transactions — not fees schedules, summaries, or header rows.',
      },
      {
        role: 'user',
        content: `Extract all transactions from this bank statement text. 

Return JSON: { "transactions": [{ "date": "YYYY-MM-DD", "description": string, "amount": number (always positive), "type": "debit"|"credit" }] }

Rules:
- date must be in YYYY-MM-DD format
- amount must always be a positive number
- type: "debit" for withdrawals/charges/payments out; "credit" for deposits/refunds/payments in
- Skip summary rows, opening/closing balances, and non-transaction lines
- If you cannot determine the year, infer it from context (statement date range)

Statement text:
${truncatedText}`,
      },
    ],
  })

  const content = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(content)
  const rawTxns = parsed.transactions ?? []

  if (!Array.isArray(rawTxns)) {
    throw new Error('GPT returned unexpected format for PDF transactions')
  }

  return rawTxns.map((tx: { date: string; description: string; amount: number; type: 'debit' | 'credit' }) => ({
    date: tx.date,
    description: tx.description,
    amount: Math.abs(tx.amount),
    type: tx.type === 'credit' ? 'credit' : 'debit',
  }))
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    // Try Authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const decoded = jwtDecode<{ sub?: string }>(token)
      return decoded.sub ?? null
    }
    // Fall back to cookie
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      [...request.cookies.getAll()].find(c => c.name.includes('-auth-token'))?.value
    if (cookieToken) {
      const decoded = jwtDecode<{ sub?: string }>(cookieToken)
      return decoded.sub ?? null
    }
  } catch {
    // Invalid token
  }
  return null
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploadId = (formData.get('upload_id') as string) || crypto.randomUUID()

    const force = formData.get('force') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isCSV = fileName.endsWith('.csv')
    const isPDF = fileName.endsWith('.pdf')

    if (!isCSV && !isPDF) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a CSV or PDF bank statement.' },
        { status: 400 }
      )
    }

    let transactions: ParsedTransaction[]

    if (isCSV) {
      const text = await file.text()
      try {
        transactions = await parseCSVWithGPT(text)
      } catch (err) {
        console.error('CSV parse error:', err)
        return NextResponse.json(
          { error: 'Could not parse CSV columns. Please check the file is a valid bank statement export.' },
          { status: 400 }
        )
      }
    } else {
      // PDF
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      try {
        transactions = await parsePDFWithGPT(buffer)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('PDF parse error:', err)
        return NextResponse.json(
          { error: `Could not extract transactions from PDF: ${message}` },
          { status: 400 }
        )
      }
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in the file. Check the file format or date range.' },
        { status: 422 }
      )
    }

    const supabase = getSupabaseClient()

    // ─── Duplicate detection ───────────────────────────────────────────────────
    if (!force) {
      const { data: existing } = await supabase
        .from('uploads')
        .select('id, filename')
        .eq('filename', file.name)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { duplicate: true, existing_upload_id: existing.id, filename: existing.filename },
          { status: 409 }
        )
      }
    }

    // Store the upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        id: uploadId,
        filename: file.name,
        row_count: transactions.length,
        status: 'parsed',
        user_id: userId,
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Upload record error:', uploadError)
      return NextResponse.json({ error: 'Failed to save upload record' }, { status: 500 })
    }

    // Store transactions
    const rows = transactions.map((tx, i) => ({
      upload_id: uploadRecord.id,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      raw: tx.raw ?? null,
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

    // Auto-trigger categorization internally
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
      await fetch(`${baseUrl}/api/transactions/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: uploadRecord.id }),
      })
    } catch (catErr) {
      // Non-fatal — categorization can be retried; don't fail the whole upload
      console.warn('Auto-categorization failed (non-fatal):', catErr)
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
