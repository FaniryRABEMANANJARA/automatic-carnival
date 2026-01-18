import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, createTransaction, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export async function GET() {
  try {
    await ensureDbInitialized()
    const transactions = await getTransactions()
    
    // Ajouter le champ currency par défaut pour les anciennes transactions
    const transactionsWithCurrency = transactions.map(t => ({
      ...t,
      currency: t.currency || 'MGA' as 'MGA' | 'RMB'
    }))
    
    return NextResponse.json(transactionsWithCurrency)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { type, category, description, amount, date, currency, income_source } = body

    if (!type || !category || !amount || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const transactionCurrency = currency || 'MGA'
    const newTransaction = await createTransaction({
      type,
      category,
      description: description || '',
      amount: parseFloat(amount),
      currency: transactionCurrency,
      date,
      income_source: type === 'expense' && income_source ? income_source : undefined,
    })
    
    return NextResponse.json({ id: newTransaction.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
