import { NextRequest, NextResponse } from 'next/server'
import { getBudgetAlerts, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized()
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    
    const alerts = await getBudgetAlerts(limit, unreadOnly)
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
