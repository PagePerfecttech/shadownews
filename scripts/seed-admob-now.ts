import { db } from '../src/lib/db'

async function main() {
  console.log('Seeding AdMob configuration and settings to database...')

  const appId = 'ca-app-pub-8507128258192249~5695444020'
  const appOpenId = 'ca-app-pub-8507128258192249/6357789009'
  const bannerId = 'ca-app-pub-8507128258192249/6473998216'
  const interstitialId = 'ca-app-pub-8507128258192249/2901759723'
  const nativeId = 'ca-app-pub-8507128258192249/9359036069'
  const rewardedId = 'ca-app-pub-8507128258192249/1779928946'
  const rewardedInterstitialId = 'ca-app-pub-8507128258192249/1588678059'

  // 1. Upsert AdMobConfig
  const config = await db.adMobConfig.upsert({
    where: { id: 'default' },
    update: {
      isEnabled: true,
      testMode: false,
      primaryStrategy: 'admob_first',
      feedAdFrequency: 3,
      nativeEnabled: true,
      bannerEnabled: true,
      interstitialEnabled: true,
      rewardedEnabled: true,
      appOpenEnabled: true,
      androidAppId: appId,
      androidNativeId: nativeId,
      androidBannerId: bannerId,
      androidInterstitialId: interstitialId,
      androidRewardedId: rewardedId,
      androidAppOpenId: appOpenId,
      iosAppId: appId,
      iosNativeId: nativeId,
      iosBannerId: bannerId,
      iosInterstitialId: interstitialId,
      iosRewardedId: rewardedId,
      iosAppOpenId: appOpenId,
    },
    create: {
      id: 'default',
      isEnabled: true,
      testMode: false,
      primaryStrategy: 'admob_first',
      feedAdFrequency: 3,
      nativeEnabled: true,
      bannerEnabled: true,
      interstitialEnabled: true,
      rewardedEnabled: true,
      appOpenEnabled: true,
      androidAppId: appId,
      androidNativeId: nativeId,
      androidBannerId: bannerId,
      androidInterstitialId: interstitialId,
      androidRewardedId: rewardedId,
      androidAppOpenId: appOpenId,
      iosAppId: appId,
      iosNativeId: nativeId,
      iosBannerId: bannerId,
      iosInterstitialId: interstitialId,
      iosRewardedId: rewardedId,
      iosAppOpenId: appOpenId,
    },
  })

  console.log('✓ Successfully upserted AdMobConfig record:')
  console.log(JSON.stringify(config, null, 2))

  // 2. Upsert Settings key-values
  const settingsToSeed: Record<string, string> = {
    admob_enabled: 'true',
    admob_test_mode: 'false',
    admob_feed_enabled: 'true',
    admob_feed_frequency: '3',
    admob_strategy: 'admob_first',
    admob_app_id_android: appId,
    admob_app_id_ios: appId,
    admob_app_open_id_android: appOpenId,
    admob_app_open_id_ios: appOpenId,
    admob_banner_id_android: bannerId,
    admob_banner_id_ios: bannerId,
    admob_banner_id: bannerId,
    admob_interstitial_id_android: interstitialId,
    admob_interstitial_id_ios: interstitialId,
    admob_interstitial_id: interstitialId,
    admob_native_id_android: nativeId,
    admob_native_id_ios: nativeId,
    admob_native_id: nativeId,
    admob_rewarded_id_android: rewardedId,
    admob_rewarded_id_ios: rewardedId,
    admob_rewarded_id: rewardedId,
    admob_rewarded_interstitial_id_android: rewardedInterstitialId,
    admob_rewarded_interstitial_id_ios: rewardedInterstitialId,
    admob_rewarded_interstitial_id: rewardedInterstitialId,
  }

  for (const [key, value] of Object.entries(settingsToSeed)) {
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }

  console.log('✓ Successfully upserted all AdMob Settings in the database.')
  process.exit(0)
}

main().catch((e) => {
  console.error('Error seeding AdMob config to database:', e)
  process.exit(1)
})

