import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { TELUGU_FEED_SOURCES } from '@/lib/feed-sources'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [categories, states, districts] = await Promise.all([
      db.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, color: true },
        orderBy: { sortOrder: 'asc' },
      }),
      db.state.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      db.district.findMany({
        where: { isActive: true },
        select: { id: true, name: true, stateId: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({
      success: true,
      sources: TELUGU_FEED_SOURCES,
      categories,
      states,
      districts,
    })
  } catch (error: any) {
    console.error('Error fetching feed sources:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

