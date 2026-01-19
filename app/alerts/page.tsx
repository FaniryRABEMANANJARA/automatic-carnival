'use client'

import { useEffect, useState } from 'react'
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Toolbar,
  Button,
  Chip,
  Alert,
  AlertTitle,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'

interface BudgetAlert {
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

export default function AlertsPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const { alerts, unreadCount, loadAlerts, markAsRead, markAllAsRead } = useBudgetAlerts()
  const [allAlerts, setAllAlerts] = useState<BudgetAlert[]>([])
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })

  useEffect(() => {
    loadAllAlerts()
  }, [])

  const loadAllAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (response.ok) {
        const data = await response.json()
        setAllAlerts(data)
      }
    } catch (error) {
      console.error('Error loading all alerts:', error)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id)
    loadAllAlerts()
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    loadAllAlerts()
  }

  const handleDelete = async (id: number) => {
    setAlertDialog({
      open: true,
      title: 'Confirmation de suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette alerte?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
          if (response.ok) {
            loadAllAlerts()
          }
        } catch (error) {
          console.error('Error deleting alert:', error)
        }
      },
      showCancel: true
    })
  }

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const unreadAlerts = allAlerts.filter(a => !a.is_read)
  const readAlerts = allAlerts.filter(a => a.is_read)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          <Toolbar sx={{ mb: 3, px: 0 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                Alertes de Budget
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} non lue(s)`}
                  color="error"
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
            {unreadAlerts.length > 0 && (
              <Button
                variant="outlined"
                onClick={handleMarkAllAsRead}
                sx={{ borderRadius: 2 }}
              >
                Tout marquer comme lu
              </Button>
            )}
          </Toolbar>

          {allAlerts.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune alerte
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vous n'avez aucune alerte de budget pour le moment
              </Typography>
            </Paper>
          ) : (
            <>
              {unreadAlerts.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Alertes non lues
                  </Typography>
                  <List>
                    {unreadAlerts.map((alert, index) => {
                      const isOverBudget = alert.percentage >= 100
                      const isWarning = alert.percentage >= 80 && alert.percentage < 100
                      
                      return (
                        <Box key={alert.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {isOverBudget ? (
                                    <WarningIcon sx={{ color: 'error.main' }} />
                                  ) : (
                                    <WarningIcon sx={{ color: 'warning.main' }} />
                                  )}
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {alert.category}
                                  </Typography>
                                  <Chip
                                    label={`${alert.percentage.toFixed(1)}%`}
                                    size="small"
                                    color={isOverBudget ? 'error' : 'warning'}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    {months[alert.month - 1]} {alert.year}
                                  </Typography>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    Budget: {formatCurrency(alert.budget_amount, mainCurrency)} • 
                                    Dépensé: {formatCurrency(alert.spent_amount, mainCurrency)}
                                  </Typography>
                                  {alert.created_at && (
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      {new Date(alert.created_at).toLocaleString('fr-FR')}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMarkAsRead(alert.id)}
                                  color="primary"
                                  title="Marquer comme lu"
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(alert.id)}
                                  color="error"
                                  title="Supprimer"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < unreadAlerts.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                        </Box>
                      )
                    })}
                  </List>
                </Paper>
              )}

              {readAlerts.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Alertes lues
                  </Typography>
                  <List>
                    {readAlerts.map((alert, index) => {
                      const isOverBudget = alert.percentage >= 100
                      
                      return (
                        <Box key={alert.id}>
                          <ListItem sx={{ opacity: 0.7 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />
                                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                    {alert.category}
                                  </Typography>
                                  <Chip
                                    label={`${alert.percentage.toFixed(1)}%`}
                                    size="small"
                                    color={isOverBudget ? 'error' : 'warning'}
                                    variant="outlined"
                                  />
                                </Box>
                              }
                              secondary={
                                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    {months[alert.month - 1]} {alert.year}
                                  </Typography>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    Budget: {formatCurrency(alert.budget_amount, mainCurrency)} • 
                                    Dépensé: {formatCurrency(alert.spent_amount, mainCurrency)}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(alert.id)}
                                color="error"
                                title="Supprimer"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < readAlerts.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                        </Box>
                      )
                    })}
                  </List>
                </Paper>
              )}
            </>
          )}

          <AlertDialog
            open={alertDialog.open}
            onClose={() => setAlertDialog({ ...alertDialog, open: false })}
            onConfirm={alertDialog.onConfirm}
            title={alertDialog.title}
            message={alertDialog.message}
            type={alertDialog.type}
            showCancel={alertDialog.showCancel}
          />
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
