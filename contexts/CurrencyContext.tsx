'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Currency = 'MGA' | 'RMB'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatCurrency: (amount: number, displayCurrency?: Currency) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('MGA')

  // Charger la devise depuis localStorage au démarrage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency') as Currency | null
    if (savedCurrency && (savedCurrency === 'MGA' || savedCurrency === 'RMB')) {
      setCurrencyState(savedCurrency)
    }
  }, [])

  // Sauvegarder la devise dans localStorage
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency)
    localStorage.setItem('currency', newCurrency)
  }

  const formatCurrency = (amount: number, displayCurrency?: 'MGA' | 'RMB'): string => {
    const curr = displayCurrency || currency
    if (curr === 'MGA') {
      return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ar`
    } else if (curr === 'RMB') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return amount.toLocaleString('fr-FR')
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
