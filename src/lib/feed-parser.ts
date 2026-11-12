/**
 * Robust RSS / Atom Feed Parser for Telugu News Portals.
 * Extracts title, link, date, full text, and high-resolution thumbnail images.
 */

export interface RawFeedItem {
  id: string
  title: string
  link: string
  pubDate: string
  publishedAt: Date
  description: string
  content?: string
  author?: string
  sourceName?: string
  categoryHint?: string
  thumbnailUrl: string
}

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  politics: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&auto=format&fit=crop&q=80',
  crime: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
  sports: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop&q=80',
  entertainment: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
  business: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
  agriculture: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
  infrastructure: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
}

export function decodeHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#([0-9]{1,7});/gi, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .trim()
}

export function stripHtml(html: string): string {
  if (!html) return ''
  const decoded = decodeHtml(html)
  return decoded
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extracts candidate image URL from RSS XML chunk or HTML
 */
function extractImageFromXmlChunk(xml: string): string | null {
  // 1. media:content url="..."
  const mediaContentMatch = /<media:content[^>]+url=["']([^"']+)["']/i.exec(xml)
  if (mediaContentMatch?.[1]) return mediaContentMatch[1]

  // 2. media:thumbnail url="..."
  const mediaThumbMatch = /<media:thumbnail[^>]+url=["']([^"']+)["']/i.exec(xml)
  if (mediaThumbMatch?.[1]) return mediaThumbMatch[1]

  // 3. enclosure url="..." (with image MIME or extension)
  const enclosureMatch = /<enclosure[^>]+url=["']([^"']+)["']/i.exec(xml)
  if (enclosureMatch?.[1] && (enclosureMatch[0].includes('image') || enclosureMatch[1].match(/\.(jpg|jpeg|png|webp|gif)/i))) {
    return enclosureMatch[1]
  }

  // 4. img tag in description or content
  const imgMatch = /<img[^>]+src=["']([^"']+)["']/i.exec(xml)
  if (imgMatch?.[1]) return imgMatch[1]

  return null
}

/**
 * Quick scraper to fetch og:image or twitter:image from article HTML if RSS omitted image
 */
export async function scrapeArticleOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })

    if (!res.ok) return null
    const html = await res.text()

    const ogMatch =
      /<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i.exec(html) ||
      /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i.exec(html)

    if (ogMatch?.[1]) {
      const url = decodeHtml(ogMatch[1])
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }
    }
  } catch {
    // Timeout or network error - fail silently
  }
  return null
}

/**
 * Fetches and parses an RSS 2.0 or Atom feed.
 */
export async function fetchAndParseFeed(feedUrl: string, limit = 15): Promise<RawFeedItem[]> {
  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShadowNewsFeedBot/1.0 (+https://shadownews.in)',
      Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/html, */*',
    },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch feed from ${feedUrl}: HTTP ${res.status} ${res.statusText}`)
  }

  const xmlText = await res.text()
  return parseFeedXml(xmlText, feedUrl, limit)
}

/**
 * Parses raw XML/Atom string into normalized items
 */
export function parseFeedXml(xmlText: string, feedUrl = '', limit = 15): RawFeedItem[] {
  const items: RawFeedItem[] = []

  // Detect whether this is Atom (<entry>) or RSS (<item>)
  const isAtom = /<entry[\s>]/i.test(xmlText) && !/<item[\s>]/i.test(xmlText)
  const itemTagRegex = isAtom ? /<entry>([\s\S]*?)<\/entry>/gi : /<item>([\s\S]*?)<\/item>/gi

  let match: RegExpExecArray | null
  while ((match = itemTagRegex.exec(xmlText)) !== null && items.length < limit) {
    const rawItem = match[1]

    // Title
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(rawItem)
    if (!titleMatch) continue
    const title = stripHtml(titleMatch[1])
    if (!title || title.length < 5) continue

    // Link
    let link = ''
    if (isAtom) {
      const atomLink = /<link[^>]+href=["']([^"']+)["']/i.exec(rawItem)
      link = atomLink ? decodeHtml(atomLink[1]) : ''
    } else {
      const rssLink = /<link[^>]*>([\s\S]*?)<\/link>/i.exec(rawItem)
      link = rssLink ? stripHtml(rssLink[1]) : ''
    }

    // PubDate
    const dateMatch =
      /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i.exec(rawItem) ||
      /<published[^>]*>([\s\S]*?)<\/published>/i.exec(rawItem) ||
      /<updated[^>]*>([\s\S]*?)<\/updated>/i.exec(rawItem) ||
      /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i.exec(rawItem)

    const pubDateStr = dateMatch ? stripHtml(dateMatch[1]) : new Date().toISOString()
    const parsedDate = new Date(pubDateStr)
    const publishedAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate

    // Description / Summary
    const descMatch =
      /<description[^>]*>([\s\S]*?)<\/description>/i.exec(rawItem) ||
      /<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(rawItem)
    const rawDesc = descMatch ? descMatch[1] : ''
    const cleanDesc = stripHtml(rawDesc)

    // Full Content (content:encoded or content)
    const contentMatch =
      /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i.exec(rawItem) ||
      /<content[^>]*>([\s\S]*?)<\/content>/i.exec(rawItem)
    const cleanContent = contentMatch ? stripHtml(contentMatch[1]) : cleanDesc

    // Source / Author
    const sourceMatch =
      /<source[^>]*>([\s\S]*?)<\/source>/i.exec(rawItem) ||
      /<author[^>]*>([\s\S]*?)<\/author>/i.exec(rawItem) ||
      /<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(rawItem)
    const sourceName = sourceMatch ? stripHtml(sourceMatch[1]) : detectSourceFromUrl(link || feedUrl)

    // Category hint
    const categoryMatch = /<category[^>]*>([\s\S]*?)<\/category>/i.exec(rawItem)
    const categoryHint = categoryMatch ? stripHtml(categoryMatch[1]) : ''

    // Unique ID
    const guidMatch =
      /<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(rawItem) ||
      /<id[^>]*>([\s\S]*?)<\/id>/i.exec(rawItem)
    const id = guidMatch ? stripHtml(guidMatch[1]) : link || title

    // Image extraction
    let imageUrl = extractImageFromXmlChunk(rawItem)
    if (!imageUrl && rawDesc) {
      imageUrl = extractImageFromXmlChunk(rawDesc)
    }

    items.push({
      id,
      title,
      link,
      pubDate: pubDateStr,
      publishedAt,
      description: cleanDesc || title,
      content: cleanContent || cleanDesc || title,
      author: sourceName,
      sourceName,
      categoryHint,
      thumbnailUrl: imageUrl || '',
    })
  }

  return items
}

export function detectSourceFromUrl(url: string): string {
  if (!url) return 'Telugu News'
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('google')) return 'Google News'
    if (hostname.includes('eenadu')) return 'Eenadu'
    if (hostname.includes('sakshi')) return 'Sakshi'
    if (hostname.includes('tv9')) return 'TV9 Telugu'
    if (hostname.includes('abplive') || hostname.includes('abpdesam')) return 'ABP Desam'
    if (hostname.includes('teluguone')) return 'TeluguOne'
    if (hostname.includes('andhrajyothy')) return 'Andhrajyothy'
    if (hostname.includes('asianet')) return 'Asianet Telugu'
    if (hostname.includes('oneindia')) return 'Oneindia Telugu'
    if (hostname.includes('samayam')) return 'Samayam Telugu'
    return hostname.replace('www.', '')
  } catch {
    return 'Telugu News'
  }
}

export function getFallbackImage(categorySlug?: string): string {
  if (!categorySlug) return DEFAULT_CATEGORY_IMAGES.default
  return DEFAULT_CATEGORY_IMAGES[categorySlug.toLowerCase()] || DEFAULT_CATEGORY_IMAGES.default
}

