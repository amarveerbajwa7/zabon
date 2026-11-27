import { NextRequest, NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

const INTUIT_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2'

const SCOPES = [
  'com.intuit.quickbooks.accounting',
].join(' ')

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = jwtDecode<{ sub?: string }>(authHeader.slice(7))
      return decoded.sub ?? null
    }
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      [...request.cookies.getAll()].find(c => c.name.includes('-auth-token'))?.value
    if (cookieToken) {
      const decoded = jwtDecode<{ sub?: string }>(cookieToken)
      return decoded.sub ?? null
    }
    // Also check query param (passed from dashboard link)
    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // user_id may be passed as query param from the dashboard link
  const userIdFromQuery = searchParams.get('user_id')
  const userId = getUserIdFromRequest(request) || userIdFromQuery
  const clientId = process.env.QBO_CLIENT_ID
  const redirectUri = process.env.QBO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Missing QBO configuration' },
      { status: 500 }
    )
  }

  // Encode user_id into state so the callback can retrieve it
  const nonce = crypto.randomUUID()
  const state = userId ? `${nonce}:${userId}` : nonce

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
