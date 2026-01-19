'use client'

import { useEffect, useState } from 'react'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Toolbar,
  IconButton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Savings as SavingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertToMGA, convertCurrency, type Currency } from '@/lib/currency'

interface Goal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  currency: 'MGA' | 'RMB'
  target_date?: string
  is_completed: boolean
  created_at?: string
  updated_at?: string
}

export default function GoalsPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const [goals, setGoals] = useState<Goal[]>([])
  const [dialog, setDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    currency: 'MGA' as Currency,
    target_date: '',
    is_completed: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/goals')
      const data = await res.json()
      setGoals(data)
    } catch (error) {
      console.error('Error loading goals:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingGoal
        ? `/api/goals/${editingGoal.id}`
        : '/api/goals'
      
      const method = editingGoal ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          target_amount: parseFloat(formData.target_amount),
          current_amount: parseFloat(formData.current_amount) || 0,
          target_date: formData.target_date || undefined,
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setAlertDialog({
          open: true,
          title: 'Erreur',
          message: data.error || 'Une erreur est survenue',
          type: 'error',
          onConfirm: undefined,
          showCancel: false
        })
        return
      }
      
      setDialog(false)
      setEditingGoal(null)
      setFormData({
        name: '',
        target_amount: '',
        current_amount: '',
        currency: 'MGA',
        target_date: '',
        is_completed: false
      })
      loadData()
    } catch (error) {
      console.error('Error saving goal:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de la sauvegarde',
        type: 'error',
        onConfirm: undefined,
        showCancel: false
      })
    }
  }

  const handleDelete = async (id: number) => {
    setAlertDialog({
      open: true,
      title: 'Confirmation de suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cet objectif?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/goals/${id}`, {
            method: 'DELETE'
          })
          
          const data = await response.json()
          
          if (!response.ok) {
            setAlertDialog({
              open: true,
              title: 'Erreur',
              message: data.error || 'Une erreur est survenue',
              type: 'error',
              onConfirm: undefined,
              showCancel: false
            })
            return
          }
          
          loadData()
        } catch (error) {
          console.error('Error deleting goal:', error)
          setAlertDialog({
            open: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression',
            type: 'error',
            onConfirm: undefined,
            showCancel: false
          })
        }
      },
      showCancel: true
    })
  }

  const handleToggleCompleted = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !currentStatus })
      })
      
      if (!response.ok) {
        const data = await response.json()
        setAlertDialog({
          open: true,
          title: 'Erreur',
          message: data.error || 'Une erreur est survenue',
          type: 'error',
          onConfirm: undefined,
          showCancel: false
        })
        return
      }
      
      loadData()
    } catch (error) {
      console.error('Error toggling completed status:', error)
    }
  }

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal)
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        currency: goal.currency,
        target_date: goal.target_date || '',
        is_completed: goal.is_completed
      })
    } else {
      setEditingGoal(null)
      setFormData({
        name: '',
        target_amount: '',
        current_amount: '',
        currency: 'MGA',
        target_date: '',
        is_completed: false
      })
    }
    setDialog(true)
  }

  const getGoalProgress = (goal: Goal) => {
    const targetInMGA = convertToMGA(goal.target_amount, goal.currency)
    const currentInMGA = convertToMGA(goal.current_amount, goal.currency)
    const target = convertCurrency(targetInMGA, 'MGA', mainCurrency)
    const current = convertCurrency(currentInMGA, 'MGA', mainCurrency)
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0
    const remaining = Math.max(target - current, 0)
    return { target, current, percentage, remaining }
  }

  const activeGoals = goals.filter(g => !g.is_completed)
  const completedGoals = goals.filter(g => g.is_completed)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          <Toolbar sx={{ mb: 3, px: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Objectifs d'épargne
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 2 }}
            >
              Nouvel objectif
            </Button>
          </Toolbar>

          {goals.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
              <SavingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucun objectif défini
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Créez votre premier objectif d'épargne pour commencer à économiser
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Créer un objectif
              </Button>
            </Paper>
          ) : (
            <>
              {activeGoals.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Objectifs en cours
                  </Typography>
                  <Grid container spacing={3}>
                    {activeGoals.map((goal) => {
                      const { target, current, percentage, remaining } = getGoalProgress(goal)
                      const isNearTarget = percentage >= 80 && percentage < 100
                      const isOverTarget = percentage >= 100
                      
                      return (
                        <Grid item xs={12} md={6} key={goal.id}>
                          <Card
                            sx={{
                              border: isOverTarget ? '2px solid #4caf50' : isNearTarget ? '2px solid #ff9800' : '1px solid #e0e0e0',
                              borderRadius: 2,
                              overflow: 'hidden'
                            }}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    {goal.name}
                                  </Typography>
                                  {goal.target_date && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                      <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                      <Typography variant="caption" color="text.secondary">
                                        Échéance: {new Date(goal.target_date).toLocaleDateString('fr-FR')}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(goal)}
                                    color="primary"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(goal.id)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </Box>

                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Objectif
                                  </Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {formatCurrency(target, mainCurrency)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Épargné
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 600,
                                      color: isOverTarget ? 'success.main' : 'text.primary'
                                    }}
                                  >
                                    {formatCurrency(current, mainCurrency)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Restant
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 600,
                                      color: remaining > 0 ? 'text.primary' : 'success.main'
                                    }}
                                  >
                                    {formatCurrency(remaining, mainCurrency)}
                                  </Typography>
                                </Box>

                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(percentage, 100)}
                                  sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: '#e0e0e0',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: isOverTarget ? '#4caf50' : isNearTarget ? '#ff9800' : '#2196f3',
                                    }
                                  }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {percentage.toFixed(1)}% atteint
                                  </Typography>
                                  {isOverTarget && (
                                    <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <CheckCircleIcon sx={{ fontSize: 14 }} />
                                      Objectif atteint!
                                    </Typography>
                                  )}
                                  {isNearTarget && !isOverTarget && (
                                    <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <WarningIcon sx={{ fontSize: 14 }} />
                                      Presque atteint
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Paper>
              )}

              {completedGoals.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Objectifs atteints
                  </Typography>
                  <Grid container spacing={3}>
                    {completedGoals.map((goal) => {
                      const { target, current } = getGoalProgress(goal)
                      
                      return (
                        <Grid item xs={12} md={6} key={goal.id}>
                          <Card
                            sx={{
                              border: '1px solid #4caf50',
                              borderRadius: 2,
                              opacity: 0.8
                            }}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                      {goal.name}
                                    </Typography>
                                  </Box>
                                  {goal.target_date && (
                                    <Typography variant="caption" color="text.secondary">
                                      Échéance: {new Date(goal.target_date).toLocaleDateString('fr-FR')}
                                    </Typography>
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleToggleCompleted(goal.id, goal.is_completed)}
                                    color="success"
                                    title="Réactiver"
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(goal.id)}
                                    color="error"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Objectif: {formatCurrency(target, mainCurrency)}
                                </Typography>
                                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                  Épargné: {formatCurrency(current, mainCurrency)}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Paper>
              )}
            </>
          )}

          <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
              <DialogTitle>
                {editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif d\'épargne'}
              </DialogTitle>
              <DialogContent>
                <TextField
                  label="Nom de l'objectif"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  fullWidth
                  margin="normal"
                  required
                  placeholder="Ex: Vacances, Achat voiture, Épargne d'urgence..."
                />
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <TextField
                    label="Montant cible"
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <TextField
                    select
                    label="Devise"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                    margin="normal"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="MGA">MGA</MenuItem>
                    <MenuItem value="RMB">RMB</MenuItem>
                  </TextField>
                </Box>
                {formData.currency !== mainCurrency && formData.target_amount && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2">
                      Montant cible converti: {formatCurrency(
                        convertCurrency(
                          convertToMGA(parseFloat(formData.target_amount) || 0, formData.currency),
                          'MGA',
                          mainCurrency
                        ),
                        mainCurrency
                      )}
                    </Typography>
                  </Box>
                )}
                <TextField
                  label="Montant actuel (optionnel)"
                  type="number"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  fullWidth
                  margin="normal"
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Montant déjà épargné pour cet objectif"
                />
                <TextField
                  label="Date cible (optionnel)"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  helperText="Date à laquelle vous souhaitez atteindre cet objectif"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialog(false)}>Annuler</Button>
                <Button type="submit" variant="contained">
                  {editingGoal ? 'Modifier' : 'Créer'}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

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
