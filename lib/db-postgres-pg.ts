import { Pool } from 'pg'

export interface Transaction {
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

export interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string
}

export interface Budget {
  id: number
  category: string
  amount: number
  currency: 'MGA' | 'RMB'
  month: number
  year: number
  created_at?: string
  updated_at?: string
}

export interface RecurringTransaction {
  id: number
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  currency: 'MGA' | 'RMB'
  day_of_month: number // Jour du mois (1-31)
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface Goal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  currency: 'MGA' | 'RMB'
  target_date?: string
  is_completed: boolean
  created_at?: string
  updated_at?: string
}

export interface BudgetAlert {
  id: number
  budget_id?: number
  category: string
  budget_amount: number
  spent_amount: number
  currency: 'MGA' | 'RMB'
  month: number
  year: number
  percentage: number
  is_read: boolean
  created_at?: string
}

// Pool de connexions (initialisé paresseusement)
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    // L'URL peut contenir des caractères spéciaux, donc on l'utilise directement
    // Enlever les guillemets si présents
    let connectionString = (process.env.POSTGRES_URL || '').trim()
    if (connectionString.startsWith('"') && connectionString.endsWith('"')) {
      connectionString = connectionString.slice(1, -1)
    }
    if (connectionString.startsWith("'") && connectionString.endsWith("'")) {
      connectionString = connectionString.slice(1, -1)
    }

    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable is not set')
    }

    // Normaliser le sslmode pour éviter les warnings de sécurité
    // Remplacer 'require', 'prefer', 'verify-ca' par 'verify-full' explicitement
    if (connectionString.includes('sslmode=require')) {
      connectionString = connectionString.replace('sslmode=require', 'sslmode=verify-full')
    } else if (connectionString.includes('sslmode=prefer')) {
      connectionString = connectionString.replace('sslmode=prefer', 'sslmode=verify-full')
    } else if (connectionString.includes('sslmode=verify-ca')) {
      connectionString = connectionString.replace('sslmode=verify-ca', 'sslmode=verify-full')
    }
    
    // Configuration SSL
    const hasSSL = connectionString.includes('sslmode=verify-full')
    let sslConfig = undefined
    if (hasSSL) {
      // Pour Vercel/Prisma, on accepte les certificats non vérifiés car ils gèrent la sécurité au niveau de l'infrastructure
      sslConfig = {
        rejectUnauthorized: false
      }
    }
    
    pool = new Pool({
      connectionString: connectionString,
      ssl: sslConfig,
      // Configuration pour éviter les problèmes de connexion
      max: 1, // Limiter à 1 connexion pour Vercel (limite de connexions)
      idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
      connectionTimeoutMillis: 10000, // Timeout de connexion de 10s
    })

    // Gérer les erreurs de connexion
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      // Réinitialiser le pool en cas d'erreur
      pool = null
    })
  }
  return pool
}

// Initialiser les tables si elles n'existent pas
export async function initDatabase() {
  let pool: Pool | null = null
  let retries = 3
  let lastError: Error | null = null

  // Tenter de se connecter avec retry
  while (retries > 0) {
    try {
      pool = getPool()
      // Tester la connexion d'abord avec une requête simple
      await pool.query('SELECT 1')
      break
    } catch (error: any) {
      lastError = error
      retries--
      if (retries > 0) {
        console.log(`Tentative de reconnexion... (${3 - retries + 1}/3)`)
        // Réinitialiser le pool
        const globalPool = (getPool as any).pool
        if (globalPool) {
          try {
            await globalPool.end()
          } catch (e) {
            // Ignorer les erreurs de fermeture
          }
        }
        // Réinitialiser la variable pool globale
        ;(getPool as any).pool = null
        await new Promise(resolve => setTimeout(resolve, 1000)) // Attendre 1s avant de réessayer
      }
    }
  }

  if (retries === 0 && lastError) {
    throw new Error(`Impossible de se connecter à la base de données après 3 tentatives: ${lastError.message}`)
  }

  if (!pool) {
    throw new Error('Impossible d\'initialiser le pool de connexion')
  }

  try {
    // Créer la table users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Créer un index sur l'email pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)
    
    // Créer la table categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Créer une séquence pour les IDs si elle n'existe pas
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'categories_id_seq') THEN
          CREATE SEQUENCE categories_id_seq START 1;
        END IF;
      END $$;
    `)
    
    // Mettre à jour la séquence pour qu'elle commence après le max ID existant
    await pool.query(`
      SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false)
    `)

    // Créer la table transactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        category VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL CHECK (currency IN ('MGA', 'RMB')),
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        income_source VARCHAR(255)
      )
    `)

    // Créer une séquence pour les IDs si elle n'existe pas
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'transactions_id_seq') THEN
          CREATE SEQUENCE transactions_id_seq START 1;
        END IF;
      END $$;
    `)
    
    // Mettre à jour la séquence pour qu'elle commence après le max ID existant
    await pool.query(`
      SELECT setval('transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 0) + 1, false)
    `)

    // Créer des index pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)`)

    // Créer la table recurring_transactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        category VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL CHECK (currency IN ('MGA', 'RMB')),
        day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Créer des index pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recurring_type ON recurring_transactions(type)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active)`)

    // Créer la table goals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        target_amount DECIMAL(15, 2) NOT NULL,
        current_amount DECIMAL(15, 2) DEFAULT 0,
        currency VARCHAR(3) NOT NULL CHECK (currency IN ('MGA', 'RMB')),
        target_date DATE,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Créer des index pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(is_completed)`)

    // Créer la table budget_alerts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_alerts (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER,
        category VARCHAR(255) NOT NULL,
        budget_amount DECIMAL(15, 2) NOT NULL,
        spent_amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL CHECK (currency IN ('MGA', 'RMB')),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        percentage DECIMAL(5, 2) NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Créer des index pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_read ON budget_alerts(is_read)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_alerts_created ON budget_alerts(created_at)`)

    // Créer la table budgets
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id SERIAL PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL CHECK (currency IN ('MGA', 'RMB')),
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, month, year)
      )
    `)

    // Créer des index pour améliorer les performances
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON budgets(month, year)`)

    // Insérer les catégories par défaut si elles n'existent pas
    const defaultCategories = [
      { name: 'Salaire', type: 'income', color: '#4CAF50' },
      { name: 'Autre Revenu', type: 'income', color: '#8BC34A' },
      { name: 'Nourriture', type: 'expense', color: '#F44336' },
      { name: 'Transport', type: 'expense', color: '#FF9800' },
      { name: 'Logement', type: 'expense', color: '#9C27B0' },
      { name: 'Santé', type: 'expense', color: '#E91E63' },
      { name: 'Divertissement', type: 'expense', color: '#00BCD4' },
      { name: 'Autre Dépense', type: 'expense', color: '#607D8B' },
    ]

    for (const cat of defaultCategories) {
      await pool.query(`
        INSERT INTO categories (id, name, type, color)
        SELECT nextval('categories_id_seq'), $1::VARCHAR, $2::VARCHAR, $3::VARCHAR
        WHERE NOT EXISTS (
          SELECT 1 FROM categories WHERE name = $1::VARCHAR AND type = $2::VARCHAR
        )
      `, [cat.name, cat.type, cat.color])
    }
  } catch (error: any) {
    console.error('Error initializing database:', error)
    // Si c'est une erreur de connexion, réinitialiser le pool
    if (error.message && (error.message.includes('terminated') || error.message.includes('connection'))) {
      const globalPool = (getPool as any).pool
      if (globalPool) {
        try {
          await globalPool.end()
        } catch (e) {
          // Ignorer les erreurs de fermeture
        }
        ;(getPool as any).pool = null
      }
    }
    throw error
  }
}

// Fonctions pour les transactions
export async function getTransactions() {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        type,
        category,
        description,
        amount::numeric,
        currency,
        date::text,
        created_at::text,
        income_source
      FROM transactions
      ORDER BY date DESC, created_at DESC
    `)
    return rows.map(row => ({
      id: Number(row.id),
      type: row.type as 'income' | 'expense',
      category: row.category,
      description: row.description || '',
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      date: row.date,
      created_at: row.created_at,
      income_source: row.income_source || undefined,
    })) as Transaction[]
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw error
  }
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>) {
  const pool = getPool()
  try {
    // Obtenir le prochain ID depuis la séquence
    const { rows: idRow } = await pool.query(`SELECT nextval('transactions_id_seq') as next_id`)
    const nextId = Number(idRow[0].next_id)
    
    const { rows } = await pool.query(`
      INSERT INTO transactions (id, type, category, description, amount, currency, date, income_source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      nextId,
      transaction.type,
      transaction.category,
      transaction.description || '',
      transaction.amount,
      transaction.currency,
      transaction.date,
      transaction.income_source || null
    ])
    return {
      id: Number(rows[0].id),
      ...transaction,
      created_at: rows[0].created_at,
    } as Transaction
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
}

export async function updateTransaction(id: number, transaction: Partial<Transaction>) {
  const pool = getPool()
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (transaction.type !== undefined) {
      updates.push(`type = $${paramIndex++}`)
      values.push(transaction.type)
    }
    if (transaction.category !== undefined) {
      updates.push(`category = $${paramIndex++}`)
      values.push(transaction.category)
    }
    if (transaction.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(transaction.description)
    }
    if (transaction.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`)
      values.push(transaction.amount)
    }
    if (transaction.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`)
      values.push(transaction.currency)
    }
    if (transaction.date !== undefined) {
      updates.push(`date = $${paramIndex++}`)
      values.push(transaction.date)
    }
    if (transaction.income_source !== undefined) {
      updates.push(`income_source = $${paramIndex++}`)
      values.push(transaction.income_source || null)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    values.push(id)
    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
    
    const { rows } = await pool.query(query, values)
    if (rows.length === 0) {
      throw new Error('Transaction not found')
    }
    
    return {
      id: Number(rows[0].id),
      type: rows[0].type,
      category: rows[0].category,
      description: rows[0].description || '',
      amount: Number(rows[0].amount),
      currency: rows[0].currency,
      date: rows[0].date,
      created_at: rows[0].created_at,
      income_source: rows[0].income_source || undefined,
    } as Transaction
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw error
  }
}

export async function deleteTransaction(id: number) {
  const pool = getPool()
  try {
    const { rowCount } = await pool.query(`DELETE FROM transactions WHERE id = $1`, [id])
    return (rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw error
  }
}

// Fonctions pour les catégories
export async function getCategories() {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT id, name, type, color
      FROM categories
      ORDER BY type, name
    `)
    return rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      type: row.type as 'income' | 'expense',
      color: row.color,
    })) as Category[]
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

export async function createCategory(category: Omit<Category, 'id'>) {
  const pool = getPool()
  try {
    // Obtenir le prochain ID depuis la séquence
    const { rows: idRow } = await pool.query(`SELECT nextval('categories_id_seq') as next_id`)
    const nextId = Number(idRow[0].next_id)
    
    const { rows } = await pool.query(`
      INSERT INTO categories (id, name, type, color)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nextId, category.name, category.type, category.color])
    return {
      id: Number(rows[0].id),
      ...category,
    } as Category
  } catch (error) {
    console.error('Error creating category:', error)
    throw error
  }
}

export async function updateCategory(id: number, category: Partial<Category>) {
  const pool = getPool()
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (category.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(category.name)
    }
    if (category.type !== undefined) {
      updates.push(`type = $${paramIndex++}`)
      values.push(category.type)
    }
    if (category.color !== undefined) {
      updates.push(`color = $${paramIndex++}`)
      values.push(category.color)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    values.push(id)
    const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`
    
    const { rows } = await pool.query(query, values)
    if (rows.length === 0) {
      throw new Error('Category not found')
    }
    
    return {
      id: Number(rows[0].id),
      name: rows[0].name,
      type: rows[0].type,
      color: rows[0].color,
    } as Category
  } catch (error) {
    console.error('Error updating category:', error)
    throw error
  }
}

export async function deleteCategory(id: number) {
  const pool = getPool()
  try {
    // Vérifier si la catégorie est utilisée dans des transactions
    const { rows } = await pool.query(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE category = (SELECT name FROM categories WHERE id = $1)
    `, [id])
    
    if (Number(rows[0].count) > 0) {
      throw new Error('Category is used in transactions and cannot be deleted')
    }
    
    const { rowCount } = await pool.query(`DELETE FROM categories WHERE id = $1`, [id])
    return (rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}

// Fonctions pour les budgets
export async function getBudgets(month?: number, year?: number) {
  const pool = getPool()
  try {
    let query = `
      SELECT 
        id,
        category,
        amount::numeric,
        currency,
        month,
        year,
        created_at::text,
        updated_at::text
      FROM budgets
    `
    const params: any[] = []
    
    if (month !== undefined && year !== undefined) {
      query += ` WHERE month = $1 AND year = $2`
      params.push(month, year)
    } else if (month !== undefined) {
      query += ` WHERE month = $1`
      params.push(month)
    } else if (year !== undefined) {
      query += ` WHERE year = $1`
      params.push(year)
    }
    
    query += ` ORDER BY year DESC, month DESC, category ASC`
    
    const { rows } = await pool.query(query, params)
    return rows.map(row => ({
      id: Number(row.id),
      category: row.category,
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      month: Number(row.month),
      year: Number(row.year),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Budget[]
  } catch (error) {
    console.error('Error fetching budgets:', error)
    throw error
  }
}

export async function getBudgetById(id: number) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        category,
        amount::numeric,
        currency,
        month,
        year,
        created_at::text,
        updated_at::text
      FROM budgets
      WHERE id = $1
    `, [id])
    
    if (rows.length === 0) {
      return null
    }
    
    const row = rows[0]
    return {
      id: Number(row.id),
      category: row.category,
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      month: Number(row.month),
      year: Number(row.year),
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Budget
  } catch (error) {
    console.error('Error fetching budget:', error)
    throw error
  }
}

export async function createBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      INSERT INTO budgets (category, amount, currency, month, year)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (category, month, year) 
      DO UPDATE SET 
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, category, amount::numeric, currency, month, year, created_at::text, updated_at::text
    `, [budget.category, budget.amount, budget.currency, budget.month, budget.year])
    
    return {
      id: Number(rows[0].id),
      category: rows[0].category,
      amount: Number(rows[0].amount),
      currency: rows[0].currency as 'MGA' | 'RMB',
      month: Number(rows[0].month),
      year: Number(rows[0].year),
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
    } as Budget
  } catch (error) {
    console.error('Error creating budget:', error)
    throw error
  }
}

export async function updateBudget(id: number, budget: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at'>>) {
  const pool = getPool()
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (budget.category !== undefined) {
      updates.push(`category = $${paramIndex++}`)
      values.push(budget.category)
    }
    if (budget.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`)
      values.push(budget.amount)
    }
    if (budget.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`)
      values.push(budget.currency)
    }
    if (budget.month !== undefined) {
      updates.push(`month = $${paramIndex++}`)
      values.push(budget.month)
    }
    if (budget.year !== undefined) {
      updates.push(`year = $${paramIndex++}`)
      values.push(budget.year)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)
    const query = `UPDATE budgets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, category, amount::numeric, currency, month, year, created_at::text, updated_at::text`
    
    const { rows } = await pool.query(query, values)
    if (rows.length === 0) {
      throw new Error('Budget not found')
    }
    
    const row = rows[0]
    return {
      id: Number(row.id),
      category: row.category,
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      month: Number(row.month),
      year: Number(row.year),
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Budget
  } catch (error) {
    console.error('Error updating budget:', error)
    throw error
  }
}

export async function deleteBudget(id: number) {
  const pool = getPool()
  try {
    const { rowCount } = await pool.query(`DELETE FROM budgets WHERE id = $1`, [id])
    return rowCount ? rowCount > 0 : false
  } catch (error) {
    console.error('Error deleting budget:', error)
    throw error
  }
}

// Fonctions pour les transactions récurrentes
export async function getRecurringTransactions() {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        type,
        category,
        description,
        amount::numeric,
        currency,
        day_of_month,
        is_active,
        created_at::text,
        updated_at::text
      FROM recurring_transactions
      ORDER BY day_of_month ASC, category ASC
    `)
    return rows.map(row => ({
      id: Number(row.id),
      type: row.type as 'income' | 'expense',
      category: row.category,
      description: row.description || '',
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      day_of_month: Number(row.day_of_month),
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as RecurringTransaction[]
  } catch (error) {
    console.error('Error fetching recurring transactions:', error)
    throw error
  }
}

export async function getRecurringTransactionById(id: number) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        type,
        category,
        description,
        amount::numeric,
        currency,
        day_of_month,
        is_active,
        created_at::text,
        updated_at::text
      FROM recurring_transactions
      WHERE id = $1
    `, [id])
    
    if (rows.length === 0) {
      return null
    }
    
    const row = rows[0]
    return {
      id: Number(row.id),
      type: row.type as 'income' | 'expense',
      category: row.category,
      description: row.description || '',
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      day_of_month: Number(row.day_of_month),
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as RecurringTransaction
  } catch (error) {
    console.error('Error fetching recurring transaction:', error)
    throw error
  }
}

export async function createRecurringTransaction(recurring: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      INSERT INTO recurring_transactions (type, category, description, amount, currency, day_of_month, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, type, category, description, amount::numeric, currency, day_of_month, is_active, created_at::text, updated_at::text
    `, [
      recurring.type,
      recurring.category,
      recurring.description,
      recurring.amount,
      recurring.currency,
      recurring.day_of_month,
      recurring.is_active !== undefined ? recurring.is_active : true
    ])
    
    const row = rows[0]
    return {
      id: Number(row.id),
      type: row.type as 'income' | 'expense',
      category: row.category,
      description: row.description || '',
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      day_of_month: Number(row.day_of_month),
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as RecurringTransaction
  } catch (error) {
    console.error('Error creating recurring transaction:', error)
    throw error
  }
}

export async function updateRecurringTransaction(id: number, recurring: Partial<Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>>) {
  const pool = getPool()
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (recurring.type !== undefined) {
      updates.push(`type = $${paramIndex++}`)
      values.push(recurring.type)
    }
    if (recurring.category !== undefined) {
      updates.push(`category = $${paramIndex++}`)
      values.push(recurring.category)
    }
    if (recurring.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(recurring.description)
    }
    if (recurring.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`)
      values.push(recurring.amount)
    }
    if (recurring.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`)
      values.push(recurring.currency)
    }
    if (recurring.day_of_month !== undefined) {
      updates.push(`day_of_month = $${paramIndex++}`)
      values.push(recurring.day_of_month)
    }
    if (recurring.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      values.push(recurring.is_active)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)
    const query = `UPDATE recurring_transactions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, type, category, description, amount::numeric, currency, day_of_month, is_active, created_at::text, updated_at::text`
    
    const { rows } = await pool.query(query, values)
    if (rows.length === 0) {
      throw new Error('Recurring transaction not found')
    }
    
    const row = rows[0]
    return {
      id: Number(row.id),
      type: row.type as 'income' | 'expense',
      category: row.category,
      description: row.description || '',
      amount: Number(row.amount),
      currency: row.currency as 'MGA' | 'RMB',
      day_of_month: Number(row.day_of_month),
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as RecurringTransaction
  } catch (error) {
    console.error('Error updating recurring transaction:', error)
    throw error
  }
}

export async function deleteRecurringTransaction(id: number) {
  const pool = getPool()
  try {
    const { rowCount } = await pool.query(`DELETE FROM recurring_transactions WHERE id = $1`, [id])
    return rowCount ? rowCount > 0 : false
  } catch (error) {
    console.error('Error deleting recurring transaction:', error)
    throw error
  }
}

// Générer les transactions pour le mois actuel
export async function generateRecurringTransactionsForMonth(month: number, year: number) {
  const pool = getPool()
  try {
    // Récupérer toutes les transactions récurrentes actives
    const { rows: recurringRows } = await pool.query(`
      SELECT 
        id,
        type,
        category,
        description,
        amount::numeric,
        currency,
        day_of_month
      FROM recurring_transactions
      WHERE is_active = true
    `)

    const generatedTransactions: Transaction[] = []
    const daysInMonth = new Date(year, month, 0).getDate()

    for (const recurring of recurringRows) {
      // Ajuster le jour si le mois n'a pas assez de jours (ex: 31 pour février)
      const day = Math.min(recurring.day_of_month, daysInMonth)
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
      // Vérifier si la transaction existe déjà pour ce mois
      const { rows: existingRows } = await pool.query(`
        SELECT id FROM transactions
        WHERE type = $1
          AND category = $2
          AND description = $3
          AND amount = $4
          AND currency = $5
          AND date = $6
      `, [
        recurring.type,
        recurring.category,
        recurring.description || '',
        recurring.amount,
        recurring.currency,
        date
      ])

      // Si la transaction n'existe pas, la créer
      if (existingRows.length === 0) {
        const transaction = await createTransaction({
          type: recurring.type as 'income' | 'expense',
          category: recurring.category,
          description: recurring.description || '',
          amount: Number(recurring.amount),
          currency: recurring.currency as 'MGA' | 'RMB',
          date: date,
        })
        generatedTransactions.push(transaction)
      }
    }

    return generatedTransactions
  } catch (error) {
    console.error('Error generating recurring transactions:', error)
    throw error
  }
}

// Fonctions pour les objectifs d'épargne
export async function getGoals() {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        name,
        target_amount::numeric,
        current_amount::numeric,
        currency,
        target_date::text,
        is_completed,
        created_at::text,
        updated_at::text
      FROM goals
      ORDER BY is_completed ASC, created_at DESC
    `)
    return rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
      currency: row.currency as 'MGA' | 'RMB',
      target_date: row.target_date || undefined,
      is_completed: row.is_completed,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Goal[]
  } catch (error) {
    console.error('Error fetching goals:', error)
    throw error
  }
}

export async function getGoalById(id: number) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        name,
        target_amount::numeric,
        current_amount::numeric,
        currency,
        target_date::text,
        is_completed,
        created_at::text,
        updated_at::text
      FROM goals
      WHERE id = $1
    `, [id])
    
    if (rows.length === 0) {
      return null
    }
    
    const row = rows[0]
    return {
      id: Number(row.id),
      name: row.name,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
      currency: row.currency as 'MGA' | 'RMB',
      target_date: row.target_date || undefined,
      is_completed: row.is_completed,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Goal
  } catch (error) {
    console.error('Error fetching goal:', error)
    throw error
  }
}

export async function createGoal(goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      INSERT INTO goals (name, target_amount, current_amount, currency, target_date, is_completed)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, target_amount::numeric, current_amount::numeric, currency, target_date::text, is_completed, created_at::text, updated_at::text
    `, [
      goal.name,
      goal.target_amount,
      goal.current_amount || 0,
      goal.currency,
      goal.target_date || null,
      goal.is_completed !== undefined ? goal.is_completed : false
    ])
    
    const row = rows[0]
    return {
      id: Number(row.id),
      name: row.name,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
      currency: row.currency as 'MGA' | 'RMB',
      target_date: row.target_date || undefined,
      is_completed: row.is_completed,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Goal
  } catch (error) {
    console.error('Error creating goal:', error)
    throw error
  }
}

export async function updateGoal(id: number, goal: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>) {
  const pool = getPool()
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (goal.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(goal.name)
    }
    if (goal.target_amount !== undefined) {
      updates.push(`target_amount = $${paramIndex++}`)
      values.push(goal.target_amount)
    }
    if (goal.current_amount !== undefined) {
      updates.push(`current_amount = $${paramIndex++}`)
      values.push(goal.current_amount)
    }
    if (goal.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`)
      values.push(goal.currency)
    }
    if (goal.target_date !== undefined) {
      updates.push(`target_date = $${paramIndex++}`)
      values.push(goal.target_date || null)
    }
    if (goal.is_completed !== undefined) {
      updates.push(`is_completed = $${paramIndex++}`)
      values.push(goal.is_completed)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)
    const query = `UPDATE goals SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, target_amount::numeric, current_amount::numeric, currency, target_date::text, is_completed, created_at::text, updated_at::text`
    
    const { rows } = await pool.query(query, values)
    if (rows.length === 0) {
      throw new Error('Goal not found')
    }
    
    const row = rows[0]
    return {
      id: Number(row.id),
      name: row.name,
      target_amount: Number(row.target_amount),
      current_amount: Number(row.current_amount),
      currency: row.currency as 'MGA' | 'RMB',
      target_date: row.target_date || undefined,
      is_completed: row.is_completed,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Goal
  } catch (error) {
    console.error('Error updating goal:', error)
    throw error
  }
}

export async function deleteGoal(id: number) {
  const pool = getPool()
  try {
    const { rowCount } = await pool.query(`DELETE FROM goals WHERE id = $1`, [id])
    return rowCount ? rowCount > 0 : false
  } catch (error) {
    console.error('Error deleting goal:', error)
    throw error
  }
}

// Fonctions pour les alertes de budget
export async function getBudgetAlerts(limit?: number, unreadOnly?: boolean) {
  const pool = getPool()
  try {
    let query = `
      SELECT 
        id,
        budget_id,
        category,
        budget_amount::numeric,
        spent_amount::numeric,
        currency,
        month,
        year,
        percentage::numeric,
        is_read,
        created_at::text
      FROM budget_alerts
    `
    const params: any[] = []
    
    if (unreadOnly) {
      query += ` WHERE is_read = false`
    }
    
    query += ` ORDER BY created_at DESC`
    
    if (limit) {
      query += ` LIMIT $${params.length + 1}`
      params.push(limit)
    }
    
    const { rows } = await pool.query(query, params)
    return rows.map(row => ({
      id: Number(row.id),
      budget_id: row.budget_id ? Number(row.budget_id) : undefined,
      category: row.category,
      budget_amount: Number(row.budget_amount),
      spent_amount: Number(row.spent_amount),
      currency: row.currency as 'MGA' | 'RMB',
      month: Number(row.month),
      year: Number(row.year),
      percentage: Number(row.percentage),
      is_read: row.is_read,
      created_at: row.created_at,
    })) as BudgetAlert[]
  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    throw error
  }
}

export async function createBudgetAlert(alert: Omit<BudgetAlert, 'id' | 'created_at'>) {
  const pool = getPool()
  try {
    // Vérifier si une alerte similaire existe déjà pour ce budget/mois
    const { rows: existing } = await pool.query(`
      SELECT id FROM budget_alerts
      WHERE category = $1 AND month = $2 AND year = $3 AND is_read = false
      LIMIT 1
    `, [alert.category, alert.month, alert.year])
    
    if (existing.length > 0) {
      // Mettre à jour l'alerte existante
      const { rows } = await pool.query(`
        UPDATE budget_alerts
        SET budget_amount = $1, spent_amount = $2, percentage = $3, created_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, budget_id, category, budget_amount::numeric, spent_amount::numeric, currency, month, year, percentage::numeric, is_read, created_at::text
      `, [alert.budget_amount, alert.spent_amount, alert.percentage, existing[0].id])
      
      const row = rows[0]
      return {
        id: Number(row.id),
        budget_id: row.budget_id ? Number(row.budget_id) : undefined,
        category: row.category,
        budget_amount: Number(row.budget_amount),
        spent_amount: Number(row.spent_amount),
        currency: row.currency as 'MGA' | 'RMB',
        month: Number(row.month),
        year: Number(row.year),
        percentage: Number(row.percentage),
        is_read: row.is_read,
        created_at: row.created_at,
      } as BudgetAlert
    } else {
      // Créer une nouvelle alerte
      const { rows } = await pool.query(`
        INSERT INTO budget_alerts (budget_id, category, budget_amount, spent_amount, currency, month, year, percentage, is_read)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, budget_id, category, budget_amount::numeric, spent_amount::numeric, currency, month, year, percentage::numeric, is_read, created_at::text
      `, [
        alert.budget_id || null,
        alert.category,
        alert.budget_amount,
        alert.spent_amount,
        alert.currency,
        alert.month,
        alert.year,
        alert.percentage,
        alert.is_read !== undefined ? alert.is_read : false
      ])
      
      const row = rows[0]
      return {
        id: Number(row.id),
        budget_id: row.budget_id ? Number(row.budget_id) : undefined,
        category: row.category,
        budget_amount: Number(row.budget_amount),
        spent_amount: Number(row.spent_amount),
        currency: row.currency as 'MGA' | 'RMB',
        month: Number(row.month),
        year: Number(row.year),
        percentage: Number(row.percentage),
        is_read: row.is_read,
        created_at: row.created_at,
      } as BudgetAlert
    }
  } catch (error) {
    console.error('Error creating budget alert:', error)
    throw error
  }
}

export async function markAlertAsRead(id: number) {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`
      UPDATE budget_alerts
      SET is_read = true
      WHERE id = $1
      RETURNING id
    `, [id])
    return rows.length > 0
  } catch (error) {
    console.error('Error marking alert as read:', error)
    throw error
  }
}

export async function markAllAlertsAsRead() {
  const pool = getPool()
  try {
    await pool.query(`UPDATE budget_alerts SET is_read = true WHERE is_read = false`)
    return true
  } catch (error) {
    console.error('Error marking all alerts as read:', error)
    throw error
  }
}

export async function deleteBudgetAlert(id: number) {
  const pool = getPool()
  try {
    const { rowCount } = await pool.query(`DELETE FROM budget_alerts WHERE id = $1`, [id])
    return rowCount ? rowCount > 0 : false
  } catch (error) {
    console.error('Error deleting budget alert:', error)
    throw error
  }
}

// Exporter la fonction pour obtenir le pool
export { getPool }
