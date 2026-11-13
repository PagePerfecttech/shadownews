import { db } from './db'
import { stripHtml } from './feed-parser'

export interface YouTubeShortItem {
  videoId: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  publishedAt: Date
  channelTitle: string
}

const TELUGU_NEWS_CHANNELS = [
  { id: 'UCPXTXMecYqnRKNdqdVOGSFg', name: 'TV9 Telugu Live' },
  { id: 'UCZ9m4KOh8Ei60428xeGYDCQ', name: 'Sakshi TV' },
]

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Fetch latest YouTube videos/shorts for a channel via public YouTube XML feed (No API Key Required)
 */
export async function fetchYouTubeChannelVideos(channelId: string, limit: number = 10): Promise<YouTubeShortItem[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  try {
    let xml = ''
    try {
      const { stdout } = await execFileAsync('curl.exe', ['-s', '-L', '--max-time', '10', url])
      xml = stdout
    } catch {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) xml = await res.text()
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
      const videoUrl = `https://www.youtube.com/shorts/${videoId}`

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
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`

    // Check existing
    const existing = await db.video.findFirst({
      where: {
        OR: [
          { videoUrl: shortsUrl },
          { videoUrl: `https://www.youtube.com/watch?v=${videoId}` },
          { videoUrl: rawUrl },
        ],
      },
    })

    if (existing) {
      return { success: true, video: existing }
    }

    // Fetch details via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const { stdout } = await execFileAsync('curl.exe', ['-s', '-L', '--max-time', '8', oembedUrl])
    let data: any = {}
    try {
      data = JSON.parse(stdout)
    } catch {
      data = {
        title: 'Telugu News Shorts',
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      }
    }

    const defaultCategory = await db.category.findFirst({
      where: { isActive: true },
      select: { id: true },
    })

    const created = await db.video.create({
      data: {
        title: data.title || 'Telugu News Shorts',
        description: data.author_name ? `Reported by ${data.author_name}` : null,
        videoUrl: shortsUrl,
        thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: 60,
        categoryId: defaultCategory?.id || null,
        status: 'published',
      },
    })

    return { success: true, video: created }
  } catch (err: any) {
    return { success: false, error: err.message || 'Import failed' }
  }
}

/**
 * Auto-import YouTube Shorts into the Videos section (`db.video`).
 * Ensures no duplicate videos are added and links to an active category.
 */
export async function autoImportYouTubeShorts(limitPerChannel: number = 3): Promise<{
  importedCount: number
  skippedCount: number
  importedVideos: Array<{ id: string; title: string; videoUrl: string }>
}> {
  let importedCount = 0
  let skippedCount = 0
  const importedVideos: Array<{ id: string; title: string; videoUrl: string }> = []

  // Get active category for news/videos
  const defaultCategory = await db.category.findFirst({
    where: { isActive: true },
    select: { id: true },
  })

  for (const channel of TELUGU_NEWS_CHANNELS) {
    const items = await fetchYouTubeChannelVideos(channel.id, limitPerChannel)

    for (const item of items) {
      // Check if video already exists in db.video
      const existingVideo = await db.video.findFirst({
        where: {
          OR: [
            { videoUrl: item.videoUrl },
            { videoUrl: `https://www.youtube.com/watch?v=${item.videoId}` },
            { title: item.title },
          ],
        },
      })

      if (existingVideo) {
        skippedCount++
        continue
      }

      // Check if also exists in db.news
      const existingNews = await db.news.findFirst({
        where: {
          OR: [
            { videoUrl: item.videoUrl },
            { videoUrl: `https://www.youtube.com/watch?v=${item.videoId}` },
          ],
        },
      })

      if (existingNews) {
        skippedCount++
        continue
      }

      const created = await db.video.create({
        data: {
          title: item.title,
          description: item.description,
          videoUrl: item.videoUrl,
          thumbnailUrl: item.thumbnailUrl,
          duration: 60, // standard shorts length
          categoryId: defaultCategory?.id || null,
          status: 'published',
          createdAt: item.publishedAt,
        },
      })

      importedVideos.push({
        id: created.id,
        title: created.title,
        videoUrl: created.videoUrl,
      })

      importedCount++
    }
  }

  return { importedCount, skippedCount, importedVideos }
}
