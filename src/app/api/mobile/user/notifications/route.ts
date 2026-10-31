import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken, messaging } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const phone = decodedToken.phone_number
    if (!phone) {
      return NextResponse.json({ error: 'Token missing phone number' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { phone },
      select: {
        id: true,
        fcmToken: true,
        notificationsEnabled: true,
        notifyBreaking: true,
        notifyLocation: true,
        notifyCategories: true,
        notifyReporters: true,
        notifyRewards: true,
        notifyPromotions: true,
        quietHoursEnabled: true,
        quietHoursStart: true,
        quietHoursEnd: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Notification settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const phone = decodedToken.phone_number
    if (!phone) {
      return NextResponse.json({ error: 'Token missing phone number' }, { status: 401 })
    }

    let dbUser = await db.user.findUnique({ where: { phone } })
    if (!dbUser) {
      dbUser = await db.user.create({ data: { phone } })
    }

    const data = await request.json()
    const updateData: Record<string, unknown> = {}

    if (data.fcmToken !== undefined) updateData.fcmToken = data.fcmToken
    if (data.notificationsEnabled !== undefined) updateData.notificationsEnabled = Boolean(data.notificationsEnabled)
    if (data.notifyBreaking !== undefined) updateData.notifyBreaking = Boolean(data.notifyBreaking)
    if (data.notifyLocation !== undefined) updateData.notifyLocation = Boolean(data.notifyLocation)
    if (data.notifyCategories !== undefined) updateData.notifyCategories = Boolean(data.notifyCategories)
    if (data.notifyReporters !== undefined) updateData.notifyReporters = Boolean(data.notifyReporters)
    if (data.notifyRewards !== undefined) updateData.notifyRewards = Boolean(data.notifyRewards)
    if (data.notifyPromotions !== undefined) updateData.notifyPromotions = Boolean(data.notifyPromotions)
    if (data.quietHoursEnabled !== undefined) updateData.quietHoursEnabled = Boolean(data.quietHoursEnabled)
    if (data.quietHoursStart !== undefined) updateData.quietHoursStart = data.quietHoursStart
    if (data.quietHoursEnd !== undefined) updateData.quietHoursEnd = data.quietHoursEnd

    const updatedUser = await db.user.update({
      where: { id: dbUser.id },
      data: updateData,
    })

    // Sync with FCM Topics if fcmToken is available
    const token = (data.fcmToken || dbUser.fcmToken) as string | null
    if (token) {
      try {
        const isMasterOn = updatedUser.notificationsEnabled
        const isBreakingOn = updatedUser.notifyBreaking && isMasterOn

        if (isBreakingOn) {
          await messaging.subscribeToTopic(token, 'all')
        } else {
          await messaging.unsubscribeFromTopic(token, 'all')
        }

        if (updatedUser.districtId && updatedUser.notifyLocation && isMasterOn) {
          await messaging.subscribeToTopic(token, `district_${updatedUser.districtId}`)
        }
      } catch (fcmErr) {
        console.error('FCM topic sync error:', fcmErr)
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        notificationsEnabled: updatedUser.notificationsEnabled,
        notifyBreaking: updatedUser.notifyBreaking,
        notifyLocation: updatedUser.notifyLocation,
        notifyCategories: updatedUser.notifyCategories,
        notifyReporters: updatedUser.notifyReporters,
        notifyRewards: updatedUser.notifyRewards,
        notifyPromotions: updatedUser.notifyPromotions,
        quietHoursEnabled: updatedUser.quietHoursEnabled,
        quietHoursStart: updatedUser.quietHoursStart,
        quietHoursEnd: updatedUser.quietHoursEnd,
      },
    })
  } catch (error) {
    console.error('Notification settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

