'use client'

import { useEffect, useState } from 'react'
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  InputAdornment,
  Pagination,
  Switch,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  CalendarToday as CalendarIcon,
  Repeat as RepeatIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
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

export default function TransactionsPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dialog, setDialog] = useState(false)
  const [recurringDialog, setRecurringDialog] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedTransactionForRecurring, setSelectedTransactionForRecurring] = useState<Transaction | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [page, setPage] = useState(1)
  const rowsPerPage = 10
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })
  const [recurringFormData, setRecurringFormData] = useState({
    day_of_month: new Date().getDate(),
    is_active: true
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
      const [transRes, catRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories')
      ])
      const transData = await transRes.json()
      const catData = await catRes.json()
      setTransactions(transData)
      setCategories(catData)
    } catch (error) {
      console.error('Error loading data:', error)
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

  const handleOpenDialog = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setFormData({
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        income_source: transaction.income_source || '',
        date: transaction.date
      })
      setDialog(true)
    } else {
      setEditingTransaction(null)
      setFormData({
        type: 'expense',
        category: '',
        description: '',
        amount: '',
        currency: 'MGA',
        income_source: '',
        date: new Date().toISOString().split('T')[0]
      })
      setDialog(true)
    }
  }

  const handleCloseDialog = () => {
    setDialog(false)
    setEditingTransaction(null)
    setFormData({
      type: 'expense',
      category: '',
      description: '',
      amount: '',
      currency: 'MGA',
      income_source: '',
      date: new Date().toISOString().split('T')[0]
    })
  }

  const handleOpenRecurringDialog = (transaction: Transaction) => {
    setSelectedTransactionForRecurring(transaction)
    setRecurringFormData({
      day_of_month: new Date(transaction.date).getDate(),
      is_active: true
    })
    setRecurringDialog(true)
  }

  const handleCloseRecurringDialog = () => {
    setRecurringDialog(false)
    setSelectedTransactionForRecurring(null)
    setRecurringFormData({
      day_of_month: new Date().getDate(),
      is_active: true
    })
  }

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTransactionForRecurring) return

    try {
      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedTransactionForRecurring.type,
          category: selectedTransactionForRecurring.category,
          description: selectedTransactionForRecurring.description || '',
          amount: selectedTransactionForRecurring.amount,
          currency: selectedTransactionForRecurring.currency,
          day_of_month: recurringFormData.day_of_month,
          is_active: recurringFormData.is_active,
        }),
      })

      if (response.ok) {
        handleCloseRecurringDialog()
        setAlertDialog({
          open: true,
          title: 'Succès',
          message: 'Charge fixe créée avec succès',
          type: 'info',
          showCancel: false,
          onConfirm: undefined,
        })
      } else {
        const error = await response.json()
        setAlertDialog({
          open: true,
          title: 'Erreur',
          message: error.error || 'Erreur lors de la création de la charge fixe',
          type: 'error',
          showCancel: false,
          onConfirm: undefined,
        })
      }
    } catch (error) {
      console.error('Error creating recurring transaction:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de la création de la charge fixe',
        type: 'error',
        showCancel: false,
        onConfirm: undefined,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingTransaction 
        ? `/api/transactions/${editingTransaction.id}`
        : '/api/transactions'
      const method = editingTransaction ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
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
        handleCloseDialog()
        setAlertDialog({
          open: true,
          title: 'Succès',
          message: editingTransaction 
            ? 'Transaction modifiée avec succès'
            : 'Transaction ajoutée avec succès',
          type: 'info',
          showCancel: false,
          onConfirm: undefined,
        })
      } else {
        const error = await response.json()
        setAlertDialog({
          open: true,
          title: 'Erreur',
          message: error.error || 'Erreur lors de l\'enregistrement de la transaction',
          type: 'error',
          showCancel: false,
          onConfirm: undefined,
        })
      }
    } catch (error) {
      console.error('Error saving transaction:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de l\'enregistrement de la transaction',
        type: 'error',
        showCancel: false,
        onConfirm: undefined,
      })
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || transaction.type === filterType
    return matchesSearch && matchesType
  })

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  )

  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
        <Toolbar sx={{ mb: 3, px: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Transactions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2 }}
          >
            Nouvelle transaction
          </Button>
        </Toolbar>

        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <TextField
              select
              label="Filtrer par type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">Tous</MenuItem>
              <MenuItem value="income">Revenus</MenuItem>
              <MenuItem value="expense">Dépenses</MenuItem>
            </TextField>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Catégorie</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source revenu</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Montant</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Aucune transaction trouvée
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={transaction.type === 'income' ? <ArrowDownIcon /> : <ArrowUpIcon />}
                          label={transaction.type === 'income' ? 'Revenu' : 'Dépense'}
                          color={transaction.type === 'income' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={transaction.category} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>{transaction.description || '-'}</TableCell>
                      <TableCell>
                        {transaction.type === 'expense' && transaction.income_source ? (
                          <Chip 
                            label={transaction.income_source} 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            color: transaction.type === 'income' ? 'success.main' : 'error.main',
                          }}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount, (transaction.currency || 'MGA') as Currency)}
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
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenRecurringDialog(transaction)}
                            color="secondary"
                            title="Ajouter aux charges fixes"
                          >
                            <RepeatIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(transaction)}
                            color="primary"
                            title="Modifier"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(transaction.id)}
                            color="error"
                            title="Supprimer"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        <Dialog open={dialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </DialogTitle>
            <DialogContent>
              <TextField
                select
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  type: e.target.value as 'income' | 'expense',
                  category: '',
                  income_source: e.target.value === 'income' ? '' : formData.income_source,
                })}
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

              {formData.currency !== mainCurrency && formData.amount && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
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
              <Button onClick={handleCloseDialog}>Annuler</Button>
              <Button type="submit" variant="contained">
                {editingTransaction ? 'Modifier' : 'Ajouter'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={recurringDialog} onClose={handleCloseRecurringDialog} maxWidth="sm" fullWidth>
          <form onSubmit={handleCreateRecurring}>
            <DialogTitle>
              Ajouter aux charges fixes mensuelles
            </DialogTitle>
            <DialogContent>
              {selectedTransactionForRecurring && (
                <>
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Transaction sélectionnée:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedTransactionForRecurring.description || selectedTransactionForRecurring.category}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Catégorie: {selectedTransactionForRecurring.category}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Montant: {formatCurrency(
                          selectedTransactionForRecurring.amount,
                          selectedTransactionForRecurring.currency
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  <TextField
                    label="Jour du mois"
                    type="number"
                    value={recurringFormData.day_of_month}
                    onChange={(e) => setRecurringFormData({ 
                      ...recurringFormData, 
                      day_of_month: parseInt(e.target.value) || 1 
                    })}
                    fullWidth
                    margin="normal"
                    required
                    inputProps={{ min: 1, max: 31 }}
                    helperText="Jour du mois où la transaction sera créée automatiquement (1-31)"
                  />

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        Activer cette charge fixe
                      </Typography>
                      <Switch
                        checked={recurringFormData.is_active}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecurringFormData({ 
                          ...recurringFormData, 
                          is_active: e.target.checked 
                        })}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Cette transaction sera automatiquement créée chaque mois au jour sélectionné.
                      Vous pourrez la modifier ou la désactiver depuis la page "Charges fixes".
                    </Typography>
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseRecurringDialog}>Annuler</Button>
              <Button type="submit" variant="contained" color="secondary">
                Créer la charge fixe
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
