import { sql } from '@vercel/postgres'

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

// Initialiser les tables si elles n'existent pas
export async function initDatabase() {
  try {
    // Créer la table categories
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Créer une séquence pour les IDs si elle n'existe pas
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'categories_id_seq') THEN
          CREATE SEQUENCE categories_id_seq START 1;
        END IF;
      END $$;
    `
    
    // Mettre à jour la séquence pour qu'elle commence après le max ID existant
    await sql`
      SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false)
    `

    // Créer la table transactions
    await sql`
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
    `

    // Créer une séquence pour les IDs si elle n'existe pas
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'transactions_id_seq') THEN
          CREATE SEQUENCE transactions_id_seq START 1;
        END IF;
      END $$;
    `
    
    // Mettre à jour la séquence pour qu'elle commence après le max ID existant
    await sql`
      SELECT setval('transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 0) + 1, false)
    `

    // Créer des index pour améliorer les performances
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type)`

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
      await sql`
        INSERT INTO categories (name, type, color)
        SELECT ${cat.name}, ${cat.type}, ${cat.color}
        WHERE NOT EXISTS (
          SELECT 1 FROM categories WHERE name = ${cat.name} AND type = ${cat.type}
        )
      `
    }
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

// Fonctions pour les transactions
export async function getTransactions() {
  try {
    const { rows } = await sql`
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
    `
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
  try {
    // Obtenir le prochain ID depuis la séquence
    const { rows: idRow } = await sql`SELECT nextval('transactions_id_seq') as next_id`
    const nextId = Number(idRow[0].next_id)
    
    const { rows } = await sql`
      INSERT INTO transactions (id, type, category, description, amount, currency, date, income_source)
      VALUES (
        ${nextId},
        ${transaction.type},
        ${transaction.category},
        ${transaction.description || ''},
        ${transaction.amount},
        ${transaction.currency},
        ${transaction.date},
        ${transaction.income_source || null}
      )
      RETURNING id, created_at
    `
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
    
    // Utiliser sql.unsafe pour les requêtes dynamiques
    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`
    const { rows } = await (sql as any).unsafe(query, values)
    
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
  try {
    const { rowCount } = await sql`DELETE FROM transactions WHERE id = ${id}`
    return (rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw error
  }
}

// Fonctions pour les catégories
export async function getCategories() {
  try {
    const { rows } = await sql`
      SELECT id, name, type, color
      FROM categories
      ORDER BY type, name
    `
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
  try {
    // Obtenir le prochain ID depuis la séquence
    const { rows: idRow } = await sql`SELECT nextval('categories_id_seq') as next_id`
    const nextId = Number(idRow[0].next_id)
    
    const { rows } = await sql`
      INSERT INTO categories (id, name, type, color)
      VALUES (${nextId}, ${category.name}, ${category.type}, ${category.color})
      RETURNING id
    `
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
  try {
    const updates: string[] = []
    const values: any[] = []

    if (category.name !== undefined) {
      updates.push(`name = $${values.length + 1}`)
      values.push(category.name)
    }
    if (category.type !== undefined) {
      updates.push(`type = $${values.length + 1}`)
      values.push(category.type)
    }
    if (category.color !== undefined) {
      updates.push(`color = $${values.length + 1}`)
      values.push(category.color)
    }

    if (updates.length === 0) {
      throw new Error('No fields to update')
    }

    values.push(id)
    
    // Utiliser sql.unsafe pour les requêtes dynamiques
    const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`
    const { rows } = await (sql as any).unsafe(query, values)
    
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
  try {
    // Vérifier si la catégorie est utilisée dans des transactions
    const { rows } = await sql`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE category = (SELECT name FROM categories WHERE id = ${id})
    `
    
    if (Number(rows[0].count) > 0) {
      throw new Error('Category is used in transactions and cannot be deleted')
    }
    
    const { rowCount } = await sql`DELETE FROM categories WHERE id = ${id}`
    return (rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error deleting category:', error)
    throw error
  }
}
