import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 })
  }

  const supabase = getSupabaseClient()

  // Delete transactions first (in case FK doesn't cascade)
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('upload_id', id)

  if (txError) {
    console.error('Failed to delete transactions:', txError)
    return NextResponse.json({ error: 'Failed to delete transactions' }, { status: 500 })
  }

  // Delete the upload record
  const { error: uploadError } = await supabase
    .from('uploads')
    .delete()
    .eq('id', id)

  if (uploadError) {
    console.error('Failed to delete upload:', uploadError)
    return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
