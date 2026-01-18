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
  TrendingUp as TrendingUpIcon,
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

export default function IncomePage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const { notifyTransaction } = useNotifications()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dialog, setDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [editDescription, setEditDescription] = useState('')
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
      
      const incomeTransactions = transData.filter((t: Transaction) => t.type === 'income')
      setTransactions(incomeTransactions)
      setCategories(catData.filter((c: Category) => c.type === 'income'))
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
        body: JSON.stringify({ ...formData, type: 'income', currency: formData.currency })
      })
      
      if (response.ok) {
        // Envoyer une notification
        notifyTransaction(
          'income',
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
      message: 'Êtes-vous sûr de vouloir supprimer ce revenu?',
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
            message: 'Erreur lors de la suppression du revenu',
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
    setEditDescription(transaction.description || '')
    setEditDialog(true)
  }

  const handleUpdateDescription = async () => {
    if (!selectedTransaction) return
    
    try {
      const response = await fetch(`/api/transactions/${selectedTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedTransaction,
          description: editDescription
        })
      })
      
      if (response.ok) {
        setEditDialog(false)
        setSelectedTransaction(null)
        setEditDescription('')
        loadData()
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  const totalIncome = transactions.reduce((sum, t) => {
    const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
    const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
    return sum + convertedAmount
  }, 0)
  const incomeByCategory = transactions.reduce((acc, t) => {
    const amountInMGA = convertToMGA(t.amount, t.currency || 'MGA')
    const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
    acc[t.category] = (acc[t.category] || 0) + convertedAmount
    return acc
  }, {} as Record<string, number>)

  return (
    <DashboardLayout>
      <Box>
        <Toolbar sx={{ mb: 3, px: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Revenus
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Ajouter un revenu
          </Button>
        </Toolbar>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Total des revenus
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(totalIncome)}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.8 }} />
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
                  Revenu moyen
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {transactions.length > 0
                    ? formatCurrency(totalIncome / transactions.length)
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
                Liste des revenus
              </Typography>
              {transactions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    Aucun revenu enregistré
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <CalendarIcon sx={{ fontSize: 14 }} />
                              {new Date(transaction.date).toLocaleDateString('fr-FR')}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 700 }}>
                                +{formatCurrency(transaction.amount, (transaction.currency || 'MGA') as Currency)}
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
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Par catégorie
              </Typography>
              {Object.entries(incomeByCategory).map(([category, amount]) => (
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
          </Grid>
        </Grid>

        <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>Ajouter un revenu</DialogTitle>
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

        {/* Dialog d'édition du nom */}
        <Dialog 
          open={editDialog} 
          onClose={() => {
            setEditDialog(false)
            setSelectedTransaction(null)
            setEditDescription('')
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Modifier le nom du revenu
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedTransaction && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Informations de la transaction
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={selectedTransaction.category} size="small" variant="outlined" />
                    <Chip 
                      label={formatCurrency(
                        selectedTransaction.amount, 
                        (selectedTransaction.currency || 'MGA') as Currency
                      )} 
                      size="small" 
                      color="success"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(selectedTransaction.date).toLocaleDateString('fr-FR')}
                  </Typography>
                </Paper>
              </Box>
            )}
            <TextField
              label="Nom / Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              margin="normal"
              placeholder="Entrez le nom ou la description du revenu"
              helperText="Modifiez le nom de cette transaction de revenu"
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setEditDialog(false)
                setSelectedTransaction(null)
                setEditDescription('')
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateDescription}
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
  )
}
