'use client'

import { useEffect, useState } from 'react'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Toolbar,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
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

export default function ExpensesPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const { notifyTransaction } = useNotifications()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([])
  const [dialog, setDialog] = useState(false)
  const [classificationDialog, setClassificationDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [selectedIncomeSource, setSelectedIncomeSource] = useState('')
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
      const [transRes, catRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories')
      ])
      const transData = await transRes.json()
      const catData = await catRes.json()
      
      const expenseTransactions = transData.filter((t: Transaction) => t.type === 'expense')
      const incomeTrans = transData.filter((t: Transaction) => t.type === 'income')
      setTransactions(expenseTransactions)
      setIncomeTransactions(incomeTrans)
      setCategories(catData.filter((c: Category) => c.type === 'expense'))
      // Charger les catégories de revenus pour le formulaire d'ajout
      const incomeCats = catData.filter((c: Category) => c.type === 'income')
      setIncomeCategories(incomeCats)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          type: 'expense', 
          currency: formData.currency,
          income_source: formData.income_source || undefined
        })
      })
      
      if (response.ok) {
        // Envoyer une notification
        notifyTransaction(
          'expense',
          parseFloat(formData.amount),
          formData.currency,
          formData.description || formData.category
        )
        
        setDialog(false)
        setFormData({
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
      message: 'Êtes-vous sûr de vouloir supprimer cette dépense?',
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
            message: 'Erreur lors de la suppression de la dépense',
            type: 'error',
            onConfirm: undefined,
            showCancel: false
          })
        }
      },
      showCancel: true
    })
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setSelectedIncomeSource(transaction.income_source || '')
    setClassificationDialog(true)
  }

  const handleUpdateIncomeSource = async () => {
    if (!selectedTransaction) return
    
    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedTransaction,
          income_source: selectedIncomeSource || undefined
        })
      })
      
      if (response.ok) {
        setClassificationDialog(false)
        setSelectedTransaction(null)
        setSelectedIncomeSource('')
        loadData()
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  const totalExpenses = transactions.reduce((sum, t) => {
    const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
    const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
    return sum + convertedAmount
  }, 0)
  const expensesByCategory = transactions.reduce((acc, t) => {
    const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
    const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
    acc[t.category] = (acc[t.category] || 0) + convertedAmount
    return acc
  }, {} as Record<string, number>)

  const expensesByIncomeSource = transactions
    .filter(t => t.income_source)
    .reduce((acc, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
      const source = t.income_source || 'Non spécifié'
      if (!acc[source]) {
        acc[source] = 0
      }
      acc[source] += convertedAmount
      return acc
    }, {} as Record<string, number>)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
        <Toolbar sx={{ mb: 3, px: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Dépenses
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Ajouter une dépense
          </Button>
        </Toolbar>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Total des dépenses
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(totalExpenses)}
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Nombre de transactions
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {transactions.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Dépense moyenne
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {transactions.length > 0
                    ? formatCurrency(totalExpenses / transactions.length)
                    : formatCurrency(0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Liste des dépenses
              </Typography>
              {transactions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    Aucune dépense enregistrée
                  </Typography>
                </Box>
              ) : (
                <List>
                  {transactions.map((transaction, index) => (
                    <Box key={transaction.id}>
                      <ListItem
                        onClick={() => handleTransactionClick(transaction)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                {transaction.description || transaction.category}
                              </Typography>
                              <Chip label={transaction.category} size="small" variant="outlined" />
                            </Box>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                              <CalendarIcon sx={{ fontSize: 14 }} />
                              <Typography component="span" variant="caption" color="text.secondary">
                                {new Date(transaction.date).toLocaleDateString('fr-FR')}
                              </Typography>
                              {transaction.income_source && (
                                <>
                                  <Typography component="span" variant="caption" color="text.secondary">•</Typography>
                                  <Chip 
                                    label={`Source: ${transaction.income_source}`} 
                                    size="small" 
                                    variant="outlined"
                                    color="success"
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                </>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 700 }}>
                                -{formatCurrency(transaction.amount, (transaction.currency || 'MGA') as Currency)}
                              </Typography>
                              {transaction.currency !== mainCurrency && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(transaction.id)
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < transactions.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                    </Box>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Par catégorie
              </Typography>
              {Object.entries(expensesByCategory).map(([category, amount]) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{category}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(amount)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
            {Object.keys(expensesByIncomeSource).length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Par source de revenu
                </Typography>
                {Object.entries(expensesByIncomeSource).map(([source, amount]) => (
                  <Box key={source} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        <Chip 
                          label={source} 
                          size="small" 
                          color="success"
                          variant="outlined"
                          sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                        />
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(amount)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}
          </Grid>
        </Grid>

        <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>Ajouter une dépense</DialogTitle>
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
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Montant"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                fullWidth
                margin="normal"
                inputProps={{ step: '0.01', min: '0' }}
                required
              />
              <TextField
                select
                label="Devise"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
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
              <TextField
                select
                label="Source de revenu (optionnel)"
                value={formData.income_source}
                onChange={(e) => setFormData({ ...formData, income_source: e.target.value })}
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
              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(false)}>Annuler</Button>
              <Button type="submit" variant="contained">Ajouter</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog de classification par source de revenu */}
        <Dialog 
          open={classificationDialog} 
          onClose={() => {
            setClassificationDialog(false)
            setSelectedTransaction(null)
            setSelectedIncomeSource('')
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Classifier la dépense
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedTransaction && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Dépense sélectionnée
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedTransaction.description || selectedTransaction.category}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={selectedTransaction.category} size="small" variant="outlined" />
                    <Chip 
                      label={formatCurrency(
                        selectedTransaction.amount, 
                        (selectedTransaction.currency || 'MGA') as Currency
                      )} 
                      size="small" 
                      color="error"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(selectedTransaction.date).toLocaleDateString('fr-FR')}
                  </Typography>
                </Paper>
              </Box>
            )}
            <TextField
              select
              label="Source de revenu"
              value={selectedIncomeSource}
              onChange={(e) => setSelectedIncomeSource(e.target.value)}
              fullWidth
              margin="normal"
              helperText="Sélectionnez le revenu qui finance cette dépense"
            >
              <MenuItem value="">
                <em>Aucune source</em>
              </MenuItem>
              {incomeTransactions.map((income) => (
                <MenuItem key={income.id} value={income.description || income.category}>
                  {income.description || income.category}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setClassificationDialog(false)
                setSelectedTransaction(null)
                setSelectedIncomeSource('')
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateIncomeSource}
              variant="contained"
              color="primary"
            >
              Enregistrer
            </Button>
          </DialogActions>
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
