import { NextRequest, NextResponse } from 'next/server'
import { getRecurringTransactionById, updateRecurringTransaction, deleteRecurringTransaction, initDatabase } from '@/lib/db-postgres-pg'

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
        { error: 'Invalid recurring transaction ID' },
        { status: 400 }
      )
    }

    const recurring = await getRecurringTransactionById(id)
    
    if (!recurring) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(recurring)
  } catch (error) {
    console.error('Error fetching recurring transaction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recurring transaction' },
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
        { error: 'Invalid recurring transaction ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type, category, description, amount, currency, day_of_month, is_active } = body

    const updateData: any = {}
    if (type !== undefined) updateData.type = type
    if (category !== undefined) updateData.category = category
    if (description !== undefined) updateData.description = description
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (currency !== undefined) updateData.currency = currency
    if (day_of_month !== undefined) {
      const day = parseInt(day_of_month)
      if (day < 1 || day > 31) {
        return NextResponse.json(
          { error: 'Day of month must be between 1 and 31' },
          { status: 400 }
        )
      }
      updateData.day_of_month = day
    }
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updatedRecurring = await updateRecurringTransaction(id, updateData)
    return NextResponse.json(updatedRecurring)
  } catch (error: any) {
    console.error('Error updating recurring transaction:', error)
    if (error.message === 'Recurring transaction not found') {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update recurring transaction' },
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
        { error: 'Invalid recurring transaction ID' },
        { status: 400 }
      )
    }

    const deleted = await deleteRecurringTransaction(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete recurring transaction' },
      { status: 500 }
    )
  }
}
