import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { getAllLevelConfigs, runPromotionEngineCron } from '@/lib/reward-engine'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [levels, audits] = await Promise.all([
      getAllLevelConfigs(),
      db.reporterLevelAudit.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { name: true, phone: true, avatar: true }
          }
        }
      })
    ])

    return NextResponse.json({ levels, audits })
  } catch (error) {
    console.error('Fetch reward rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { levels } = body

    if (!Array.isArray(levels)) {
      return NextResponse.json({ error: 'Invalid levels array' }, { status: 400 })
    }

    const updatedLevels = []
    for (const lvl of levels) {
      if (!lvl.levelKey) continue

      const updated = await db.reporterLevelConfig.update({
        where: { levelKey: lvl.levelKey },
        data: {
          displayName: lvl.displayName,
          badgeColor: lvl.badgeColor,
          rankOrder: lvl.rankOrder,
          minApprovedArticles: lvl.minApprovedArticles,
          minApprovalRate: lvl.minApprovalRate,
          minTotalViews: lvl.minTotalViews,
          minPerformanceScore: lvl.minPerformanceScore,
          maxWarningsAllowed: lvl.maxWarningsAllowed,
          maxFakeNewsAllowed: lvl.maxFakeNewsAllowed,
          demotionScoreThreshold: lvl.demotionScoreThreshold,
          dailyPostLimit: lvl.dailyPostLimit,
          weeklyPostLimit: lvl.weeklyPostLimit,
          perCategoryDailyLimit: lvl.perCategoryDailyLimit,
          payPerApprovedArticle: lvl.payPerApprovedArticle,
          breakingBonus: lvl.breakingBonus,
          exclusiveBonus: lvl.exclusiveBonus,
          viewsBonusThreshold: lvl.viewsBonusThreshold,
          viewsBonusAmount: lvl.viewsBonusAmount,
          penaltyRejectedArticle: lvl.penaltyRejectedArticle,
          penaltyFakeNews: lvl.penaltyFakeNews,
          canPublishDirectly: lvl.canPublishDirectly,
          isActive: lvl.isActive !== false,
        }
      })
      updatedLevels.push(updated)
    }

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'update_reward_rules',
        entity: 'reporter_level_configs',
        changes: JSON.stringify({ count: updatedLevels.length }),
      }
    })

    return NextResponse.json({ success: true, levels: updatedLevels })
  } catch (error) {
    console.error('Update reward rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Run promotion & demotion engine across all reporters
    const report = await runPromotionEngineCron()

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'run_promotion_engine',
        entity: 'reporter_level_engine',
        changes: JSON.stringify(report),
      }
    })

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Promotion engine run error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

