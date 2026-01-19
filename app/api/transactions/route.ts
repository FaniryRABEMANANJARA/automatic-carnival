import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, createTransaction, initDatabase } from '@/lib/db-postgres-pg'
import { requireAuth } from '@/lib/api-auth'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

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
    // Vérifier l'authentification
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

    await ensureDbInitialized()
    const body = await request.json()
    
    // Validation et sanitization des entrées
    const { validateTransactionInput } = await import('@/lib/security')
    const validation = validateTransactionInput({
      type: body.type,
      category: body.category,
      description: body.description,
      amount: body.amount,
      currency: body.currency || 'MGA',
      date: body.date,
      income_source: body.income_source,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      )
    }

    const newTransaction = await createTransaction(validation.sanitized!)
    
    return NextResponse.json({ id: newTransaction.id }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
