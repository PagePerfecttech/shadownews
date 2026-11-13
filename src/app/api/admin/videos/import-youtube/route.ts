import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { autoImportYouTubeShorts, fetchYouTubeChannelVideos, importYouTubeVideoByUrl } from '@/lib/youtube-import'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { channelId, url, videoUrl } = body

    const targetUrl = url || videoUrl
    if (targetUrl) {
      const res = await importYouTubeVideoByUrl(targetUrl)
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to import video' }, { status: 400 })
      }
      return NextResponse.json({ success: true, video: res.video })
    }

    if (channelId) {
      const items = await fetchYouTubeChannelVideos(channelId, 10)
      let count = 0

      const defaultCategory = await db.category.findFirst({
        where: { isActive: true },
        select: { id: true },
      })

      for (const item of items) {
        const existing = await db.video.findFirst({
          where: {
            OR: [
              { videoUrl: item.videoUrl },
              { title: item.title },
            ],
          },
        })

        if (!existing) {
          await db.video.create({
            data: {
              title: item.title,
              description: item.description,
              videoUrl: item.videoUrl,
              thumbnailUrl: item.thumbnailUrl,
              duration: 60,
              categoryId: defaultCategory?.id || null,
              status: 'published',
              createdAt: item.publishedAt,
            },
          })
          count++
        }
      }

      return NextResponse.json({
        success: true,
        importedCount: count,
        totalFetched: items.length,
      })
    }

    // Default: Auto-import from Telugu news YouTube channels
    const result = await autoImportYouTubeShorts(3)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('YouTube Shorts Import Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
