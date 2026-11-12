import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils'
import { messaging } from '@/lib/firebase-admin'
import { sendOneSignalNotification } from '@/lib/onesignal'

import { generate5CharNewsId } from '@/lib/id-generator'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const districtId = searchParams.get('districtId')
    const priority = searchParams.get('priority')
    const reporterId = searchParams.get('reporterId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    // SECURITY: Cap limit to maximum of 100 to prevent DoS
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100)
    const search = searchParams.get('search')?.trim()

    // SECURITY: Validate search string length
    if (search && search.length > 100) {
      return NextResponse.json({ error: 'Search query too long (max 100 characters)' }, { status: 400 })
    }

    const where: Record<string, unknown> = { deletedAt: null }
    if (status && status !== 'all') where.status = status
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId
    if (districtId && districtId !== 'all') where.districtId = districtId
    if (priority && priority !== 'all') where.priority = priority
    if (reporterId && reporterId !== 'all') where.reporterId = reporterId
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { shortDesc: { contains: search } },
      ]
    }

    const [news, total] = await Promise.all([
      db.news.findMany({
        where,
        select: {
          id: true,
          title: true,
          shortDesc: true,
          thumbnailUrl: true,
          imagesUrls: true,
          videoUrl: true,
          status: true,
          priority: true,
          isFeatured: true,
          viewsCount: true,
          sharesCount: true,
          createdAt: true,
          publishedAt: true,
          approvedAt: true,
          approvedBy: true,
          categoryId: true,
          category: { select: { name: true, color: true } },
          state: { select: { name: true } },
          district: { select: { name: true } },
          reporter: { select: { id: true, name: true, avatar: true, phone: true } },
          approver: { select: { id: true, name: true, email: true } },
          admin: { select: { id: true, name: true } },
          tags: { select: { tag: { select: { name: true, slug: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.news.count({ where }),
    ])

    const simplified = news.map(n => ({
      ...n,
      imagesUrls: safeJsonParse<string[]>(n.imagesUrls || '[]', []),
    }))

    return NextResponse.json({ news: simplified, total, page, limit, hasMore: (page * limit) < total })
  } catch (error) {
    console.error('News list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await request.json()

    // Get Telangana state ID if not provided
    let stateId = data.stateId
    if (data.districtId && !stateId) {
      const dist = await db.district.findUnique({ where: { id: data.districtId }, select: { stateId: true } })
      if (dist?.stateId) {
        stateId = dist.stateId
      }
    }
    if (!stateId) {
      const telangana = await db.state.findFirst({ where: { code: 'TG' } })
      stateId = telangana?.id || ''
    }

    const newsId = await generate5CharNewsId()
    const news = await db.news.create({
      data: {
        id: newsId,
        title: data.title || '',
        shortDesc: data.shortDesc || null,
        content: data.content || null,
        categoryId: data.categoryId,
        stateId: stateId,
        districtId: data.districtId || null,
        mandalId: data.mandalId || null,
        thumbnailUrl: data.thumbnailUrl || '',
        imagesUrls: safeJsonStringify(data.imagesUrls || []),
        videoUrl: data.videoUrl || null,
        sourceType: data.sourceType || 'original',
        reporterId: data.reporterId || null,
        priority: data.priority || 'normal',
        status: data.status || 'draft',
        isFeatured: data.isFeatured || false,
        publishedAt: data.status === 'published' ? new Date() : null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        externalLink: data.externalLink || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: admin.id,
      },
    })

    // Create tag associations
    if (data.tagIds && data.tagIds.length > 0) {
      await db.newsTag.createMany({
        data: data.tagIds.map((tagId: string) => ({
          newsId: news.id,
          tagId,
        })),
      })
    }

    // Audit log
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'create',
        entity: 'news',
        entityId: news.id,
        changes: JSON.stringify({ title: data.title }),
      },
    })

    // Send push notification if published and requested
    if (news.status === 'published' && data.sendNotification !== false) {
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
        console.log(`FCM notification sent for news to topic: ${targetTopic}`)
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

    return NextResponse.json({ ...news, imagesUrls: safeJsonParse<string[]>(news.imagesUrls || '[]', []) }, { status: 201 })
  } catch (error) {
    console.error('News create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
