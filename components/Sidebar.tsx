'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Toolbar,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material'

const drawerWidth = 240

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Transactions', icon: <WalletIcon />, path: '/transactions' },
  { text: 'Revenus', icon: <TrendingUpIcon />, path: '/income' },
  { text: 'Dépenses', icon: <TrendingDownIcon />, path: '/expenses' },
  { text: 'Catégories', icon: <CategoryIcon />, path: '/categories' },
  { text: 'Rapports', icon: <AssessmentIcon />, path: '/reports' },
  { text: 'Paramètres', icon: <SettingsIcon />, path: '/settings' },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  
  const drawer = (
    <div>
      <Toolbar
        sx={{
          backgroundColor: '#1976D2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" noWrap component="div">
          💰 Budget App
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                href={item.path}
                selected={isActive}
                onClick={onClose}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    borderLeft: '4px solid #1976D2',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#1976D2' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          Version 1.0.0
        </Typography>
      </Box>
    </div>
  )

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        display: { xs: 'block', sm: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: drawerWidth,
        },
      }}
    >
      {drawer}
    </Drawer>
  )
}

export function PermanentSidebar({ open }: { open: boolean }) {
  const pathname = usePathname()
  
  const drawer = (
    <div>
      <Toolbar
        sx={{
          backgroundColor: '#1976D2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" noWrap component="div">
          💰 Budget App
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                href={item.path}
                selected={isActive}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    borderLeft: '4px solid #1976D2',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? '#1976D2' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          Version 1.0.0
        </Typography>
      </Box>
    </div>
  )

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: 'none', sm: 'block' },
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      open
    >
      {drawer}
    </Drawer>
  )
}

export { drawerWidth }
