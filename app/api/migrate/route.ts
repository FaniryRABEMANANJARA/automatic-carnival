import { NextResponse } from 'next/server'
import { initDatabase, getPool } from '@/lib/db-postgres-pg'
import fs from 'fs'
import path from 'path'

interface OldTransaction {
  id: number
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  currency: 'MGA' | 'RMB'
  date: string
  created_at: string
  income_source?: string
}

interface OldCategory {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string
}

interface OldData {
  transactions: OldTransaction[]
  categories: OldCategory[]
}

export async function POST() {
  try {
    const pool = getPool()
    
    // Initialiser la base de données
    await initDatabase()
    
    // Lire les données existantes
    const dataPath = path.join(process.cwd(), 'data', 'budget.json')
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ success: true, message: 'No existing data file found' })
    }
    
    const fileContent = fs.readFileSync(dataPath, 'utf-8')
    const oldData: OldData = JSON.parse(fileContent)
    
    // Migrer les catégories
    if (oldData.categories.length > 0) {
      for (const category of oldData.categories) {
        try {
          await pool.query(`
            INSERT INTO categories (id, name, type, color)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              type = EXCLUDED.type,
              color = EXCLUDED.color
          `, [category.id, category.name, category.type, category.color])
        } catch (error) {
          console.error(`Error migrating category ${category.name}:`, error)
        }
      }
    }
    
    // Migrer les transactions
    if (oldData.transactions.length > 0) {
      for (const transaction of oldData.transactions) {
        try {
          await pool.query(`
            INSERT INTO transactions (
              id, type, category, description, amount, currency, date, created_at, income_source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              type = EXCLUDED.type,
              category = EXCLUDED.category,
              description = EXCLUDED.description,
              amount = EXCLUDED.amount,
              currency = EXCLUDED.currency,
              date = EXCLUDED.date,
              income_source = EXCLUDED.income_source
          `, [
            transaction.id,
            transaction.type,
            transaction.category,
            transaction.description || '',
            transaction.amount,
            transaction.currency || 'MGA',
            transaction.date,
            transaction.created_at || new Date().toISOString(),
            transaction.income_source || null
          ])
        } catch (error) {
          console.error(`Error migrating transaction ${transaction.id}:`, error)
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      migrated: {
        transactions: oldData.transactions.length,
        categories: oldData.categories.length
      }
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
