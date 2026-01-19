/**
 * Rate limiting simple en mémoire pour protéger contre les attaques brute force
 * Note: Pour la production, utilisez un service comme Redis ou Upstash
 */

import type { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Nettoyer les entrées expirées toutes les 5 minutes
// Note: Dans un environnement serverless, setInterval peut ne pas fonctionner correctement
// Le nettoyage se fait aussi de manière lazy lors des vérifications
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    // Utiliser Array.from pour éviter les problèmes d'itération
    rateLimitStore.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key)
      }
    })
    
    // Supprimer les clés expirées
    keysToDelete.forEach(key => rateLimitStore.delete(key))
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  windowMs: number // Fenêtre de temps en millisecondes
  maxRequests: number // Nombre maximum de requêtes
}

const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requêtes par fenêtre
}

/**
 * Vérifier le rate limiting pour une clé donnée
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = defaultOptions
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Nettoyage lazy : supprimer les entrées expirées lors de la vérification
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key)
  }

  if (!entry || now > entry.resetTime) {
    // Créer une nouvelle entrée
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + options.windowMs,
    })
    return { allowed: true }
  }

  if (entry.count >= options.maxRequests) {
    // Limite atteinte
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000) // en secondes
    return { allowed: false, retryAfter }
  }

  // Incrémenter le compteur
  entry.count++
  return { allowed: true }
}

/**
 * Obtenir la clé de rate limiting à partir d'une requête
 */
export function getRateLimitKey(request: NextRequest, prefix: string = ''): string {
  // Utiliser l'IP de l'utilisateur comme clé
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  return `${prefix}:${ip}`
}

/**
 * Rate limiting spécifique pour les tentatives de connexion
 */
export const loginRateLimitOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 tentatives de connexion
}

/**
 * Rate limiting spécifique pour les inscriptions
 */
export const registerRateLimitOptions: RateLimitOptions = {
  windowMs: 60 * 60 * 1000, // 1 heure
  maxRequests: 3, // 3 inscriptions par heure
}
