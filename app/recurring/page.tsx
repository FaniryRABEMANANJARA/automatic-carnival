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
  Switch,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Repeat as RepeatIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { convertToMGA, convertCurrency, type Currency } from '@/lib/currency'

interface RecurringTransaction {
  id: number
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  currency: 'MGA' | 'RMB'
  day_of_month: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string
}

export default function RecurringPage() {
  const { formatCurrency, currency: mainCurrency } = useCurrency()
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dialog, setDialog] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)
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
    day_of_month: 1,
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [recurringRes, categoriesRes] = await Promise.all([
        fetch('/api/recurring'),
        fetch('/api/categories')
      ])
      const recurringData = await recurringRes.json()
      const categoriesData = await categoriesRes.json()
      setRecurringTransactions(recurringData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingRecurring
        ? `/api/recurring/${editingRecurring.id}`
        : '/api/recurring'
      
      const method = editingRecurring ? 'PUT' : 'POST'
      
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
      setEditingRecurring(null)
      setFormData({
        type: 'expense',
        category: '',
        description: '',
        amount: '',
        currency: 'MGA',
        day_of_month: 1,
        is_active: true
      })
      loadData()
    } catch (error) {
      console.error('Error saving recurring transaction:', error)
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
      message: 'Êtes-vous sûr de vouloir supprimer cette charge fixe?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/recurring/${id}`, {
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
          console.error('Error deleting recurring transaction:', error)
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

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
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
      console.error('Error toggling active status:', error)
    }
  }

  const handleGenerate = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      
      const response = await fetch('/api/recurring/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonth, year: currentYear })
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
      
      setAlertDialog({
        open: true,
        title: 'Succès',
        message: `${data.count} transaction(s) générée(s) pour ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
        type: 'info',
        onConfirm: undefined,
        showCancel: false
      })
    } catch (error) {
      console.error('Error generating transactions:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de la génération des transactions',
        type: 'error',
        onConfirm: undefined,
        showCancel: false
      })
    }
  }

  const handleOpenDialog = (recurring?: RecurringTransaction) => {
    if (recurring) {
      setEditingRecurring(recurring)
      setFormData({
        type: recurring.type,
        category: recurring.category,
        description: recurring.description,
        amount: recurring.amount.toString(),
        currency: recurring.currency,
        day_of_month: recurring.day_of_month,
        is_active: recurring.is_active
      })
    } else {
      setEditingRecurring(null)
      setFormData({
        type: 'expense',
        category: '',
        description: '',
        amount: '',
        currency: 'MGA',
        day_of_month: 1,
        is_active: true
      })
    }
    setDialog(true)
  }

  const filteredCategories = categories.filter(c => c.type === formData.type)

  const activeRecurring = recurringTransactions.filter(r => r.is_active)
  const inactiveRecurring = recurringTransactions.filter(r => !r.is_active)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          <Toolbar sx={{ mb: 3, px: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Charges fixes mensuelles
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RepeatIcon />}
              onClick={handleGenerate}
              sx={{ mr: 2, borderRadius: 2 }}
            >
              Générer ce mois
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ borderRadius: 2 }}
            >
              Nouvelle charge fixe
            </Button>
          </Toolbar>

          {recurringTransactions.length === 0 ? (
            <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
              <RepeatIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucune charge fixe définie
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Créez vos premières charges fixes mensuelles (loyer, salaire, etc.)
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Créer une charge fixe
              </Button>
            </Paper>
          ) : (
            <>
              {activeRecurring.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Charges fixes actives
                  </Typography>
                  <List>
                    {activeRecurring.map((recurring, index) => {
                      const category = categories.find(c => c.name === recurring.category)
                      const amountInMGA = convertToMGA(recurring.amount, recurring.currency)
                      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
                      
                      return (
                        <Box key={recurring.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                    {recurring.description || recurring.category}
                                  </Typography>
                                  {category && (
                                    <Chip
                                      label={recurring.category}
                                      size="small"
                                      sx={{
                                        backgroundColor: category.color,
                                        color: 'white',
                                      }}
                                    />
                                  )}
                                  {!category && (
                                    <Chip label={recurring.category} size="small" variant="outlined" />
                                  )}
                                  <Chip
                                    label={recurring.type === 'income' ? 'Revenu' : 'Dépense'}
                                    size="small"
                                    color={recurring.type === 'income' ? 'success' : 'error'}
                                    variant="outlined"
                                  />
                                </Box>
                              }
                              secondary={
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    {formatCurrency(convertedAmount, mainCurrency)}
                                  </Typography>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    • Jour {recurring.day_of_month} du mois
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleActive(recurring.id, recurring.is_active)}
                                  color="primary"
                                  title="Désactiver"
                                >
                                  <PauseIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(recurring)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(recurring.id)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < activeRecurring.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                        </Box>
                      )
                    })}
                  </List>
                </Paper>
              )}

              {inactiveRecurring.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Charges fixes inactives
                  </Typography>
                  <List>
                    {inactiveRecurring.map((recurring, index) => {
                      const category = categories.find(c => c.name === recurring.category)
                      const amountInMGA = convertToMGA(recurring.amount, recurring.currency)
                      const convertedAmount = convertCurrency(amountInMGA, 'MGA', mainCurrency)
                      
                      return (
                        <Box key={recurring.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 500, opacity: 0.6 }}>
                                    {recurring.description || recurring.category}
                                  </Typography>
                                  {category && (
                                    <Chip
                                      label={recurring.category}
                                      size="small"
                                      sx={{
                                        backgroundColor: category.color,
                                        color: 'white',
                                        opacity: 0.6,
                                      }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    {formatCurrency(convertedAmount, mainCurrency)}
                                  </Typography>
                                  <Typography component="span" variant="body2" color="text.secondary">
                                    • Jour {recurring.day_of_month} du mois
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleActive(recurring.id, recurring.is_active)}
                                  color="success"
                                  title="Activer"
                                >
                                  <PlayIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(recurring)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(recurring.id)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < inactiveRecurring.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                        </Box>
                      )
                    })}
                  </List>
                </Paper>
              )}
            </>
          )}

          <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
              <DialogTitle>
                {editingRecurring ? 'Modifier la charge fixe' : 'Nouvelle charge fixe'}
              </DialogTitle>
              <DialogContent>
                <TextField
                  select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense', category: '' })}
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
                  {filteredCategories.map((cat) => (
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
                  placeholder="Ex: Loyer, Salaire, Abonnement..."
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
                <TextField
                  label="Jour du mois"
                  type="number"
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })}
                  fullWidth
                  margin="normal"
                  required
                  inputProps={{ min: 1, max: 31 }}
                  helperText="Jour du mois où la transaction sera créée (1-31)"
                />
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      Activer cette charge fixe
                    </Typography>
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialog(false)}>Annuler</Button>
                <Button type="submit" variant="contained">
                  {editingRecurring ? 'Modifier' : 'Créer'}
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
