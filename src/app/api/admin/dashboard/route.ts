import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalNews,
      publishedToday,
      pendingReviews,
      totalViewsAgg,
      activeUsers,
      dauCount,
      mauCount,
      activeReporters,
      pendingReporters,
      pendingWithdrawalsAgg,
      activeAdsCount,
      totalAdImpressionsAgg,
    ] = await Promise.all([
      db.news.count({ where: { deletedAt: null } }),
      db.news.count({
        where: {
          status: 'published',
          publishedAt: { gte: todayStart },
          deletedAt: null,
        },
      }),
      db.news.count({ where: { status: 'pending_review', deletedAt: null } }),
      db.news.aggregate({ _sum: { viewsCount: true }, where: { deletedAt: null } }),
      db.user.count({ where: { isActive: true, deletedAt: null } }),
      db.user.count({
        where: {
          deletedAt: null,
          OR: [{ lastActiveAt: { gte: oneDayAgo } }, { updatedAt: { gte: oneDayAgo } }],
        },
      }),
      db.user.count({
        where: {
          deletedAt: null,
          OR: [{ lastActiveAt: { gte: thirtyDaysAgo } }, { updatedAt: { gte: thirtyDaysAgo } }],
        },
      }),
      db.reporter.count({ where: { status: 'active', deletedAt: null } }),
      db.reporter.count({ where: { status: 'pending', deletedAt: null } }),
      db.withdrawalRequest.aggregate({
        _count: { _all: true },
        _sum: { moneyAmount: true },
        where: { status: 'pending' },
      }),
      db.customAd.count({ where: { isActive: true, deletedAt: null } }),
      db.customAd.aggregate({ _sum: { impressionsServed: true, clicksServed: true }, where: { deletedAt: null } }),
    ])

    // Attention Queue 1: Top 5 Pending News Submissions
    const pendingNewsQueue = await db.news.findMany({
      where: { status: 'pending_review', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        createdAt: true,
        category: { select: { name: true } },
        reporter: { select: { name: true, role: true } },
      },
    })

    // Attention Queue 2: Top 5 Pending Withdrawals
    const pendingWithdrawalsQueue = await db.withdrawalRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: {
        id: true,
        moneyAmount: true,
        payoutMethod: true,
        upiId: true,
        createdAt: true,
        reporter: { select: { name: true, phone: true } },
      },
    })

    // 7-Day News Publishing Velocity
    const recentNews = await db.news.findMany({
      where: { publishedAt: { gte: sevenDaysAgo }, deletedAt: null },
      select: { publishedAt: true },
    })

    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dayMap[key] = 0
    }
    for (const n of recentNews) {
      if (n.publishedAt) {
        const key = n.publishedAt.toISOString().split('T')[0]
        if (key in dayMap) dayMap[key]++
      }
    }
    const weeklyData = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

    // News by category
    const newsByCategoryGroup = await db.news.groupBy({
      by: ['categoryId'],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    })

    const categoryIds = newsByCategoryGroup.map((c) => c.categoryId)
    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    })
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

    const newsByCategoryData = newsByCategoryGroup.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap[item.categoryId] || 'Unknown',
      count: item._count.id,
    }))

    // Top 5 Reporters Leaderboard
    const topReporters = await db.reporter.findMany({
      where: { status: 'active', deletedAt: null },
      orderBy: [{ approvedArticles: 'desc' }, { performanceScore: 'desc' }],
      take: 5,
      select: {
        id: true,
        name: true,
        role: true,
        avatar: true,
        approvedArticles: true,
        performanceScore: true,
        earningsBalance: true,
      },
    })

    // Top 5 Active Districts by Published News
    const topDistrictsRaw = await db.news.groupBy({
      by: ['districtId'],
      where: { status: 'published', deletedAt: null, districtId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    })
    const districtIds = topDistrictsRaw.map((d) => d.districtId).filter(Boolean) as string[]
    const districts = await db.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, name: true },
    })
    const districtMap = Object.fromEntries(districts.map((d) => [d.id, d.name]))
    const topLocations = topDistrictsRaw.map((d) => ({
      name: d.districtId ? districtMap[d.districtId] || 'District' : 'Unknown',
      count: d._count.id,
    }))

    // Recent Admin Audit Activities
    const recentAuditLogs = await db.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { name: true } } },
    })

    return NextResponse.json({
      kpis: {
        totalNews,
        publishedToday,
        pendingReviews,
        totalViews: totalViewsAgg._sum.viewsCount || 0,
        activeUsers,
        dau: Math.max(dauCount, 1),
        mau: Math.max(mauCount, 1),
        activeReporters,
        pendingReporters,
        pendingWithdrawalsCount: pendingWithdrawalsAgg._count?._all || 0,
        pendingWithdrawalsAmount: pendingWithdrawalsAgg._sum?.moneyAmount || 0,
        activeAdsCount,
        totalAdImpressions: totalAdImpressionsAgg._sum?.impressionsServed || 0,
        totalAdClicks: totalAdImpressionsAgg._sum?.clicksServed || 0,
      },
      attentionQueue: {
        pendingNews: pendingNewsQueue,
        pendingWithdrawals: pendingWithdrawalsQueue,
      },
      weeklyData,
      newsByCategory: newsByCategoryData,
      topReporters,
      topLocations,
      recentActivity: recentAuditLogs,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
