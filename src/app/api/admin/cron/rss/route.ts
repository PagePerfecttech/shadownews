import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function decodeHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .trim()
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // CRITICAL: cronSecret MUST be configured and match
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const rssUrl = 'https://www.teluguone.com/news/rss/latestnews/latestnews-25.rss'
    const res = await fetch(rssUrl, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch RSS feed: ${res.statusText}` }, { status: 502 })
    }

    const rssData = await res.text()
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    const rawItems: string[] = []
    while ((match = itemRegex.exec(rssData)) !== null) {
      rawItems.push(match[1])
    }

    // Process top 10 items
    const itemsToProcess = rawItems.slice(0, 10)
    let importedCount = 0

    // Get default category and state
    const category = await db.category.findFirst({ where: { isActive: true } })
    const state = await db.state.findFirst({ where: { isActive: true } })
    const admin = await db.admin.findFirst({ where: { isActive: true } })

    if (!category || !state || !admin) {
      return NextResponse.json({ error: 'Database state missing active category, state, or admin' }, { status: 500 })
    }

    const defaultThumbnail = 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop&q=60'

    for (const rawItem of itemsToProcess) {
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(rawItem)
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(rawItem)
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(rawItem)

      if (!titleMatch || !linkMatch) continue

      const title = decodeHtml(titleMatch[1])
      const link = decodeHtml(linkMatch[1])
      const pubDateStr = pubDateMatch ? decodeHtml(pubDateMatch[1]) : new Date().toISOString()
      const publishedAt = new Date(pubDateStr)

      const existing = await db.news.findFirst({ where: { title } })
      if (existing) continue

      let description = `తెలుగువన్ అందిస్తున్న తాజా వార్తలు: ${title}.`
      let imageUrl = defaultThumbnail

      try {
        const pageRes = await fetch(link, { cache: 'no-store' })
        if (pageRes.ok) {
          const pageHtml = await pageRes.text()
          const ogDescMatch = /<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml) ||
                              /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml)
          if (ogDescMatch) description = decodeHtml(ogDescMatch[1])

          const ogImageMatch = /<meta\s+property=["']og:image["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml) ||
                               /<meta\s+name=["']twitter:image["']\s+content=["']([\s\S]*?)["']/.exec(pageHtml)
          if (ogImageMatch) imageUrl = decodeHtml(ogImageMatch[1])
        }
      } catch (err) {
        console.warn(`Failed to scrape ${link}, using default meta.`)
      }

      await db.news.create({
        data: {
          title,
          shortDesc: description.substring(0, 500),
          content: description,
          thumbnailUrl: imageUrl,
          imagesUrls: JSON.stringify([imageUrl]),
          sourceType: 'rss',
          sourceUrl: link,
          status: 'published',
          publishedAt,
          categoryId: category.id,
          stateId: state.id,
          createdBy: admin.id,
        }
      })
      importedCount++
    }

    return NextResponse.json({ success: true, importedCount })
  } catch (error: any) {
    console.error('RSS Cron Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
