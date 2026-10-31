import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils'

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
      where: { phone, deletedAt: null },
      include: {
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true } },
        mandal: { select: { id: true, name: true } },
      },
    })

    const reporter = await db.reporter.findUnique({
      where: { phone, deletedAt: null },
      include: {
        state: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        mandal: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      user: user
        ? {
          ...user,
          preferredCategories: safeJsonParse<string[]>(user.preferredCategories, []),
        }
        : null,
      reporterStatus: reporter ? reporter.status : 'none',
      reporter: reporter
        ? {
          id: reporter.id,
          name: reporter.name,
          role: reporter.role,
          status: reporter.status,
          postingScope: reporter.postingScope,
          earningsBalance: reporter.earningsBalance,
          totalEarnings: reporter.totalEarnings,
          coinsBalance: reporter.coinsBalance,
          canPublishDirectly: reporter.canPublishDirectly,
          homeLocation: {
            state: reporter.state?.name,
            district: reporter.district?.name,
            mandal: reporter.mandal?.name,
          },
        }
        : null,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
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

    if (data.name !== undefined) updateData.name = data.name || decodedToken.name || null
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.avatar !== undefined) updateData.avatar = data.avatar || null
    if (data.gender !== undefined) updateData.gender = data.gender || null
    if (data.dob !== undefined) updateData.dob = data.dob ? new Date(data.dob) : null
    if (data.stateId !== undefined) updateData.stateId = data.stateId || null
    if (data.districtId !== undefined) updateData.districtId = data.districtId || null
    if (data.mandalId !== undefined) updateData.mandalId = data.mandalId || null
    if (data.preferredLanguage !== undefined) updateData.preferredLanguage = data.preferredLanguage
    if (data.preferredCategories !== undefined) {
      updateData.preferredCategories = safeJsonStringify(data.preferredCategories || [])
    }

    const user = await db.user.update({
      where: { id: dbUser.id },
      data: updateData,
      include: {
        state: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        mandal: { select: { id: true, name: true } },
      },
    })

    // Also update Reporter record if user is a registered reporter
    const existingReporter = await db.reporter.findUnique({ where: { phone } })
    if (existingReporter) {
      const reporterUpdate: Record<string, unknown> = {}
      if (data.name) reporterUpdate.name = data.name
      if (data.email !== undefined) reporterUpdate.email = data.email
      if (data.avatar) reporterUpdate.avatar = data.avatar
      if (data.stateId) reporterUpdate.stateId = data.stateId
      if (data.districtId) reporterUpdate.districtId = data.districtId
      if (data.mandalId !== undefined) reporterUpdate.mandalId = data.mandalId

      if (Object.keys(reporterUpdate).length > 0) {
        await db.reporter.update({
          where: { id: existingReporter.id },
          data: reporterUpdate,
        })
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        preferredCategories: safeJsonParse<string[]>(user.preferredCategories, []),
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const user = await db.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Play Store compliance: Soft delete user and clear personal tokens
    await db.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        fcmToken: null,
        phone: `deleted_${Date.now()}_${user.phone}`,
        email: user.email ? `deleted_${Date.now()}_${user.email}` : null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully in compliance with Play Store policy',
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
