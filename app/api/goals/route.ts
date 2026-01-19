import { NextRequest, NextResponse } from 'next/server'
import { getGoals, createGoal, initDatabase } from '@/lib/db-postgres-pg'

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
    const goals = await getGoals()
    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { name, target_amount, current_amount, currency, target_date, is_completed } = body

    if (!name || !target_amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const newGoal = await createGoal({
      name,
      target_amount: parseFloat(target_amount),
      current_amount: current_amount ? parseFloat(current_amount) : 0,
      currency,
      target_date: target_date || undefined,
      is_completed: is_completed !== undefined ? is_completed : false,
    })
    
    return NextResponse.json(newGoal, { status: 201 })
  } catch (error: any) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    )
  }
}
