import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils'
import { processNewsApprovalEarning, reverseNewsReward } from '@/lib/wallet-service'
import { processNewsRejectionScore } from '@/lib/scoring-service'
import { uploadToYouTubeShorts } from '@/lib/youtube-service'
import { messaging } from '@/lib/firebase-admin'
import { sendOneSignalNotification } from '@/lib/onesignal'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const news = await db.news.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        state: true,
        district: true,
        reporter: true,
        approver: { select: { id: true, name: true, email: true } },
        admin: { select: { id: true, name: true, email: true } },
        tags: { include: { tag: true } },
      },
    })

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...news,
      imagesUrls: safeJsonParse<string[]>(news.imagesUrls || '[]', []),
    })
  } catch (error) {
    console.error('News get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await request.json()

    const existingNews = await db.news.findUnique({ where: { id }, select: { status: true } })
    if (!existingNews) return NextResponse.json({ error: 'News not found' }, { status: 404 })
    const wasPublished = existingNews.status === 'published'

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.shortDesc !== undefined) updateData.shortDesc = data.shortDesc || null
    if (data.content !== undefined) updateData.content = data.content || null
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.stateId !== undefined) updateData.stateId = data.stateId
    if (data.districtId !== undefined) {
      updateData.districtId = data.districtId || null
      if (data.districtId && !data.stateId) {
        const dist = await db.district.findUnique({ where: { id: data.districtId }, select: { stateId: true } })
        if (dist?.stateId) {
          updateData.stateId = dist.stateId
        }
      }
    }
    if (data.mandalId !== undefined) updateData.mandalId = data.mandalId || null
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl || ''
    if (data.imagesUrls !== undefined) updateData.imagesUrls = safeJsonStringify(data.imagesUrls || [])
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl || null
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType
    if (data.reporterId !== undefined) updateData.reporterId = data.reporterId || null
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'published') {
        if (!wasPublished) updateData.publishedAt = new Date()
        updateData.approvedBy = admin.id
        updateData.approvedAt = new Date()
      }
    }
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    if (data.scheduledAt !== undefined) updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
    if (data.externalLink !== undefined) updateData.externalLink = data.externalLink || null
    if (data.rejectReason !== undefined) updateData.rejectReason = data.rejectReason || null

    const news = await db.news.update({
      where: { id },
      data: updateData,
    })

    // Update tags
    if (data.tagIds) {
      await db.newsTag.deleteMany({ where: { newsId: id } })
      if (data.tagIds.length > 0) {
        await db.newsTag.createMany({
          data: data.tagIds.map((tagId: string) => ({
            newsId: id,
            tagId,
          })),
        })
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'update',
        entity: 'news',
        entityId: id,
        changes: JSON.stringify({ title: data.title, status: data.status }),
      },
    })

    // Process Earning & YouTube if newly published
    if (data.status === 'published' && !wasPublished) {
      const isVideo = !!(news.videoUrl)
      await processNewsApprovalEarning(id, isVideo)

      if (isVideo && news.videoUrl) {
        // Run youtube upload asynchronously
        uploadToYouTubeShorts(id, news.title, news.shortDesc || '', news.videoUrl, true)
      }

      // Send push notification if requested
      if (data.sendNotification !== false) {
        try {
          const isBreaking = news.priority === 'urgent' || news.priority === 'breaking' || news.isFeatured
          const isValidUrl = news.thumbnailUrl && news.thumbnailUrl.startsWith('http')
          const targetTopic = isBreaking ? 'all' : (news.districtId ? `district_${news.districtId}` : 'all')

          await messaging.send({
            topic: targetTopic,
            notification: {
              title: isBreaking ? `🚨 బ్రేకింగ్ న్యూస్: ${news.title}` : news.title,
              body: news.shortDesc || news.title,
              imageUrl: isValidUrl ? news.thumbnailUrl : undefined,
            },
            data: {
              route: `/p/${news.id}`,
              newsId: news.id,
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'shadownews_default_channel',
                sound: 'default',
                priority: 'max',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          })
          console.log(`FCM notification sent for news update to topic: ${targetTopic}`)
        } catch (fcmError) {
          console.error('Failed to send FCM notification:', fcmError)
        }

        // Send OneSignal Push Notification
        try {
          const isBreaking = news.priority === 'urgent' || news.priority === 'breaking' || news.isFeatured
          const isValidUrl = news.thumbnailUrl && news.thumbnailUrl.startsWith('http')
          await sendOneSignalNotification({
            title: isBreaking ? `🚨 బ్రేకింగ్ న్యూస్: ${news.title}` : news.title,
            body: news.shortDesc || news.title,
            imageUrl: isValidUrl ? news.thumbnailUrl : undefined,
            data: {
              route: `/p/${news.id}`,
              newsId: news.id,
            },
          })
        } catch (osError) {
          console.error('Failed to send OneSignal push notification:', osError)
        }
      }
    }

    return NextResponse.json({ ...news, imagesUrls: safeJsonParse<string[]>(news.imagesUrls || '[]', []) })
  } catch (error) {
    console.error('News update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await request.json()

    const existingNews = await db.news.findUnique({ where: { id }, select: { status: true } })
    if (!existingNews) return NextResponse.json({ error: 'News not found' }, { status: 404 })
    const wasPublished = existingNews.status === 'published'

    const updateData: Record<string, unknown> = { status: data.status }
    if (data.status === 'published' && !wasPublished) {
      updateData.publishedAt = new Date()
    }
    if (data.status === 'rejected') {
      updateData.rejectReason = data.rejectReason || null
    }

    const news = await db.news.update({
      where: { id },
      data: updateData,
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: `status_${data.status}`,
        entity: 'news',
        entityId: id,
        changes: JSON.stringify({ status: data.status, rejectReason: data.rejectReason }),
      },
    })

    if (data.status === 'rejected') {
      if (wasPublished) {
        await reverseNewsReward(id, data.rejectReason || 'Article rejected after publication')
      }
      if (news.reporterId) {
        await processNewsRejectionScore(news.reporterId)
      }
    }

    if (data.status === 'published' && !wasPublished) {
      const isVideo = !!(news.videoUrl)
      await processNewsApprovalEarning(id, isVideo)

      if (isVideo && news.videoUrl) {
        uploadToYouTubeShorts(id, news.title, news.shortDesc || '', news.videoUrl, true)
      }

      // Send push notification if requested
      if (data.sendNotification !== false) {
        try {
          const isBreaking = news.priority === 'urgent' || news.priority === 'breaking' || news.isFeatured
          const isValidUrl = news.thumbnailUrl && news.thumbnailUrl.startsWith('http')
          const targetTopic = isBreaking ? 'all' : (news.districtId ? `district_${news.districtId}` : 'all')

          await messaging.send({
            topic: targetTopic,
            notification: {
              title: isBreaking ? `🚨 బ్రేకింగ్ న్యూస్: ${news.title}` : news.title,
              body: news.shortDesc || news.title,
              imageUrl: isValidUrl ? news.thumbnailUrl : undefined,
            },
            data: {
              route: `/p/${news.id}`,
              newsId: news.id,
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'shadownews_default_channel',
                sound: 'default',
                priority: 'max',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          })
          console.log(`FCM notification sent for news update to topic: ${targetTopic}`)
        } catch (fcmError) {
          console.error('Failed to send FCM notification:', fcmError)
        }

        // Send OneSignal Push Notification
        try {
          const isBreaking = news.priority === 'urgent' || news.priority === 'breaking' || news.isFeatured
          const isValidUrl = news.thumbnailUrl && news.thumbnailUrl.startsWith('http')
          await sendOneSignalNotification({
            title: isBreaking ? `🚨 బ్రేకింగ్ న్యూస్: ${news.title}` : news.title,
            body: news.shortDesc || news.title,
            imageUrl: isValidUrl ? news.thumbnailUrl : undefined,
            data: {
              route: `/p/${news.id}`,
              newsId: news.id,
            },
          })
        } catch (osError) {
          console.error('Failed to send OneSignal push notification:', osError)
        }
      }
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('News status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await db.news.findUnique({ where: { id }, select: { status: true } })
    if (existing?.status === 'published') {
      await reverseNewsReward(id, 'Article deleted by admin')
    }

    await db.news.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'delete',
        entity: 'news',
        entityId: id,
        changes: '{}',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('News delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
