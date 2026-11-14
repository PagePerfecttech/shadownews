import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRandomShortCode, generateDeterministicShortCode } from '@/lib/short-code'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const news = await db.news.findFirst({
      where: {
        OR: [
          { id },
          { shortCode: id },
        ],
        status: 'published',
        deletedAt: null,
      },
      include: {
        category: true,
        state: { select: { name: true } },
        district: { select: { name: true } },
        reporter: { select: { name: true, avatar: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
        _count: {
          select: {
            comments: { where: { isActive: true } },
            reactions: true,
          }
        }
      },
    })

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    // Get article_banner ad
    const ad = await db.customAd.findFirst({
      where: {
        placement: 'article_banner',
        isActive: true,
        deletedAt: null,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    })

    let code = news.shortCode
    if (!code || code.trim() === '' || code.length !== 5) {
      if (news.id && news.id.length === 5) {
        code = news.id
      } else {
        code = generateDeterministicShortCode(news.id)
        db.news.update({ where: { id: news.id }, data: { shortCode: code } }).catch(() => {})
      }
    }

    return NextResponse.json({
      news: {
        ...news,
        shortCode: code,
        short_code: code,
        imagesUrls: JSON.parse(news.imagesUrls || '[]'),
        categoryName: news.category?.name,
      },
      ad: ad ? {
        ...ad,
        imagesUrls: JSON.parse(ad.imagesUrls || '[]'),
        targetStateIds: JSON.parse(ad.targetStateIds || '[]'),
        targetCategoryIds: JSON.parse(ad.targetCategoryIds || '[]'),
      } : null,
    })
  } catch (error) {
    console.error('News detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'view') {
      await db.news.update({ where: { id }, data: { viewsCount: { increment: 1 } } })
    } else if (body.action === 'share') {
      await db.news.update({ where: { id }, data: { sharesCount: { increment: 1 } } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('News action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
