import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processNewsApprovalEarning } from '@/lib/wallet-service'
import { uploadToYouTubeShorts } from '@/lib/youtube-service'
import { messaging } from '@/lib/firebase-admin'

export async function GET(request: Request) {
  try {
    // Enforce mandatory CRON_SECRET authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const now = new Date()

    // Find scheduled news whose scheduledAt time has passed
    const newsToPublish = await db.news.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: now,
        },
        deletedAt: null,
      },
    })

    if (newsToPublish.length === 0) {
      return NextResponse.json({ success: true, message: 'No scheduled news to publish' })
    }

    const publishedIds: string[] = []

    for (const news of newsToPublish) {
      // Update status to published
      await db.news.update({
        where: { id: news.id },
        data: {
          status: 'published',
          publishedAt: now,
        },
      })
      publishedIds.push(news.id)

      // Handle rewards and YouTube
      const isVideo = !!news.videoUrl
      if (news.reporterId) {
        await processNewsApprovalEarning(news.id, isVideo).catch(console.error)
      }

      if (isVideo && news.videoUrl) {
        uploadToYouTubeShorts(news.id, news.title, news.shortDesc || '', news.videoUrl, true).catch(console.error)
      }

      // Send push notification
      try {
        const isValidUrl = news.thumbnailUrl && news.thumbnailUrl.startsWith('http')
        await messaging.send({
          topic: news.districtId ? `district_${news.districtId}` : `state_${news.stateId}`,
          notification: {
            title: news.districtId ? 'New Update in Your District' : 'New Update in Your State',
            body: news.title,
            imageUrl: isValidUrl ? news.thumbnailUrl : undefined,
          },
          data: {
            route: `/feed?newsId=${news.id}`,
            newsId: news.id,
          },
          android: {
            notification: {
              sound: 'default',
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              }
            }
          }
        })
      } catch (fcmError) {
        console.error('Failed to send FCM notification for scheduled news:', fcmError)
      }
    }

    return NextResponse.json({
      success: true,
      publishedCount: publishedIds.length,
      publishedIds,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
