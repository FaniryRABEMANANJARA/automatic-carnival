import { NextRequest, NextResponse } from 'next/server'
import { updateTransaction, deleteTransaction, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureDbInitialized()
    const id = parseInt(params.id)
    const body = await request.json()
    
    // Préparer les données à mettre à jour (exclure id et created_at)
    const { id: _, created_at: __, ...updateData } = body
    
    const updatedTransaction = await updateTransaction(id, updateData)
    
    return NextResponse.json({ success: true, transaction: updatedTransaction })
  } catch (error: any) {
    console.error('Error updating transaction:', error)
    if (error.message === 'Transaction not found') {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureDbInitialized()
    const id = parseInt(params.id)
    
    const deleted = await deleteTransaction(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    )
  }
}
