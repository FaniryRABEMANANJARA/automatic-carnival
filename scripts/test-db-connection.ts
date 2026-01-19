import dotenv from 'dotenv'
import path from 'path'
import { getPool, initDatabase } from '../lib/db-postgres-pg'

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function testConnection() {
  console.log('🔍 Test de connexion à la base de données PostgreSQL...\n')

  try {
    // Vérifier que POSTGRES_URL est défini
    const postgresUrl = process.env.POSTGRES_URL
    if (!postgresUrl) {
      console.error('❌ POSTGRES_URL n\'est pas défini dans les variables d\'environnement')
      console.log('💡 Assurez-vous d\'avoir un fichier .env.local avec POSTGRES_URL')
      process.exit(1)
    }

    console.log('✅ POSTGRES_URL trouvé')
    console.log(`   URL: ${postgresUrl.substring(0, 30)}...`)

    // Tester la connexion
    console.log('\n🔌 Tentative de connexion...')
    const pool = getPool()
    
    // Test simple de connexion
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version')
    console.log('✅ Connexion réussie!')
    console.log(`   Heure serveur: ${result.rows[0].current_time}`)
    console.log(`   Version PostgreSQL: ${result.rows[0].pg_version.substring(0, 50)}...`)

    // Vérifier les tables existantes
    console.log('\n📊 Vérification des tables...')
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows.map(row => row.table_name)
    console.log(`   Tables trouvées: ${tables.length}`)
    tables.forEach(table => {
      console.log(`   - ${table}`)
    })

    // Initialiser la base de données si nécessaire
    console.log('\n🔧 Initialisation de la base de données...')
    await initDatabase()
    console.log('✅ Base de données initialisée avec succès')

    // Vérifier les catégories
    console.log('\n📁 Vérification des catégories...')
    const categoriesResult = await pool.query('SELECT COUNT(*) as count FROM categories')
    console.log(`   Nombre de catégories: ${categoriesResult.rows[0].count}`)

    // Vérifier les transactions
    console.log('\n💰 Vérification des transactions...')
    const transactionsResult = await pool.query('SELECT COUNT(*) as count FROM transactions')
    console.log(`   Nombre de transactions: ${transactionsResult.rows[0].count}`)

    // Vérifier les utilisateurs
    console.log('\n👥 Vérification des utilisateurs...')
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users')
    console.log(`   Nombre d'utilisateurs: ${usersResult.rows[0].count}`)

    console.log('\n✅ Tous les tests sont passés avec succès!')
    console.log('🎉 La base de données PostgreSQL de Vercel fonctionne correctement!')

    await pool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Erreur lors du test de connexion:')
    console.error(`   Message: ${error.message}`)
    if (error.code) {
      console.error(`   Code: ${error.code}`)
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
    }
    process.exit(1)
  }
}

testConnection()
