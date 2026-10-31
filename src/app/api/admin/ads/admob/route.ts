import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'
import { getAdMobConfig } from '@/lib/ad-engine'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await getAdMobConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('AdMob config get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await request.json()

    const updated = await db.adMobConfig.upsert({
      where: { id: 'default' },
      update: {
        isEnabled: data.isEnabled ?? true,
        testMode: data.testMode ?? false,
        primaryStrategy: data.primaryStrategy || 'direct_first',
        feedAdFrequency: data.feedAdFrequency ? parseInt(data.feedAdFrequency) : 5,

        nativeEnabled: data.nativeEnabled ?? true,
        bannerEnabled: data.bannerEnabled ?? true,
        interstitialEnabled: data.interstitialEnabled ?? false,
        rewardedEnabled: data.rewardedEnabled ?? false,
        appOpenEnabled: data.appOpenEnabled ?? false,

        androidAppId: data.androidAppId ?? '',
        androidNativeId: data.androidNativeId ?? '',
        androidBannerId: data.androidBannerId ?? '',
        androidInterstitialId: data.androidInterstitialId ?? '',
        androidRewardedId: data.androidRewardedId ?? '',
        androidAppOpenId: data.androidAppOpenId ?? '',

        iosAppId: data.iosAppId ?? '',
        iosNativeId: data.iosNativeId ?? '',
        iosBannerId: data.iosBannerId ?? '',
        iosInterstitialId: data.iosInterstitialId ?? '',
        iosRewardedId: data.iosRewardedId ?? '',
        iosAppOpenId: data.iosAppOpenId ?? '',
      },
      create: {
        id: 'default',
        isEnabled: data.isEnabled ?? true,
        testMode: data.testMode ?? false,
        primaryStrategy: data.primaryStrategy || 'direct_first',
        feedAdFrequency: data.feedAdFrequency ? parseInt(data.feedAdFrequency) : 5,

        nativeEnabled: data.nativeEnabled ?? true,
        bannerEnabled: data.bannerEnabled ?? true,
        interstitialEnabled: data.interstitialEnabled ?? false,
        rewardedEnabled: data.rewardedEnabled ?? false,
        appOpenEnabled: data.appOpenEnabled ?? false,

        androidAppId: data.androidAppId ?? '',
        androidNativeId: data.androidNativeId ?? '',
        androidBannerId: data.androidBannerId ?? '',
        androidInterstitialId: data.androidInterstitialId ?? '',
        androidRewardedId: data.androidRewardedId ?? '',
        androidAppOpenId: data.androidAppOpenId ?? '',

        iosAppId: data.iosAppId ?? '',
        iosNativeId: data.iosNativeId ?? '',
        iosBannerId: data.iosBannerId ?? '',
        iosInterstitialId: data.iosInterstitialId ?? '',
        iosRewardedId: data.iosRewardedId ?? '',
        iosAppOpenId: data.iosAppOpenId ?? '',
      }
    })

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'admob_config',
      entityId: 'default',
      ipAddress: getClientIp(request),
      changes: { isEnabled: updated.isEnabled, primaryStrategy: updated.primaryStrategy, feedAdFrequency: updated.feedAdFrequency }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('AdMob config update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

