import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { generateGrokNewsRewrite } from '@/lib/grok-service'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const news = await db.news.findUnique({ where: { id } })
    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    const aiResult = await generateGrokNewsRewrite(
      news.title,
      news.content || news.shortDesc || news.title,
      news.shortDesc || undefined
    )

    if (!aiResult) {
      return NextResponse.json({ error: 'Failed to generate Grok AI rewrite. Please check your xAI Grok API key in Admin Settings.' }, { status: 500 })
    }

    const updatedNews = await db.news.update({
      where: { id },
      data: {
        aiTitle: aiResult.aiTitle,
        aiShortDesc: aiResult.aiShortDesc,
        aiContent: aiResult.aiContent,
        aiStatus: 'generated',
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'news_ai_rewrite',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: { aiTitle: aiResult.aiTitle, aiStatus: 'generated' },
    })

    return NextResponse.json({ success: true, news: updatedNews })
  } catch (error) {
    console.error('AI rewrite trigger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { action } = body

    const news = await db.news.findUnique({ where: { id } })
    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 })
    }

    if (action === 'accept') {
      if (!news.aiTitle) {
        return NextResponse.json({ error: 'No AI suggestions found for this news' }, { status: 400 })
      }

      const updatedNews = await db.news.update({
        where: { id },
        data: {
          title: news.aiTitle,
          shortDesc: news.aiShortDesc || news.shortDesc,
          content: news.aiContent || news.content,
          aiStatus: 'accepted',
        },
      })

      await logAudit({
        adminId: admin.id,
        action: 'update',
        entity: 'news_ai_accept',
        entityId: id,
        ipAddress: getClientIp(request),
        changes: { action: 'accept', newTitle: news.aiTitle },
      })

      return NextResponse.json({ success: true, message: 'AI suggestions applied to news successfully', news: updatedNews })
    } else if (action === 'decline') {
      const updatedNews = await db.news.update({
        where: { id },
        data: {
          aiStatus: 'declined',
        },
      })

      await logAudit({
        adminId: admin.id,
        action: 'update',
        entity: 'news_ai_decline',
        entityId: id,
        ipAddress: getClientIp(request),
        changes: { action: 'decline' },
      })

      return NextResponse.json({ success: true, message: 'AI suggestions declined', news: updatedNews })
    } else {
      return NextResponse.json({ error: 'Invalid action (must be accept or decline)' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI rewrite action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
