import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import {
  computeReporterMetrics,
  getAllLevelConfigs,
  getLevelConfig,
  evaluatePromotionDemotion
} from '@/lib/reward-engine'
import { issueReporterWarning, flagReporterFakeNews } from '@/lib/scoring-service'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [reporters, allLevels] = await Promise.all([
      db.reporter.findMany({
        where: { deletedAt: null },
        include: {
          district: { select: { name: true } },
          mandal: { select: { name: true } },
        },
        orderBy: [
          { performanceScore: 'desc' },
          { approvedArticles: 'desc' },
        ],
      }),
      getAllLevelConfigs(),
    ])

    const reportersWithStats = await Promise.all(
      reporters.map(async (reporter) => {
        const metrics = await computeReporterMetrics(reporter.id)
        const currentRole = reporter.role || 'junior'
        const currentLevelConfig = allLevels.find((l) => l.levelKey === currentRole) || allLevels[0]
        const nextLevelConfig = allLevels.find((l) => l.rankOrder === currentLevelConfig.rankOrder + 1) || null

        return {
          id: reporter.id,
          name: reporter.name,
          phone: reporter.phone,
          email: reporter.email,
          avatar: reporter.avatar,
          role: currentRole,
          levelDisplayName: currentLevelConfig.displayName,
          badgeColor: currentLevelConfig.badgeColor,
          status: reporter.status,
          postingScope: reporter.postingScope || 'mandal',
          performanceScore: reporter.performanceScore || 0,
          approvedArticles: metrics.approvedCount,
          rejectedArticles: metrics.rejectedCount,
          pendingArticles: metrics.pendingCount,
          approvalRate: metrics.approvalRate,
          fakeNewsCount: reporter.fakeNewsCount || 0,
          warningCount: reporter.warningCount || 0,
          promotionStatus: reporter.promotionStatus || 'none',
          earningsBalance: reporter.earningsBalance || 0,
          totalEarnings: reporter.totalEarnings || 0,
          coinsBalance: reporter.coinsBalance || 0,
          totalViews: metrics.totalViews,
          totalShares: metrics.totalShares,
          currentStreak: metrics.currentStreak,
          avgApprovalHours: metrics.avgApprovalHours,
          nextLevelName: nextLevelConfig?.displayName || null,
          district: reporter.district?.name || null,
          mandal: reporter.mandal?.name || null,
          createdAt: reporter.createdAt,
        }
      })
    )

    return NextResponse.json(reportersWithStats)
  } catch (error) {
    console.error('Reporter performance list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { reporterId, action, reason, targetLevel } = body

    if (!reporterId || !action) {
      return NextResponse.json({ error: 'Reporter ID and action are required' }, { status: 400 })
    }

    const reporter = await db.reporter.findUnique({ where: { id: reporterId } })
    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })
    }

    const allLevels = await getAllLevelConfigs()
    const currentRole = reporter.role || 'junior'
    const currentConfig = allLevels.find((l) => l.levelKey === currentRole) || allLevels[0]

    let updatedReporter: Record<string, unknown> = {}

    switch (action) {
      case 'promote': {
        const nextLevel = targetLevel
          ? allLevels.find((l) => l.levelKey === targetLevel)
          : allLevels.find((l) => l.rankOrder === currentConfig.rankOrder + 1)

        if (!nextLevel) {
          return NextResponse.json({ error: 'Already at highest level' }, { status: 400 })
        }

        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: {
            role: nextLevel.levelKey,
            canPublishDirectly: nextLevel.canPublishDirectly,
            promotionStatus: 'promoted',
          },
        })

        await db.reporterLevelAudit.create({
          data: {
            reporterId,
            fromLevel: currentConfig.levelKey,
            toLevel: nextLevel.levelKey,
            action: 'promoted',
            reason: reason || `Admin promoted to ${nextLevel.displayName}`,
            changedBy: admin.id,
          }
        })
        break
      }

      case 'demote': {
        const prevLevel = targetLevel
          ? allLevels.find((l) => l.levelKey === targetLevel)
          : allLevels.find((l) => l.rankOrder === currentConfig.rankOrder - 1)

        if (!prevLevel) {
          return NextResponse.json({ error: 'Already at lowest level' }, { status: 400 })
        }

        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: {
            role: prevLevel.levelKey,
            canPublishDirectly: prevLevel.canPublishDirectly,
            promotionStatus: 'demoted',
          },
        })

        await db.reporterLevelAudit.create({
          data: {
            reporterId,
            fromLevel: currentConfig.levelKey,
            toLevel: prevLevel.levelKey,
            action: 'demoted',
            reason: reason || `Admin demoted to ${prevLevel.displayName}`,
            changedBy: admin.id,
          }
        })
        break
      }

      case 'set_level': {
        const target = allLevels.find((l) => l.levelKey === targetLevel)
        if (!target) {
          return NextResponse.json({ error: 'Target level does not exist' }, { status: 400 })
        }

        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: {
            role: target.levelKey,
            canPublishDirectly: target.canPublishDirectly,
            promotionStatus: 'none',
          },
        })

        await db.reporterLevelAudit.create({
          data: {
            reporterId,
            fromLevel: currentConfig.levelKey,
            toLevel: target.levelKey,
            action: 'manual_override',
            reason: reason || `Admin manually set level to ${target.displayName}`,
            changedBy: admin.id,
          }
        })
        break
      }

      case 'warning':
        await issueReporterWarning(reporterId, reason)
        updatedReporter = (await db.reporter.findUnique({ where: { id: reporterId } })) || {}
        break

      case 'fake_news':
        await flagReporterFakeNews(reporterId)
        updatedReporter = (await db.reporter.findUnique({ where: { id: reporterId } })) || {}
        break

      case 'dismiss_recommendation':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: { promotionStatus: 'none' },
        })
        break

      case 'hold':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: { status: 'hold' },
        })
        break

      case 'activate':
        updatedReporter = await db.reporter.update({
          where: { id: reporterId },
          data: { status: 'approved' },
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'reporter_performance',
      entityId: reporterId,
      ipAddress: getClientIp(request),
      changes: { action, reason, targetLevel, reporterName: reporter.name },
    })

    return NextResponse.json({ success: true, reporter: updatedReporter })
  } catch (error) {
    console.error('Reporter performance action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
