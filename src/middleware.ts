// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login']

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.some((route) => path.startsWith(route))
  const hasSession = req.cookies.has('session')

  // 1. Redirect unauthenticated users to login
  if (!isPublicRoute && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  // 2. Redirect authenticated users away from login
  if (path === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}