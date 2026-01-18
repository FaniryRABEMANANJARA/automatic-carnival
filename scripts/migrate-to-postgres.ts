import dotenv from 'dotenv'
import { getPool, initDatabase } from '../lib/db-postgres-pg'
import fs from 'fs'
import path from 'path'

// Charger les variables d'environnement depuis .env.local AVANT d'importer le module
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

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

async function migrate() {
  try {
    console.log('🚀 Starting migration to Postgres...')
    
    // Initialiser la base de données
    await initDatabase()
    console.log('✅ Database initialized')
    
    // Lire les données existantes
    const dataPath = path.join(process.cwd(), 'data', 'budget.json')
    if (!fs.existsSync(dataPath)) {
      console.log('⚠️  No existing data file found, skipping migration')
      return
    }
    
    const fileContent = fs.readFileSync(dataPath, 'utf-8')
    const oldData: OldData = JSON.parse(fileContent)
    
    console.log(`📊 Found ${oldData.transactions.length} transactions and ${oldData.categories.length} categories`)
    
    // Migrer les catégories
    if (oldData.categories.length > 0) {
      console.log('📦 Migrating categories...')
      const pool = getPool()
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
      console.log('✅ Categories migrated')
    }
    
    // Migrer les transactions
    if (oldData.transactions.length > 0) {
      console.log('📦 Migrating transactions...')
      const pool = getPool()
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
      console.log('✅ Transactions migrated')
    }
    
    console.log('🎉 Migration completed successfully!')
    
    // Fermer le pool de connexions
    const pool = getPool()
    await pool.end()
  } catch (error) {
    console.error('❌ Migration failed:', error)
    try {
      const pool = getPool()
      await pool.end()
    } catch {}
    throw error
  }
}

// Exécuter la migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration script failed:', error)
      process.exit(1)
    })
}

export { migrate }
