import { db } from './db'
import { safeJsonParse } from './json-utils'

export interface AdTargetingParams {
  stateId?: string | null
  districtId?: string | null
  mandalId?: string | null
  categoryId?: string | null
}

export async function getAdMobConfig() {
  let config = await db.adMobConfig.findUnique({
    where: { id: 'default' }
  })

  if (!config) {
    config = await db.adMobConfig.create({
      data: {
        id: 'default',
        isEnabled: true,
        testMode: false,
        primaryStrategy: 'admob_first',
        feedAdFrequency: 3,
        nativeEnabled: true,
        bannerEnabled: true,
      }
    })
  }

  return config
}

export async function getActiveCustomAds(placement: string = 'feed_inline', targeting?: AdTargetingParams) {
  const now = new Date()
  const ads = await db.customAd.findMany({
    where: {
      placement,
      isActive: true,
      deletedAt: null,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: null }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  // Filter out ads that exceeded lifetime impression limit
  const eligibleAds = ads.filter((ad) => {
    if (ad.impressionsLimit > 0 && ad.impressionsServed >= ad.impressionsLimit) {
      return false
    }

    // Check targeting if provided
    if (targeting) {
      const stateTargets = safeJsonParse<string[]>(ad.targetStateIds || '[]', [])
      if (stateTargets.length > 0 && targeting.stateId && !stateTargets.includes(targeting.stateId)) {
        return false
      }

      const districtTargets = safeJsonParse<string[]>(ad.targetDistrictIds || '[]', [])
      if (districtTargets.length > 0 && targeting.districtId && !districtTargets.includes(targeting.districtId)) {
        return false
      }

      const mandalTargets = safeJsonParse<string[]>(ad.targetMandalIds || '[]', [])
      if (mandalTargets.length > 0 && targeting.mandalId && !mandalTargets.includes(targeting.mandalId)) {
        return false
      }

      const catTargets = safeJsonParse<string[]>(ad.targetCategoryIds || '[]', [])
      if (catTargets.length > 0 && targeting.categoryId && !catTargets.includes(targeting.categoryId)) {
        return false
      }
    }

    return true
  })

  return eligibleAds
}

// Weighted non-repeating ad rotation
export function rotateAds(eligibleAds: any[], countNeeded: number): any[] {
  if (eligibleAds.length === 0) return []
  if (eligibleAds.length === 1) return Array(countNeeded).fill(eligibleAds[0])

  // Build weighted pool based on ad priority (1 to 10)
  const pool: any[] = []
  for (const ad of eligibleAds) {
    const weight = Math.max(1, Math.min(10, ad.priority || 1))
    for (let i = 0; i < weight; i++) {
      pool.push(ad)
    }
  }

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const selected: any[] = []
  let lastAdId = ''

  for (let step = 0; step < countNeeded; step++) {
    // Pick first candidate that doesn't repeat the immediately preceding ad
    const candidate = pool.find((a) => a.id !== lastAdId) || pool[0]
    selected.push(candidate)
    lastAdId = candidate.id
  }

  return selected
}

// Inject ads into feed cards adhering to AdMobConfig strategy and frequency
export async function injectAdsIntoFeedCards(
  newsCards: any[],
  targeting?: AdTargetingParams
): Promise<any[]> {
  const admobConfig = await getAdMobConfig()
  const frequency = Math.max(2, admobConfig.feedAdFrequency || 3)
  const strategy = admobConfig.primaryStrategy || 'direct_first'

  const customAds = await getActiveCustomAds('feed_inline', targeting)
  const feedWithAds: any[] = []

  let newsCounter = 0
  let adSlotIndex = 0

  for (let i = 0; i < newsCards.length; i++) {
    feedWithAds.push({
      type: 'news',
      news: newsCards[i]
    })
    newsCounter++

    // Time to inject an ad?
    if (newsCounter % frequency === 0) {
      let injected = false

      if (strategy === 'hybrid') {
        const canServeAdmob = admobConfig.isEnabled && admobConfig.nativeEnabled
        const canServeDirect = customAds.length > 0

        if (canServeAdmob && canServeDirect) {
          // Alternate 50/50 between Direct custom ads and AdMob native ads
          if (adSlotIndex % 2 === 0) {
            const chosenAd = customAds[Math.floor(adSlotIndex / 2) % customAds.length]
            feedWithAds.push({
              type: 'ad',
              ad: {
                ...chosenAd,
                imagesUrls: safeJsonParse<string[]>(chosenAd.imagesUrls || '[]', []),
                targetStateIds: safeJsonParse<string[]>(chosenAd.targetStateIds || '[]', []),
                targetDistrictIds: safeJsonParse<string[]>(chosenAd.targetDistrictIds || '[]', []),
                targetMandalIds: safeJsonParse<string[]>(chosenAd.targetMandalIds || '[]', []),
                targetCategoryIds: safeJsonParse<string[]>(chosenAd.targetCategoryIds || '[]', []),
              }
            })
          } else {
            feedWithAds.push({ type: 'admob_native' })
          }
          adSlotIndex++
          injected = true
        } else if (canServeAdmob) {
          feedWithAds.push({ type: 'admob_native' })
          injected = true
        } else if (canServeDirect) {
          const chosenAd = customAds[adSlotIndex % customAds.length]
          adSlotIndex++
          feedWithAds.push({
            type: 'ad',
            ad: {
              ...chosenAd,
              imagesUrls: safeJsonParse<string[]>(chosenAd.imagesUrls || '[]', []),
              targetStateIds: safeJsonParse<string[]>(chosenAd.targetStateIds || '[]', []),
              targetDistrictIds: safeJsonParse<string[]>(chosenAd.targetDistrictIds || '[]', []),
              targetMandalIds: safeJsonParse<string[]>(chosenAd.targetMandalIds || '[]', []),
              targetCategoryIds: safeJsonParse<string[]>(chosenAd.targetCategoryIds || '[]', []),
            }
          })
          injected = true
        }
      } else if (strategy === 'direct_first' || strategy === 'direct_only') {
        if (customAds.length > 0) {
          const chosenAd = customAds[adSlotIndex % customAds.length]
          adSlotIndex++
          feedWithAds.push({
            type: 'ad',
            ad: {
              ...chosenAd,
              imagesUrls: safeJsonParse<string[]>(chosenAd.imagesUrls || '[]', []),
              targetStateIds: safeJsonParse<string[]>(chosenAd.targetStateIds || '[]', []),
              targetDistrictIds: safeJsonParse<string[]>(chosenAd.targetDistrictIds || '[]', []),
              targetMandalIds: safeJsonParse<string[]>(chosenAd.targetMandalIds || '[]', []),
              targetCategoryIds: safeJsonParse<string[]>(chosenAd.targetCategoryIds || '[]', []),
            }
          })
          injected = true
        } else if (strategy === 'direct_first' && admobConfig.isEnabled && admobConfig.nativeEnabled) {
          // Fallback to AdMob
          feedWithAds.push({ type: 'admob_native' })
          injected = true
        }
      } else if (strategy === 'admob_first' || strategy === 'admob_only') {
        if (admobConfig.isEnabled && admobConfig.nativeEnabled) {
          feedWithAds.push({ type: 'admob_native' })
          injected = true
        } else if (strategy === 'admob_first' && customAds.length > 0) {
          // Fallback to custom direct ad
          const chosenAd = customAds[adSlotIndex % customAds.length]
          adSlotIndex++
          feedWithAds.push({
            type: 'ad',
            ad: {
              ...chosenAd,
              imagesUrls: safeJsonParse<string[]>(chosenAd.imagesUrls || '[]', []),
              targetStateIds: safeJsonParse<string[]>(chosenAd.targetStateIds || '[]', []),
              targetDistrictIds: safeJsonParse<string[]>(chosenAd.targetDistrictIds || '[]', []),
              targetMandalIds: safeJsonParse<string[]>(chosenAd.targetMandalIds || '[]', []),
              targetCategoryIds: safeJsonParse<string[]>(chosenAd.targetCategoryIds || '[]', []),
            }
          })
          injected = true
        }
      }

      // If nothing injected (e.g. direct only and no active custom ads), continue without breaking feed
    }
  }

  return feedWithAds
}

