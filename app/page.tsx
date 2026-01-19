'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Box, CircularProgress } from '@mui/material'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Si l'utilisateur est connecté, rediriger vers le dashboard
        router.push('/dashboard')
      } else {
        // Si l'utilisateur n'est pas connecté, rediriger vers le login
        router.push('/login')
      }
    }
  }, [user, loading, router])

  // Afficher un loader pendant la vérification
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  )
}
