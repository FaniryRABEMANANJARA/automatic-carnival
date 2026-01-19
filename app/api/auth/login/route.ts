import { NextRequest, NextResponse } from 'next/server'
import { verifyUser, generateToken } from '@/lib/auth'
import { initDatabase } from '@/lib/db-postgres-pg'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Initialiser la base de données avec gestion d'erreur
    try {
      await initDatabase()
    } catch (error: any) {
      // Si l'initialisation échoue, réessayer une fois
      console.log('Retry initDatabase...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      await initDatabase()
    }
    
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis' },
        { status: 400 }
      )
    }

    const user = await verifyUser(email, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la connexion' },
      { status: 500 }
    )
  }
}
