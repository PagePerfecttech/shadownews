import { db } from './db'
import { processNewsApprovalReward, reverseNewsReward } from './reward-engine'

export async function processNewsApprovalEarning(newsId: string, isVideo: boolean = false) {
  try {
    const res = await processNewsApprovalReward(newsId)
    if (res.success) {
      console.log(`[Reward Engine] Processed reward of ₹${res.rewardedAmount} for news #${newsId}. Balance after: ₹${res.balanceAfter}`)
    }
  } catch (error) {
    console.error('Error processing earning for news approval:', error)
  }
}

export interface CreateWalletTransactionParams {
  reporterId: string
  type: string
  moneyAmount: number
  referenceId?: string | null
  description?: string
  adminId?: string | null
}

export async function createWalletTransaction(params: CreateWalletTransactionParams) {
  const { reporterId, type, moneyAmount, referenceId, description, adminId } = params

  return await db.$transaction(async (tx) => {
    const reporter = await tx.reporter.findUnique({
      where: { id: reporterId },
    })
    if (!reporter) throw new Error('Reporter not found')

    const newEarningsBalance = Math.round((reporter.earningsBalance + moneyAmount) * 100) / 100
    const coinsAmount = Math.round(moneyAmount * 100)
    const newCoinsBalance = reporter.coinsBalance + coinsAmount

    const transaction = await tx.walletTransaction.create({
      data: {
        reporterId,
        amount: Math.abs(coinsAmount),
        moneyAmount: Math.abs(moneyAmount),
        type: moneyAmount >= 0 ? 'CREDIT' : 'DEBIT',
        txCategory: type || 'adjustment',
        description: description || `Wallet ledger transaction (${type})`,
        referenceId: referenceId || null,
        balanceAfter: newEarningsBalance,
        coinsBalanceAfter: newCoinsBalance,
        status: 'completed',
      },
    })

    await tx.reporter.update({
      where: { id: reporterId },
      data: {
        earningsBalance: newEarningsBalance,
        coinsBalance: newCoinsBalance,
      },
    })

    return transaction
  })
}

export { reverseNewsReward }
