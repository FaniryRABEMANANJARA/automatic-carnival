'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertToMGA, convertCurrency } from '@/lib/currency'
import { comparePeriods, compareCategories, calculateTrendData, calculateYearlyTrendData } from '@/lib/analytics'
import type { Transaction } from '@/lib/db-postgres-pg'

declare global {
  interface Window {
    Chart: any
  }
}

export default function ReportsPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Refs pour les canvas des graphiques
  const lineChartRef = useRef<HTMLCanvasElement>(null)
  const pieExpenseChartRef = useRef<HTMLCanvasElement>(null)
  const pieIncomeChartRef = useRef<HTMLCanvasElement>(null)
  const barChartRef = useRef<HTMLCanvasElement>(null)
  const comparisonChartRef = useRef<HTMLCanvasElement>(null)
  const yearlyTrendChartRef = useRef<HTMLCanvasElement>(null)
  
  // Refs pour les instances de graphiques
  const lineChartInstance = useRef<any>(null)
  const pieExpenseChartInstance = useRef<any>(null)
  const pieIncomeChartInstance = useRef<any>(null)
  const barChartInstance = useRef<any>(null)
  const comparisonChartInstance = useRef<any>(null)
  const yearlyTrendChartInstance = useRef<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (transactions.length > 0 && typeof window !== 'undefined' && window.Chart) {
      createCharts()
      createComparisonCharts()
    }
    return () => {
      // Nettoyer les graphiques lors du démontage
      if (lineChartInstance.current) lineChartInstance.current.destroy()
      if (pieExpenseChartInstance.current) pieExpenseChartInstance.current.destroy()
      if (pieIncomeChartInstance.current) pieIncomeChartInstance.current.destroy()
      if (barChartInstance.current) barChartInstance.current.destroy()
      if (comparisonChartInstance.current) comparisonChartInstance.current.destroy()
      if (yearlyTrendChartInstance.current) yearlyTrendChartInstance.current.destroy()
    }
  }, [transactions, selectedMonth, selectedYear, mainCurrency])

  const loadData = async () => {
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date)
    return transactionDate.getMonth() + 1 === selectedMonth && 
           transactionDate.getFullYear() === selectedYear
  })

  const income = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      return sum + convertedAmount
    }, 0)
  
  const expenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      return sum + convertedAmount
    }, 0)

  const balance = income - expenses

  // Calculer la comparaison avec le mois précédent
  const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
  const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
  const monthComparison = comparePeriods(
    transactions,
    selectedMonth,
    selectedYear,
    previousMonth,
    previousYear,
    mainCurrency
  )

  // Comparaison par catégories
  const expenseCategoryComparison = compareCategories(
    transactions,
    selectedMonth,
    selectedYear,
    previousMonth,
    previousYear,
    'expense',
    mainCurrency
  )

  const incomeCategoryComparison = compareCategories(
    transactions,
    selectedMonth,
    selectedYear,
    previousMonth,
    previousYear,
    'income',
    mainCurrency
  )

  // Tendance annuelle
  const yearlyTrendData = calculateYearlyTrendData(transactions, 5, mainCurrency)

  const expensesByCategory = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      acc[t.category] = (acc[t.category] || 0) + convertedAmount
      return acc
    }, {} as Record<string, number>)

  const incomeByCategory = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      acc[t.category] = (acc[t.category] || 0) + convertedAmount
      return acc
    }, {} as Record<string, number>)

  // Calculer les données pour les 6 derniers mois
  const getLast6MonthsData = () => {
    const months = []
    const incomeData = []
    const expenseData = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - 1 - i, 1)
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
          const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
          return sum + convertCurrency(amountInMGA, 'MGA', mainCurrency)
        }, 0)
      
      const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => {
          const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
          return sum + convertCurrency(amountInMGA, 'MGA', mainCurrency)
        }, 0)
      
      incomeData.push(monthIncome)
      expenseData.push(monthExpense)
    }
    
    return { months, incomeData, expenseData }
  }

  const createCharts = () => {
    if (!window.Chart) return

    const Chart = window.Chart
    const { months, incomeData, expenseData } = getLast6MonthsData()

    // Graphique en ligne - Évolution sur 6 mois
    if (lineChartRef.current) {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy()
      }
      const ctx = lineChartRef.current.getContext('2d')
      lineChartInstance.current = new Chart(ctx, {
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
              },
            },
          },
        },
      })
    }

    // Graphique en secteurs - Dépenses par catégorie
    if (pieExpenseChartRef.current && Object.keys(expensesByCategory).length > 0) {
      if (pieExpenseChartInstance.current) {
        pieExpenseChartInstance.current.destroy()
      }
      const ctx = pieExpenseChartRef.current.getContext('2d')
      const categories = Object.keys(expensesByCategory)
      const amounts = Object.values(expensesByCategory)
      const colors = [
        '#f5576c', '#ff9800', '#9c27b0', '#e91e63', '#00bcd4', '#607d8b',
        '#4caf50', '#2196f3', '#ff5722', '#795548'
      ]
      
      pieExpenseChartInstance.current = new Chart(ctx, {
        type: 'pie',
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

    // Graphique en secteurs - Revenus par catégorie
    if (pieIncomeChartRef.current && Object.keys(incomeByCategory).length > 0) {
      if (pieIncomeChartInstance.current) {
        pieIncomeChartInstance.current.destroy()
      }
      const ctx = pieIncomeChartRef.current.getContext('2d')
      const categories = Object.keys(incomeByCategory)
      const amounts = Object.values(incomeByCategory)
      const colors = [
        '#667eea', '#4caf50', '#8bc34a', '#00bcd4', '#ff9800', '#9c27b0',
        '#e91e63', '#2196f3', '#ff5722', '#795548'
      ]
      
      pieIncomeChartInstance.current = new Chart(ctx, {
        type: 'pie',
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

    // Graphique en barres - Comparaison mensuelle
    if (barChartRef.current) {
      if (barChartInstance.current) {
        barChartInstance.current.destroy()
      }
      const ctx = barChartRef.current.getContext('2d')
      barChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Revenus',
              data: incomeData,
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
            },
            {
              label: 'Dépenses',
              data: expenseData,
              backgroundColor: 'rgba(245, 87, 108, 0.8)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
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
              },
            },
          },
        },
      })
    }
  }

  const createComparisonCharts = () => {
    if (!window.Chart) return

    const Chart = window.Chart

    // Graphique de comparaison mois actuel vs précédent
    if (comparisonChartRef.current) {
      if (comparisonChartInstance.current) {
        comparisonChartInstance.current.destroy()
      }
      const ctx = comparisonChartRef.current.getContext('2d')
      comparisonChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Revenus', 'Dépenses', 'Solde'],
          datasets: [
            {
              label: 'Mois Actuel',
              data: [
                monthComparison.current.income,
                monthComparison.current.expense,
                monthComparison.current.balance,
              ],
              backgroundColor: 'rgba(102, 126, 234, 0.8)',
            },
            {
              label: 'Mois Précédent',
              data: [
                monthComparison.previous.income,
                monthComparison.previous.expense,
                monthComparison.previous.balance,
              ],
              backgroundColor: 'rgba(158, 158, 158, 0.8)',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
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
              beginAtZero: false,
              ticks: {
                callback: (value: any) => formatCurrency(value, mainCurrency),
              },
            },
          },
        },
      })
    }

    // Graphique de tendance annuelle
    if (yearlyTrendChartRef.current && yearlyTrendData.length > 0) {
      if (yearlyTrendChartInstance.current) {
        yearlyTrendChartInstance.current.destroy()
      }
      const ctx = yearlyTrendChartRef.current.getContext('2d')
      const years = yearlyTrendData.map(d => d.year.toString())
      const incomeData = yearlyTrendData.map(d => d.income)
      const expenseData = yearlyTrendData.map(d => d.expense)
      
      yearlyTrendChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: years,
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
              },
            },
          },
        },
      })
    }
  }

  // Liste des mois pour le sélecteur
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1)
    return date.toLocaleString('fr-FR', { month: 'long' })
  })

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
        <Toolbar sx={{ mb: 3, px: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Rapports
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
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
        </Toolbar>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Revenus
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(income)}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Dépenses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(expenses)}
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: balance >= 0 ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Solde
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(balance)}
                    </Typography>
                  </Box>
                  <AssessmentIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Graphique en ligne - Évolution sur 6 mois */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Évolution des revenus et dépenses (6 derniers mois)
          </Typography>
          <Box sx={{ height: 300, position: 'relative' }}>
            <canvas ref={lineChartRef}></canvas>
          </Box>
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Graphique en secteurs - Dépenses */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Dépenses par catégorie
              </Typography>
              {Object.keys(expensesByCategory).length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucune dépense pour cette période
                </Typography>
              ) : (
                <Box sx={{ height: 300, position: 'relative' }}>
                  <canvas ref={pieExpenseChartRef}></canvas>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Graphique en secteurs - Revenus */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Revenus par catégorie
              </Typography>
              {Object.keys(incomeByCategory).length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucun revenu pour cette période
                </Typography>
              ) : (
                <Box sx={{ height: 300, position: 'relative' }}>
                  <canvas ref={pieIncomeChartRef}></canvas>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Graphique en barres - Comparaison mensuelle */}
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Comparaison mensuelle (6 derniers mois)
          </Typography>
          <Box sx={{ height: 300, position: 'relative' }}>
            <canvas ref={barChartRef}></canvas>
          </Box>
        </Paper>

        {/* Comparaisons et tendances */}
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, mt: 4 }}>
          Comparaisons et Tendances
        </Typography>

        {/* Comparaison mois actuel vs précédent */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Comparaison Mois Actuel vs Précédent
              </Typography>
              <Box sx={{ height: 300, position: 'relative' }}>
                <canvas ref={comparisonChartRef}></canvas>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Indicateurs de Croissance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Revenus
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatCurrency(monthComparison.current.income, mainCurrency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            vs {formatCurrency(monthComparison.previous.income, mainCurrency)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          {monthComparison.growth.income >= 0 ? (
                            <TrendingUpIcon sx={{ color: 'success.main', fontSize: 32 }} />
                          ) : (
                            <TrendingDownIcon sx={{ color: 'error.main', fontSize: 32 }} />
                          )}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: monthComparison.growth.income >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {monthComparison.growth.income >= 0 ? '+' : ''}
                            {monthComparison.growth.income.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Dépenses
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatCurrency(monthComparison.current.expense, mainCurrency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            vs {formatCurrency(monthComparison.previous.expense, mainCurrency)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          {monthComparison.growth.expense >= 0 ? (
                            <TrendingUpIcon sx={{ color: 'error.main', fontSize: 32 }} />
                          ) : (
                            <TrendingDownIcon sx={{ color: 'success.main', fontSize: 32 }} />
                          )}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: monthComparison.growth.expense >= 0 ? 'error.main' : 'success.main'
                            }}
                          >
                            {monthComparison.growth.expense >= 0 ? '+' : ''}
                            {monthComparison.growth.expense.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Solde
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatCurrency(monthComparison.current.balance, mainCurrency)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            vs {formatCurrency(monthComparison.previous.balance, mainCurrency)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          {monthComparison.growth.balance >= 0 ? (
                            <TrendingUpIcon sx={{ color: 'success.main', fontSize: 32 }} />
                          ) : (
                            <TrendingDownIcon sx={{ color: 'error.main', fontSize: 32 }} />
                          )}
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              color: monthComparison.growth.balance >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {monthComparison.growth.balance >= 0 ? '+' : ''}
                            {monthComparison.growth.balance.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Comparaison par catégories */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Évolution des Dépenses par Catégorie
              </Typography>
              {expenseCategoryComparison.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucune donnée disponible
                </Typography>
              ) : (
                <Box>
                  {expenseCategoryComparison.slice(0, 5).map((comp) => (
                    <Box key={comp.category} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{comp.category}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(comp.current, mainCurrency)}
                          </Typography>
                          {comp.growth !== 0 && (
                            <Chip
                              label={`${comp.growth >= 0 ? '+' : ''}${comp.growth.toFixed(1)}%`}
                              size="small"
                              color={comp.growth >= 0 ? 'error' : 'success'}
                              icon={comp.growth >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            flex: 1,
                            backgroundColor: '#e0e0e0',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${comp.previous > 0 ? (comp.previous / Math.max(comp.current, comp.previous)) * 100 : 0}%`,
                              backgroundColor: '#9e9e9e',
                            }}
                          />
                          <Box
                            sx={{
                              height: '100%',
                              width: `${comp.current > 0 ? (comp.current / Math.max(comp.current, comp.previous)) * 100 : 0}%`,
                              backgroundColor: comp.growth >= 0 ? '#f5576c' : '#4caf50',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Précédent: {formatCurrency(comp.previous, mainCurrency)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Évolution des Revenus par Catégorie
              </Typography>
              {incomeCategoryComparison.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucune donnée disponible
                </Typography>
              ) : (
                <Box>
                  {incomeCategoryComparison.slice(0, 5).map((comp) => (
                    <Box key={comp.category} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{comp.category}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(comp.current, mainCurrency)}
                          </Typography>
                          {comp.growth !== 0 && (
                            <Chip
                              label={`${comp.growth >= 0 ? '+' : ''}${comp.growth.toFixed(1)}%`}
                              size="small"
                              color={comp.growth >= 0 ? 'success' : 'error'}
                              icon={comp.growth >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            flex: 1,
                            backgroundColor: '#e0e0e0',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${comp.previous > 0 ? (comp.previous / Math.max(comp.current, comp.previous)) * 100 : 0}%`,
                              backgroundColor: '#9e9e9e',
                            }}
                          />
                          <Box
                            sx={{
                              height: '100%',
                              width: `${comp.current > 0 ? (comp.current / Math.max(comp.current, comp.previous)) * 100 : 0}%`,
                              backgroundColor: comp.growth >= 0 ? '#4caf50' : '#f5576c',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                            }}
                          />
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Précédent: {formatCurrency(comp.previous, mainCurrency)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Tendance annuelle */}
        {yearlyTrendData.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Tendance Annuelle (5 dernières années)
            </Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              <canvas ref={yearlyTrendChartRef}></canvas>
            </Box>
          </Paper>
        )}
      </Box>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
