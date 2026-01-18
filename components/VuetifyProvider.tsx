'use client'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
    },
    secondary: {
      main: '#424242',
    },
    success: {
      main: '#4CAF50',
    },
    error: {
      main: '#FF5252',
    },
    warning: {
      main: '#FB8C00',
    },
  },
})

export default function VuetifyProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
