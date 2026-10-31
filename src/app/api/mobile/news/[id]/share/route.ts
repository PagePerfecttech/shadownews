import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updated = await db.news.update({
      where: { id },
      data: {
        sharesCount: { increment: 1 },
      },
      select: {
        id: true,
        sharesCount: true,
      },
    })

    return NextResponse.json({
      success: true,
      newsId: updated.id,
      sharesCount: updated.sharesCount,
    })
  } catch (error) {
    console.error('Share count increment error:', error)
    return NextResponse.json({ error: 'Failed to record share' }, { status: 500 })
  }
}

