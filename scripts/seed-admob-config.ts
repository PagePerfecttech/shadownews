import { db } from '../src/lib/db'

async function main() {
  console.log('--- Migrating existing AdMob settings into unified AdMobConfig ---')
  const settings = await db.setting.findMany({
    where: {
      OR: [
        { key: { startsWith: 'admob_' } },
        { key: { startsWith: 'custom_ad_' } }
      ]
    }
  })

  const settingsMap: Record<string, string> = {}
  for (const s of settings) {
    settingsMap[s.key] = s.value
  }

  const isEnabled = settingsMap['admob_enabled'] !== 'false' && settingsMap['admob_feed_enabled'] !== 'false'
  const feedFrequency = parseInt(settingsMap['admob_feed_frequency'] || settingsMap['admob_frequency_cap'] || '5', 10) || 5

  const config = await db.adMobConfig.upsert({
    where: { id: 'default' },
    update: {
      isEnabled,
      primaryStrategy: 'direct_first',
      feedAdFrequency: feedFrequency,
      nativeEnabled: true,
      bannerEnabled: true,
      interstitialEnabled: false,
      rewardedEnabled: false,
      appOpenEnabled: false,
      androidAppId: settingsMap['admob_app_id_android'] || 'ca-app-pub-8507128258192249~5695444020',
      androidNativeId: settingsMap['admob_native_id_android'] || settingsMap['admob_native_id'] || 'ca-app-pub-8507128258192249/9359036069',
      androidBannerId: settingsMap['admob_banner_id_android'] || settingsMap['admob_banner_id'] || 'ca-app-pub-8507128258192249/6473998216',
      androidInterstitialId: settingsMap['admob_interstitial_id_android'] || settingsMap['admob_interstitial_id'] || 'ca-app-pub-8507128258192249/2901759723',
      androidRewardedId: settingsMap['admob_rewarded_id_android'] || settingsMap['admob_rewarded_id'] || 'ca-app-pub-8507128258192249/1779928946',
      androidAppOpenId: settingsMap['admob_app_open_id_android'] || 'ca-app-pub-8507128258192249/6357789009',
      iosAppId: settingsMap['admob_app_id_ios'] || 'ca-app-pub-8507128258192249~5695444020',
      iosNativeId: settingsMap['admob_native_id_ios'] || 'ca-app-pub-8507128258192249/9359036069',
      iosBannerId: settingsMap['admob_banner_id_ios'] || 'ca-app-pub-8507128258192249/6473998216',
      iosInterstitialId: settingsMap['admob_interstitial_id_ios'] || 'ca-app-pub-8507128258192249/2901759723',
      iosRewardedId: settingsMap['admob_rewarded_id_ios'] || 'ca-app-pub-8507128258192249/1779928946',
      iosAppOpenId: settingsMap['admob_app_open_id_ios'] || 'ca-app-pub-8507128258192249/6357789009',
    },
    create: {
      id: 'default',
      isEnabled,
      testMode: false,
      primaryStrategy: 'direct_first',
      feedAdFrequency: feedFrequency,
      nativeEnabled: true,
      bannerEnabled: true,
      interstitialEnabled: true,
      rewardedEnabled: true,
      appOpenEnabled: true,
      androidAppId: settingsMap['admob_app_id_android'] || 'ca-app-pub-8507128258192249~5695444020',
      androidNativeId: settingsMap['admob_native_id_android'] || settingsMap['admob_native_id'] || 'ca-app-pub-8507128258192249/9359036069',
      androidBannerId: settingsMap['admob_banner_id_android'] || settingsMap['admob_banner_id'] || 'ca-app-pub-8507128258192249/6473998216',
      androidInterstitialId: settingsMap['admob_interstitial_id_android'] || settingsMap['admob_interstitial_id'] || 'ca-app-pub-8507128258192249/2901759723',
      androidRewardedId: settingsMap['admob_rewarded_id_android'] || settingsMap['admob_rewarded_id'] || 'ca-app-pub-8507128258192249/1779928946',
      androidAppOpenId: settingsMap['admob_app_open_id_android'] || 'ca-app-pub-8507128258192249/6357789009',
      iosAppId: settingsMap['admob_app_id_ios'] || 'ca-app-pub-8507128258192249~5695444020',
      iosNativeId: settingsMap['admob_native_id_ios'] || 'ca-app-pub-8507128258192249/9359036069',
      iosBannerId: settingsMap['admob_banner_id_ios'] || 'ca-app-pub-8507128258192249/6473998216',
      iosInterstitialId: settingsMap['admob_interstitial_id_ios'] || 'ca-app-pub-8507128258192249/2901759723',
      iosRewardedId: settingsMap['admob_rewarded_id_ios'] || 'ca-app-pub-8507128258192249/1779928946',
      iosAppOpenId: settingsMap['admob_app_open_id_ios'] || 'ca-app-pub-8507128258192249/6357789009',
    }
  })

  console.log('✓ Successfully initialized AdMobConfig record:', JSON.stringify(config, null, 2))
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

