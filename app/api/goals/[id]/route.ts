import { NextRequest, NextResponse } from 'next/server'
import { getGoalById, updateGoal, deleteGoal, initDatabase } from '@/lib/db-postgres-pg'

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
        { error: 'Invalid goal ID' },
        { status: 400 }
      )
    }

    const goal = await getGoalById(id)
    
    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error fetching goal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goal' },
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
        { error: 'Invalid goal ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, target_amount, current_amount, currency, target_date, is_completed } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (target_amount !== undefined) updateData.target_amount = parseFloat(target_amount)
    if (current_amount !== undefined) updateData.current_amount = parseFloat(current_amount)
    if (currency !== undefined) updateData.currency = currency
    if (target_date !== undefined) updateData.target_date = target_date || null
    if (is_completed !== undefined) updateData.is_completed = is_completed

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updatedGoal = await updateGoal(id, updateData)
    return NextResponse.json(updatedGoal)
  } catch (error: any) {
    console.error('Error updating goal:', error)
    if (error.message === 'Goal not found') {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update goal' },
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
        { error: 'Invalid goal ID' },
        { status: 400 }
      )
    }

    const deleted = await deleteGoal(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    )
  }
}
