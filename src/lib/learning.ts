import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Normalize a raw transaction description to a canonical merchant name.
 * Strips transaction codes, card numbers, noise words, and extra whitespace.
 *
 * Examples:
 *   "TIM HORTONS #1234 PURCHASE" → "tim hortons"
 *   "AMAZON.COM*AB12CD345 DEBIT CARD" → "amazon"
 *   "PAYPAL *GITHUBINC 4929" → "githubinc"
 */
export function normalizeDescription(description: string): string {
  let s = description.toLowerCase()

  // Remove card last-4 patterns (e.g. "4929", "xxxx1234")
  s = s.replace(/\b(?:x{3,}\d{4}|\d{4})\b/g, '')

  // Remove common transaction codes (alphanumeric after * or #)
  s = s.replace(/[#*][a-z0-9]+/g, '')

  // Remove noise words
  const noiseWords = [
    'purchase',
    'payment',
    'pos',
    'debit',
    'credit',
    'card',
    'transaction',
    'transfer',
    'withdrawal',
    'deposit',
    'recurring',
    'preauth',
    'pre-auth',
    'authorized',
    'authorization',
    'internet',
    'online',
    'web',
    'mobile',
    'contactless',
    'tap',
    'etransfer',
    'e-transfer',
    'direct',
    'ach',
    'wire',
    'fee',
    'charge',
    'misc',
    'ref',
    'ca',
    'us',
    'ltd',
    'inc',
    'llc',
    'corp',
  ]
  const noisePattern = new RegExp(`\\b(${noiseWords.join('|')})\\b`, 'g')
  s = s.replace(noisePattern, '')

  // Remove standalone numbers (e.g. store/branch numbers)
  s = s.replace(/\b\d+\b/g, '')

  // Remove special chars except letters and spaces
  s = s.replace(/[^a-z\s]/g, ' ')

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

/**
 * Look up a categorization rule for the given user + transaction description.
 * Returns { category, confidence } if a match exists, null otherwise.
 */
export async function lookupRule(
  supabase: SupabaseClient,
  userId: string,
  description: string
): Promise<{ category: string; confidence: number } | null> {
  const pattern = normalizeDescription(description)

  if (!pattern) return null

  const { data, error } = await supabase
    .from('categorization_rules')
    .select('category')
    .eq('user_id', userId)
    .eq('merchant_pattern', pattern)
    .single()

  if (error || !data) return null

  // Update last_matched_at (fire-and-forget)
  supabase
    .from('categorization_rules')
    .update({ last_matched_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('merchant_pattern', pattern)
    .then(() => {})

  return { category: data.category, confidence: 99 }
}

/**
 * Save or update a categorization rule for a given user + transaction description.
 * On conflict (same user + merchant_pattern), increments match_count.
 */
export async function saveRule(
  supabase: SupabaseClient,
  userId: string,
  description: string,
  category: string
): Promise<void> {
  const pattern = normalizeDescription(description)

  if (!pattern) return

  await supabase.from('categorization_rules').upsert(
    {
      user_id: userId,
      merchant_pattern: pattern,
      category,
      last_matched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,merchant_pattern',
      ignoreDuplicates: false,
    }
  )

  // Increment match_count separately — Supabase upsert doesn't support increments
  await supabase.rpc('increment_rule_match_count', {
    p_user_id: userId,
    p_merchant_pattern: pattern,
  })
}
