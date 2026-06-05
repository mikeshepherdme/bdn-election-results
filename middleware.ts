import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function middleware(request: NextRequest) {
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
  }

  // Pass through, injecting CORS headers on the response
  const response = NextResponse.next()
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
