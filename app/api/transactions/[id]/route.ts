import { NextRequest, NextResponse } from 'next/server'
import { updateTransaction, deleteTransaction, initDatabase } from '@/lib/db-postgres-pg'
import { requireAuth } from '@/lib/api-auth'
import { isValidId, validateTransactionInput } from '@/lib/security'

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

    await ensureDbInitialized()
    const { id: idParam } = await params
    
    // Validation de l'ID
    if (!isValidId(idParam)) {
      return NextResponse.json(
        { error: 'ID de transaction invalide' },
        { status: 400 }
      )
    }

    const id = parseInt(idParam, 10)
    const body = await request.json()
    
    // Validation et sanitization des entrées
    const validation = validateTransactionInput({
      type: body.type,
      category: body.category,
      description: body.description,
      amount: body.amount,
      currency: body.currency,
      date: body.date,
      income_source: body.income_source,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      )
    }
    
    // Utiliser les données validées et sanitizées
    const updatedTransaction = await updateTransaction(id, validation.sanitized!)
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const authResult = await requireAuth(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

    await ensureDbInitialized()
    const { id: idParam } = await params
    
    // Validation de l'ID
    if (!isValidId(idParam)) {
      return NextResponse.json(
        { error: 'ID de transaction invalide' },
        { status: 400 }
      )
    }

    const id = parseInt(idParam, 10)
    
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
