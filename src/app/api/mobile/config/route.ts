import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdMobConfig } from '@/lib/ad-engine'

export async function GET() {
  try {
    const [settings, admobConfig] = await Promise.all([
      db.setting.findMany(),
      getAdMobConfig()
    ])

    const config: Record<string, string> = {}
    for (const s of settings) {
      config[s.key] = s.value
    }

    return NextResponse.json({
      featureFlags: {
        comments: config.feature_comments !== 'false',
        darkMode: config.feature_dark_mode !== 'false',
        videoSection: config.feature_video_section !== 'false',
        notifications: config.feature_notifications !== 'false',
        bookmarks: config.feature_bookmarks !== 'false',
        share: config.feature_share !== 'false',
      },
      forceUpdate: {
        android: config.force_update_android || '1.0.0',
        ios: config.force_update_ios || '1.0.0',
        hardBlock: config.force_update_hard_block === 'true',
      },
      admob: {
        enabled: admobConfig.isEnabled,
        testMode: admobConfig.testMode,
        primaryStrategy: admobConfig.primaryStrategy,
        bannerId: admobConfig.androidBannerId || config.admob_banner_id || '',
        interstitialId: admobConfig.androidInterstitialId || config.admob_interstitial_id || '',
        nativeId: admobConfig.androidNativeId || config.admob_native_id || '',
        rewardedId: admobConfig.androidRewardedId || config.admob_rewarded_id || '',
        frequencyCap: admobConfig.feedAdFrequency || 5,
        nativeEnabled: admobConfig.nativeEnabled,
        bannerEnabled: admobConfig.bannerEnabled,
      },
      maintenance: {
        enabled: config.maintenance_mode === 'true',
        message: config.maintenance_message || '',
      },
    })
  } catch (error) {
    console.error('Config error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
