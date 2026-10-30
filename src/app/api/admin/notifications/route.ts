import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const notifications = await db.pushNotification.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Notifications list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    const notification = await db.pushNotification.create({
      data: {
        title: data.title,
        body: data.body,
        imageUrl: data.imageUrl || null,
        targetType: data.targetType || 'all',
        targetValue: data.targetValue || null,
        newsId: data.newsId || null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'scheduled' : (data.sendNow ? 'sent' : 'draft'),
      },
    })
    
    // If sending now, trigger Firebase Messaging
    if (notification.status === 'sent') {
      try {
        const { messaging } = await import('@/lib/firebase-admin')
        
        const targetTopic = notification.targetType === 'district' && notification.targetValue
          ? `district_${notification.targetValue}`
          : (notification.targetType === 'category' && notification.targetValue
            ? `category_${notification.targetValue}`
            : 'all')

        const messagePayload: any = {
          notification: {
            title: notification.title,
            body: notification.body,
          },
          topic: targetTopic,
          data: {
            route: notification.newsId ? `/p/${notification.newsId}` : '/feed',
            newsId: notification.newsId || '',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'spotnews_default_channel',
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
        }
        
        if (notification.imageUrl && notification.imageUrl.startsWith('http')) {
          messagePayload.notification.imageUrl = notification.imageUrl
        }
        
        await messaging.send(messagePayload)
        console.log(`Firebase notification sent successfully to topic: ${targetTopic}`)
      } catch (fcmError: any) {
        console.error('Error sending Firebase notification:', fcmError)
        // Update status to failed
        await db.pushNotification.update({
          where: { id: notification.id },
          data: { status: 'failed' }
        })
        return NextResponse.json({
          error: `Failed to deliver via Firebase: ${fcmError?.message || 'FCM error'}`
        }, { status: 500 })
      }
    }

    await logAudit({
      adminId: admin.id,
      action: 'send',
      entity: 'notification',
      entityId: notification.id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, targetType: data.targetType, status: notification.status },
    })
    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Notification create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
