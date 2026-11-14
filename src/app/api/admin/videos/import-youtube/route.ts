import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import {
  autoImportYouTubeShorts,
  importYouTubeShortsFromChannel,
  importYouTubeVideoByUrl,
  POPULAR_TELUGU_CHANNELS,
} from '@/lib/youtube-import'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    return NextResponse.json({
      success: true,
      popularChannels: POPULAR_TELUGU_CHANNELS,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { channel, channelUrl, channelHandle, channelId, url, videoUrl, limit = 10 } = body

    // 1. Single video / shorts URL
    const targetUrl = url || videoUrl
    if (targetUrl) {
      const res = await importYouTubeVideoByUrl(targetUrl)
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to import video' }, { status: 400 })
      }
      return NextResponse.json({ success: true, video: res.video })
    }

    // 2. Specific channel (URL, @handle, or ID)
    const targetChannel = channel || channelUrl || channelHandle || channelId
    if (targetChannel && typeof targetChannel === 'string' && targetChannel.trim().length > 0) {
      const res = await importYouTubeShortsFromChannel(targetChannel.trim(), Math.min(Number(limit) || 10, 30))
      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to import from channel' }, { status: 400 })
      }
      return NextResponse.json(res)
    }

    // 3. Default: Auto-import from Popular Telugu channels
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
