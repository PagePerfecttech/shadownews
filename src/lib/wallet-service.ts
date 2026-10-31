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

export { reverseNewsReward }
