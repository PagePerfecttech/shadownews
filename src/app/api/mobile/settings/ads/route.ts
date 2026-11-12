import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdMobConfig } from '@/lib/ad-engine'

export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  try {
    const config = await getAdMobConfig()

    // Also fetch any custom banner settings if present
    const settings = await db.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'custom_banner_' } }
        ]
      }
    })

    const adConfig: Record<string, string> = {
      admob_enabled: String(config.isEnabled),
      admob_test_mode: String(config.testMode),
      admob_feed_enabled: String(config.isEnabled && config.nativeEnabled),
      admob_feed_frequency: String(config.feedAdFrequency || 5),
      admob_strategy: config.primaryStrategy,

      admob_app_open_id_android: config.androidAppOpenId,
      admob_app_open_id_ios: config.iosAppOpenId,
      admob_banner_id_android: config.androidBannerId,
      admob_banner_id_ios: config.iosBannerId,
      admob_interstitial_id_android: config.androidInterstitialId,
      admob_interstitial_id_ios: config.iosInterstitialId,
      admob_native_id_android: config.androidNativeId,
      admob_native_id_ios: config.iosNativeId,
      admob_rewarded_id_android: config.androidRewardedId,
      admob_rewarded_id_ios: config.iosRewardedId,
      admob_rewarded_interstitial_id_android: 'ca-app-pub-8507128258192249/1588678059',
      admob_rewarded_interstitial_id_ios: 'ca-app-pub-8507128258192249/1588678059',
    }

    for (const s of settings) {
      adConfig[s.key] = s.value
    }

    return NextResponse.json(adConfig)
  } catch (error) {
    console.error('Ad Settings API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
