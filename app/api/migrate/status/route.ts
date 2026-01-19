import { NextResponse } from 'next/server'
import { getPool, initDatabase } from '@/lib/db-postgres-pg'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const pool = getPool()
    
    // Initialiser la base de données si nécessaire
    await initDatabase()
    
    // Vérifier les tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'categories', 'transactions', 'budgets', 'goals', 'recurring_transactions', 'budget_alerts')
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows.map(row => row.table_name)
    
    // Compter les données dans chaque table
    const counts: Record<string, number> = {}
    
    for (const table of ['users', 'categories', 'transactions', 'budgets', 'goals', 'recurring_transactions', 'budget_alerts']) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = parseInt(result.rows[0].count)
      } catch (error) {
        counts[table] = 0
      }
    }
    
    // Vérifier si le fichier de migration existe
    const dataPath = path.join(process.cwd(), 'data', 'budget.json')
    const hasOldData = fs.existsSync(dataPath)
    let oldDataCount = { transactions: 0, categories: 0 }
    
    if (hasOldData) {
      try {
        const fileContent = fs.readFileSync(dataPath, 'utf-8')
        const oldData = JSON.parse(fileContent)
        oldDataCount = {
          transactions: oldData.transactions?.length || 0,
          categories: oldData.categories?.length || 0
        }
      } catch (error) {
        // Ignorer les erreurs de lecture
      }
    }
    
    // Déterminer l'état de la migration
    const migrationStatus = {
      tablesCreated: tables.length >= 7, // Au moins 7 tables principales
      dataMigrated: counts.transactions > 0 || counts.categories > 0,
      hasOldData: hasOldData,
      needsMigration: hasOldData && (oldDataCount.transactions > 0 || oldDataCount.categories > 0) && 
                      (counts.transactions === 0 && counts.categories === 0)
    }
    
    return NextResponse.json({
      success: true,
      status: migrationStatus,
      tables: {
        created: tables,
        count: tables.length
      },
      data: {
        current: counts,
        old: oldDataCount
      },
      message: migrationStatus.needsMigration 
        ? 'Migration nécessaire: données trouvées dans budget.json mais pas dans PostgreSQL'
        : migrationStatus.dataMigrated 
        ? 'Migration déjà effectuée'
        : 'Aucune donnée à migrer'
    })
  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erreur lors de la vérification',
        status: {
          tablesCreated: false,
          dataMigrated: false,
          hasOldData: false,
          needsMigration: false
        }
      },
      { status: 500 }
    )
  }
}
