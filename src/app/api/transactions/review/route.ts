import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

type ReviewAction = 'approve' | 'reject' | 'categorize'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, action, category } = body as {
      ids: string[]
      action: ReviewAction
      category?: string
    }

    if (!ids?.length || !action) {
      return NextResponse.json({ error: 'ids and action are required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    let update: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        update = { status: 'approved' }
        break
      case 'reject':
        update = { status: 'rejected' }
        break
      case 'categorize':
        if (!category) {
          return NextResponse.json({ error: 'category is required for categorize action' }, { status: 400 })
        }
        update = { final_category: category }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('transactions')
      .update(update)
      .in('id', ids)

    if (error) {
      console.error('Review update error:', error)
      return NextResponse.json({ error: 'Failed to update transactions' }, { status: 500 })
    }

    return NextResponse.json({ updated: ids.length })
  } catch (err) {
    console.error('Review error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
