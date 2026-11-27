import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('upload_id')

  if (!uploadId) {
    return NextResponse.json({ error: 'upload_id is required' }, { status: 400 })
  }

  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(
      'id, date, description, amount, type, suggested_category, final_category, ai_confidence, ai_reasoning, status, qbo_id, push_error'
    )
    .eq('upload_id', uploadId)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }

  return NextResponse.json({ transactions: data })
}
