import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, email, accountType, deletionScope, reason } = body

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return NextResponse.json(
        { error: 'A valid registered phone number is required.' },
        { status: 400 }
      )
    }

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '')
    const cleanEmail = typeof email === 'string' ? email.trim() : null
    const scope = deletionScope === 'activity_only' ? 'activity_only' : 'full'
    const type = accountType === 'reporter' ? 'reporter' : 'reader'
    const referenceId = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // 1. Locate matching User if present
    const user = await db.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(cleanPhone.startsWith('+91') ? [{ phone: cleanPhone.replace('+91', '') }] : []),
          ...(cleanPhone.length === 10 ? [{ phone: `+91${cleanPhone}` }] : []),
        ],
      },
    })

    // 2. If user exists and full deletion requested, soft-delete immediately & invalidate tokens
    if (user && scope === 'full') {
      await db.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          fcmToken: null,
        },
      })
    }

    // 3. Locate matching Reporter if present
    const reporter = await db.reporter.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(cleanPhone.startsWith('+91') ? [{ phone: cleanPhone.replace('+91', '') }] : []),
          ...(cleanPhone.length === 10 ? [{ phone: `+91${cleanPhone}` }] : []),
        ],
      },
    })

    // 4. Record the deletion request in AppFeedback for admin audit tracking
    await db.appFeedback.create({
      data: {
        userId: user?.id || null,
        rating: 1,
        category: 'account_deletion',
        feedback: `Account Deletion Request [${referenceId}]: Phone=${cleanPhone}, Email=${cleanEmail || 'N/A'}, Type=${type}, Scope=${scope}. Reason: ${reason || 'Not provided'}`,
        status: 'new',
        adminNotes: JSON.stringify({
          referenceId,
          phone: cleanPhone,
          email: cleanEmail,
          accountType: type,
          deletionScope: scope,
          reason: reason || null,
          matchedUserId: user?.id || null,
          matchedReporterId: reporter?.id || null,
          requestedAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      referenceId,
      message: 'Your account deletion request has been submitted successfully. Your active sessions have been invalidated and your data will be permanently processed within 30 days in accordance with data protection regulations.',
    })
  } catch (error) {
    console.error('Account deletion request error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again or contact support at admin@shadownews.in.' },
      { status: 500 }
    )
  }
}

