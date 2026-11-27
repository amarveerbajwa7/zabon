import { NextRequest, NextResponse } from 'next/server'

// Auth is handled client-side in each page component.
// Middleware only needs to allow QBO OAuth routes through unconditionally.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
