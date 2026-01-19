import { NextRequest, NextResponse } from 'next/server'
import { getBudgetById, updateBudget, deleteBudget, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      )
    }

    const budget = await getBudgetById(id)
    
    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { category, amount, currency, month, year } = body

    const updateData: any = {}
    if (category !== undefined) updateData.category = category
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (currency !== undefined) updateData.currency = currency
    if (month !== undefined) {
      const monthNum = parseInt(month)
      if (monthNum < 1 || monthNum > 12) {
        return NextResponse.json(
          { error: 'Month must be between 1 and 12' },
          { status: 400 }
        )
      }
      updateData.month = monthNum
    }
    if (year !== undefined) updateData.year = parseInt(year)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updatedBudget = await updateBudget(id, updateData)
    return NextResponse.json(updatedBudget)
  } catch (error: any) {
    console.error('Error updating budget:', error)
    if (error.message === 'Budget not found') {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDbInitialized()
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid budget ID' },
        { status: 400 }
      )
    }

    const deleted = await deleteBudget(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}
