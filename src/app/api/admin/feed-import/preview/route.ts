import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { fetchAndParseFeed, scrapeArticleOgImage, getFallbackImage } from '@/lib/feed-parser'
import { TELUGU_FEED_SOURCES } from '@/lib/feed-sources'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { feedUrl, limit = 15 } = body

    if (!feedUrl || typeof feedUrl !== 'string') {
      return NextResponse.json({ error: 'Feed URL is required' }, { status: 400 })
    }

    const maxItems = Math.min(30, Math.max(1, Number(limit) || 15))
    const parsedItems = await fetchAndParseFeed(feedUrl.trim(), maxItems)

    if (parsedItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        message: 'No articles found in this feed.',
      })
    }

    // Check which articles are already imported in database
    const links = parsedItems.map(i => i.link).filter(Boolean)
    const titles = parsedItems.map(i => i.title).filter(Boolean)

    const existingNews = await db.news.findMany({
      where: {
        OR: [
          { sourceUrl: { in: links } },
          { title: { in: titles } },
        ],
      },
      select: { id: true, sourceUrl: true, title: true, publishedAt: true },
    })

    const existingUrlMap = new Set(existingNews.map(n => n.sourceUrl).filter(Boolean))
    const existingTitleMap = new Set(existingNews.map(n => n.title))

    const matchedSource = TELUGU_FEED_SOURCES.find(s => s.url.toLowerCase() === feedUrl.trim().toLowerCase())
    const defaultHint = matchedSource?.categorySlug || ''

    // Enrich items with duplicate status and resolve missing images where possible
    const enrichedItems = await Promise.all(
      parsedItems.map(async item => {
        const isImported = existingUrlMap.has(item.link) || existingTitleMap.has(item.title)
        const finalCategoryHint = (item.categoryHint && item.categoryHint.trim().length > 0)
          ? item.categoryHint
          : defaultHint

        let thumbnail = item.thumbnailUrl
        if (!thumbnail && item.link) {
          thumbnail = (await scrapeArticleOgImage(item.link)) || ''
        }
        if (!thumbnail) {
          thumbnail = getFallbackImage(finalCategoryHint)
        }

        return {
          ...item,
          categoryHint: finalCategoryHint,
          thumbnailUrl: thumbnail,
          isAlreadyImported: isImported,
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: enrichedItems.length,
      items: enrichedItems,
    })
  } catch (error: any) {
    console.error('Error previewing feed:', error)
    return NextResponse.json({ error: error.message || 'Failed to parse RSS feed' }, { status: 500 })
  }
}

