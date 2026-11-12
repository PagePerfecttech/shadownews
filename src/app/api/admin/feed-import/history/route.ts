import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const news = await db.news.findMany({
      where: {
        sourceType: {
          in: ['feed_import', 'rss'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        shortDesc: true,
        aiTitle: true,
        aiStatus: true,
        sourceType: true,
        sourceUrl: true,
        thumbnailUrl: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        category: {
          select: { id: true, name: true, slug: true, color: true },
        },
        state: {
          select: { id: true, name: true, code: true },
        },
        district: {
          select: { id: true, name: true },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      count: news.length,
      news,
    })
  } catch (error: any) {
    console.error('Error fetching feed import history:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

