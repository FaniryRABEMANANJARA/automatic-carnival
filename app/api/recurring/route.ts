import { NextRequest, NextResponse } from 'next/server'
import { getRecurringTransactions, createRecurringTransaction, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const recurringTransactions = await getRecurringTransactions()
    return NextResponse.json(recurringTransactions)
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { type, category, description, amount, currency, day_of_month, is_active } = body

    if (!type || !category || !amount || !currency || !day_of_month) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (day_of_month < 1 || day_of_month > 31) {
      return NextResponse.json(
        { error: 'Day of month must be between 1 and 31' },
        { status: 400 }
      )
    }

    const newRecurring = await createRecurringTransaction({
      type,
      category,
      description: description || '',
      amount: parseFloat(amount),
      currency,
      day_of_month: parseInt(day_of_month),
      is_active: is_active !== undefined ? is_active : true,
    })
    
    return NextResponse.json(newRecurring, { status: 201 })
  } catch (error: any) {
    console.error('Error creating recurring transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create recurring transaction' },
      { status: 500 }
    )
  }
}
