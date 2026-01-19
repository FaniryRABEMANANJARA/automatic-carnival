import { NextRequest, NextResponse } from 'next/server'
import { getCategories, updateCategory, deleteCategory, initDatabase } from '@/lib/db-postgres-pg'

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
    await ensureDbInitialized()
    const body = await request.json()
    const { name, type, color } = body
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (!name || !type || !color) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Vérifier si le nom existe déjà pour une autre catégorie
    const existingCategories = await getCategories()
    const existingCategory = existingCategories.find(
      c => c.id !== id && c.name.toLowerCase() === name.toLowerCase() && c.type === type
    )
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Cette catégorie existe déjà' },
        { status: 400 }
      )
    }

    const updatedCategory = await updateCategory(id, { name, type, color })
    
    return NextResponse.json(updatedCategory)
  } catch (error: any) {
    console.error('Error updating category:', error)
    if (error.message === 'Category not found') {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update category' },
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
    
    const deleted = await deleteCategory(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting category:', error)
    if (error.message === 'Category is used in transactions and cannot be deleted') {
      return NextResponse.json(
        { error: 'Cette catégorie est utilisée dans des transactions et ne peut pas être supprimée' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
