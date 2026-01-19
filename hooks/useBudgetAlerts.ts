'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNotifications } from './useNotifications'

export interface BudgetAlert {
  id: number
  budget_id?: number
  category: string
  budget_amount: number
  spent_amount: number
  currency: 'MGA' | 'RMB'
  month: number
  year: number
  percentage: number
  is_read: boolean
  created_at?: string
}

export function useBudgetAlerts() {
  const { showNotification, enabled } = useNotifications()
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/alerts?unreadOnly=true&limit=10')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data)
        setUnreadCount(data.filter((a: BudgetAlert) => !a.is_read).length)
      }
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    // Recharger les alertes toutes les 30 secondes
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  const checkBudgetAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/check', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        if (data.newAlerts && data.newAlerts.length > 0) {
          // Afficher des notifications pour les nouvelles alertes
          data.newAlerts.forEach((alert: BudgetAlert) => {
            if (enabled) {
              showNotification({
                title: '⚠️ Budget dépassé!',
                body: `${alert.category}: ${alert.percentage.toFixed(1)}% utilisé (${alert.spent_amount.toLocaleString('fr-FR')} / ${alert.budget_amount.toLocaleString('fr-FR')} ${alert.currency})`,
                tag: `budget-alert-${alert.id}`,
                requireInteraction: true,
              })
            }
          })
          loadAlerts()
        }
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error)
    }
  }, [enabled, showNotification, loadAlerts])

  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/alerts/${id}/read`, { method: 'PUT' })
      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }, [loadAlerts])

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/read-all', { method: 'PUT' })
      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Error marking all alerts as read:', error)
    }
  }, [loadAlerts])

  return {
    alerts,
    unreadCount,
    loading,
    loadAlerts,
    checkBudgetAlerts,
    markAsRead,
    markAllAsRead,
  }
}
