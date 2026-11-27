import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    QBO_CLIENT_ID: process.env.QBO_CLIENT_ID ? `${process.env.QBO_CLIENT_ID.slice(0, 8)}...` : 'MISSING',
    QBO_CLIENT_SECRET: process.env.QBO_CLIENT_SECRET ? 'SET' : 'MISSING',
    QBO_REDIRECT_URI: process.env.QBO_REDIRECT_URI || 'MISSING',
    QBO_ENVIRONMENT: process.env.QBO_ENVIRONMENT || 'MISSING',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
  })
}
