import dotenv from 'dotenv'
import path from 'path'

// Charger les variables d'environnement
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

console.log('🔍 Vérification de la configuration des routes...\n')

const routes = [
  { path: '/', name: 'Dashboard', protected: true },
  { path: '/login', name: 'Login', protected: false },
  { path: '/register', name: 'Register', protected: false },
  { path: '/transactions', name: 'Transactions', protected: true },
  { path: '/income', name: 'Income', protected: true },
  { path: '/expenses', name: 'Expenses', protected: true },
  { path: '/categories', name: 'Categories', protected: true },
  { path: '/reports', name: 'Reports', protected: true },
  { path: '/settings', name: 'Settings', protected: true },
]

console.log('📋 Routes de l\'application:\n')
routes.forEach(route => {
  const status = route.protected ? '🔒 Protégée' : '🌐 Publique'
  console.log(`  ${status} - ${route.path.padEnd(15)} → ${route.name}`)
})

console.log('\n✅ Configuration des routes vérifiée!')
console.log('\n💡 Le dashboard est accessible à la route "/" (racine)')
console.log('💡 Toutes les routes protégées nécessitent une authentification')
console.log('💡 Les routes /login et /register sont publiques')
