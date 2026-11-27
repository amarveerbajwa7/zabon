import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup']
const PUBLIC_API_PREFIXES = ['/api/auth/quickbooks']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public API routes (QBO OAuth must stay public)
  if (PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Always allow public pages and static assets
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    // If already authenticated and hitting /login, redirect to dashboard
    if (pathname === '/login' || pathname === '/signup') {
      const token =
        request.cookies.get('sb-access-token')?.value ||
        // Supabase also stores tokens in a cookie named like sb-<project-ref>-auth-token
        [...request.cookies.getAll()].find(c => c.name.includes('-auth-token'))?.value

      if (token) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Protected routes — check for auth session
  const token =
    request.cookies.get('sb-access-token')?.value ||
    [...request.cookies.getAll()].find(c => c.name.includes('-auth-token'))?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
