export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'
import { createClient } from '@supabase/supabase-js'
import { saveRule } from '@/lib/learning'

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

    // Extract user_id from Authorization JWT for learning agent
    let userId: string | null = null
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7)
        const decoded = jwtDecode<{ sub?: string }>(token)
        userId = decoded.sub ?? null
      } catch {
        // no-op — learning agent degrades gracefully
      }
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

    // --- Learning agent: save rules on approve or recategorize (fire-and-forget) ---
    if (userId && (action === 'approve' || action === 'categorize')) {
      ;(async () => {
        try {
          // Fetch the transactions to get description + final_category
          const { data: txRows } = await supabase
            .from('transactions')
            .select('description, final_category, suggested_category')
            .in('id', ids)

          if (txRows) {
            for (const tx of txRows) {
              const finalCat = tx.final_category ?? tx.suggested_category
              if (tx.description && finalCat) {
                await saveRule(supabase, userId!, tx.description, finalCat)
              }
            }
          }
        } catch (err) {
          console.error('Learning agent saveRule error:', err)
        }
      })()
    }

    return NextResponse.json({ updated: ids.length })
  } catch (err) {
    console.error('Review error:', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
