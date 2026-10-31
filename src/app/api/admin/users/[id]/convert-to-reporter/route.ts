import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      include: {
        state: true,
        district: true,
        mandal: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if reporter already exists
    const phoneVariants = [
      user.phone,
      user.phone.replace('+91', ''),
      user.phone.startsWith('+91') ? user.phone : `+91${user.phone}`,
    ]
    let existingReporter = await db.reporter.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
    })

    if (existingReporter) {
      if (existingReporter.deletedAt || existingReporter.status !== 'active') {
        existingReporter = await db.reporter.update({
          where: { id: existingReporter.id },
          data: {
            status: 'active',
            deletedAt: null,
          },
        })
      }
      return NextResponse.json({
        success: true,
        message: 'User is already registered as a reporter. Status verified as active.',
        reporter: existingReporter,
      })
    }

    // Find or default State
    let finalStateId = user.stateId
    if (!finalStateId) {
      const defaultState = await db.state.findFirst({ where: { isActive: true } })
      if (!defaultState) {
        return NextResponse.json({ error: 'No active state found in database.' }, { status: 400 })
      }
      finalStateId = defaultState.id
    }

    // Find or default District
    let finalDistrictId = user.districtId
    if (!finalDistrictId) {
      const defaultDistrict = await db.district.findFirst({
        where: { stateId: finalStateId },
      })
      if (!defaultDistrict) {
        return NextResponse.json({ error: 'Please set the user district before promoting to reporter.' }, { status: 400 })
      }
      finalDistrictId = defaultDistrict.id
    }

    const reporter = await db.reporter.create({
      data: {
        name: user.name || `Reporter ${user.phone.slice(-4)}`,
        phone: user.phone,
        email: user.email || null,
        avatar: user.avatar || null,
        stateId: finalStateId,
        districtId: finalDistrictId,
        mandalId: user.mandalId || null,
        role: 'junior',
        status: 'active',
        postingScope: 'mandal',
        canPublishDirectly: false,
        coinsBalance: 0,
        earningsBalance: 0,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'reporter',
      entityId: reporter.id,
      ipAddress: getClientIp(request),
      changes: { convertedFromUserId: user.id, role: 'junior', status: 'active' },
    })

    return NextResponse.json({
      success: true,
      message: `User ${user.name || user.phone} has been successfully promoted to Reporter!`,
      reporter,
    })
  } catch (error) {
    console.error('Convert user to reporter error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
