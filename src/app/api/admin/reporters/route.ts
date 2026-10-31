import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status')
    const role = searchParams.get('role')
    const stateId = searchParams.get('stateId')
    const districtId = searchParams.get('districtId')
    const mandalId = searchParams.get('mandalId')
    const exportCsv = searchParams.get('export') === 'csv'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = { deletedAt: null }

    if (status && status !== 'all') {
      where.status = status
    }
    if (role && role !== 'all') {
      where.role = role
    }
    if (stateId && stateId !== 'all') {
      where.stateId = stateId
    }
    if (districtId && districtId !== 'all') {
      where.districtId = districtId
    }
    if (mandalId && mandalId !== 'all') {
      where.mandalId = mandalId
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { beat: { contains: search, mode: 'insensitive' } },
      ]
    }

    // If CSV export is requested, retrieve all matching records without pagination
    if (exportCsv) {
      const reporters = await db.reporter.findMany({
        where,
        include: {
          state: { select: { name: true } },
          district: { select: { name: true } },
          mandal: { select: { name: true } },
          news: {
            where: { deletedAt: null },
            select: { status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const headers = [
        'ID',
        'Name',
        'Phone',
        'Email',
        'Role/Level',
        'Posting Scope',
        'Status',
        'State',
        'District',
        'Mandal',
        'Beat',
        'Total News',
        'Approved News',
        'Pending News',
        'Rejected News',
        'Wallet Balance (INR)',
        'Total Earned (INR)',
        'Joined Date',
      ]

      const rows = reporters.map((r) => {
        const approvedCount = r.news.filter((n) => n.status === 'published').length
        const pendingCount = r.news.filter((n) => n.status === 'pending_review').length
        const rejectedCount = r.news.filter((n) => n.status === 'rejected').length

        return [
          r.id,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          `"${r.phone}"`,
          `"${r.email || ''}"`,
          r.role || 'junior',
          r.postingScope || 'mandal',
          r.status,
          `"${r.state?.name || ''}"`,
          `"${r.district?.name || ''}"`,
          `"${r.mandal?.name || ''}"`,
          `"${(r.beat || '').replace(/"/g, '""')}"`,
          r.news.length,
          approvedCount,
          pendingCount,
          rejectedCount,
          (r.earningsBalance || 0).toFixed(2),
          (r.totalEarnings || 0).toFixed(2),
          new Date(r.createdAt).toISOString().split('T')[0],
        ].join(',')
      })

      const csvContent = [headers.join(','), ...rows].join('\n')
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reporters-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    const [reporters, total] = await Promise.all([
      db.reporter.findMany({
        where,
        include: {
          state: { select: { id: true, name: true } },
          district: { select: { id: true, name: true } },
          mandal: { select: { id: true, name: true } },
          news: {
            where: { deletedAt: null },
            select: { status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.reporter.count({ where }),
    ])

    const formatted = reporters.map((r) => {
      const approvedArticles = r.news.filter((n) => n.status === 'published').length
      const pendingArticles = r.news.filter((n) => n.status === 'pending_review').length
      const rejectedArticles = r.news.filter((n) => n.status === 'rejected').length
      const totalNews = r.news.length

      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        avatar: r.avatar,
        bio: r.bio,
        idProofUrl: r.idProofUrl,
        beat: r.beat,
        status: r.status,
        role: r.role || 'junior',
        postingScope: r.postingScope || 'mandal',
        allowedDistrictIds: r.allowedDistrictIds,
        allowedMandalIds: r.allowedMandalIds,
        canPublishDirectly: r.canPublishDirectly,
        stateId: r.stateId,
        districtId: r.districtId,
        mandalId: r.mandalId,
        state: r.state,
        district: r.district,
        mandal: r.mandal,
        earningsBalance: r.earningsBalance || 0,
        totalEarnings: r.totalEarnings || 0,
        coinsBalance: r.coinsBalance || 0,
        currentStreakDays: r.currentStreakDays || 0,
        performanceScore: r.performanceScore || 0,
        promotionStatus: r.promotionStatus || 'none',
        fakeNewsCount: r.fakeNewsCount || 0,
        warningCount: r.warningCount || 0,
        totalNews,
        approvedArticles,
        pendingArticles,
        rejectedArticles,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }
    })

    return NextResponse.json({
      reporters: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Reporters list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()

    // Validate phone uniqueness
    const existing = await db.reporter.findUnique({
      where: { phone: data.phone },
    })
    if (existing && !existing.deletedAt) {
      return NextResponse.json({ error: 'Reporter with this phone number already exists' }, { status: 400 })
    }

    const reporter = await db.reporter.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        avatar: data.avatar || null,
        bio: data.bio || null,
        idProofUrl: data.idProofUrl || null,
        stateId: data.stateId,
        districtId: data.districtId,
        mandalId: data.mandalId || null,
        beat: data.beat || null,
        status: data.status || 'pending',
        role: data.role || 'junior',
        postingScope: data.postingScope || 'mandal',
        canPublishDirectly: data.canPublishDirectly || false,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'reporter',
      entityId: reporter.id,
      ipAddress: getClientIp(request),
      changes: { name: data.name, phone: data.phone, email: data.email, role: data.role },
    })

    return NextResponse.json(reporter, { status: 201 })
  } catch (error) {
    console.error('Reporter create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
