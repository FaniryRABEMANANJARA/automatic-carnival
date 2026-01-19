import { NextRequest, NextResponse } from 'next/server'
import { getBudgets, createBudget, initDatabase } from '@/lib/db-postgres-pg'

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
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    
    const budgets = await getBudgets(month, year)
    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { category, amount, currency, month, year } = body

    if (!category || !amount || !currency || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      )
    }

    const newBudget = await createBudget({
      category,
      amount: parseFloat(amount),
      currency,
      month: parseInt(month),
      year: parseInt(year),
    })
    
    return NextResponse.json(newBudget, { status: 201 })
  } catch (error: any) {
    console.error('Error creating budget:', error)
    if (error.message && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Un budget existe déjà pour cette catégorie, ce mois et cette année' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    )
  }
}
