import { db } from './db'
import { processNewsApprovalScore, getSettingNumber } from './scoring-service'

export async function processNewsApprovalEarning(newsId: string, isVideo: boolean = false) {
  try {
    const news = await db.news.findUnique({
      where: { id: newsId },
      include: { reporter: true }
    })
    if (!news || !news.reporterId || !news.reporter) return

    const reporter = news.reporter
    const isSenior = reporter.role === 'senior' || reporter.canPublishDirectly

    // Ensure we don't reward multiple times for the same news
    const existingTransaction = await db.walletTransaction.findFirst({
      where: { reporterId: news.reporterId, referenceId: newsId }
    })
    if (existingTransaction) return

    // Check daily coin reward limit based on rank (Junior: max 5/day, Senior: max 10/day)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const todayRewardsCount = await db.walletTransaction.count({
      where: {
        reporterId: news.reporterId,
        type: 'CREDIT',
        createdAt: { gte: startOfDay }
      }
    })

    const maxDailyLimit = isSenior ? 10 : 5
    if (todayRewardsCount >= maxDailyLimit) {
      console.log(`Daily reward limit of ${maxDailyLimit} reached for reporter ${news.reporterId}`)
      return
    }

    // Calculate reward in Rupees (₹) based on reporter level
    const rewardKey = isSenior ? 'reward_senior_article' : 'reward_junior_article'
    const defaultReward = isSenior ? 5 : 3
    const rewardAmount = await getSettingNumber(rewardKey, defaultReward)

    if (rewardAmount <= 0) return

    const coinsPerInr = await getSettingNumber('COINS_PER_INR', 100)
    const coinsToCredit = Math.round(rewardAmount * coinsPerInr)

    // Run transaction: update earnings balance and log transaction
    await db.$transaction([
      db.walletTransaction.create({
        data: {
          reporterId: news.reporterId,
          amount: coinsToCredit,
          type: 'CREDIT',
          description: `Reward for approved ${isSenior ? 'Senior' : 'Junior'} news article (₹${rewardAmount}): ${news.title}`,
          referenceId: newsId,
        }
      }),
      db.reporter.update({
        where: { id: news.reporterId },
        data: {
          earningsBalance: { increment: rewardAmount },
          coinsBalance: { increment: coinsToCredit },
        }
      })
    ])

    // Update performance score (+10) and check promotion eligibility
    await processNewsApprovalScore(news.reporterId)

    console.log(`Credited ₹${rewardAmount} and +10 score to reporter ${news.reporterId} (${reporter.name}) for news ${newsId}`)
  } catch (error) {
    console.error('Error processing earning for news approval:', error)
  }
}
