'use client'

import { useEffect, useState } from 'react'
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
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertToMGA, convertCurrency } from '@/lib/currency'

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

export default function ReportsPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadData()
  }, [])

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

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
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

        <Grid container spacing={3}>
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
                <Box>
                  {Object.entries(expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <Box key={category} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{category}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(amount)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(amount / expenses) * 100}%`,
                              backgroundColor: '#f5576c',
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                </Box>
              )}
            </Paper>
          </Grid>
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
                <Box>
                  {Object.entries(incomeByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <Box key={category} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{category}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(amount)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(amount / income) * 100}%`,
                              backgroundColor: '#667eea',
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  )
}
