import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'
import {
  getLevelConfig,
  getReporterLevelProgress,
  checkSubmissionLimit,
  computeReporterMetrics,
} from '@/lib/reward-engine'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken, {
      include: {
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

    if (!reporter) {
      return NextResponse.json({ error: 'Reporter not found' }, { status: 404 })
    }

    const [levelConfig, levelProgress, submissionLimits, metrics] = await Promise.all([
      getLevelConfig(reporter.role || 'junior'),
      getReporterLevelProgress(reporter.id),
      checkSubmissionLimit(reporter.id),
      computeReporterMetrics(reporter.id),
    ])

    const rateSetting = await db.setting.findUnique({ where: { key: 'COINS_PER_INR' } })
    const coinsPerInr = rateSetting && !isNaN(parseFloat(rateSetting.value)) ? parseFloat(rateSetting.value) : 100
    const conversionRate = 1 / coinsPerInr

    return NextResponse.json({
      balance: reporter.coinsBalance, // backwards-compatible coins
      coinsBalance: reporter.coinsBalance,
      earningsBalance: reporter.earningsBalance, // ₹ balance
      totalEarnings: reporter.totalEarnings,
      conversionRate,
      levelConfig,
      levelProgress,
      submissionLimits,
      metrics,
      savedPaymentDetails: {
        upiId: reporter.upiId || '',
        bankAccountNumber: reporter.bankAccountNumber || '',
        bankIfsc: reporter.bankIfsc || '',
        bankAccountName: reporter.bankAccountName || '',
        lastWithdrawalAt: reporter.lastWithdrawalAt,
      },
      transactions: reporter.walletTransactions,
      withdrawals: reporter.withdrawalRequests,
    })
  } catch (error) {
    console.error('Wallet get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
