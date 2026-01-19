'use client'

import { useState } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Grid, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  GitHub as GitHubIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Category as CategoryIcon,
  Repeat as RepeatIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#f5f5f5',
        borderTop: '1px solid #e0e0e0',
        mt: 'auto',
        py: 4,
        width: '100%',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
              Gestion Budgétaire
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestion budgétaire mensuelle pour suivre dépenses.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
              Liens rapides
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link 
                component="button"
                onClick={() => setAboutOpen(true)}
                color="text.secondary" 
                sx={{ 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main',
                  },
                }}
              >
                À propos
              </Link> 
              <Link 
                component="button"
                onClick={() => setSupportOpen(true)}
                color="text.secondary"
                sx={{ 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main',
                  },
                }}
              >
                Support
              </Link>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
              Contact
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Link href="https://github.com/FaniryRABEMANANJARA" color="text.secondary" sx={{ textDecoration: 'none' }}>
                <IconButton
                  color="default"
                  size="small"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      color: 'primary.main',
                    },
                  }}
                >
                  <GitHubIcon />
                </IconButton>
              </Link>
              <Link href="mailto:faniry.zo.rabemananjarafaniry@gmail.com" color="text.secondary" sx={{ textDecoration: 'none' }}>
                <IconButton
                  color="default"
                  size="small"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      color: 'primary.main',
                    },
                  }}
                >
                  <EmailIcon />
                </IconButton>
              </Link>
              <Link href="https://www.linkedin.com/in/faniryzorabemananjara/" color="text.secondary" sx={{ textDecoration: 'none' }}>
                <IconButton
                  color="default"
                  size="small"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      color: 'primary.main',
                    },
                  }}
                >
                  <LinkedInIcon />
                </IconButton>
              </Link>
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            © {currentYear} Gestion Budgétaire. Tous droits réservés.
          </Typography>
        </Box>
      </Container>

      {/* Dialog À propos */}
      <Dialog 
        open={aboutOpen} 
        onClose={() => setAboutOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          <Typography variant="h6" component="span">
            À propos de l'application
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ mb: 3 }}>
            <strong>Gestion Budgétaire</strong> est une application web moderne et intuitive 
            conçue pour vous aider à gérer efficacement vos finances personnelles. 
            Suivez vos revenus et dépenses, planifiez vos budgets et atteignez vos objectifs financiers.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
            Fonctionnalités principales
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <AccountBalanceIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Gestion des transactions"
                secondary="Enregistrez et suivez tous vos revenus et dépenses avec facilité"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CategoryIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Catégorisation intelligente"
                secondary="Organisez vos transactions par catégories personnalisables"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TrendingUpIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Budgets mensuels"
                secondary="Définissez et suivez vos budgets par catégorie et par mois"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <NotificationsIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Alertes budgétaires"
                secondary="Recevez des notifications lorsque vous approchez de vos limites"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <RepeatIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Transactions récurrentes"
                secondary="Automatisez vos transactions régulières (salaires, loyers, etc.)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <AssessmentIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Rapports et analyses"
                secondary="Visualisez vos tendances financières avec des graphiques détaillés"
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
            Technologies utilisées
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Cette application est construite avec <strong>Next.js 14</strong>, <strong>React</strong>, 
            <strong>TypeScript</strong>, <strong>Material-UI</strong>, et <strong>PostgreSQL</strong> 
            pour une expérience utilisateur optimale et des performances élevées.
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            Version 1.0.0 - Développé avec ❤️ pour une meilleure gestion financière
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)} variant="contained" color="primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Support */}
      <Dialog 
        open={supportOpen} 
        onClose={() => setSupportOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpIcon color="primary" />
          <Typography variant="h6" component="span">
            Support et Aide
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ mb: 3 }}>
            Besoin d'aide ? Nous sommes là pour vous accompagner dans l'utilisation de l'application.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2, fontWeight: 600 }}>
            Questions fréquentes
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Comment ajouter une transaction ?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Allez dans la section "Transactions" et cliquez sur le bouton "Nouvelle transaction". 
              Remplissez les informations (type, catégorie, montant, date) et enregistrez.
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
              Comment créer un budget ?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Dans la section "Budgets", sélectionnez un mois et une catégorie, puis définissez 
              le montant maximum que vous souhaitez dépenser.
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
              Comment configurer des transactions récurrentes ?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Allez dans "Transactions récurrentes" et créez une nouvelle transaction récurrente. 
              L'application générera automatiquement ces transactions chaque mois.
            </Typography>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
              Comment changer la devise d'affichage ?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Utilisez le sélecteur de devise dans l'en-tête de l'application pour basculer entre 
              MGA (Ariary) et RMB (Yuan chinois).
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
            Contactez-nous
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Email"
                secondary={
                  <Link href="mailto:faniry.zo.rabemananjarafaniry@gmail.com" color="primary">
                    faniry.zo.rabemananjarafaniry@gmail.com
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <GitHubIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="GitHub"
                secondary={
                  <Link href="https://github.com/FaniryRABEMANANJARA" target="_blank" rel="noopener" color="primary">
                    github.com/FaniryRABEMANANJARA
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <LinkedInIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="LinkedIn"
                secondary={
                  <Link href="https://www.linkedin.com/in/faniryzorabemananjara/" target="_blank" rel="noopener" color="primary">
                    linkedin.com/in/faniryzorabemananjara
                  </Link>
                }
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>💡 Astuce :</strong> Consultez régulièrement vos rapports pour identifier 
              vos tendances de dépenses et optimiser votre budget.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupportOpen(false)} variant="contained" color="primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
