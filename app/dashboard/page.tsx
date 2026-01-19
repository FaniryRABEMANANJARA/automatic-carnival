'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Paper,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useNotifications } from '@/hooks/useNotifications'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { convertToMGA, convertCurrency, type Currency } from '@/lib/currency'

declare global {
  interface Window {
    Chart: any
  }
}

interface Transaction {
  id: number
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  currency: 'MGA' | 'RMB'
  date: string
  income_source?: string
}

interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string
}

interface Budget {
  id: number
  category: string
  amount: number
  currency: 'MGA' | 'RMB'
  month: number
  year: number
}

export default function DashboardPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const { notifyTransaction } = useNotifications()
  const { unreadCount, checkBudgetAlerts } = useBudgetAlerts()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [dialog, setDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Refs pour les canvas des graphiques
  const miniLineChartRef = useRef<HTMLCanvasElement>(null)
  const miniPieChartRef = useRef<HTMLCanvasElement>(null)
  const miniLineChartInstance = useRef<any>(null)
  const miniPieChartInstance = useRef<any>(null)
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    currency: 'MGA' as Currency,
    income_source: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadData()
    // Vérifier les alertes de budget toutes les minutes
    checkBudgetAlerts()
    const interval = setInterval(checkBudgetAlerts, 60000)
    return () => clearInterval(interval)
  }, [checkBudgetAlerts])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const [transRes, catRes, budgetsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories'),
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`)
      ])
      const transData = await transRes.json()
      const catData = await catRes.json()
      const budgetsData = await budgetsRes.json()
      setTransactions(transData)
      setCategories(catData)
      setBudgets(budgetsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + convertToMGA(t.amount, t.currency), 0)
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + convertToMGA(t.amount, t.currency), 0)
    setTotalIncome(income)
    setTotalExpense(expense)
  }, [transactions])

  useEffect(() => {
    if (transactions.length > 0 && typeof window !== 'undefined' && window.Chart) {
      createMiniCharts()
    }
    return () => {
      if (miniLineChartInstance.current) miniLineChartInstance.current.destroy()
      if (miniPieChartInstance.current) miniPieChartInstance.current.destroy()
    }
  }, [transactions, mainCurrency])

  const createMiniCharts = () => {
    if (!window.Chart) return

    const Chart = window.Chart
    const currentMonthNum = new Date().getMonth() + 1
    const currentYearNum = new Date().getFullYear()

    // Mini graphique en ligne - 6 derniers mois
    if (miniLineChartRef.current) {
      if (miniLineChartInstance.current) {
        miniLineChartInstance.current.destroy()
      }
      const ctx = miniLineChartRef.current.getContext('2d')
      const months = []
      const incomeData = []
      const expenseData = []
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYearNum, currentMonthNum - 1 - i, 1)
        const monthNum = date.getMonth() + 1
        const yearNum = date.getFullYear()
        months.push(date.toLocaleString('fr-FR', { month: 'short' }))
        
        const monthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date)
          return transactionDate.getMonth() + 1 === monthNum && 
                 transactionDate.getFullYear() === yearNum
        })
        
        const monthIncome = monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => {
            const amountInMGA = convertToMGA(t.amount, t.currency)
            return sum + convertCurrency(amountInMGA, 'MGA', mainCurrency)
          }, 0)
        
        const monthExpense = monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => {
            const amountInMGA = convertToMGA(t.amount, t.currency)
            return sum + convertCurrency(amountInMGA, 'MGA', mainCurrency)
          }, 0)
        
        incomeData.push(monthIncome)
        expenseData.push(monthExpense)
      }
      
      miniLineChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Revenus',
              data: incomeData,
              borderColor: 'rgb(102, 126, 234)',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true,
            },
            {
              label: 'Dépenses',
              data: expenseData,
              borderColor: 'rgb(245, 87, 108)',
              backgroundColor: 'rgba(245, 87, 108, 0.1)',
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { size: 11 },
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  return `${context.dataset.label}: ${formatCurrency(context.parsed.y, mainCurrency)}`
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value: any) => formatCurrency(value, mainCurrency),
                font: { size: 10 },
              },
            },
            x: {
              ticks: {
                font: { size: 10 },
              },
            },
          },
        },
      })
    }

    // Mini graphique en secteurs - Dépenses par catégorie (mois actuel)
    if (miniPieChartRef.current && Object.keys(expensesByCategory).length > 0) {
      if (miniPieChartInstance.current) {
        miniPieChartInstance.current.destroy()
      }
      const ctx = miniPieChartRef.current.getContext('2d')
      const categories = Object.keys(expensesByCategory)
      const amounts = Object.values(expensesByCategory)
      const colors = [
        '#f5576c', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#607d8b',
        '#4caf50', '#2196f3', '#ff5722', '#795548'
      ]
      
      miniPieChartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [
            {
              data: amounts,
              backgroundColor: colors.slice(0, categories.length),
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 10,
                font: { size: 10 },
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || ''
                  const value = formatCurrency(context.parsed, mainCurrency)
                  const total = amounts.reduce((a, b) => a + b, 0)
                  const percentage = ((context.parsed / total) * 100).toFixed(1)
                  return `${label}: ${value} (${percentage}%)`
                },
              },
            },
          },
        },
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          date: formData.date,
          income_source: formData.income_source || undefined,
        }),
      })

      if (response.ok) {
        await loadData()
        setDialog(false)
        setFormData({
          type: 'expense',
          category: '',
          description: '',
          amount: '',
          currency: 'MGA',
          income_source: '',
          date: new Date().toISOString().split('T')[0]
        })
        
        // Envoyer une notification
        const newTransaction = await response.json()
        notifyTransaction(newTransaction.type, newTransaction.description, newTransaction.amount, newTransaction.currency)
      } else {
        const error = await response.json()
        setAlertDialog({
          open: true,
          title: 'Erreur',
          message: error.error || 'Erreur lors de l\'ajout de la transaction',
          type: 'error',
          showCancel: false,
          onConfirm: undefined,
        })
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de l\'ajout de la transaction',
        type: 'error',
        showCancel: false,
        onConfirm: undefined,
      })
    }
  }

  const handleDelete = async (id: number) => {
    setAlertDialog({
      open: true,
      title: 'Supprimer la transaction',
      message: 'Êtes-vous sûr de vouloir supprimer cette transaction ?',
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/transactions/${id}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            await loadData()
            setAlertDialog({ ...alertDialog, open: false })
          } else {
            const error = await response.json()
            setAlertDialog({
              open: true,
              title: 'Erreur',
              message: error.error || 'Erreur lors de la suppression',
              type: 'error',
              showCancel: false,
              onConfirm: undefined,
            })
          }
        } catch (error) {
          console.error('Error deleting transaction:', error)
          setAlertDialog({
            open: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression',
            type: 'error',
            showCancel: false,
            onConfirm: undefined,
          })
        }
      },
    })
  }

  const balance = totalIncome - totalExpense
  const currentMonth = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  const recentTransactions = transactions.slice(0, 10)
  const expensePercentage = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0

  // Calculer les dépenses par catégorie pour le mois actuel
  const currentMonthNum = new Date().getMonth() + 1
  const currentYearNum = new Date().getFullYear()
  const expensesByCategory = transactions
    .filter(t => {
      const transactionDate = new Date(t.date)
      return t.type === 'expense' &&
             transactionDate.getMonth() + 1 === currentMonthNum &&
             transactionDate.getFullYear() === currentYearNum
    })
    .reduce((acc, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency)
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      acc[t.category] = (acc[t.category] || 0) + convertedAmount
      return acc
    }, {} as Record<string, number>)

  // Calculer l'utilisation des budgets
  const getBudgetUsage = (budget: Budget) => {
    const spent = expensesByCategory[budget.category] || 0
    const budgetAmountInMGA = convertToMGA(budget.amount, budget.currency)
    const budgetAmount = convertCurrency(budgetAmountInMGA, 'MGA', mainCurrency)
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
    return { spent, budgetAmount, percentage }
  }

  // Budgets dépassés ou en alerte
  const budgetsWithAlerts = budgets
    .map(budget => {
      const usage = getBudgetUsage(budget)
      return { ...budget, ...usage }
    })
    .filter(b => b.percentage > 80)
    .sort((a, b) => b.percentage - a.percentage)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                  Dashboard
                </Typography>
                {unreadCount > 0 && (
                  <Chip
                    label={`${unreadCount} alerte(s)`}
                    color="error"
                    size="small"
                    icon={<WarningIcon />}
                    clickable
                    component="a"
                    href="/alerts"
                  />
                )}
              </Box>
              <Typography variant="body1" color="text.secondary">
                {currentMonth}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialog(true)}
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Nouvelle transaction
            </Button>
          </Box>

          {loading && <LinearProgress sx={{ mb: 3 }} />}

          {/* Cards de statistiques */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Revenus totaux
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                        {formatCurrency(totalIncome)}
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Dépenses totales
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                        {formatCurrency(totalExpense)}
                      </Typography>
                    </Box>
                    <TrendingDownIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: balance >= 0 ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Solde
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                        {formatCurrency(balance)}
                      </Typography>
                    </Box>
                    <WalletIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Taux de dépenses
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, mt: 1 }}>
                    {expensePercentage.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(expensePercentage, 100)}
                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                    color={expensePercentage > 80 ? 'error' : expensePercentage > 50 ? 'warning' : 'success'}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Alertes de budgets */}
          {budgetsWithAlerts.length > 0 && (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '2px solid #ff9800' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningIcon sx={{ color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  Alertes de Budget
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {budgetsWithAlerts.slice(0, 3).map((budget) => {
                  const category = categories.find(c => c.name === budget.category)
                  const isOverBudget = budget.percentage > 100
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={budget.id}>
                      <Card
                        sx={{
                          border: isOverBudget ? '2px solid #f44336' : '1px solid #ff9800',
                          borderRadius: 2,
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {category && (
                              <Chip
                                label={budget.category}
                                size="small"
                                sx={{
                                  backgroundColor: category.color,
                                  color: 'white',
                                }}
                              />
                            )}
                            {!category && (
                              <Chip label={budget.category} size="small" variant="outlined" />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Budget: {formatCurrency(budget.budgetAmount, mainCurrency)}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              color: isOverBudget ? 'error.main' : 'warning.main',
                            }}
                          >
                            Dépensé: {formatCurrency(budget.spent, mainCurrency)}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(budget.percentage, 100)}
                            sx={{
                              mt: 1,
                              height: 8,
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: isOverBudget ? '#f44336' : '#ff9800',
                              },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {budget.percentage.toFixed(1)}% utilisé
                            {isOverBudget && ' - Budget dépassé!'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
              {budgetsWithAlerts.length > 3 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    href="/budgets"
                    sx={{ borderRadius: 2 }}
                  >
                    Voir tous les budgets ({budgetsWithAlerts.length})
                  </Button>
                </Box>
              )}
            </Paper>
          )}

          {/* Mini graphiques */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Évolution (6 derniers mois)
                </Typography>
                <Box sx={{ height: 250, position: 'relative' }}>
                  <canvas ref={miniLineChartRef}></canvas>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Dépenses par catégorie (mois actuel)
                </Typography>
                {Object.keys(expensesByCategory).length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Aucune dépense ce mois
                  </Typography>
                ) : (
                  <Box sx={{ height: 250, position: 'relative' }}>
                    <canvas ref={miniPieChartRef}></canvas>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Transactions récentes */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Transactions récentes
              </Typography>
              <Button
                variant="outlined"
                size="small"
                href="/transactions"
                sx={{ borderRadius: 2 }}
              >
                Voir tout
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {recentTransactions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Aucune transaction pour le moment
              </Typography>
            ) : (
              <List>
                {recentTransactions.map((transaction) => {
                  const convertedAmount = convertCurrency(
                    transaction.amount,
                    transaction.currency,
                    mainCurrency
                  )
                  const isDifferentCurrency = transaction.currency !== mainCurrency

                  return (
                    <ListItem
                      key={transaction.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        mb: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {transaction.description}
                            </Typography>
                            <Chip
                              label={transaction.type === 'income' ? 'Revenu' : 'Dépense'}
                              size="small"
                              color={transaction.type === 'income' ? 'success' : 'error'}
                              sx={{ height: 20 }}
                            />
                            {isDifferentCurrency && (
                              <Chip
                                label={transaction.currency}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20 }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {transaction.category}
                            </Typography>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {new Date(transaction.date).toLocaleDateString('fr-FR')}
                            </Typography>
                            {transaction.income_source && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                Source: {transaction.income_source}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: transaction.type === 'income' ? 'success.main' : 'error.main',
                            }}
                          >
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(convertedAmount)}
                          </Typography>
                          {isDifferentCurrency && (
                            <Typography variant="body2" color="text.secondary">
                              ({formatCurrency(transaction.amount, transaction.currency)})
                            </Typography>
                          )}
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDelete(transaction.id)}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  )
                })}
              </List>
            )}
          </Paper>

          {/* Dialog pour ajouter une transaction */}
          <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Nouvelle transaction</DialogTitle>
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <TextField
                  select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                  fullWidth
                  margin="normal"
                  required
                >
                  <MenuItem value="income">Revenu</MenuItem>
                  <MenuItem value="expense">Dépense</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Catégorie"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  fullWidth
                  margin="normal"
                  required
                >
                  {categories
                    .filter((c) => c.type === formData.type)
                    .map((category) => (
                      <MenuItem key={category.id} value={category.name}>
                        {category.name}
                      </MenuItem>
                    ))}
                </TextField>

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  fullWidth
                  margin="normal"
                  required
                />

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

                {formData.currency !== mainCurrency && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2">
                      Montant converti: {formatCurrency(
                        convertCurrency(parseFloat(formData.amount) || 0, formData.currency, mainCurrency),
                        mainCurrency
                      )}
                    </Typography>
                  </Box>
                )}

                {formData.type === 'expense' && (
                  <TextField
                    select
                    label="Source de revenu (optionnel)"
                    value={formData.income_source}
                    onChange={(e) => setFormData({ ...formData, income_source: e.target.value })}
                    fullWidth
                    margin="normal"
                  >
                    <MenuItem value="">Aucune</MenuItem>
                    {transactions
                      .filter((t) => t.type === 'income')
                      .map((transaction) => (
                        <MenuItem key={transaction.id} value={transaction.description}>
                          {transaction.description}
                        </MenuItem>
                      ))}
                  </TextField>
                )}

                <TextField
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  fullWidth
                  margin="normal"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialog(false)}>Annuler</Button>
                <Button type="submit" variant="contained" sx={{ borderRadius: 1 }}>
                  Ajouter
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
