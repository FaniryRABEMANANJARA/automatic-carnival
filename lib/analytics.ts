import { convertToMGA, convertCurrency } from './currency'
import type { Transaction } from './db-postgres-pg'

export interface PeriodComparison {
  current: {
    income: number
    expense: number
    balance: number
    transactions: Transaction[]
  }
  previous: {
    income: number
    expense: number
    balance: number
    transactions: Transaction[]
  }
  growth: {
    income: number // Pourcentage de croissance
    expense: number
    balance: number
  }
}

export interface CategoryComparison {
  category: string
  current: number
  previous: number
  growth: number
}

/**
 * Calcule les statistiques pour une période donnée
 */
export function calculatePeriodStats(
  transactions: Transaction[],
  month: number,
  year: number,
  displayCurrency: 'MGA' | 'RMB' = 'MGA'
) {
  const periodTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date)
    return transactionDate.getMonth() + 1 === month &&
           transactionDate.getFullYear() === year
  })

  const income = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency)
      return sum + convertCurrency(amountInMGA, 'MGA', displayCurrency)
    }, 0)

  const expense = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => {
      const amountInMGA = convertToMGA(t.amount, t.currency)
      return sum + convertCurrency(amountInMGA, 'MGA', displayCurrency)
    }, 0)

  const balance = income - expense

  return {
    income,
    expense,
    balance,
    transactions: periodTransactions
  }
}

/**
 * Compare deux périodes (mois ou années)
 */
export function comparePeriods(
  transactions: Transaction[],
  currentMonth: number,
  currentYear: number,
  previousMonth: number,
  previousYear: number,
  displayCurrency: 'MGA' | 'RMB' = 'MGA'
): PeriodComparison {
  const current = calculatePeriodStats(transactions, currentMonth, currentYear, displayCurrency)
  const previous = calculatePeriodStats(transactions, previousMonth, previousYear, displayCurrency)

  const growth = {
    income: previous.income > 0 
      ? ((current.income - previous.income) / previous.income) * 100 
      : current.income > 0 ? 100 : 0,
    expense: previous.expense > 0 
      ? ((current.expense - previous.expense) / previous.expense) * 100 
      : current.expense > 0 ? 100 : 0,
    balance: previous.balance !== 0 
      ? ((current.balance - previous.balance) / Math.abs(previous.balance)) * 100 
      : current.balance !== 0 ? (current.balance > 0 ? 100 : -100) : 0,
  }

  return {
    current,
    previous,
    growth
  }
}

/**
 * Compare les catégories entre deux périodes
 */
export function compareCategories(
  transactions: Transaction[],
  currentMonth: number,
  currentYear: number,
  previousMonth: number,
  previousYear: number,
  type: 'income' | 'expense',
  displayCurrency: 'MGA' | 'RMB' = 'MGA'
): CategoryComparison[] {
  const currentStats = calculatePeriodStats(transactions, currentMonth, currentYear, displayCurrency)
  const previousStats = calculatePeriodStats(transactions, previousMonth, previousYear, displayCurrency)

  const currentByCategory: Record<string, number> = {}
  const previousByCategory: Record<string, number> = {}

  currentStats.transactions
    .filter(t => t.type === type)
    .forEach(t => {
      const amountInMGA = convertToMGA(t.amount, t.currency)
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', displayCurrency)
      currentByCategory[t.category] = (currentByCategory[t.category] || 0) + convertedAmount
    })

  previousStats.transactions
    .filter(t => t.type === type)
    .forEach(t => {
      const amountInMGA = convertToMGA(t.amount, t.currency)
      const convertedAmount = convertCurrency(amountInMGA, 'MGA', displayCurrency)
      previousByCategory[t.category] = (previousByCategory[t.category] || 0) + convertedAmount
    })

  const allCategories = new Set([
    ...Object.keys(currentByCategory),
    ...Object.keys(previousByCategory)
  ])

  return Array.from(allCategories).map(category => {
    const current = currentByCategory[category] || 0
    const previous = previousByCategory[category] || 0
    const growth = previous > 0 
      ? ((current - previous) / previous) * 100 
      : current > 0 ? 100 : 0

    return {
      category,
      current,
      previous,
      growth
    }
  }).sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))
}

/**
 * Calcule les statistiques pour plusieurs mois consécutifs
 */
export function calculateTrendData(
  transactions: Transaction[],
  months: number,
  displayCurrency: 'MGA' | 'RMB' = 'MGA'
) {
  const today = new Date()
  const data = []

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    
    const stats = calculatePeriodStats(transactions, month, year, displayCurrency)
    
    data.push({
      month,
      year,
      monthName: date.toLocaleString('fr-FR', { month: 'short' }),
      ...stats
    })
  }

  return data
}

/**
 * Calcule les statistiques pour plusieurs années consécutives
 */
export function calculateYearlyTrendData(
  transactions: Transaction[],
  years: number,
  displayCurrency: 'MGA' | 'RMB' = 'MGA'
) {
  const today = new Date()
  const data = []

  for (let i = years - 1; i >= 0; i--) {
    const year = today.getFullYear() - i
    
    const yearTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getFullYear() === year
    })

    const income = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const amountInMGA = convertToMGA(t.amount, t.currency)
        return sum + convertCurrency(amountInMGA, 'MGA', displayCurrency)
      }, 0)

    const expense = yearTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const amountInMGA = convertToMGA(t.amount, t.currency)
        return sum + convertCurrency(amountInMGA, 'MGA', displayCurrency)
      }, 0)

    const balance = income - expense
    
    data.push({
      year,
      income,
      expense,
      balance
    })
  }

  return data
}
