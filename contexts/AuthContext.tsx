'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: number
  email: string
  name: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Important pour envoyer les cookies
        cache: 'no-store', // Ne pas mettre en cache pour toujours avoir les dernières données
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        // Ne pas logger les erreurs 401 car c'est normal si l'utilisateur n'est pas connecté
        // Seulement si ce n'est pas une erreur 401, on peut logger
        if (response.status !== 401) {
          console.error('Auth check failed with status:', response.status)
        }
        setUser(null)
      }
    } catch (error) {
      // Ne pas logger les erreurs de réseau si c'est juste une absence de cookie
      // Seulement logger les vraies erreurs
      if (error instanceof Error && !error.message.includes('401')) {
        console.error('Auth check error:', error)
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important pour recevoir les cookies
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la connexion')
    }

    // Mettre à jour l'utilisateur immédiatement avec les données de la réponse
    // Cela permet à la redirection de fonctionner même si checkAuth() n'a pas encore vérifié
    setUser(data.user)
    
    // Ne pas appeler checkAuth() immédiatement car le cookie vient d'être défini
    // et pourrait ne pas être encore disponible, ce qui réinitialiserait user à null
    // La vérification sera faite automatiquement par le useEffect dans AuthContext
  }

  const register = async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include', // Important pour recevoir les cookies
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'inscription')
    }

    // Mettre à jour l'utilisateur immédiatement avec les données de la réponse
    setUser(data.user)
    
    // Attendre un peu pour que le cookie soit propagé
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Re-vérifier l'authentification pour confirmer que le cookie est bien défini
    // Si la vérification échoue, on garde quand même l'utilisateur défini
    try {
      await checkAuth()
    } catch (error) {
      // Si la vérification échoue, on garde l'utilisateur défini car l'inscription a réussi
      console.warn('Auth verification after register failed, but registration was successful')
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
