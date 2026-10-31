import { db } from '../src/lib/db'

const DEFAULT_LEVELS = [
  {
    levelKey: 'trainee',
    displayName: 'Trainee Reporter',
    rankOrder: 1,
    badgeColor: '#9CA3AF',
    minApprovedArticles: 0,
    minApprovalRate: 0.0,
    minTotalViews: 0,
    minPerformanceScore: 0,
    demotionScoreThreshold: 0,
    dailyPostLimit: 3,
    weeklyPostLimit: 15,
    perCategoryDailyLimit: 2,
    payPerApprovedArticle: 2.0,
    breakingBonus: 1.0,
    exclusiveBonus: 3.0,
    viewsBonusThreshold: 1000,
    viewsBonusAmount: 0.5,
    penaltyRejectedArticle: 0.5,
    penaltyFakeNews: 10.0,
    canPublishDirectly: false,
    isActive: true,
  },
  {
    levelKey: 'junior',
    displayName: 'Junior Reporter',
    rankOrder: 2,
    badgeColor: '#3B82F6',
    minApprovedArticles: 10,
    minApprovalRate: 60.0,
    minTotalViews: 1000,
    minPerformanceScore: 50,
    demotionScoreThreshold: 0,
    dailyPostLimit: 5,
    weeklyPostLimit: 30,
    perCategoryDailyLimit: 3,
    payPerApprovedArticle: 3.0,
    breakingBonus: 2.0,
    exclusiveBonus: 5.0,
    viewsBonusThreshold: 1000,
    viewsBonusAmount: 1.0,
    penaltyRejectedArticle: 1.0,
    penaltyFakeNews: 15.0,
    canPublishDirectly: false,
    isActive: true,
  },
  {
    levelKey: 'senior',
    displayName: 'Senior Reporter',
    rankOrder: 3,
    badgeColor: '#8B5CF6',
    minApprovedArticles: 50,
    minApprovalRate: 75.0,
    minTotalViews: 10000,
    minPerformanceScore: 120,
    demotionScoreThreshold: 60,
    dailyPostLimit: 10,
    weeklyPostLimit: 60,
    perCategoryDailyLimit: 5,
    payPerApprovedArticle: 5.0,
    breakingBonus: 3.0,
    exclusiveBonus: 10.0,
    viewsBonusThreshold: 1000,
    viewsBonusAmount: 1.5,
    penaltyRejectedArticle: 1.5,
    penaltyFakeNews: 25.0,
    canPublishDirectly: true,
    isActive: true,
  },
  {
    levelKey: 'mandal_head',
    displayName: 'Mandal Head',
    rankOrder: 4,
    badgeColor: '#10B981',
    minApprovedArticles: 150,
    minApprovalRate: 85.0,
    minTotalViews: 50000,
    minPerformanceScore: 250,
    demotionScoreThreshold: 150,
    dailyPostLimit: 15,
    weeklyPostLimit: 100,
    perCategoryDailyLimit: 8,
    payPerApprovedArticle: 7.0,
    breakingBonus: 5.0,
    exclusiveBonus: 15.0,
    viewsBonusThreshold: 1000,
    viewsBonusAmount: 2.0,
    penaltyRejectedArticle: 2.0,
    penaltyFakeNews: 50.0,
    canPublishDirectly: true,
    isActive: true,
  },
  {
    levelKey: 'district_head',
    displayName: 'District Incharge',
    rankOrder: 5,
    badgeColor: '#F59E0B',
    minApprovedArticles: 400,
    minApprovalRate: 90.0,
    minTotalViews: 200000,
    minPerformanceScore: 500,
    demotionScoreThreshold: 300,
    dailyPostLimit: 25,
    weeklyPostLimit: 150,
    perCategoryDailyLimit: 12,
    payPerApprovedArticle: 10.0,
    breakingBonus: 7.0,
    exclusiveBonus: 20.0,
    viewsBonusThreshold: 1000,
    viewsBonusAmount: 2.5,
    penaltyRejectedArticle: 3.0,
    penaltyFakeNews: 100.0,
    canPublishDirectly: true,
    isActive: true,
  },
  {
    levelKey: 'state_head',
    displayName: 'State Editor / Head',
    rankOrder: 6,
    badgeColor: '#EF4444',
    minApprovedArticles: 1000,
    minApprovalRate: 95.0,
    minTotalViews: 1000000,
    minPerformanceScore: 1000,
    demotionScoreThreshold: 600,
    dailyPostLimit: 50,
    weeklyPostLimit: 300,
    perCategoryDailyLimit: 20,
    payPerApprovedArticle: 15.0,
    breakingBonus: 10.0,
    exclusiveBonus: 30.0,
    viewsBonusThreshold: 1000,
    viewsBonusAmount: 3.0,
    penaltyRejectedArticle: 5.0,
    penaltyFakeNews: 200.0,
    canPublishDirectly: true,
    isActive: true,
  },
]

async function main() {
  console.log('--- Step 1: Seeding / Upserting Reporter Level Configs ---')
  for (const level of DEFAULT_LEVELS) {
    await db.reporterLevelConfig.upsert({
      where: { levelKey: level.levelKey },
      update: level,
      create: level,
    })
    console.log(`✓ Upserted level: ${level.displayName} (${level.levelKey})`)
  }

  console.log('\n--- Step 2: Normalizing Existing Reporter Roles to Levels ---')
  const reporters = await db.reporter.findMany()
  console.log(`Found ${reporters.length} reporters`)

  for (const r of reporters) {
    let targetRole = r.role?.toLowerCase()
    if (!targetRole || targetRole === 'reporter' || targetRole === 'user') {
      targetRole = 'junior'
    } else if (targetRole === 'mandal') {
      targetRole = 'mandal_head'
    } else if (targetRole === 'district') {
      targetRole = 'district_head'
    } else if (targetRole === 'state') {
      targetRole = 'state_head'
    } else if (r.canPublishDirectly && targetRole !== 'senior' && targetRole !== 'mandal_head' && targetRole !== 'district_head' && targetRole !== 'state_head') {
      targetRole = 'senior'
    }

    if (targetRole !== r.role) {
      await db.reporter.update({
        where: { id: r.id },
        data: { role: targetRole },
      })
      console.log(`Updated reporter ${r.name} (${r.id}): role -> ${targetRole}`)
    }
  }

  console.log('\n--- Step 3: Reconciling Wallet Transactions (Double-Entry Ledger) ---')
  let totalReconciledTx = 0
  for (const r of reporters) {
    // Get all transactions for reporter ordered chronologically
    const txs = await db.walletTransaction.findMany({
      where: { reporterId: r.id },
      orderBy: { createdAt: 'asc' },
    })

    if (txs.length === 0) continue

    let runningCash = 0.0
    let runningCoins = 0
    let lifetimeCashEarned = 0.0

    for (const tx of txs) {
      const isCredit = tx.type.toUpperCase() === 'CREDIT'
      
      // Determine money amount from description or amount
      let cashVal = tx.moneyAmount
      if (cashVal <= 0) {
        // Parse from description if available like "(₹5)" or amount
        const match = tx.description?.match(/₹\s*([0-9.]+)/)
        if (match && match[1]) {
          cashVal = parseFloat(match[1])
        } else {
          // If coins was stored as 1 or 5 or 100
          cashVal = tx.amount > 50 ? tx.amount / 100 : tx.amount
        }
      }

      if (isCredit) {
        runningCash += cashVal
        runningCoins += tx.amount
        lifetimeCashEarned += cashVal
      } else {
        runningCash = Math.max(0, runningCash - cashVal)
        runningCoins = Math.max(0, runningCoins - tx.amount)
      }

      // Infer category if needed
      let category = tx.txCategory || 'reward'
      const descLower = (tx.description || '').toLowerCase()
      if (descLower.includes('withdraw')) category = 'withdrawal'
      else if (descLower.includes('bonus')) category = 'bonus'
      else if (descLower.includes('penalty')) category = 'penalty'
      else if (descLower.includes('adjust')) category = 'adjustment'
      else if (descLower.includes('revers')) category = 'reversal'

      await db.walletTransaction.update({
        where: { id: tx.id },
        data: {
          moneyAmount: cashVal,
          balanceAfter: Math.round(runningCash * 100) / 100,
          coinsBalanceAfter: runningCoins,
          txCategory: category,
          status: 'completed',
        },
      })
      totalReconciledTx++
    }

    // Sync reporter's balances with ledger sum
    await db.reporter.update({
      where: { id: r.id },
      data: {
        earningsBalance: Math.round(runningCash * 100) / 100,
        coinsBalance: runningCoins,
        totalEarnings: Math.round(lifetimeCashEarned * 100) / 100,
      },
    })
  }

  console.log(`✓ Reconciled ${totalReconciledTx} transactions across ${reporters.length} reporters`)
  console.log('--- Done! All wallets, transactions, and level configs are now 100% in sync. ---')
  process.exit(0)
}

main().catch((e) => {
  console.error('Reconciliation error:', e)
  process.exit(1)
})

