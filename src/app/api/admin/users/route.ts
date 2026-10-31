import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status') // 'all', 'active', 'blocked'
    const stateId = searchParams.get('stateId')
    const districtId = searchParams.get('districtId')
    const mandalId = searchParams.get('mandalId')
    const activeFilter = searchParams.get('activeFilter') // 'all', 'today', '7d', '30d', 'inactive'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
    const exportFormat = searchParams.get('export')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))

    const where: Record<string, any> = { deletedAt: null }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'blocked') {
      where.isActive = false
    }

    if (stateId) where.stateId = stateId
    if (districtId) where.districtId = districtId
    if (mandalId) where.mandalId = mandalId

    const now = new Date()
    if (activeFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      where.OR = [
        { lastActiveAt: { gte: todayStart } },
        { updatedAt: { gte: todayStart } },
      ]
    } else if (activeFilter === '7d') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      where.OR = [
        { lastActiveAt: { gte: sevenDaysAgo } },
        { updatedAt: { gte: sevenDaysAgo } },
      ]
    } else if (activeFilter === '30d') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      where.OR = [
        { lastActiveAt: { gte: thirtyDaysAgo } },
        { updatedAt: { gte: thirtyDaysAgo } },
      ]
    } else if (activeFilter === 'inactive') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      where.AND = [
        { OR: [{ lastActiveAt: { lt: thirtyDaysAgo } }, { lastActiveAt: null }] },
        { updatedAt: { lt: thirtyDaysAgo } },
      ]
    }

    // Determine sort field
    let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: sortOrder }
    if (sortBy === 'lastActiveAt') {
      orderBy = { lastActiveAt: sortOrder }
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder }
    } else if (sortBy === 'phone') {
      orderBy = { phone: sortOrder }
    }

    // Handle CSV Export
    if (exportFormat === 'csv') {
      const allUsers = await db.user.findMany({
        where,
        include: {
          state: { select: { name: true } },
          district: { select: { name: true } },
          mandal: { select: { name: true } },
          _count: {
            select: {
              bookmarks: true,
              comments: true,
            },
          },
        },
        orderBy,
        take: 5000, // Export cap for safety
      })

      const headers = [
        'ID',
        'Name',
        'Phone',
        'Email',
        'State',
        'District',
        'Mandal',
        'Preferred Language',
        'Status',
        'Notifications Enabled',
        'App Version',
        'Platform',
        'Joined At',
        'Last Active',
        'Bookmarks Count',
        'Comments Count',
      ]

      const csvRows = [headers.join(',')]
      for (const u of allUsers) {
        const row = [
          `"${u.id}"`,
          `"${(u.name || '').replace(/"/g, '""')}"`,
          `"${u.phone || ''}"`,
          `"${(u.email || '').replace(/"/g, '""')}"`,
          `"${(u.state?.name || '').replace(/"/g, '""')}"`,
          `"${(u.district?.name || '').replace(/"/g, '""')}"`,
          `"${(u.mandal?.name || '').replace(/"/g, '""')}"`,
          `"${u.preferredLanguage || 'te'}"`,
          `"${u.isActive ? 'Active' : 'Blocked'}"`,
          `"${u.notificationsEnabled ? 'Yes' : 'No'}"`,
          `"${u.appVersion || 'N/A'}"`,
          `"${u.devicePlatform || 'N/A'}"`,
          `"${u.createdAt.toISOString()}"`,
          `"${u.lastActiveAt ? u.lastActiveAt.toISOString() : ''}"`,
          u._count.bookmarks,
          u._count.comments,
        ]
        csvRows.push(row.join(','))
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="app-users-${Date.now()}.csv"`,
        },
      })
    }

    // Standard paginated fetch
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          state: { select: { id: true, name: true } },
          district: { select: { id: true, name: true } },
          mandal: { select: { id: true, name: true } },
          _count: {
            select: {
              bookmarks: true,
              comments: true,
              newsReactions: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
