'use client'

import { Box, Container, Typography, Link, Grid, IconButton } from '@mui/material'
import {
  GitHub as GitHubIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material'

export default function Footer() {
  const currentYear = new Date().getFullYear()

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
                href="#" 
                color="text.secondary" 
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main',
                  },
                }}
              >
                À propos
              </Link>
              <Link 
                href="#" 
                color="text.secondary"
                sx={{ 
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.main',
                  },
                }}
              >
                Documentation
              </Link>
              <Link 
                href="#" 
                color="text.secondary"
                sx={{ 
                  textDecoration: 'none',
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
              <Link href="#" color="text.secondary" sx={{ textDecoration: 'none' }}>
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
              <Link href="#" color="text.secondary" sx={{ textDecoration: 'none' }}>
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
              <Link href="#" color="text.secondary" sx={{ textDecoration: 'none' }}>
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
    </Box>
  )
}
