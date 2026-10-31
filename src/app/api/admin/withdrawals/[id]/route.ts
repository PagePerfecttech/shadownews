import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'
import { completeReporterWithdrawal, rejectReporterWithdrawal } from '@/lib/reward-engine'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            avatar: true,
            earningsBalance: true,
            coinsBalance: true,
            totalEarnings: true,
            approvedArticles: true,
            rejectedArticles: true,
            district: { select: { name: true } },
            mandal: { select: { name: true } },
            state: { select: { name: true } },
          }
        }
      }
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    // Fetch prior withdrawals by this same reporter
    const priorWithdrawals = await db.withdrawalRequest.findMany({
      where: {
        reporterId: withdrawal.reporterId,
        id: { not: id }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Fetch recent wallet ledger transactions for earning breakdown
    const recentTransactions = await db.walletTransaction.findMany({
      where: { reporterId: withdrawal.reporterId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return NextResponse.json({
      withdrawal,
      priorWithdrawals,
      recentTransactions,
    })
  } catch (error) {
    console.error('Admin withdrawal detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await request.json()
    const { status, transactionReference, rejectionReason, adminNotes } = data

    const withdrawal = await db.withdrawalRequest.findUnique({ where: { id } })
    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal request not found' }, { status: 404 })
    }

    if (status === 'completed') {
      const res = await completeReporterWithdrawal({
        withdrawalId: id,
        transactionReference: transactionReference || data.reference,
        adminNotes,
        adminName: admin.name || 'Admin'
      })
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 })
      }
    } else if (status === 'rejected') {
      const res = await rejectReporterWithdrawal({
        withdrawalId: id,
        rejectionReason: rejectionReason || adminNotes || 'Declined by administrator',
        adminNotes,
        adminName: admin.name || 'Admin'
      })
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 })
      }
    } else if (status === 'approved' || status === 'processing') {
      await db.withdrawalRequest.update({
        where: { id },
        data: {
          status,
          adminNotes: adminNotes ?? withdrawal.adminNotes,
          processedBy: admin.name || 'Admin',
        }
      })
    } else if (adminNotes !== undefined) {
      await db.withdrawalRequest.update({
        where: { id },
        data: { adminNotes }
      })
    }

    await logAudit({
      adminId: admin.id,
      action: 'status_change',
      entity: 'withdrawal',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: { status, transactionReference, rejectionReason, adminNotes }
    })

    const updated = await db.withdrawalRequest.findUnique({
      where: { id },
      include: { reporter: true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin withdrawal update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
