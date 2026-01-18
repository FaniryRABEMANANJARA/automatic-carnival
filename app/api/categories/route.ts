import { NextRequest, NextResponse } from 'next/server'
import { getCategories, createCategory, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export async function GET() {
  try {
    await ensureDbInitialized()
    const categories = await getCategories()
    
    // Trier les catégories
    const sortedCategories = categories.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'income' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
    return NextResponse.json(sortedCategories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const body = await request.json()
    const { name, type, color } = body

    if (!name || !type || !color) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Vérifier si la catégorie existe déjà
    const existingCategories = await getCategories()
    const existingCategory = existingCategories.find(
      c => c.name.toLowerCase() === name.toLowerCase() && c.type === type
    )
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Cette catégorie existe déjà' },
        { status: 400 }
      )
    }

    const newCategory = await createCategory({ name, type, color })
    
    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
