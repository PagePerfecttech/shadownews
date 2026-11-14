import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchAndParseFeed, getFallbackImage, scrapeArticleOgImage } from '@/lib/feed-parser'
import { processArticleWithAIAgent } from '@/lib/feed-ai-agent'
import { TELUGU_FEED_SOURCES } from '@/lib/feed-sources'
import { sendOneSignalNotification } from '@/lib/onesignal'
import { autoImportYouTubeShorts } from '@/lib/youtube-import'
import { generate5CharNewsId } from '@/lib/id-generator'

export async function GET(request: NextRequest) {
  return handleCron(request)
}

export async function POST(request: NextRequest) {
  return handleCron(request)
}

async function handleCron(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const secretQuery = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET is not configured in environment')
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` ||
      secretQuery === cronSecret

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    // 1. Fetch categories, states, and districts
    const [categories, states, districts, admin] = await Promise.all([
      db.category.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true } }),
      db.state.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true } }),
      db.district.findMany({ where: { isActive: true }, select: { id: true, name: true, stateId: true } }),
      db.admin.findFirst({ where: { isActive: true } }),
    ])

    if (!admin || categories.length === 0 || states.length === 0) {
      return NextResponse.json({ error: 'Database missing active admin, category, or state' }, { status: 500 })
    }

    // 2. Select top 3 priority sources for this cron run
    const prioritySources = [
      'https://news.google.com/rss?hl=te&gl=IN&ceid=IN:te', // Google News Top
      'https://news.google.com/rss/search?q=తెలంగాణ&hl=te&gl=IN&ceid=IN:te', // Telangana
      'https://news.google.com/rss/search?q=ఆంధ్రప్రదేశ్&hl=te&gl=IN&ceid=IN:te', // Andhra Pradesh
    ]

    let totalImported = 0
    let totalSkipped = 0

    for (const feedUrl of prioritySources) {
      try {
        const items = await fetchAndParseFeed(feedUrl, 6)

        for (const item of items) {
          // Check if already in DB
          const existing = await db.news.findFirst({
            where: {
              OR: [
                ...(item.link ? [{ sourceUrl: item.link }] : []),
                { title: item.title },
              ],
            },
          })

          if (existing) {
            totalSkipped++
            continue
          }

          // Resolve image if missing
          let thumbnail = item.thumbnailUrl
          if (!thumbnail && item.link) {
            thumbnail = (await scrapeArticleOgImage(item.link)) || ''
          }

          // Process with AI Agent
          const processed = await processArticleWithAIAgent(item, {
            categories,
            states,
            districts,
            options: { autoRewrite: true, autoCategory: true, autoLocation: true },
          })

          const finalThumb = thumbnail || getFallbackImage(processed.categorySlug)

          const newsId = await generate5CharNewsId()
          const created = await db.news.create({
            data: {
              id: newsId,
              shortCode: newsId,
              title: processed.aiTitle || item.title,
              shortDesc: processed.aiShortDesc.substring(0, 500),
              content: processed.aiContent,
              aiTitle: processed.aiTitle,
              aiShortDesc: processed.aiShortDesc,
              aiContent: processed.aiContent,
              aiStatus: processed.aiStatus,
              sourceType: 'feed_import',
              sourceUrl: item.link || null,
              externalLink: item.link || null,
              thumbnailUrl: finalThumb,
              imagesUrls: JSON.stringify([finalThumb]),
              status: 'published',
              priority: 'normal',
              publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
              categoryId: processed.categoryId,
              stateId: processed.stateId,
              districtId: processed.districtId || null,
              createdBy: admin.id,
              approvedBy: admin.id,
              approvedAt: new Date(),
            },
          })

          // Link tags
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

          totalImported++

          // Send push notification for newly imported published news (up to 1 per source run)
          try {
            await sendOneSignalNotification({
              title: created.title,
              body: created.shortDesc || 'తాజా వార్తలు - షాడో న్యూస్ లో ఇప్పుడే చదవండి',
              imageUrl: finalThumb && finalThumb.startsWith('http') ? finalThumb : undefined,
              data: {
                route: `/p/${created.id}`,
                newsId: created.id,
                type: 'news_detail',
              },
            })
          } catch (notifErr) {
            console.warn('Failed to send push notification for cron news item:', notifErr)
          }
        }
      } catch (feedErr) {
        console.warn(`Cron feed fetch error for ${feedUrl}:`, feedErr)
      }
    }

    // Auto-import YouTube Shorts for Videos section
    let youtubeShortsImported = 0
    try {
      const ytResult = await autoImportYouTubeShorts(2)
      youtubeShortsImported = ytResult.importedCount
    } catch (ytErr) {
      console.warn('YouTube Shorts Cron Auto-Import error:', ytErr)
    }

    return NextResponse.json({
      success: true,
      importedCount: totalImported,
      skippedCount: totalSkipped,
      youtubeShortsImported,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Feed Import Cron Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

