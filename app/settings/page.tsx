'use client'

import { useState } from 'react'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Toolbar,
  Switch,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Backup as BackupIcon,
  DeleteForever as DeleteIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material'
import DashboardLayout from '@/components/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import AlertDialog from '@/components/AlertDialog'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useNotifications } from '@/hooks/useNotifications'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

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

export default function SettingsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { enabled, permission, enableNotifications, disableNotifications } = useNotifications()
  const [darkMode, setDarkMode] = useState(false)
  const { currency, setCurrency, formatCurrency } = useCurrency()
  const [language, setLanguage] = useState('fr')
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)
  const [loading, setLoading] = useState(false)
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error',
    onConfirm: undefined as (() => void) | undefined,
    showCancel: false
  })

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null)
  }

  const loadData = async () => {
    try {
      const [transRes, catRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories')
      ])
      const transData = await transRes.json()
      const catData = await catRes.json()
      return { transactions: transData, categories: catData }
    } catch (error) {
      console.error('Error loading data:', error)
      return { transactions: [], categories: [] }
    }
  }

  const exportToPDF = async () => {
    setLoading(true)
    handleExportMenuClose()
    try {
      const { transactions, categories } = await loadData()
      
      const doc = new jsPDF()
      
      // Titre
      doc.setFontSize(18)
      doc.text('Rapport Budgétaire', 14, 22)
      doc.setFontSize(10)
      doc.text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30)
      
      let yPosition = 40

      // Tableau des transactions
      const tableData = transactions.map((t: Transaction) => [
        t.type === 'income' ? 'Revenu' : 'Dépense',
        t.category,
        t.description || '-',
        `${t.amount.toLocaleString('fr-FR')} ${t.currency}`,
        new Date(t.date).toLocaleDateString('fr-FR'),
        t.income_source || '-'
      ])

      ;(doc as any).autoTable({
        head: [['Type', 'Catégorie', 'Description', 'Montant', 'Date', 'Source revenu']],
        body: tableData,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      })

      // Tableau des catégories
      const lastY = (doc as any).lastAutoTable.finalY || yPosition
      doc.setFontSize(14)
      doc.text('Catégories', 14, lastY + 20)
      
      const categoryData = categories.map((c: Category) => [
        c.name,
        c.type === 'income' ? 'Revenu' : 'Dépense',
        c.color
      ])

      ;(doc as any).autoTable({
        head: [['Nom', 'Type', 'Couleur']],
        body: categoryData,
        startY: lastY + 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      })

      // Statistiques
      const finalY = (doc as any).lastAutoTable.finalY || lastY + 25
      doc.setFontSize(14)
      doc.text('Statistiques', 14, finalY + 20)
      
      const totalIncome = transactions
        .filter((t: Transaction) => t.type === 'income')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
      const totalExpense = transactions
        .filter((t: Transaction) => t.type === 'expense')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
      const balance = totalIncome - totalExpense

      const statsData = [
        ['Total Revenus', `${totalIncome.toLocaleString('fr-FR')} MGA`],
        ['Total Dépenses', `${totalExpense.toLocaleString('fr-FR')} MGA`],
        ['Solde', `${balance.toLocaleString('fr-FR')} MGA`]
      ]

      ;(doc as any).autoTable({
        head: [['Statistique', 'Valeur']],
        body: statsData,
        startY: finalY + 25,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] }
      })

      doc.save(`rapport-budgetaire-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de l\'export PDF',
        type: 'error',
        onConfirm: undefined,
        showCancel: false
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = async () => {
    setLoading(true)
    handleExportMenuClose()
    try {
      const { transactions, categories } = await loadData()
      
      // Créer un nouveau workbook
      const workbook = XLSX.utils.book_new()

      // Feuille 1: Transactions
      const transactionsData = transactions.map((t: Transaction) => ({
        Type: t.type === 'income' ? 'Revenu' : 'Dépense',
        Catégorie: t.category,
        Description: t.description || '',
        Montant: t.amount,
        Devise: t.currency,
        Date: new Date(t.date).toLocaleDateString('fr-FR'),
        'Source revenu': t.income_source || ''
      }))
      const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData)
      XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions')

      // Feuille 2: Catégories
      const categoriesData = categories.map((c: Category) => ({
        Nom: c.name,
        Type: c.type === 'income' ? 'Revenu' : 'Dépense',
        Couleur: c.color
      }))
      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData)
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Catégories')

      // Feuille 3: Statistiques
      const totalIncome = transactions
        .filter((t: Transaction) => t.type === 'income')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
      const totalExpense = transactions
        .filter((t: Transaction) => t.type === 'expense')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
      const balance = totalIncome - totalExpense

      const statsData = [
        ['Statistique', 'Valeur'],
        ['Total Revenus', totalIncome],
        ['Total Dépenses', totalExpense],
        ['Solde', balance],
        ['Nombre de transactions', transactions.length],
        ['Nombre de catégories', categories.length]
      ]
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData)
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiques')

      // Générer le fichier Excel
      XLSX.writeFile(workbook, `rapport-budgetaire-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      setAlertDialog({
        open: true,
        title: 'Erreur',
        message: 'Erreur lors de l\'export Excel',
        type: 'error',
        onConfirm: undefined,
        showCancel: false
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
        <Toolbar sx={{ mb: 3, px: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, flexGrow: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Paramètres
          </Typography>
        </Toolbar>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Notifications
                </Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Activer les notifications"
                    secondary="Recevez des alertes pour vos transactions"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={enabled}
                      onChange={async (e) => {
                        if (e.target.checked) {
                          const granted = await enableNotifications()
                          // Ne pas afficher le dialog si la permission est 'default' (utilisateur a juste fermé la popup)
                          // Afficher seulement si la permission est explicitement 'denied'
                          if (!granted && permission === 'denied') {
                            setAlertDialog({
                              open: true,
                              title: 'Permission refusée',
                              message: 'Les notifications ont été refusées. Veuillez les autoriser dans les paramètres de votre navigateur. Sur iOS, les notifications du navigateur peuvent ne pas être disponibles.',
                              type: 'warning',
                              onConfirm: undefined,
                              showCancel: false
                            })
                          } else if (!granted && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                            // Sur iOS, les notifications peuvent ne pas être supportées
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                            if (isIOS) {
                              setAlertDialog({
                                open: true,
                                title: 'Notifications non disponibles',
                                message: 'Les notifications du navigateur ne sont pas disponibles sur iOS Safari. Veuillez utiliser un autre navigateur ou activer les notifications via les paramètres iOS.',
                                type: 'info',
                                onConfirm: undefined,
                                showCancel: false
                              })
                            }
                          }
                        } else {
                          disableNotifications()
                        }
                      }}
                      disabled={permission === 'denied'}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PaletteIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Apparence
                </Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Mode sombre"
                    secondary="Activer le thème sombre"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LanguageIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Préférences
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  select
                  label="Devise"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'MGA' | 'RMB')}
                  fullWidth
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="MGA">MGA (Ar) - Ariary malgache</option>
                  <option value="RMB">RMB (¥) - Yuan chinois</option>
                </TextField>
                <TextField
                  select
                  label="Langue"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  fullWidth
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </TextField>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BackupIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Données
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  startIcon={<BackupIcon />}
                  endIcon={<ArrowDropDownIcon />}
                  onClick={handleExportMenuOpen}
                  disabled={loading}
                >
                  Exporter les données
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportMenuClose}
                >
                  <MenuItem onClick={exportToPDF} disabled={loading}>
                    <PdfIcon sx={{ mr: 1, fontSize: 20 }} />
                    Exporter en PDF
                  </MenuItem>
                  <MenuItem onClick={exportToExcel} disabled={loading}>
                    <ExcelIcon sx={{ mr: 1, fontSize: 20 }} />
                    Exporter en Excel
                  </MenuItem>
                </Menu>
                <Button variant="outlined" fullWidth disabled={loading}>
                  Importer les données
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid #f44336' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DeleteIcon color="error" />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                  Zone de danger
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ces actions sont irréversibles. Veuillez être prudent.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setAlertDialog({
                    open: true,
                    title: 'Confirmation de suppression',
                    message: 'Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.',
                    type: 'warning',
                    onConfirm: () => {
                      setAlertDialog({
                        open: true,
                        title: 'Information',
                        message: 'Fonctionnalité à implémenter : Suppression de toutes les données',
                        type: 'info',
                        onConfirm: undefined,
                        showCancel: false
                      })
                    },
                    showCancel: true
                  })
                }}
              >
                Supprimer toutes les données
              </Button>
            </Paper>
          </Grid>
        </Grid>

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
