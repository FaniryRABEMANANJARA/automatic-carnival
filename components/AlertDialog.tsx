'use client'

import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import { Warning as WarningIcon, Error as ErrorIcon, Info as InfoIcon } from '@mui/icons-material'

interface AlertDialogProps {
  open: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  type?: 'info' | 'warning' | 'error'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

export default function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Annuler',
  showCancel = false
}: AlertDialogProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <ErrorIcon color="error" sx={{ mr: 1 }} />
      case 'warning':
        return <WarningIcon color="warning" sx={{ mr: 1 }} />
      default:
        return <InfoIcon color="info" sx={{ mr: 1 }} />
    }
  }

  const getConfirmColor = () => {
    switch (type) {
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      default:
        return 'primary'
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        {getIcon()}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {showCancel && (
          <Button onClick={onClose} color="inherit">
            {cancelText}
          </Button>
        )}
        <Button onClick={handleConfirm} variant="contained" color={getConfirmColor()}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
