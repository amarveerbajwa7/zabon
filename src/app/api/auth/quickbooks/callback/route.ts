import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const realmId = searchParams.get('realmId')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/dashboard?error=missing_params', request.url)
    )
  }

  // Validate state
  const storedState = request.cookies.get('qbo_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_state', request.url)
    )
  }

  const clientId = process.env.QBO_CLIENT_ID!
  const clientSecret = process.env.QBO_CLIENT_SECRET!
  const redirectUri = process.env.QBO_REDIRECT_URI!

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('Token exchange failed:', errText)
      return NextResponse.redirect(
        new URL('/dashboard?error=token_exchange_failed', request.url)
      )
    }

    const tokens = await tokenRes.json()

    const supabase = getSupabaseClient()

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const refreshExpiresAt = new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('qbo_connections')
      .upsert(
        {
          realm_id: realmId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_at: expiresAt,
          refresh_expires_at: refreshExpiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'realm_id' }
      )

    if (dbError) {
      console.error('Failed to store tokens:', dbError)
      return NextResponse.redirect(
        new URL('/dashboard?error=db_error', request.url)
      )
    }

    const response = NextResponse.redirect(
      new URL(`/dashboard?connected=true&realmId=${realmId}`, request.url)
    )
    response.cookies.delete('qbo_state')

    return response
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      new URL('/dashboard?error=unexpected', request.url)
    )
  }
}
