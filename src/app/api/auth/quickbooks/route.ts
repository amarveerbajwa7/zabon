import { NextResponse } from 'next/server'

const INTUIT_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'

const SCOPES = [
  'com.intuit.quickbooks.accounting',
].join(' ')

export async function GET() {
  const clientId = process.env.QBO_CLIENT_ID
  const redirectUri = process.env.QBO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Missing QBO configuration' },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
  })

  const authUrl = `${INTUIT_AUTH_URL}?${params.toString()}`

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('qbo_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  })

  return response
}
