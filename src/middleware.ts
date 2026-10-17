// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

// Routes that don't require authentication
const publicRoutes = ['/login']

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path)

  // 1. Decrypt the session from the cookie
  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  // 2. Redirect unauthenticated users to login
  if (!isPublicRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // 3. Redirect authenticated users away from login
  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}