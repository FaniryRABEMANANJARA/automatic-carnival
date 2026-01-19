/**
 * Utilitaires d'authentification pour les routes API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getUserById } from './auth'

export interface AuthenticatedRequest {
  userId: number
  userEmail: string
}

/**
 * Middleware pour vérifier l'authentification dans les routes API
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ authenticated: true; user: AuthenticatedRequest } | { authenticated: false; response: NextResponse }> {
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      ),
    }
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      ),
    }
  }

  // Vérifier que l'utilisateur existe toujours
  const user = await getUserById(decoded.id)

  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      ),
    }
  }

  return {
    authenticated: true,
    user: {
      userId: user.id,
      userEmail: user.email,
    },
  }
}

/**
 * Vérifier que l'utilisateur peut accéder à une ressource
 * (pour l'instant, on vérifie juste l'authentification, mais on peut ajouter plus de logique)
 */
export async function requireResourceAccess(
  request: NextRequest,
  resourceUserId?: number
): Promise<{ authorized: true; user: AuthenticatedRequest } | { authorized: false; response: NextResponse }> {
  const authResult = await requireAuth(request)

  if (!authResult.authenticated) {
    return {
      authorized: false,
      response: authResult.response,
    }
  }

  // Si un resourceUserId est fourni, vérifier que l'utilisateur peut y accéder
  // Pour l'instant, on suppose que chaque utilisateur ne peut accéder qu'à ses propres ressources
  // Cette logique peut être étendue selon les besoins
  if (resourceUserId !== undefined && resourceUserId !== authResult.user.userId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Accès non autorisé à cette ressource' },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user: authResult.user,
  }
}
