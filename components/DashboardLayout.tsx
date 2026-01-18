'use client'

import { useState } from 'react'
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material'
import Header from './Header'
import Sidebar, { PermanentSidebar, drawerWidth } from './Sidebar'
import Footer from './Footer'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onMenuClick={handleDrawerToggle} drawerOpen={mobileOpen} />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isMobile && <PermanentSidebar open={true} />}
        {isMobile && <Sidebar open={mobileOpen} onClose={handleDrawerToggle} />}
        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            backgroundColor: '#f5f5f5',
            minHeight: 0,
          }}
        >
          <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            <Toolbar />
            {children}
          </Box>
          <Footer />
        </Box>
      </Box>
    </Box>
  )
}
