'use client'

import { useEffect, useState } from 'react'
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
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useNotifications } from '@/hooks/useNotifications'
import { convertToMGA, convertCurrency, type Currency } from '@/lib/currency'

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

export default function Home() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const { notifyTransaction } = useNotifications()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [dialog, setDialog] = useState(false)
  const [loading, setLoading] = useState(true)
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
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [transRes, catRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories')
      ])
      const transData = await transRes.json()
      const catData = await catRes.json()
      
      setTransactions(transData)
      setCategories(catData)
      
      // Convertir tous les montants vers la devise principale pour les calculs
      const income = transData
        .filter((t: Transaction) => t.type === 'income')
        .reduce((sum: number, t: Transaction) => {
          const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
          const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
          return sum + convertedAmount
        }, 0)
      const expense = transData
        .filter((t: Transaction) => t.type === 'expense')
        .reduce((sum: number, t: Transaction) => {
          const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
          const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
          return sum + convertedAmount
        }, 0)
      
      setTotalIncome(income)
      setTotalExpense(expense)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        // Envoyer une notification
        notifyTransaction(
          formData.type,
          parseFloat(formData.amount),
          formData.currency,
          formData.description || formData.category
        )
        
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
        loadData()
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
    }
  }

  const handleDelete = async (id: number) => {
    setAlertDialog({
      open: true,
      title: 'Confirmation de suppression',
      message: 'Êtes-vous sûr de vouloir supprimer cette transaction?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
          loadData()
        } catch (error) {
          console.error('Error deleting transaction:', error)
          setAlertDialog({
            open: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression de la transaction',
            type: 'error',
            onConfirm: undefined,
            showCancel: false
          })
        }
      },
      showCancel: true
    })
  }

  const filteredCategories = categories.filter(c => c.type === formData.type)
  const incomeCategories = categories.filter((c: Category) => c.type === 'income')
  const balance = totalIncome - totalExpense
  const currentMonth = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  const recentTransactions = transactions.slice(0, 10)
  const expensePercentage = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Dashboard
            </Typography>
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
            <Card
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Revenus
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(totalIncome)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      p: 1.5,
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Dépenses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(totalExpense)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      p: 1.5,
                    }}
                  >
                    <TrendingDownIcon sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: balance >= 0
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                  : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            >
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
                  <Box
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      p: 1.5,
                    }}
                  >
                    <WalletIcon sx={{ fontSize: 32 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                color: '#333',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Taux de dépenses
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {expensePercentage.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(expensePercentage, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Transactions récentes */}
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Transactions récentes
                </Typography>
                <Chip
                  label={`${transactions.length} total`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {recentTransactions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Aucune transaction enregistrée
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setDialog(true)}
                    sx={{ mt: 2 }}
                  >
                    Ajouter une transaction
                  </Button>
                </Box>
              ) : (
                <List>
                  {recentTransactions.map((transaction, index) => (
                    <Box key={transaction.id}>
                      <ListItem
                        sx={{
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.02)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor:
                              transaction.type === 'income'
                                ? 'rgba(76, 175, 80, 0.1)'
                                : 'rgba(244, 67, 54, 0.1)',
                            mr: 2,
                          }}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowDownIcon
                              color="success"
                              sx={{ fontSize: 20 }}
                            />
                          ) : (
                            <ArrowUpIcon color="error" sx={{ fontSize: 20 }} />
                          )}
                        </Box>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {transaction.description || transaction.category}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={transaction.category}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                              {transaction.type === 'expense' && transaction.income_source && (
                                <Chip
                                  label={`Source: ${transaction.income_source}`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                <CalendarIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                                {new Date(transaction.date).toLocaleDateString('fr-FR')}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  color:
                                    transaction.type === 'income'
                                      ? 'success.main'
                                      : 'error.main',
                                  fontWeight: 700,
                                }}
                              >
                                {transaction.type === 'income' ? '+' : '-'}
                                {formatCurrency(transaction.amount, (transaction.currency || 'MGA') as Currency)}
                              </Typography>
                              {transaction.currency !== mainCurrency && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block' }}
                                >
                                  ≈ {formatCurrency(
                                    convertCurrency(
                                      convertToMGA(transaction.amount, transaction.currency || 'MGA'),
                                      'MGA',
                                      mainCurrency
                                    )
                                  )}
                                </Typography>
                              )}
                            </Box>
                            <IconButton
                              edge="end"
                              color="error"
                              onClick={() => handleDelete(transaction.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < recentTransactions.length - 1 && (
                        <Divider sx={{ my: 1 }} />
                      )}
                    </Box>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Résumé mensuel */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Résumé du mois
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Revenus
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(totalIncome)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#4CAF50',
                    },
                  }}
                />
              </Box>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Dépenses
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(totalExpense)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#F44336',
                    },
                  }}
                />
              </Box>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Solde
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatCurrency(balance)}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.8, fontStyle: 'italic' }}
                >
                  {balance >= 0
                    ? 'Excellent ! Vous êtes dans le vert.'
                    : 'Attention ! Vous dépensez plus que vos revenus.'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Dialog pour ajouter une transaction */}
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Nouvelle transaction
              </Typography>
            </DialogTitle>
            <DialogContent>
              <TextField
                select
                label="Type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'income' | 'expense',
                    category: '',
                    income_source: e.target.value === 'income' ? '' : formData.income_source,
                  })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                fullWidth
                margin="normal"
                required
              >
                {filteredCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                fullWidth
                margin="normal"
              />
              <TextField
                label="Montant"
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                fullWidth
                margin="normal"
                inputProps={{ step: '0.01', min: '0' }}
                required
              />
              <TextField
                select
                label="Devise"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value as Currency })
                }
                fullWidth
                margin="normal"
                required
              >
                <MenuItem value="MGA">MGA (Ar) - Ariary malgache</MenuItem>
                <MenuItem value="RMB">RMB (¥) - Yuan chinois</MenuItem>
              </TextField>
              {formData.currency !== mainCurrency && formData.amount && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Équivalent en {mainCurrency === 'MGA' ? 'MGA' : 'RMB'}:{' '}
                    <strong>
                      {formatCurrency(
                        convertCurrency(
                          convertToMGA(parseFloat(formData.amount) || 0, formData.currency),
                          'MGA',
                          mainCurrency
                        )
                      )}
                    </strong>
                  </Typography>
                </Box>
              )}
              {formData.type === 'expense' && (
                <TextField
                  select
                  label="Source de revenu (optionnel)"
                  value={formData.income_source || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, income_source: e.target.value })
                  }
                  fullWidth
                  margin="normal"
                  helperText="Sélectionnez la catégorie de revenu qui finance cette dépense"
                >
                  <MenuItem value="">Aucune source</MenuItem>
                  {incomeCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 1 }}>
              <Button onClick={() => setDialog(false)}>Annuler</Button>
              <Button type="submit" variant="contained" sx={{ borderRadius: 1 }}>
                Ajouter
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </DashboardLayout>
  )
}
