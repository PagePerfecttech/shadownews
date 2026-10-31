import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    if (authHeader) {
      try {
        const decoded = await verifyFirebaseToken(authHeader)
        const rawPhone = decoded.phone_number || (decoded.email ? `email_${decoded.email}` : decoded.uid)
        const digitsOnly = rawPhone.replace(/\D/g, '')
        const phone = digitsOnly.length === 10 ? `+91${digitsOnly}` : rawPhone
        const user = await db.user.findFirst({
          where: {
            OR: [
              { phone: { in: [rawPhone, phone, digitsOnly] } },
              ...(decoded.email ? [{ email: decoded.email }] : []),
            ],
            deletedAt: null,
          },
          select: { id: true },
        })
        if (user) userId = user.id
      } catch {
        // Guest / unauthenticated feedback
      }
    }

    const body = await request.json()
    const { rating, feedback, category, appVersion, deviceInfo } = body

    const numericRating = parseInt(String(rating), 10)
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: 'Valid rating between 1 and 5 is required' },
        { status: 400 }
      )
    }

    const saved = await db.appFeedback.create({
      data: {
        userId: userId || null,
        rating: numericRating,
        feedback: feedback ? String(feedback).trim().slice(0, 1000) : null,
        category: category ? String(category).trim().slice(0, 50) : 'general',
        appVersion: appVersion ? String(appVersion).trim().slice(0, 50) : null,
        deviceInfo: deviceInfo ? String(deviceInfo).trim().slice(0, 100) : null,
        status: 'new',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'మీ అభిప్రాయానికి ధన్యవాదాలు! మీ సూచనల ఆధారంగా యాప్‌ను మరింత మెరుగుపరుస్తాము.\n(Thank you for your valuable feedback!)',
      feedbackId: saved.id,
    })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

