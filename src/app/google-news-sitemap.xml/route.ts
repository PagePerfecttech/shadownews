import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const revalidate = 900 // Revalidate every 15 minutes

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shadownews.com'
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  try {
    const newsArticles = await db.news.findMany({
      where: {
        status: 'published',
        deletedAt: null,
        publishedAt: { gte: twoDaysAgo },
      },
      select: {
        id: true,
        title: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 1000,
    })

    const escapeXml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${newsArticles
    .map((item) => {
      const pubDate = (item.publishedAt || item.createdAt || new Date()).toISOString()
      return `
  <url>
    <loc>${baseUrl}/p/${item.id}</loc>
    <news:news>
      <news:publication>
        <news:name>Shadow News</news:name>
        <news:language>te</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(item.title)}</news:title>
    </news:news>
  </url>`
    })
    .join('')}
</urlset>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Google News sitemap error:', error)
    return new NextResponse('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}
