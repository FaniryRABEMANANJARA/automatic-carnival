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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AccountBalance as BudgetIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertToMGA, convertCurrency, type Currency } from '@/lib/currency'

interface Budget {
  id: number
  category: string
  amount: number
  currency: 'MGA' | 'RMB'
  month: number
  year: number
  created_at?: string
  updated_at?: string
}

interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string
}

interface Transaction {
  id: number
  type: 'income' | 'expense'
  category: string
  amount: number
  currency: 'MGA' | 'RMB'
  date: string
}

export default function BudgetsPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [dialog, setDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    currency: 'MGA' as Currency,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    try {
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch(`/api/budgets?month=${selectedMonth}&year=${selectedYear}`),
        fetch('/api/categories'),
        fetch('/api/transactions')
      ])
      const budgetsData = await budgetsRes.json()
      const categoriesData = await categoriesRes.json()
      const transactionsData = await transactionsRes.json()
      setBudgets(budgetsData)
      setCategories(categoriesData)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingBudget
        ? `/api/budgets/${editingBudget.id}`
        : '/api/budgets'
      
      const method = editingBudget ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
      setEditingBudget(null)
      setFormData({
        category: '',
        amount: '',
        currency: 'MGA',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      })
      loadData()
    } catch (error) {
      console.error('Error saving budget:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de la sauvegarde du budget',
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
      message: 'Êtes-vous sûr de vouloir supprimer ce budget?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/budgets/${id}`, {
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
          console.error('Error deleting budget:', error)
          setAlertDialog({
            open: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression du budget',
            type: 'error',
            onConfirm: undefined,
            showCancel: false
          })
        }
      },
      showCancel: true
    })
  }

  const handleOpenDialog = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget)
      setFormData({
        category: budget.category,
        amount: budget.amount.toString(),
        currency: budget.currency,
        month: budget.month,
        year: budget.year
      })
    } else {
      setEditingBudget(null)
      setFormData({
        category: '',
        amount: '',
        currency: 'MGA',
        month: selectedMonth,
        year: selectedYear
      })
    }
    setDialog(true)
  }

  // Calculer les dépenses réelles par catégorie pour le mois sélectionné
  const getExpensesByCategory = () => {
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return t.type === 'expense' &&
             transactionDate.getMonth() + 1 === selectedMonth &&
             transactionDate.getFullYear() === selectedYear
    })

    return filteredTransactions.reduce((acc, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency)
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      acc[t.category] = (acc[t.category] || 0) + convertedAmount
      return acc
    }, {} as Record<string, number>)
  }

  const expensesByCategory = getExpensesByCategory()

  // Calculer le pourcentage utilisé pour chaque budget
  const getBudgetUsage = (budget: Budget) => {
    const spent = expensesByCategory[budget.category] || 0
    const budgetAmountInMGA = convertToMGA(budget.amount, budget.currency)
    const budgetAmount = convertCurrency(budgetAmountInMGA, 'MGA', mainCurrency)
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
    return { spent, budgetAmount, percentage }
  }

  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          <Toolbar sx={{ mb: 3, px: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Budgets
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 2 }}
            >
              Nouveau budget
            </Button>
          </Toolbar>

          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Mois</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Mois"
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {months.map((month, index) => (
                    <MenuItem key={index} value={index + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Année</InputLabel>
                <Select
                  value={selectedYear}
                  label="Année"
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>

          {budgets.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
              <BudgetIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucun budget défini
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Créez votre premier budget pour commencer à suivre vos dépenses
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Créer un budget
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {budgets.map((budget) => {
                const { spent, budgetAmount, percentage } = getBudgetUsage(budget)
                const isOverBudget = percentage > 100
                const isWarning = percentage > 80 && percentage <= 100
                const category = categories.find(c => c.name === budget.category)

                return (
                  <Grid item xs={12} md={6} key={budget.id}>
                    <Card
                      sx={{
                        border: isOverBudget ? '2px solid #f44336' : isWarning ? '2px solid #ff9800' : '1px solid #e0e0e0',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {category && (
                              <Chip
                                label={budget.category}
                                sx={{
                                  backgroundColor: category.color,
                                  color: 'white',
                                  fontWeight: 600
                                }}
                              />
                            )}
                            {!category && (
                              <Chip label={budget.category} variant="outlined" />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(budget)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(budget.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Budget
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {formatCurrency(budgetAmount, mainCurrency)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Dépensé
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 600,
                                color: isOverBudget ? 'error.main' : 'text.primary'
                              }}
                            >
                              {formatCurrency(spent, mainCurrency)}
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
                                color: budgetAmount - spent < 0 ? 'error.main' : 'success.main'
                              }}
                            >
                              {formatCurrency(budgetAmount - spent, mainCurrency)}
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
                                backgroundColor: isOverBudget ? '#f44336' : isWarning ? '#ff9800' : '#4caf50',
                              }
                            }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {percentage.toFixed(1)}% utilisé
                            </Typography>
                            {isOverBudget && (
                              <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WarningIcon sx={{ fontSize: 14 }} />
                                Budget dépassé
                              </Typography>
                            )}
                            {isWarning && !isOverBudget && (
                              <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WarningIcon sx={{ fontSize: 14 }} />
                                Attention
                              </Typography>
                            )}
                            {!isWarning && !isOverBudget && (
                              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CheckCircleIcon sx={{ fontSize: 14 }} />
                                Dans les limites
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
          )}

          <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
              <DialogTitle>
                {editingBudget ? 'Modifier le budget' : 'Nouveau budget'}
              </DialogTitle>
              <DialogContent>
                <TextField
                  select
                  label="Catégorie"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  fullWidth
                  margin="normal"
                  required
                >
                  {expenseCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <TextField
                    label="Montant"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                {formData.currency !== mainCurrency && formData.amount && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2">
                      Montant converti: {formatCurrency(
                        convertCurrency(
                          convertToMGA(parseFloat(formData.amount) || 0, formData.currency),
                          'MGA',
                          mainCurrency
                        ),
                        mainCurrency
                      )}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <TextField
                    select
                    label="Mois"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    fullWidth
                    margin="normal"
                    required
                  >
                    {months.map((month, index) => (
                      <MenuItem key={index} value={index + 1}>
                        {month}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Année"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    fullWidth
                    margin="normal"
                    required
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialog(false)}>Annuler</Button>
                <Button type="submit" variant="contained">
                  {editingBudget ? 'Modifier' : 'Créer'}
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
