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
  Pagination,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Category as CategoryIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'

interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [dialog, setDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#1976D2'
  })
  const [incomePage, setIncomePage] = useState(1)
  const [expensePage, setExpensePage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'
      
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
      setEditingCategory(null)
      setFormData({ name: '', type: 'expense', color: '#1976D2' })
      setIncomePage(1)
      setExpensePage(1)
      loadData()
    } catch (error) {
      console.error('Error saving category:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de la sauvegarde de la catégorie',
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
      message: 'Êtes-vous sûr de vouloir supprimer cette catégorie?',
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/categories/${id}`, {
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
          
          setIncomePage(1)
          setExpensePage(1)
          loadData()
        } catch (error) {
          console.error('Error deleting category:', error)
          setAlertDialog({
            open: true,
            title: 'Erreur',
            message: 'Erreur lors de la suppression de la catégorie',
            type: 'error',
            onConfirm: undefined,
            showCancel: false
          })
        }
      },
      showCancel: true
    })
  }

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color
      })
    } else {
      setEditingCategory(null)
      setFormData({ name: '', type: 'expense', color: '#1976D2' })
    }
    setDialog(true)
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  // Pagination pour les revenus
  const incomeStartIndex = (incomePage - 1) * itemsPerPage
  const incomeEndIndex = incomeStartIndex + itemsPerPage
  const paginatedIncomeCategories = incomeCategories.slice(incomeStartIndex, incomeEndIndex)
  const totalIncomePages = Math.ceil(incomeCategories.length / itemsPerPage)

  // Pagination pour les dépenses
  const expenseStartIndex = (expensePage - 1) * itemsPerPage
  const expenseEndIndex = expenseStartIndex + itemsPerPage
  const paginatedExpenseCategories = expenseCategories.slice(expenseStartIndex, expenseEndIndex)
  const totalExpensePages = Math.ceil(expenseCategories.length / itemsPerPage)

  const colors = [
    '#1976D2', '#4CAF50', '#F44336', '#FF9800', '#9C27B0',
    '#E91E63', '#00BCD4', '#607D8B', '#795548', '#FF5722'
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
        <Toolbar sx={{ mb: 3, px: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Catégories
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ borderRadius: 2 }}
          >
            Nouvelle catégorie
          </Button>
        </Toolbar>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CategoryIcon color="success" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Catégories de revenus
                </Typography>
              </Box>
              {incomeCategories.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucune catégorie de revenu
                </Typography>
              ) : (
                <>
                  <List>
                    {paginatedIncomeCategories.map((category, index) => (
                      <Box key={category.id}>
                        <ListItem>
                          <Chip
                            label={category.name}
                            sx={{
                              backgroundColor: category.color,
                              color: 'white',
                              mr: 2,
                            }}
                          />
                          <ListItemText />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(category)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(category.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < paginatedIncomeCategories.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                      </Box>
                    ))}
                  </List>
                  {totalIncomePages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                      <Pagination
                        count={totalIncomePages}
                        page={incomePage}
                        onChange={(_, value) => setIncomePage(value)}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CategoryIcon color="error" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Catégories de dépenses
                </Typography>
              </Box>
              {expenseCategories.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucune catégorie de dépense
                </Typography>
              ) : (
                <>
                  <List>
                    {paginatedExpenseCategories.map((category, index) => (
                      <Box key={category.id}>
                        <ListItem>
                          <Chip
                            label={category.name}
                            sx={{
                              backgroundColor: category.color,
                              color: 'white',
                              mr: 2,
                            }}
                          />
                          <ListItemText />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(category)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(category.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < paginatedExpenseCategories.length - 1 && <Box sx={{ borderBottom: '1px solid #e0e0e0' }} />}
                      </Box>
                    ))}
                  </List>
                  {totalExpensePages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                      <Pagination
                        count={totalExpensePages}
                        page={expensePage}
                        onChange={(_, value) => setExpensePage(value)}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogContent>
              <TextField
                label="Nom"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                margin="normal"
                required
              />
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
                label="Couleur"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                fullWidth
                margin="normal"
                required
              >
                {colors.map((color) => (
                  <MenuItem key={color} value={color}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: '1px solid #ccc',
                        }}
                      />
                      {color}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(false)}>Annuler</Button>
              <Button type="submit" variant="contained">
                {editingCategory ? 'Modifier' : 'Créer'}
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
