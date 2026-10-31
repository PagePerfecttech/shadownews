import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params

    const reporter = await db.reporter.findUnique({
      where: { id, deletedAt: null },
      include: {
        state: true,
        district: true,
        mandal: true,
        levelAudits: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        withdrawalRequests: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!reporter) return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })

    // Fetch all news by this reporter
    const news = await db.news.findMany({
      where: { reporterId: id, deletedAt: null },
      select: {
        id: true,
        title: true,
        shortDesc: true,
        thumbnailUrl: true,
        videoUrl: true,
        status: true,
        priority: true,
        viewsCount: true,
        sharesCount: true,
        publishedAt: true,
        createdAt: true,
        category: { select: { id: true, name: true, color: true } },
        district: { select: { id: true, name: true } },
        mandal: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        approvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch earnings mapped to each news item via referenceId
    const newsIds = news.map((n) => n.id)
    const newsEarnings = await db.walletTransaction.findMany({
      where: {
        reporterId: id,
        referenceId: { in: newsIds },
      },
      select: {
        referenceId: true,
        moneyAmount: true,
        amount: true,
        type: true,
        createdAt: true,
      },
    })

    const earningsByNewsId: Record<string, number> = {}
    newsEarnings.forEach((tx) => {
      if (tx.referenceId) {
        earningsByNewsId[tx.referenceId] = (earningsByNewsId[tx.referenceId] || 0) + (tx.moneyAmount ?? 0)
      }
    })

    const enrichedNews = news.map((item) => ({
      ...item,
      earnings: earningsByNewsId[item.id] || 0,
    }))

    // Calculate aggregated metrics
    const totalNews = news.length
    const approvedArticles = news.filter((n) => n.status === 'published').length
    const pendingArticles = news.filter((n) => n.status === 'pending_review').length
    const rejectedArticles = news.filter((n) => n.status === 'rejected').length
    const totalViews = news.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0)
    const approvalRate = totalNews > 0 ? Math.round((approvedArticles / totalNews) * 100) : 0

    // Fetch general audit logs for this reporter
    const auditLogs = await db.auditLog.findMany({
      where: { entity: 'reporter', entityId: id },
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      ...reporter,
      metrics: {
        totalNews,
        approvedArticles,
        pendingArticles,
        rejectedArticles,
        totalViews,
        approvalRate,
        fakeNewsCount: reporter.fakeNewsCount || 0,
        warningCount: reporter.warningCount || 0,
        currentStreakDays: reporter.currentStreakDays || 0,
        earningsBalance: reporter.earningsBalance || 0,
        totalEarnings: reporter.totalEarnings || 0,
      },
      news: enrichedNews,
      auditLogs,
    })
  } catch (error) {
    console.error('Reporter get error:', error)
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
    const data = await request.json()

    const reporter = await db.reporter.findUnique({
      where: { id, deletedAt: null },
    })
    if (!reporter) return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })

    // 1. Check for Password Reset Action
    if (data.resetPassword) {
      const { newPassword } = data.resetPassword
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
      }
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(newPassword, salt)

      await db.reporter.update({
        where: { id },
        data: { passwordHash: hashedPassword },
      })

      await logAudit({
        adminId: admin.id,
        action: 'update',
        entity: 'reporter',
        entityId: id,
        ipAddress: getClientIp(request),
        changes: { action: 'password_reset' },
      })

      return NextResponse.json({ success: true, message: 'Password reset successfully' })
    }

    // 2. Check for Manual Wallet Adjustment Action
    if (data.adjustWallet) {
      const { amount, type, reason } = data.adjustWallet
      const numAmount = parseFloat(amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: 'Please enter a valid positive adjustment amount' }, { status: 400 })
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'Adjustment reason is required' }, { status: 400 })
      }

      const isCredit = type === 'credit'
      if (!isCredit && (reporter.earningsBalance || 0) < numAmount) {
        return NextResponse.json({ error: `Insufficient wallet balance. Reporter has ₹${reporter.earningsBalance.toFixed(2)}` }, { status: 400 })
      }

      const balanceDelta = isCredit ? numAmount : -numAmount
      const newBalance = Math.max(0, (reporter.earningsBalance || 0) + balanceDelta)
      const newTotalEarnings = isCredit ? (reporter.totalEarnings || 0) + numAmount : reporter.totalEarnings

      await db.$transaction(async (tx) => {
        // Create double-entry ledger record
        await tx.walletTransaction.create({
          data: {
            reporterId: id,
            amount: 0,
            moneyAmount: numAmount,
            type: 'ADJUSTMENT',
            txCategory: isCredit ? 'CREDIT' : 'DEBIT',
            balanceAfter: newBalance,
            status: 'completed',
            description: `Manual adjustment by admin (${admin.name}): ${reason.trim()}`,
          },
        })

        // Update reporter balance
        await tx.reporter.update({
          where: { id },
          data: {
            earningsBalance: newBalance,
            totalEarnings: newTotalEarnings,
          },
        })
      })

      await logAudit({
        adminId: admin.id,
        action: 'update',
        entity: 'reporter',
        entityId: id,
        ipAddress: getClientIp(request),
        changes: {
          action: 'wallet_adjustment',
          type,
          amount: numAmount,
          reason,
          balanceAfter: newBalance,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Wallet adjusted successfully: ${isCredit ? '+' : '-'}₹${numAmount.toFixed(2)}`,
        balanceAfter: newBalance,
      })
    }

    // 3. Check for Role / Career Level Change
    let roleUpdated = false
    if (data.role && data.role !== reporter.role) {
      roleUpdated = true
      // Log promotion / demotion audit
      await db.reporterLevelAudit.create({
        data: {
          reporterId: id,
          fromLevel: reporter.role,
          toLevel: data.role,
          action: 'manual_override',
          reason: data.levelChangeReason || `Admin manual level update to ${data.role}`,
          changedBy: admin.name,
          metricsSnapshot: JSON.stringify({
            approvedArticles: reporter.approvedArticles,
            rejectedArticles: reporter.rejectedArticles,
            totalViews: reporter.performanceScore,
            earningsBalance: reporter.earningsBalance,
          }),
        },
      })
    }

    // 4. Standard Profile / Permissions Update
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.avatar !== undefined) updateData.avatar = data.avatar || null
    if (data.idProofUrl !== undefined) updateData.idProofUrl = data.idProofUrl || null
    if (data.bio !== undefined) updateData.bio = data.bio || null
    if (data.stateId !== undefined) updateData.stateId = data.stateId
    if (data.districtId !== undefined) updateData.districtId = data.districtId
    if (data.mandalId !== undefined) updateData.mandalId = data.mandalId || null
    if (data.beat !== undefined) updateData.beat = data.beat || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.role !== undefined) updateData.role = data.role
    if (data.postingScope !== undefined) updateData.postingScope = data.postingScope
    if (data.canPublishDirectly !== undefined) updateData.canPublishDirectly = data.canPublishDirectly

    if (data.allowedDistrictIds !== undefined) {
      updateData.allowedDistrictIds = Array.isArray(data.allowedDistrictIds)
        ? JSON.stringify(data.allowedDistrictIds)
        : (typeof data.allowedDistrictIds === 'string' ? data.allowedDistrictIds : '[]')
    }
    if (data.allowedMandalIds !== undefined) {
      updateData.allowedMandalIds = Array.isArray(data.allowedMandalIds)
        ? JSON.stringify(data.allowedMandalIds)
        : (typeof data.allowedMandalIds === 'string' ? data.allowedMandalIds : '[]')
    }

    const updatedReporter = await db.reporter.update({
      where: { id },
      data: updateData,
      include: {
        state: true,
        district: true,
        mandal: true,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'reporter',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: { ...updateData, roleUpdated },
    })

    return NextResponse.json(updatedReporter)
  } catch (error) {
    console.error('Reporter update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await db.reporter.update({ where: { id }, data: { deletedAt: new Date() } })
    await logAudit({
      adminId: admin.id,
      action: 'delete',
      entity: 'reporter',
      entityId: id,
      ipAddress: getClientIp(request),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reporter delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
