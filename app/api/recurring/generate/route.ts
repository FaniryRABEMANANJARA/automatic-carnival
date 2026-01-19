import { NextRequest, NextResponse } from 'next/server'
import { generateRecurringTransactionsForMonth, initDatabase } from '@/lib/db-postgres-pg'

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
    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      )
    }

    const generatedTransactions = await generateRecurringTransactionsForMonth(month, year)
    
    return NextResponse.json({
      success: true,
      count: generatedTransactions.length,
      transactions: generatedTransactions
    })
  } catch (error: any) {
    console.error('Error generating recurring transactions:', error)
    return NextResponse.json(
      { error: 'Failed to generate recurring transactions' },
      { status: 500 }
    )
  }
}
