import { db } from './db'
import { stripHtml } from './feed-parser'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface YouTubeShortItem {
  videoId: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  publishedAt: Date
  channelTitle: string
}

export const POPULAR_TELUGU_CHANNELS = [
  { id: 'UC4MFxsRwnB2EnPYu4Bpntxw', handle: '@ShadowNewsMedia', name: 'Shadow News (Official)' },
  { id: 'UCPXTXMecYqnRKNdqdVOGSFg', handle: '@TV9TeluguLive', name: 'TV9 Telugu Live' },
  { id: 'UCZ9m4KOh8Ei60428xeGYDCQ', handle: '@sakshitv', name: 'Sakshi TV' },
  { id: 'UCd_x_1Fk98Zg90H_y0GjNqQ', handle: '@ntvtelugunews', name: 'NTV Telugu' },
  { id: 'UC4Z7m9T7y9jNqL2yqR4T7ug', handle: '@V6NewsTelugu', name: 'V6 News Telugu' },
  { id: 'UCW4pU0M8T6yT5kK9rL7yQ1w', handle: '@abntelugutv', name: 'ABN Telugu' },
]

/**
 * Resolve a YouTube Channel URL, @handle, or ID into a canonical YouTube channel ID (UC...)
 */
export async function resolveChannelId(input: string): Promise<string | null> {
  let trimmed = input.trim()
  if (!trimmed) return null

  // If already a 24-character UC ID
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return trimmed
  }

  // If URL contains /channel/UC...
  const channelUrlMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/i)
  if (channelUrlMatch) {
    return channelUrlMatch[1]
  }

  // Strip query parameters and subpaths like /videos, /shorts, /featured, /streams, /live, /community
  trimmed = trimmed.split('?')[0].replace(/\/+$/, '')
  trimmed = trimmed.replace(/\/(videos|shorts|featured|streams|live|community)$/i, '')

  // Re-check channel match in case subpath was removed
  const cleanChannelUrlMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/i)
  if (cleanChannelUrlMatch) {
    return cleanChannelUrlMatch[1]
  }

  // Quick match against POPULAR_TELUGU_CHANNELS handles and IDs
  for (const ch of POPULAR_TELUGU_CHANNELS) {
    const handleClean = ch.handle.replace(/^@/, '').toLowerCase()
    const inputLower = trimmed.toLowerCase()
    if (
      inputLower === ch.id.toLowerCase() ||
      inputLower === ch.handle.toLowerCase() ||
      inputLower === handleClean ||
      inputLower.endsWith('/' + ch.handle.toLowerCase()) ||
      inputLower.endsWith('/@' + handleClean)
    ) {
      return ch.id
    }
  }

  // Handle URL or @handle: @channel or https://www.youtube.com/@channel
  let targetUrl = trimmed
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://www.youtube.com/${trimmed.startsWith('@') ? trimmed : '@' + trimmed}`
  }

  try {
    let html = ''
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        html = await res.text()
      }
    } catch {
      // Fallback to curl with 10MB buffer
      try {
        const { stdout } = await execFileAsync(
          'curl.exe',
          [
            '-s',
            '-L',
            '--max-time',
            '10',
            '-A',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            targetUrl,
          ],
          { maxBuffer: 10 * 1024 * 1024 }
        )
        html = stdout
      } catch (curlErr) {
        console.warn(`Curl fallback failed for ${targetUrl}:`, curlErr)
      }
    }

    if (html) {
      const match =
        html.match(/channel\/(UC[\w-]{22})/i) ||
        html.match(/"channelId":"(UC[\w-]{22})"/i) ||
        html.match(/"browseId":"(UC[\w-]{22})"/i) ||
        html.match(/itemprop="identifier" content="(UC[\w-]{22})"/i) ||
        html.match(/<meta itemprop="channelId" content="(UC[\w-]{22})"/i)

      if (match && match[1]) {
        return match[1]
      }
    }
  } catch (err) {
    console.warn(`Failed to resolve channel ID for ${input}:`, err)
  }

  return null
}

/**
 * Fetch latest YouTube videos/shorts for a channel via public YouTube XML feed (No API Key Required)
 */
export async function fetchYouTubeChannelVideos(channelId: string, limit: number = 20): Promise<YouTubeShortItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  try {
    let xml = ''
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) xml = await res.text()
    } catch {
      // Fallback to curl
      try {
        const { stdout } = await execFileAsync('curl.exe', ['-s', '-L', '--max-time', '10', url], {
          maxBuffer: 5 * 1024 * 1024,
        })
        xml = stdout
      } catch (curlErr) {
        console.warn(`Curl feed fetch error for channel ${channelId}:`, curlErr)
      }
    }

    if (!xml || xml.length < 50) {
      console.warn(`Failed to fetch YouTube feed for channel ${channelId}`)
      return []
    }
    const items: YouTubeShortItem[] = []

    // Match all <entry> tags
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
    let match: RegExpExecArray | null

    while ((match = entryRegex.exec(xml)) !== null && items.length < limit) {
      const entryXml = match[1]

      // Extract video ID
      const videoIdMatch = /<yt:videoId>([^<]+)<\/yt:videoId>/i.exec(entryXml)
      if (!videoIdMatch) continue
      const videoId = videoIdMatch[1].trim()

      // Extract title
      const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(entryXml)
      const rawTitle = titleMatch ? titleMatch[1] : ''
      const title = stripHtml(rawTitle)

      // Extract description
      const descMatch = /<media:description>([\s\S]*?)<\/media:description>/i.exec(entryXml)
      const description = descMatch ? stripHtml(descMatch[1]) : title

      // Extract published date
      const pubMatch = /<published>([^<]+)<\/published>/i.exec(entryXml)
      const publishedAt = pubMatch ? new Date(pubMatch[1]) : new Date()

      // Extract channel name
      const authorMatch = /<author>\s*<name>([^<]+)<\/name>/i.exec(entryXml)
      const channelTitle = authorMatch ? stripHtml(authorMatch[1]) : 'Telugu News'

      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

      items.push({
        videoId,
        title,
        description,
        videoUrl,
        thumbnailUrl,
        publishedAt,
        channelTitle,
      })
    }

    return items
  } catch (err) {
    console.warn(`Error fetching channel ${channelId}:`, err)
    return []
  }
}

/**
 * Import a single YouTube Shorts / Video directly by its URL using oEmbed
 */
export async function importYouTubeVideoByUrl(rawUrl: string): Promise<{ success: boolean; video?: any; error?: string }> {
  try {
    const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/)
    if (!match || !match[1]) {
      return { success: false, error: 'Invalid YouTube URL' }
    }

    const videoId = match[1]
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`

    // Check existing
    const existing = await db.video.findFirst({
      where: {
        OR: [
          { youtubeVideoId: videoId },
          { videoUrl: shortsUrl },
          { videoUrl },
          { videoUrl: rawUrl },
        ],
      },
    })

    if (existing) {
      if (!existing.youtubeVideoId) {
        await db.video.update({
          where: { id: existing.id },
          data: { youtubeVideoId: videoId },
        }).catch(() => {})
      }
      return { success: true, video: existing }
    }

    // Fetch details via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    let data: any = {}
    try {
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        data = await res.json()
      }
    } catch {
      try {
        const { stdout } = await execFileAsync('curl.exe', ['-s', '-L', '--max-time', '8', oembedUrl])
        data = JSON.parse(stdout)
      } catch {
        data = {
          title: 'Telugu News Video',
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        }
      }
    }

    const defaultCategory = await db.category.findFirst({
      where: { isActive: true },
      select: { id: true },
    })

    const created = await db.video.create({
      data: {
        title: data.title || 'Telugu News Video',
        description: data.author_name ? `Reported by ${data.author_name}` : null,
        videoUrl,
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 60,
        categoryId: defaultCategory?.id || null,
        status: 'published',
        youtubeVideoId: videoId,
      },
    })

    return { success: true, video: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Import failed' }
  }
}

/**
 * Import latest shorts/videos from a specific channel (link, handle, or ID)
 */
export async function importYouTubeShortsFromChannel(
  channelInput: string,
  limit: number = 20
): Promise<{
  success: boolean
  channelId?: string
  importedCount: number
  skippedCount: number
  importedVideos: Array<{ id: string; title: string; videoUrl: string }>
  error?: string
}> {
  const channelId = await resolveChannelId(channelInput)
  if (!channelId) {
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      importedVideos: [],
      error: `Could not resolve YouTube channel from "${channelInput}". Please check the channel link or handle.`,
    }
  }

  const items = await fetchYouTubeChannelVideos(channelId, limit)
  let importedCount = 0
  let skippedCount = 0
  const importedVideos: Array<{ id: string; title: string; videoUrl: string }> = []

  const defaultCategory = await db.category.findFirst({
    where: { isActive: true },
    select: { id: true },
  })

  for (const item of items) {
    const existing = await db.video.findFirst({
      where: {
        OR: [
          { youtubeVideoId: item.videoId },
          { videoUrl: item.videoUrl },
          { videoUrl: `https://www.youtube.com/watch?v=${item.videoId}` },
          { videoUrl: `https://www.youtube.com/shorts/${item.videoId}` },
          { title: item.title },
        ],
      },
    })

    if (existing) {
      if (!existing.youtubeVideoId) {
        await db.video.update({
          where: { id: existing.id },
          data: { youtubeVideoId: item.videoId },
        }).catch(() => {})
      }
      skippedCount++
      continue
    }

    const created = await db.video.create({
      data: {
        title: item.title,
        description: item.description,
        videoUrl: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl,
        duration: 60,
        categoryId: defaultCategory?.id || null,
        status: 'published',
        createdAt: item.publishedAt,
        youtubeVideoId: item.videoId,
      },
    })

    importedVideos.push({
      id: created.id,
      title: created.title,
      videoUrl: created.videoUrl,
    })
    importedCount++
  }

  return {
    success: true,
    channelId,
    importedCount,
    skippedCount,
    importedVideos,
  }
}

/**
 * Auto-import YouTube Shorts into the Videos section (`db.video`) from popular Telugu channels.
 */
export async function autoImportYouTubeShorts(limitPerChannel: number = 3): Promise<{
  importedCount: number
  skippedCount: number
  importedVideos: Array<{ id: string; title: string; videoUrl: string }>
}> {
  let importedCount = 0
  let skippedCount = 0
  const importedVideos: Array<{ id: string; title: string; videoUrl: string }> = []

  for (const channel of POPULAR_TELUGU_CHANNELS) {
    const res = await importYouTubeShortsFromChannel(channel.id, limitPerChannel)
    importedCount += res.importedCount
    skippedCount += res.skippedCount
    importedVideos.push(...res.importedVideos)
  }

  return { importedCount, skippedCount, importedVideos }
}
