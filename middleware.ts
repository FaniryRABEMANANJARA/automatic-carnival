import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function verifyToken(token: string): { id: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string }
    return decoded
  } catch (error) {
    return null
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  // Routes publiques (pas besoin d'authentification)
  const publicRoutes = ['/login', '/register', '/api/auth', '/']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

  // Si c'est une route publique, laisser passer
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Si pas de token et route protégée, rediriger vers login
  // Ne pas rediriger si on est déjà sur / (page d'accueil qui redirige elle-même)
  if (!token && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Vérifier le token (seulement si présent)
  if (!token) {
    return NextResponse.next()
  }
  
  const decoded = verifyToken(token)
  
  if (!decoded) {
    // Token invalide, rediriger vers login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    // Supprimer le cookie invalide
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets/ (static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
}
