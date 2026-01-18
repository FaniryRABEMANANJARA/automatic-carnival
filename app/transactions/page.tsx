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
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ArrowDownward as ArrowDownIcon,
  ArrowUpward as ArrowUpIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
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
      setDialog(true)
    } else {
      setEditingTransaction(null)
      setDialog(true)
    }
  }

  const handleCloseDialog = () => {
    setDialog(false)
    setEditingTransaction(null)
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
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(transaction)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(transaction.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
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
      </Box>

      <AlertDialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
        onConfirm={alertDialog.onConfirm}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        showCancel={alertDialog.showCancel}
      />
    </DashboardLayout>
  )
}
