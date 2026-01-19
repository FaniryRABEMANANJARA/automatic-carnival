import { NextRequest, NextResponse } from 'next/server'
import { getBudgets, getTransactions, createBudgetAlert, initDatabase } from '@/lib/db-postgres-pg'
import { convertToMGA, convertCurrency } from '@/lib/currency'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    
    // Récupérer les budgets et transactions du mois actuel
    const [budgets, transactions] = await Promise.all([
      getBudgets(currentMonth, currentYear),
      getTransactions()
    ])
    
    // Filtrer les transactions du mois actuel
    const monthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() + 1 === currentMonth &&
             transactionDate.getFullYear() === currentYear
    })
    
    // Calculer les dépenses par catégorie
    const expensesByCategory: Record<string, number> = {}
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const amountInMGA = convertToMGA(t.amount, t.currency)
        const convertedAmount = convertCurrency(amountInMGA, 'MGA', 'MGA')
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + convertedAmount
      })
    
    const newAlerts = []
    
    // Vérifier chaque budget
    for (const budget of budgets) {
      const spent = expensesByCategory[budget.category] || 0
      const budgetAmountInMGA = convertToMGA(budget.amount, budget.currency)
      const budgetAmount = convertCurrency(budgetAmountInMGA, 'MGA', 'MGA')
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
      
      // Créer une alerte si le budget est dépassé (100%+) ou proche (80%+)
      if (percentage >= 80) {
        const alert = await createBudgetAlert({
          budget_id: budget.id,
          category: budget.category,
          budget_amount: budgetAmount,
          spent_amount: spent,
          currency: 'MGA',
          month: currentMonth,
          year: currentYear,
          percentage: percentage,
          is_read: false,
        })
        newAlerts.push(alert)
      }
    }
    
    return NextResponse.json({
      success: true,
      newAlerts,
      count: newAlerts.length
    })
  } catch (error) {
    console.error('Error checking budget alerts:', error)
    return NextResponse.json(
      { error: 'Failed to check budget alerts' },
      { status: 500 }
    )
  }
}
