import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchAndParseFeed, getFallbackImage, scrapeArticleOgImage } from '@/lib/feed-parser'
import { processArticleWithAIAgent } from '@/lib/feed-ai-agent'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const secretQuery = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    // CRITICAL: cronSecret MUST be configured and match
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}` && secretQuery !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const [categories, states, districts, admin] = await Promise.all([
      db.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true } }),
      db.state.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true } }),
      db.district.findMany({ where: { isActive: true }, select: { id: true, name: true, stateId: true } }),
      db.admin.findFirst({ where: { isActive: true } }),
    ])

    if (!admin || categories.length === 0 || states.length === 0) {
      return NextResponse.json({ error: 'Database state missing active category, state, or admin' }, { status: 500 })
    }

    const rssUrl = 'https://www.teluguone.com/news/rss/latestnews/latestnews-25.rss'
    const items = await fetchAndParseFeed(rssUrl, 10)
    let importedCount = 0

    for (const item of items) {
      const existing = await db.news.findFirst({
        where: {
          OR: [
            ...(item.link ? [{ sourceUrl: item.link }] : []),
            { title: item.title },
          ],
        },
      })
      if (existing) continue

      let thumbnail = item.thumbnailUrl
      if (!thumbnail && item.link) {
        thumbnail = (await scrapeArticleOgImage(item.link)) || ''
      }

      const processed = await processArticleWithAIAgent(item, {
        categories,
        states,
        districts,
        options: { autoRewrite: true, autoCategory: true, autoLocation: true },
      })

      const finalThumbnail = thumbnail || getFallbackImage(processed.categorySlug)

      const created = await db.news.create({
        data: {
          title: processed.aiTitle || item.title,
          shortDesc: processed.aiShortDesc.substring(0, 500),
          content: processed.aiContent,
          aiTitle: processed.aiTitle,
          aiShortDesc: processed.aiShortDesc,
          aiContent: processed.aiContent,
          aiStatus: processed.aiStatus,
          thumbnailUrl: finalThumbnail,
          imagesUrls: JSON.stringify([finalThumbnail]),
          sourceType: 'rss',
          sourceUrl: item.link || null,
          externalLink: item.link || null,
          status: 'published',
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          categoryId: processed.categoryId,
          stateId: processed.stateId,
          districtId: processed.districtId || null,
          createdBy: admin.id,
          approvedBy: admin.id,
          approvedAt: new Date(),
        },
      })

      if (processed.tags && processed.tags.length > 0) {
        for (const tagName of processed.tags) {
          try {
            const slug = tagName.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F]+/g, '-').replace(/(^-|-$)/g, '') || `tag-${Date.now()}`
            const tag = await db.tag.upsert({
              where: { slug },
              update: {},
              create: { name: tagName, slug, type: 'topic' },
            })
            await db.newsTag.upsert({
              where: { newsId_tagId: { newsId: created.id, tagId: tag.id } },
              update: {},
              create: { newsId: created.id, tagId: tag.id },
            })
          } catch {}
        }
      }

      importedCount++
    }

    return NextResponse.json({ success: true, importedCount })
  } catch (error: any) {
    console.error('RSS Cron Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
