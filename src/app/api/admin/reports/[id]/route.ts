import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'
import { createWalletTransaction } from '@/lib/wallet-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const report = await db.newsReport.findUnique({
      where: { id },
      include: {
        news: {
          include: {
            reporter: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, notes } = body // action: 'dismiss' | 'take_down'

    if (action === 'dismiss') {
      const updatedReport = await db.newsReport.update({
        where: { id },
        data: {
          status: 'resolved_dismissed',
          actionNotes: notes ? String(notes).trim() : 'Report reviewed and dismissed as valid news by editorial team.',
          resolvedBy: admin.id,
          resolvedAt: new Date(),
        },
      })

      await logAudit({
        adminId: admin.id,
        action: 'update',
        entity: 'news_report',
        entityId: id,
        ipAddress: getClientIp(request),
        changes: { status: 'resolved_dismissed', actionNotes: notes },
      })

      return NextResponse.json({
        success: true,
        message: 'Report dismissed successfully. News article retained.',
        report: updatedReport,
      })
    }

    if (action === 'take_down') {
      const updatedReport = await db.newsReport.update({
        where: { id },
        data: {
          status: 'resolved_removed',
          actionNotes: notes ? String(notes).trim() : `News taken down for violation: ${report.reason}`,
          resolvedBy: admin.id,
          resolvedAt: new Date(),
        },
      })

      // Soft-delete the news article and mark rejected
      await db.news.update({
        where: { id: report.newsId },
        data: {
          status: 'rejected',
          deletedAt: new Date(),
          rejectReason: `Removed by editorial moderation team: ${report.reason}. ${notes || ''}`,
        },
      })

      // If news had an assigned reporter, issue penalty/warning
      if (report.news?.reporterId && report.news?.reporter) {
        const reporter = report.news.reporter
        const isFakeNews = report.reason === 'fake_news'

        await db.reporter.update({
          where: { id: reporter.id },
          data: {
            warningCount: { increment: 1 },
            ...(isFakeNews ? { fakeNewsCount: { increment: 1 } } : {}),
            performanceScore: { decrement: isFakeNews ? 25 : 10 },
          },
        })

        // Reverse any reward credited for this news
        const priorEarning = await db.walletTransaction.findFirst({
          where: {
            reporterId: reporter.id,
            referenceId: report.newsId,
            type: 'reward_article',
            status: 'completed',
          },
        })

        if (priorEarning && priorEarning.moneyAmount > 0) {
          await createWalletTransaction({
            reporterId: reporter.id,
            type: 'penalty',
            moneyAmount: -priorEarning.moneyAmount,
            referenceId: report.newsId,
            description: `Penalty: Reversal of reward for taken down story (${report.reason})`,
            adminId: admin.id,
          })
        }
      }

      await logAudit({
        adminId: admin.id,
        action: 'delete',
        entity: 'news',
        entityId: report.newsId,
        ipAddress: getClientIp(request),
        changes: { takenDownByReport: id, reason: report.reason, notes },
      })

      return NextResponse.json({
        success: true,
        message: 'News article taken down successfully and reporter score adjusted.',
        report: updatedReport,
      })
    }

    return NextResponse.json({ error: 'Invalid action. Must be dismiss or take down.' }, { status: 400 })
  } catch (error) {
    console.error('Resolve report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

