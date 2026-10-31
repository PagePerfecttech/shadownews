import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { getClientIp } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: newsId } = await params
    const news = await db.news.findUnique({
      where: { id: newsId, deletedAt: null },
      select: { id: true, title: true, status: true },
    })

    if (!news) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 })
    }

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
        // Proceed as anonymous/guest report
      }
    }

    const body = await request.json()
    const { reason, details } = body

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Reporting reason is required' }, { status: 400 })
    }

    const validReasons = [
      'fake_news',
      'hate_speech',
      'misleading',
      'copyright',
      'duplicate',
      'graphic_violence',
      'other',
    ]

    const effectiveReason = validReasons.includes(reason) ? reason : 'other'
    const ip = getClientIp(request)

    // Rate-limit: prevent duplicate reports for the same news from the same IP within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existingRecent = await db.newsReport.findFirst({
      where: {
        newsId: news.id,
        createdAt: { gte: oneHourAgo },
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(ip ? [{ reporterIp: ip }] : []),
        ],
      },
    })

    if (existingRecent) {
      return NextResponse.json({
        success: true,
        message: 'మీరు ఇప్పటికే ఈ వార్తను రిపోర్ట్ చేశారు. మా ఎడిటోరియల్ టీమ్ దీనిని సమీక్షిస్తోంది.\n(You have already reported this story. Our editorial team is reviewing it.)',
      })
    }

    const report = await db.newsReport.create({
      data: {
        newsId: news.id,
        userId: userId || null,
        reporterIp: ip || null,
        reason: effectiveReason,
        details: details ? String(details).slice(0, 500) : null,
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'ధన్యవాదాలు! మీ ఫిర్యాదు నమోదు చేయబడింది. మా ఎడిటోరియల్ టీమ్ త్వరలోనే దీనిని పరిశీలించి తగిన చర్యలు తీసుకుంటుంది.\n(Thank you! Your report has been submitted for editorial moderation.)',
      reportId: report.id,
    })
  } catch (error) {
    console.error('Report news error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

