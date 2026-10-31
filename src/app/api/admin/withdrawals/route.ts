import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'
import { completeReporterWithdrawal, rejectReporterWithdrawal } from '@/lib/reward-engine'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const payoutMethod = searchParams.get('payoutMethod')
    const reporterId = searchParams.get('reporterId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minAmount = searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : null
    const maxAmount = searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '25')))
    const exportCsv = searchParams.get('export') === 'csv'

    // Build Prisma query filter
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (payoutMethod && payoutMethod !== 'all') {
      where.payoutMethod = payoutMethod
    }

    if (reporterId) {
      where.reporterId = reporterId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    if (minAmount !== null || maxAmount !== null) {
      where.moneyAmount = {}
      if (minAmount !== null && !isNaN(minAmount)) where.moneyAmount.gte = minAmount
      if (maxAmount !== null && !isNaN(maxAmount)) where.moneyAmount.lte = maxAmount
    }

    if (search) {
      where.OR = [
        { upiId: { contains: search, mode: 'insensitive' } },
        { transactionReference: { contains: search, mode: 'insensitive' } },
        { bankAccountNumber: { contains: search, mode: 'insensitive' } },
        { reporter: { name: { contains: search, mode: 'insensitive' } } },
        { reporter: { phone: { contains: search } } },
      ]
    }

    // CSV Export Flow
    if (exportCsv) {
      const allWithdrawals = await db.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { name: true, phone: true, role: true, district: { select: { name: true } } }
          }
        }
      })

      const headers = ['Request ID', 'Reporter', 'Phone', 'District', 'Role', 'Amount (INR)', 'Method', 'UPI / Bank A/C', 'IFSC', 'Status', 'UTR Reference', 'Requested Date', 'Processed Date', 'Processed By', 'Rejection Reason']
      const rows = allWithdrawals.map(w => [
        w.id,
        `"${(w.reporter.name || '').replace(/"/g, '""')}"`,
        w.reporter.phone,
        w.reporter.district?.name || 'TG',
        w.reporter.role,
        w.moneyAmount.toFixed(2),
        w.payoutMethod,
        w.payoutMethod === 'upi' ? (w.upiId || '') : (w.bankAccountNumber || ''),
        w.bankIfsc || '',
        w.status,
        w.transactionReference || '',
        w.createdAt.toISOString(),
        w.processedAt ? w.processedAt.toISOString() : '',
        w.processedBy || '',
        `"${(w.rejectionReason || '').replace(/"/g, '""')}"`,
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="withdrawals_export_${new Date().toISOString().slice(0, 10)}.csv"`
        }
      })
    }

    // Standard paginated fetch + Summary stats
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [
      totalCount,
      withdrawals,
      pendingGroup,
      paidTodayGroup,
      paidMonthGroup,
      rejectedCount
    ] = await Promise.all([
      db.withdrawalRequest.count({ where }),
      db.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              avatar: true,
              earningsBalance: true,
              coinsBalance: true,
              district: { select: { id: true, name: true } },
              mandal: { select: { id: true, name: true } },
            }
          }
        }
      }),
      db.withdrawalRequest.aggregate({
        where: { status: 'pending' },
        _count: true,
        _sum: { moneyAmount: true }
      }),
      db.withdrawalRequest.aggregate({
        where: { status: 'completed', processedAt: { gte: todayStart } },
        _count: true,
        _sum: { moneyAmount: true }
      }),
      db.withdrawalRequest.aggregate({
        where: { status: 'completed', processedAt: { gte: monthStart } },
        _count: true,
        _sum: { moneyAmount: true }
      }),
      db.withdrawalRequest.count({
        where: { status: 'rejected' }
      })
    ])

    return NextResponse.json({
      withdrawals: withdrawals.map(w => ({
        ...w,
        reporter: {
          id: w.reporter.id,
          name: w.reporter.name,
          phone: w.reporter.phone,
          role: w.reporter.role,
          avatar: w.reporter.avatar,
          currentBalance: w.reporter.earningsBalance,
          coinsBalance: w.reporter.coinsBalance,
          district: w.reporter.district?.name || 'Unknown',
          mandal: w.reporter.mandal?.name || '',
        }
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      summary: {
        pendingCount: pendingGroup._count || 0,
        pendingAmount: pendingGroup._sum.moneyAmount || 0,
        paidTodayCount: paidTodayGroup._count || 0,
        paidTodayAmount: paidTodayGroup._sum.moneyAmount || 0,
        paidMonthCount: paidMonthGroup._count || 0,
        paidMonthAmount: paidMonthGroup._sum.moneyAmount || 0,
        rejectedCount: rejectedCount || 0,
      }
    })
  } catch (error) {
    console.error('Admin withdrawals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Bulk Actions (Bulk approve or Bulk mark-paid)
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, ids, transactionReferencePrefix, notes } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least one withdrawal request.' }, { status: 400 })
    }

    let successCount = 0
    const errors: string[] = []

    if (action === 'bulk_approve') {
      for (const id of ids) {
        try {
          await db.withdrawalRequest.updateMany({
            where: { id, status: 'pending' },
            data: {
              status: 'approved',
              processedBy: admin.name || 'Admin',
              adminNotes: notes || 'Bulk approved by administrator'
            }
          })
          successCount++
        } catch (e: any) {
          errors.push(`ID ${id}: ${e.message}`)
        }
      }
    } else if (action === 'bulk_mark_paid') {
      const prefix = transactionReferencePrefix || `BATCH-${Date.now().toString().slice(-6)}`
      let idx = 1
      for (const id of ids) {
        const utr = `${prefix}-${idx++}`
        const res = await completeReporterWithdrawal({
          withdrawalId: id,
          transactionReference: utr,
          adminNotes: notes || 'Bulk paid via batch UTR',
          adminName: admin.name || 'Admin'
        })
        if (res.success) {
          successCount++
        } else {
          errors.push(`ID ${id}: ${res.error}`)
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid bulk action.' }, { status: 400 })
    }

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'withdrawal',
      entityId: `batch_${ids.length}`,
      ipAddress: getClientIp(request),
      changes: { action, count: successCount, total: ids.length }
    })

    return NextResponse.json({
      success: true,
      processed: successCount,
      total: ids.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Bulk withdrawal action error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
