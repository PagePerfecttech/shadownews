import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { generateGeminiNewsRewrite } from '@/lib/gemini-service'
import { logAudit, getClientIp } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    let bodyData: any = {}
    try {
      bodyData = await request.json()
    } catch {
      // Body may be empty if called without payload
    }

    let sourceTitle = bodyData?.title
    let sourceContent = bodyData?.content
    let sourceShortDesc = bodyData?.shortDesc

    let news = null
    if (id && id !== 'draft' && id !== 'new') {
      news = await db.news.findUnique({ where: { id } })
    }

    if (news) {
      sourceTitle = sourceTitle || news.title
      sourceContent = sourceContent || news.content || news.shortDesc || news.title
      sourceShortDesc = sourceShortDesc || news.shortDesc || undefined
    }

    if (!sourceTitle && !sourceContent) {
      return NextResponse.json({ error: 'Title or content is required to generate AI rewrite' }, { status: 400 })
    }

    const aiResult = await generateGeminiNewsRewrite(
      sourceTitle || 'వార్త',
      sourceContent || sourceShortDesc || sourceTitle || '',
      sourceShortDesc || undefined
    )

    if (!aiResult) {
      return NextResponse.json({ error: 'Failed to generate Gemini AI rewrite. Please check your Google Gemini API key in Admin Settings.' }, { status: 500 })
    }

    if (news) {
      const updatedNews = await db.news.update({
        where: { id: news.id },
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
        entityId: news.id,
        ipAddress: getClientIp(request),
        changes: { aiTitle: aiResult.aiTitle, aiStatus: 'generated' },
      })

      return NextResponse.json({ success: true, news: updatedNews })
    }

    // For new/unsaved drafts, return generated rewrite structure directly
    return NextResponse.json({
      success: true,
      news: {
        id: 'draft',
        aiTitle: aiResult.aiTitle,
        aiShortDesc: aiResult.aiShortDesc,
        aiContent: aiResult.aiContent,
        aiStatus: 'generated',
      },
    })
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
