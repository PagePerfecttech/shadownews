import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

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
      totalUsers,
      activeUsers,
      blockedUsers,
      newToday,
      newThisWeek,
      dauCount,
      mauCount,
      topDistrictsRaw,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { deletedAt: null, isActive: true } }),
      db.user.count({ where: { deletedAt: null, isActive: false } }),
      db.user.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } }),
      db.user.count({ where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } } }),
      db.user.count({
        where: {
          deletedAt: null,
          OR: [
            { lastActiveAt: { gte: oneDayAgo } },
            { updatedAt: { gte: oneDayAgo } },
          ],
        },
      }),
      db.user.count({
        where: {
          deletedAt: null,
          OR: [
            { lastActiveAt: { gte: thirtyDaysAgo } },
            { updatedAt: { gte: thirtyDaysAgo } },
          ],
        },
      }),
      db.user.groupBy({
        by: ['districtId'],
        where: { deletedAt: null, districtId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ])

    // Fetch district names for top districts
    const districtIds = topDistrictsRaw.map((d) => d.districtId).filter(Boolean) as string[]
    const districts = await db.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, name: true },
    })
    const districtMap = new Map(districts.map((d) => [d.id, d.name]))

    const topDistricts = topDistrictsRaw.map((d) => ({
      districtId: d.districtId,
      name: d.districtId ? districtMap.get(d.districtId) || 'Unknown' : 'Not Specified',
      count: d._count.id,
    }))

    return NextResponse.json({
      totalUsers,
      activeUsers,
      blockedUsers,
      newToday,
      newThisWeek,
      dau: Math.max(dauCount, newToday), // At least as many as new today
      mau: Math.max(mauCount, newThisWeek),
      topDistricts,
    })
  } catch (error) {
    console.error('Users stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

