import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending' // 'pending', 'resolved_dismissed', 'resolved_removed', 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))

    const where: Record<string, any> = {}
    if (status !== 'all') {
      where.status = status
    }

    const [reports, total, pendingCount] = await Promise.all([
      db.newsReport.findMany({
        where,
        include: {
          news: {
            select: {
              id: true,
              title: true,
              status: true,
              thumbnailUrl: true,
              deletedAt: true,
              reporter: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  fakeNewsCount: true,
                  warningCount: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.newsReport.count({ where }),
      db.newsReport.count({ where: { status: 'pending' } }),
    ])

    return NextResponse.json({
      reports,
      total,
      pendingCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Fetch reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

