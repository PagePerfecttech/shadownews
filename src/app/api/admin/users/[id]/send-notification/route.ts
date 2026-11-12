import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { messaging } from '@/lib/firebase-admin'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const user = await db.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await request.json()
    const { title, message, newsId, imageUrl } = body

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    if (!user.fcmToken) {
      return NextResponse.json(
        { error: 'This user does not currently have an active FCM device token on file.' },
        { status: 400 }
      )
    }

    if (!user.notificationsEnabled) {
      return NextResponse.json(
        { error: 'This user has disabled push notifications in their app settings.' },
        { status: 400 }
      )
    }

    // Dispatch FCM notification to user token
    const fcmMessage: any = {
      token: user.fcmToken,
      notification: {
        title: title.trim(),
        body: message.trim(),
        imageUrl: imageUrl && imageUrl.startsWith('http') ? imageUrl : undefined,
      },
      data: {
        route: newsId ? `/p/${newsId}` : '/home',
        newsId: newsId || '',
        type: 'direct_user_message',
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
    }

    let messageId: string | null = null
    try {
      messageId = await messaging.send(fcmMessage)
    } catch (fcmErr: any) {
      console.error('FCM send error:', fcmErr)
      return NextResponse.json(
        { error: `FCM failed: ${fcmErr?.message || 'Could not deliver notification to device.'}` },
        { status: 502 }
      )
    }

    // Record in push notification history
    const pushRecord = await db.pushNotification.create({
      data: {
        title: title.trim(),
        body: message.trim(),
        imageUrl: imageUrl || null,
        targetType: 'user',
        targetValue: user.id,
        newsId: newsId || null,
        status: 'sent',
        sentCount: 1,
        deliveredCount: 1,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'push_notification',
      entityId: pushRecord.id,
      ipAddress: getClientIp(request),
      changes: { targetUserId: user.id, title, messageId },
    })

    return NextResponse.json({
      success: true,
      message: 'Direct push notification sent successfully!',
      messageId,
    })
  } catch (error) {
    console.error('Send direct user notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

