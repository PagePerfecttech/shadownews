import { db } from './db'

export interface ReporterMetrics {
  totalArticles: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  approvalRate: number
  totalViews: number
  totalShares: number
  performanceScore: number
  currentStreak: number
  warningCount: number
  fakeNewsCount: number
  avgApprovalHours: number
}

export interface LevelProgress {
  currentLevel: any
  nextLevel: any | null
  approvedProgress: number // 0 - 100
  rateProgress: number
  viewsProgress: number
  scoreProgress: number
  overallProgress: number
}

// 1. Fetch level config with fallback defaults
export async function getLevelConfig(levelKey: string) {
  const normalizedKey = (levelKey || 'junior').toLowerCase()
  let config = await db.reporterLevelConfig.findUnique({
    where: { levelKey: normalizedKey }
  })

  if (!config) {
    // Fallback search or junior default
    config = await db.reporterLevelConfig.findFirst({
      where: { isActive: true },
      orderBy: { rankOrder: 'asc' }
    })
  }

  return config
}

// 2. Fetch all levels ordered by rank
export async function getAllLevelConfigs() {
  return await db.reporterLevelConfig.findMany({
    orderBy: { rankOrder: 'asc' }
  })
}

// 3. Check submission limits before posting news
export async function checkSubmissionLimit(reporterId: string, categoryId?: string): Promise<{
  allowed: boolean
  reason?: string
  remainingToday: number
  dailyLimit: number
  weeklyLimit: number
}> {
  const reporter = await db.reporter.findUnique({
    where: { id: reporterId },
    select: { id: true, role: true, canPublishDirectly: true, status: true }
  })

  if (!reporter || reporter.status !== 'approved') {
    return {
      allowed: false,
      reason: 'Reporter account is not active or approved.',
      remainingToday: 0,
      dailyLimit: 0,
      weeklyLimit: 0
    }
  }

  const level = await getLevelConfig(reporter.role || 'junior')
  if (!level) {
    return { allowed: true, remainingToday: 99, dailyLimit: 99, weeklyLimit: 99 }
  }

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())

  // Count articles submitted today
  const todayCount = await db.news.count({
    where: {
      reporterId,
      deletedAt: null,
      createdAt: { gte: startOfDay }
    }
  })

  if (todayCount >= level.dailyPostLimit) {
    return {
      allowed: false,
      reason: `Daily post limit of ${level.dailyPostLimit} reached for your rank (${level.displayName}).`,
      remainingToday: 0,
      dailyLimit: level.dailyPostLimit,
      weeklyLimit: level.weeklyPostLimit
    }
  }

  // Count articles submitted this week
  const weekCount = await db.news.count({
    where: {
      reporterId,
      deletedAt: null,
      createdAt: { gte: startOfWeek }
    }
  })

  if (weekCount >= level.weeklyPostLimit) {
    return {
      allowed: false,
      reason: `Weekly post limit of ${level.weeklyPostLimit} reached for your rank (${level.displayName}).`,
      remainingToday: 0,
      dailyLimit: level.dailyPostLimit,
      weeklyLimit: level.weeklyPostLimit
    }
  }

  // Check category limit if specified
  if (categoryId && level.perCategoryDailyLimit > 0) {
    const categoryTodayCount = await db.news.count({
      where: {
        reporterId,
        categoryId,
        deletedAt: null,
        createdAt: { gte: startOfDay }
      }
    })

    if (categoryTodayCount >= level.perCategoryDailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit of ${level.perCategoryDailyLimit} posts in this category reached.`,
        remainingToday: Math.max(0, level.dailyPostLimit - todayCount),
        dailyLimit: level.dailyPostLimit,
        weeklyLimit: level.weeklyPostLimit
      }
    }
  }

  return {
    allowed: true,
    remainingToday: Math.max(0, level.dailyPostLimit - todayCount),
    dailyLimit: level.dailyPostLimit,
    weeklyLimit: level.weeklyPostLimit
  }
}

// 4. Double-Entry ledger news approval reward
export async function processNewsApprovalReward(newsId: string): Promise<{
  success: boolean
  rewardedAmount: number
  balanceAfter: number
}> {
  const news = await db.news.findUnique({
    where: { id: newsId },
    include: { reporter: true }
  })

  if (!news || !news.reporterId || !news.reporter) {
    return { success: false, rewardedAmount: 0, balanceAfter: 0 }
  }

  const reporter = news.reporter

  // Prevent duplicate rewards for the same news
  const existingReward = await db.walletTransaction.findFirst({
    where: {
      reporterId: reporter.id,
      referenceId: newsId,
      txCategory: { in: ['reward', 'bonus'] },
      status: 'completed'
    }
  })

  if (existingReward) {
    return {
      success: false,
      rewardedAmount: 0,
      balanceAfter: reporter.earningsBalance
    }
  }

  const level = await getLevelConfig(reporter.role || 'junior')
  let rewardCash = level ? level.payPerApprovedArticle : 3.0

  // Add breaking or exclusive bonus
  const isBreaking = news.priority === 'urgent' || news.priority === 'breaking'
  if (isBreaking && level && level.breakingBonus > 0) {
    rewardCash += level.breakingBonus
  }
  if (news.isFeatured && level && level.exclusiveBonus > 0) {
    rewardCash += level.exclusiveBonus
  }

  if (rewardCash <= 0) {
    return { success: false, rewardedAmount: 0, balanceAfter: reporter.earningsBalance }
  }

  const coinsPerInr = 100
  const coinsAmount = Math.round(rewardCash * coinsPerInr)

  // Atomic ledger transaction execution
  const result = await db.$transaction(async (tx) => {
    // Lock reporter row for update
    const currentRep = await tx.reporter.findUnique({
      where: { id: reporter.id }
    })
    if (!currentRep) throw new Error('Reporter not found')

    const newCashBalance = Math.round((currentRep.earningsBalance + rewardCash) * 100) / 100
    const newCoinsBalance = currentRep.coinsBalance + coinsAmount
    const newTotalEarnings = Math.round((currentRep.totalEarnings + rewardCash) * 100) / 100

    const description = `Approved article reward: ${news.title.substring(0, 40)} (₹${rewardCash})`

    const transaction = await tx.walletTransaction.create({
      data: {
        reporterId: reporter.id,
        amount: coinsAmount,
        moneyAmount: rewardCash,
        type: 'CREDIT',
        txCategory: isBreaking ? 'bonus' : 'reward',
        description,
        referenceId: newsId,
        balanceAfter: newCashBalance,
        coinsBalanceAfter: newCoinsBalance,
        status: 'completed',
      }
    })

    // Update streak if posted today
    const now = new Date()
    let newStreak = currentRep.currentStreakDays
    if (!currentRep.lastPostedAt) {
      newStreak = 1
    } else {
      const diffHours = (now.getTime() - new Date(currentRep.lastPostedAt).getTime()) / (1000 * 60 * 60)
      if (diffHours >= 20 && diffHours <= 48) {
        newStreak += 1
      } else if (diffHours > 48) {
        newStreak = 1
      }
    }

    await tx.reporter.update({
      where: { id: reporter.id },
      data: {
        earningsBalance: newCashBalance,
        coinsBalance: newCoinsBalance,
        totalEarnings: newTotalEarnings,
        approvedArticles: { increment: 1 },
        performanceScore: { increment: 10 },
        lastPostedAt: now,
        currentStreakDays: newStreak,
      }
    })

    return { transaction, newCashBalance }
  })

  // Check promotion eligibility asynchronously
  evaluatePromotionDemotion(reporter.id, true, 'system_approval').catch((e) =>
    console.error('Auto promotion check failed:', e)
  )

  return {
    success: true,
    rewardedAmount: rewardCash,
    balanceAfter: result.newCashBalance,
  }
}

// 5. Reversal of rewards if news is deleted, flagged, or rejected
export async function reverseNewsReward(newsId: string, reason: string = 'Article unapproved or rejected'): Promise<{
  success: boolean
  reversedAmount: number
}> {
  const originalTxs = await db.walletTransaction.findMany({
    where: {
      referenceId: newsId,
      type: 'CREDIT',
      status: 'completed'
    }
  })

  if (originalTxs.length === 0) {
    return { success: false, reversedAmount: 0 }
  }

  let totalReversed = 0

  await db.$transaction(async (tx) => {
    for (const orig of originalTxs) {
      const reporter = await tx.reporter.findUnique({
        where: { id: orig.reporterId }
      })
      if (!reporter) continue

      const newCashBalance = Math.max(0, Math.round((reporter.earningsBalance - orig.moneyAmount) * 100) / 100)
      const newCoinsBalance = Math.max(0, reporter.coinsBalance - orig.amount)

      await tx.walletTransaction.create({
        data: {
          reporterId: orig.reporterId,
          amount: orig.amount,
          moneyAmount: orig.moneyAmount,
          type: 'DEBIT',
          txCategory: 'reversal',
          description: `Reward reversed for article #${newsId}: ${reason}`,
          referenceId: newsId,
          balanceAfter: newCashBalance,
          coinsBalanceAfter: newCoinsBalance,
          status: 'completed',
          reversalOfId: orig.id,
        }
      })

      // Mark original as reversed
      await tx.walletTransaction.update({
        where: { id: orig.id },
        data: { status: 'reversed' }
      })

      await tx.reporter.update({
        where: { id: orig.reporterId },
        data: {
          earningsBalance: newCashBalance,
          coinsBalance: newCoinsBalance,
          approvedArticles: { decrement: 1 },
          performanceScore: { decrement: 10 },
        }
      })

      totalReversed += orig.moneyAmount
    }
  })

  return { success: true, reversedAmount: totalReversed }
}

// 6. Compute real metrics from the database
export async function computeReporterMetrics(reporterId: string): Promise<ReporterMetrics> {
  const reporter = await db.reporter.findUnique({
    where: { id: reporterId },
    select: {
      performanceScore: true,
      currentStreakDays: true,
      warningCount: true,
      fakeNewsCount: true,
    }
  })

  const [articles, viewsAgg] = await Promise.all([
    db.news.findMany({
      where: { reporterId, deletedAt: null },
      select: {
        status: true,
        sharesCount: true,
        createdAt: true,
        publishedAt: true,
      }
    }),
    db.news.aggregate({
      where: { reporterId, deletedAt: null },
      _sum: { viewsCount: true, sharesCount: true }
    })
  ])

  let approved = 0
  let rejected = 0
  let pending = 0
  let totalApprovalHours = 0
  let approvedWithTime = 0

  for (const a of articles) {
    if (a.status === 'published') {
      approved++
      if (a.publishedAt && a.createdAt) {
        const diffMs = new Date(a.publishedAt).getTime() - new Date(a.createdAt).getTime()
        if (diffMs > 0) {
          totalApprovalHours += diffMs / (1000 * 60 * 60)
          approvedWithTime++
        }
      }
    } else if (a.status === 'rejected') {
      rejected++
    } else {
      pending++
    }
  }

  const total = articles.length
  const approvalRate = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0
  const avgApprovalHours = approvedWithTime > 0 ? Math.round((totalApprovalHours / approvedWithTime) * 10) / 10 : 0

  return {
    totalArticles: total,
    approvedCount: approved,
    rejectedCount: rejected,
    pendingCount: pending,
    approvalRate,
    totalViews: viewsAgg._sum.viewsCount || 0,
    totalShares: viewsAgg._sum.sharesCount || 0,
    performanceScore: reporter?.performanceScore || 0,
    currentStreak: reporter?.currentStreakDays || 0,
    warningCount: reporter?.warningCount || 0,
    fakeNewsCount: reporter?.fakeNewsCount || 0,
    avgApprovalHours,
  }
}

// 7. Calculate Progress towards next rank
export async function getReporterLevelProgress(reporterId: string): Promise<LevelProgress> {
  const reporter = await db.reporter.findUnique({
    where: { id: reporterId },
    select: { role: true }
  })

  const currentLevelKey = reporter?.role || 'junior'
  const allLevels = await getAllLevelConfigs()
  const currentConfig = allLevels.find((l) => l.levelKey === currentLevelKey) || allLevels[0]
  const nextConfig = allLevels.find((l) => l.rankOrder === currentConfig.rankOrder + 1) || null

  const metrics = await computeReporterMetrics(reporterId)

  if (!nextConfig) {
    // At maximum rank
    return {
      currentLevel: currentConfig,
      nextLevel: null,
      approvedProgress: 100,
      rateProgress: 100,
      viewsProgress: 100,
      scoreProgress: 100,
      overallProgress: 100,
    }
  }

  const approvedProgress = Math.min(100, Math.round((metrics.approvedCount / Math.max(1, nextConfig.minApprovedArticles)) * 100))
  const rateProgress = Math.min(100, Math.round((metrics.approvalRate / Math.max(1, nextConfig.minApprovalRate)) * 100))
  const viewsProgress = Math.min(100, Math.round((metrics.totalViews / Math.max(1, nextConfig.minTotalViews)) * 100))
  const scoreProgress = Math.min(100, Math.round((metrics.performanceScore / Math.max(1, nextConfig.minPerformanceScore)) * 100))

  const overall = Math.round((approvedProgress + rateProgress + viewsProgress + scoreProgress) / 4)

  return {
    currentLevel: currentConfig,
    nextLevel: nextConfig,
    approvedProgress,
    rateProgress,
    viewsProgress,
    scoreProgress,
    overallProgress: overall,
  }
}

// 8. Evaluation engine: promotion or demotion against level thresholds
export async function evaluatePromotionDemotion(
  reporterId: string,
  autoApply: boolean = false,
  changedBy: string = 'system'
): Promise<{
  eligibleAction: 'promote' | 'demote' | 'none'
  targetLevel: string | null
  reason: string
  applied: boolean
}> {
  const reporter = await db.reporter.findUnique({
    where: { id: reporterId }
  })
  if (!reporter) {
    return { eligibleAction: 'none', targetLevel: null, reason: 'Reporter not found', applied: false }
  }

  const allLevels = await getAllLevelConfigs()
  const currentLevel = allLevels.find((l) => l.levelKey === (reporter.role || 'junior')) || allLevels[0]
  const nextLevel = allLevels.find((l) => l.rankOrder === currentLevel.rankOrder + 1)
  const prevLevel = allLevels.find((l) => l.rankOrder === currentLevel.rankOrder - 1)

  const metrics = await computeReporterMetrics(reporterId)

  // Check promotion to next level
  if (nextLevel) {
    const meetsApproved = metrics.approvedCount >= nextLevel.minApprovedArticles
    const meetsRate = metrics.approvalRate >= nextLevel.minApprovalRate
    const meetsViews = metrics.totalViews >= nextLevel.minTotalViews
    const meetsScore = metrics.performanceScore >= nextLevel.minPerformanceScore
    const cleanRecord = metrics.warningCount <= nextLevel.maxWarningsAllowed && metrics.fakeNewsCount <= nextLevel.maxFakeNewsAllowed

    if (meetsApproved && meetsRate && meetsViews && meetsScore && cleanRecord) {
      if (autoApply) {
        await db.$transaction([
          db.reporter.update({
            where: { id: reporterId },
            data: {
              role: nextLevel.levelKey,
              canPublishDirectly: nextLevel.canPublishDirectly,
              promotionStatus: 'promoted',
            }
          }),
          db.reporterLevelAudit.create({
            data: {
              reporterId,
              fromLevel: currentLevel.levelKey,
              toLevel: nextLevel.levelKey,
              action: 'promoted',
              reason: `Met all thresholds for ${nextLevel.displayName} (${metrics.approvedCount} approved, ${metrics.approvalRate}% rate, ${metrics.totalViews} views, ${metrics.performanceScore} score)`,
              metricsSnapshot: JSON.stringify(metrics),
              changedBy,
            }
          })
        ])
        return {
          eligibleAction: 'promote',
          targetLevel: nextLevel.levelKey,
          reason: `Promoted to ${nextLevel.displayName}`,
          applied: true,
        }
      } else {
        await db.reporter.update({
          where: { id: reporterId },
          data: { promotionStatus: 'recommended' }
        })
        return {
          eligibleAction: 'promote',
          targetLevel: nextLevel.levelKey,
          reason: `Eligible for promotion to ${nextLevel.displayName}`,
          applied: false,
        }
      }
    }
  }

  // Check demotion to previous level if thresholds fallen below
  if (prevLevel && currentLevel.demotionScoreThreshold > 0) {
    const tooManyWarnings = metrics.warningCount >= 5
    const tooManyFake = metrics.fakeNewsCount >= 2
    const scoreFallen = metrics.performanceScore < currentLevel.demotionScoreThreshold

    if (tooManyWarnings || tooManyFake || scoreFallen) {
      if (autoApply) {
        await db.$transaction([
          db.reporter.update({
            where: { id: reporterId },
            data: {
              role: prevLevel.levelKey,
              canPublishDirectly: prevLevel.canPublishDirectly,
              promotionStatus: 'demoted',
            }
          }),
          db.reporterLevelAudit.create({
            data: {
              reporterId,
              fromLevel: currentLevel.levelKey,
              toLevel: prevLevel.levelKey,
              action: 'demoted',
              reason: `Performance dropped below threshold: Score ${metrics.performanceScore}/${currentLevel.demotionScoreThreshold}, Warnings: ${metrics.warningCount}, Fake: ${metrics.fakeNewsCount}`,
              metricsSnapshot: JSON.stringify(metrics),
              changedBy,
            }
          })
        ])
        return {
          eligibleAction: 'demote',
          targetLevel: prevLevel.levelKey,
          reason: `Demoted to ${prevLevel.displayName}`,
          applied: true,
        }
      } else {
        await db.reporter.update({
          where: { id: reporterId },
          data: { promotionStatus: 'demotion_recommended' }
        })
        return {
          eligibleAction: 'demote',
          targetLevel: prevLevel.levelKey,
          reason: `Demotion recommended to ${prevLevel.displayName}`,
          applied: false,
        }
      }
    }
  }

  return { eligibleAction: 'none', targetLevel: null, reason: 'In good standing at current level', applied: false }
}

// 9. Promotion engine cron evaluator across all active reporters
export async function runPromotionEngineCron(): Promise<{
  evaluatedCount: number
  promotedCount: number
  demotedCount: number
  flaggedCount: number
}> {
  const reporters = await db.reporter.findMany({
    where: { deletedAt: null, status: 'approved' }
  })

  let evaluated = 0
  let promoted = 0
  let demoted = 0
  let flagged = 0

  for (const r of reporters) {
    evaluated++
    const res = await evaluatePromotionDemotion(r.id, true, 'system_cron')
    if (res.applied) {
      if (res.eligibleAction === 'promote') promoted++
      if (res.eligibleAction === 'demote') demoted++
    } else if (res.eligibleAction !== 'none') {
      flagged++
    }
  }

  return {
    evaluatedCount: evaluated,
    promotedCount: promoted,
    demotedCount: demoted,
    flaggedCount: flagged,
  }
}

// 10. Request reporter withdrawal with validation, cooldown, and double-entry atomic debit
export async function requestReporterWithdrawal(params: {
  reporterId: string
  amount: number // in INR (₹)
  payoutMethod: 'upi' | 'bank_transfer'
  upiId?: string
  bankAccountNumber?: string
  bankIfsc?: string
  bankAccountName?: string
}): Promise<{
  success: boolean
  error?: string
  withdrawal?: any
  balanceAfter?: number
}> {
  const { reporterId, amount, payoutMethod, upiId, bankAccountNumber, bankIfsc, bankAccountName } = params

  if (amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Invalid withdrawal amount' }
  }

  const reporter = await db.reporter.findUnique({
    where: { id: reporterId },
    include: {
      withdrawalRequests: {
        where: { status: { in: ['pending', 'processing', 'approved'] } }
      }
    }
  })

  if (!reporter) {
    return { success: false, error: 'Reporter not found' }
  }

  // Cooldown check (24 hours between withdrawal requests)
  if (reporter.lastWithdrawalAt) {
    const hoursSinceLast = (Date.now() - new Date(reporter.lastWithdrawalAt).getTime()) / (1000 * 60 * 60)
    if (hoursSinceLast < 24) {
      const waitHours = Math.ceil(24 - hoursSinceLast)
      return { success: false, error: `Withdrawal cooldown in effect. Please wait ${waitHours} more hours before requesting again.` }
    }
  }

  // No duplicate pending requests
  if (reporter.withdrawalRequests.length > 0) {
    return { success: false, error: 'You already have an active withdrawal request under review.' }
  }

  // Minimum withdrawal limit
  const levelConfig = await getLevelConfig(reporter.role || 'junior')
  const minWithdrawal = levelConfig ? levelConfig.minWithdrawalInr : 500
  if (amount < minWithdrawal) {
    return { success: false, error: `Minimum withdrawal amount for your level (${levelConfig?.displayName || 'Reporter'}) is ₹${minWithdrawal}.` }
  }

  // Balance check
  if (reporter.earningsBalance < amount) {
    return { success: false, error: `Insufficient balance. Available: ₹${reporter.earningsBalance.toFixed(2)}, Requested: ₹${amount.toFixed(2)}.` }
  }

  // Validate payout method details
  if (payoutMethod === 'upi') {
    if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      return { success: false, error: 'Please enter a valid UPI ID (e.g. name@upi or phone@ybl).' }
    }
  } else if (payoutMethod === 'bank_transfer') {
    if (!bankAccountNumber || bankAccountNumber.trim().length < 8) {
      return { success: false, error: 'Please enter a valid Bank Account Number (minimum 8 digits).' }
    }
    if (!bankIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.trim().toUpperCase())) {
      return { success: false, error: 'Please enter a valid 11-character Bank IFSC Code (e.g. SBIN0001234).' }
    }
    if (!bankAccountName || bankAccountName.trim().length < 3) {
      return { success: false, error: 'Please enter the Account Holder Name matching your bank passbook.' }
    }
  } else {
    return { success: false, error: 'Invalid payout method selected.' }
  }

  const coinsPerInr = 100
  const coinsAmount = Math.round(amount * coinsPerInr)

  // Atomic ledger execution
  const withdrawal = await db.$transaction(async (tx) => {
    // Re-check balance inside transaction
    const locked = await tx.reporter.findUnique({ where: { id: reporterId } })
    if (!locked || locked.earningsBalance < amount) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    const newCashBalance = Math.round((locked.earningsBalance - amount) * 100) / 100
    const newCoinsBalance = Math.max(0, locked.coinsBalance - coinsAmount)

    // Create withdrawal request
    const req = await tx.withdrawalRequest.create({
      data: {
        reporterId,
        coinsAmount,
        moneyAmount: amount,
        balanceAtRequest: locked.earningsBalance,
        payoutMethod,
        upiId: payoutMethod === 'upi' ? upiId?.trim() : null,
        bankAccountNumber: payoutMethod === 'bank_transfer' ? bankAccountNumber?.trim() : null,
        bankIfsc: payoutMethod === 'bank_transfer' ? bankIfsc?.trim().toUpperCase() : null,
        bankAccountName: payoutMethod === 'bank_transfer' ? bankAccountName?.trim() : null,
        status: 'pending',
      }
    })

    // Create double-entry ledger debit
    const txRow = await tx.walletTransaction.create({
      data: {
        reporterId,
        amount: coinsAmount,
        moneyAmount: amount,
        type: 'DEBIT',
        txCategory: 'withdrawal',
        description: payoutMethod === 'upi'
          ? `Withdrawal requested via UPI ${upiId?.trim()}`
          : `Withdrawal requested to Bank A/C ${bankAccountNumber?.trim().slice(-4)} (${bankIfsc?.trim().toUpperCase()})`,
        referenceId: req.id,
        balanceAfter: newCashBalance,
        coinsBalanceAfter: newCoinsBalance,
        status: 'pending',
      }
    })

    // Link transaction ID
    await tx.withdrawalRequest.update({
      where: { id: req.id },
      data: { walletTransactionId: txRow.id }
    })

    // Update reporter balance and saved payment preferences
    await tx.reporter.update({
      where: { id: reporterId },
      data: {
        earningsBalance: newCashBalance,
        coinsBalance: newCoinsBalance,
        lastWithdrawalAt: new Date(),
        upiId: payoutMethod === 'upi' ? upiId?.trim() : locked.upiId,
        bankAccountNumber: payoutMethod === 'bank_transfer' ? bankAccountNumber?.trim() : locked.bankAccountNumber,
        bankIfsc: payoutMethod === 'bank_transfer' ? bankIfsc?.trim().toUpperCase() : locked.bankIfsc,
        bankAccountName: payoutMethod === 'bank_transfer' ? bankAccountName?.trim() : locked.bankAccountName,
      }
    })

    return { req, newCashBalance }
  })

  return {
    success: true,
    withdrawal: withdrawal.req,
    balanceAfter: withdrawal.newCashBalance,
  }
}

// 11. Admin complete withdrawal payout (mark paid with UTR)
export async function completeReporterWithdrawal(params: {
  withdrawalId: string
  transactionReference: string
  adminNotes?: string
  adminName: string
}): Promise<{ success: boolean; error?: string }> {
  const { withdrawalId, transactionReference, adminNotes, adminName } = params

  if (!transactionReference || transactionReference.trim().length < 4) {
    return { success: false, error: 'Transaction ID / UTR reference is mandatory when marking a withdrawal as paid.' }
  }

  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id: withdrawalId }
  })

  if (!withdrawal) {
    return { success: false, error: 'Withdrawal request not found.' }
  }

  if (withdrawal.status === 'completed') {
    return { success: false, error: 'This withdrawal has already been marked as paid.' }
  }

  await db.$transaction(async (tx) => {
    await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: 'completed',
        transactionReference: transactionReference.trim(),
        adminNotes: adminNotes ?? withdrawal.adminNotes,
        processedBy: adminName,
        processedAt: new Date(),
      }
    })

    if (withdrawal.walletTransactionId) {
      await tx.walletTransaction.update({
        where: { id: withdrawal.walletTransactionId },
        data: { status: 'completed' }
      })
    }
  })

  return { success: true }
}

// 12. Admin reject withdrawal and atomically refund balance
export async function rejectReporterWithdrawal(params: {
  withdrawalId: string
  rejectionReason: string
  adminNotes?: string
  adminName: string
}): Promise<{ success: boolean; error?: string }> {
  const { withdrawalId, rejectionReason, adminNotes, adminName } = params

  if (!rejectionReason || rejectionReason.trim().length < 3) {
    return { success: false, error: 'Rejection reason is mandatory so the reporter knows why the request was declined.' }
  }

  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
    include: { reporter: true }
  })

  if (!withdrawal) {
    return { success: false, error: 'Withdrawal request not found.' }
  }

  if (withdrawal.status === 'rejected') {
    return { success: false, error: 'This withdrawal is already rejected.' }
  }

  if (withdrawal.status === 'completed') {
    return { success: false, error: 'Cannot reject a withdrawal that has already been marked completed.' }
  }

  await db.$transaction(async (tx) => {
    // 1. Mark request rejected
    await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes ?? withdrawal.adminNotes,
        processedBy: adminName,
        processedAt: new Date(),
      }
    })

    // 2. Fetch fresh reporter balance
    const currentRep = await tx.reporter.findUnique({
      where: { id: withdrawal.reporterId }
    })
    if (!currentRep) throw new Error('Reporter not found')

    const refundedCash = Math.round((currentRep.earningsBalance + withdrawal.moneyAmount) * 100) / 100
    const refundedCoins = currentRep.coinsBalance + withdrawal.coinsAmount

    // 3. Create double-entry ledger refund credit
    await tx.walletTransaction.create({
      data: {
        reporterId: withdrawal.reporterId,
        amount: withdrawal.coinsAmount,
        moneyAmount: withdrawal.moneyAmount,
        type: 'CREDIT',
        txCategory: 'reversal',
        description: `Refund for rejected withdrawal: ${rejectionReason.trim()}`,
        referenceId: withdrawal.id,
        reversalOfId: withdrawal.walletTransactionId,
        balanceAfter: refundedCash,
        coinsBalanceAfter: refundedCoins,
        status: 'completed',
      }
    })

    // 4. Update reporter balances
    await tx.reporter.update({
      where: { id: withdrawal.reporterId },
      data: {
        earningsBalance: refundedCash,
        coinsBalance: refundedCoins,
      }
    })
  })

  return { success: true }
}


