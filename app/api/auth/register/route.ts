import { NextRequest, NextResponse } from 'next/server'
import { createUser, generateToken } from '@/lib/auth'
import { initDatabase } from '@/lib/db-postgres-pg'
import { checkRateLimit, getRateLimitKey, registerRateLimitOptions } from '@/lib/rate-limit'
import { isValidEmail, isValidPassword, sanitizeString } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting pour les inscriptions
    const rateLimitKey = getRateLimitKey(request, 'register')
    const rateLimitResult = checkRateLimit(rateLimitKey, registerRateLimitOptions)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives d'inscription. Réessayez dans ${rateLimitResult.retryAfter} secondes.` },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          },
        }
      )
    }

    await initDatabase()
    
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis' },
        { status: 400 }
      )
    }

    // Validation de l'email
    if (typeof email !== 'string' || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Validation du mot de passe (plus stricte)
    if (typeof password !== 'string' || !isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre' },
        { status: 400 }
      )
    }

    // Sanitization du nom si fourni
    const sanitizedName = name ? sanitizeString(name, 100) : undefined

    const user = await createUser(email, password, sanitizedName)
    const token = generateToken(user)

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })

    // Définir le cookie avec le token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
      domain: undefined, // Laisser le navigateur gérer le domaine
    })

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'inscription' },
      { status: 500 }
    )
  }
}
