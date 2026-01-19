import { NextRequest, NextResponse } from 'next/server'
import { markAllAlertsAsRead, initDatabase } from '@/lib/db-postgres-pg'

// Initialiser la base de données au démarrage
let dbInitialized = false
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase()
    dbInitialized = true
  }
}

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    await ensureDbInitialized()
    await markAllAlertsAsRead()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking all alerts as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all alerts as read' },
      { status: 500 }
    )
  }
}
