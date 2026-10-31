import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { adId } = await request.json()
    if (!adId || typeof adId !== 'string') {
      return NextResponse.json({ error: 'adId is required' }, { status: 400 })
    }

    await db.customAd.update({
      where: { id: adId },
      data: {
        clicksServed: { increment: 1 }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Gracefully handle not found or deleted ads
    return NextResponse.json({ success: false }, { status: 200 })
  }
}

