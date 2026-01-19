'use client'

import { useState, useEffect, useCallback } from 'react'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
      const saved = localStorage.getItem('notificationsEnabled')
      if (saved === 'true' && Notification.permission === 'granted') {
        setEnabled(true)
      }
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      setPermission('granted')
      setEnabled(true)
      localStorage.setItem('notificationsEnabled', 'true')
      return true
    }

    if (Notification.permission === 'denied') {
      setPermission('denied')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    
    if (result === 'granted') {
      setEnabled(true)
      localStorage.setItem('notificationsEnabled', 'true')
      return true
    } else {
      setEnabled(false)
      localStorage.setItem('notificationsEnabled', 'false')
      return false
    }
  }, [])

  const enableNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }
    
    // Si la permission est déjà refusée, ne pas demander à nouveau
    if (Notification.permission === 'denied') {
      setPermission('denied')
      setEnabled(false)
      localStorage.setItem('notificationsEnabled', 'false')
      return false
    }
    
    const granted = await requestPermission()
    if (granted) {
      setEnabled(true)
      localStorage.setItem('notificationsEnabled', 'true')
    } else {
      // Mettre à jour la permission même si refusée
      setPermission(Notification.permission)
      setEnabled(false)
      localStorage.setItem('notificationsEnabled', 'false')
    }
    return granted
  }, [requestPermission])

  const disableNotifications = useCallback(() => {
    setEnabled(false)
    localStorage.setItem('notificationsEnabled', 'false')
  }, [])

  const showNotification = useCallback((options: NotificationOptions) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (!enabled || Notification.permission !== 'granted') {
      return false
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag || 'transaction',
        requireInteraction: options.requireInteraction || false,
      })

      // Fermer automatiquement après 5 secondes
      setTimeout(() => {
        notification.close()
      }, 5000)

      return true
    } catch (error) {
      console.error('Error showing notification:', error)
      return false
    }
  }, [enabled])

  const notifyTransaction = useCallback((type: 'income' | 'expense', amount: number, currency: string, description?: string) => {
    const typeLabel = type === 'income' ? 'Revenu' : 'Dépense'
    const emoji = type === 'income' ? '💰' : '💸'
    const formattedAmount = currency === 'MGA' 
      ? `${amount.toLocaleString('fr-FR')} Ar`
      : `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    
    return showNotification({
      title: `${emoji} ${typeLabel} enregistré`,
      body: description 
        ? `${description}\n${formattedAmount}`
        : `${formattedAmount}`,
      tag: `transaction-${type}-${Date.now()}`,
    })
  }, [showNotification])

  return {
    permission,
    enabled,
    requestPermission,
    enableNotifications,
    disableNotifications,
    showNotification,
    notifyTransaction,
  }
}
