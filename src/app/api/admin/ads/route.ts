import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ads = await db.customAd.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(ads.map(ad => ({
      ...ad,
      type: ad.type === 'image' ? 'poster' : ad.type,
      imagesUrls: safeJsonParse<string[]>(ad.imagesUrls, []),
      targetStateIds: safeJsonParse<string[]>(ad.targetStateIds, []),
      targetDistrictIds: safeJsonParse<string[]>(ad.targetDistrictIds || '[]', []),
      targetMandalIds: safeJsonParse<string[]>(ad.targetMandalIds || '[]', []),
      targetCategoryIds: safeJsonParse<string[]>(ad.targetCategoryIds, []),
      frequency: ad.frequency || 5,
      priority: ad.priority || 1,
      dailyCap: ad.dailyCap || 0,
      skipAfterSeconds: ad.skipAfterSeconds || 5,
      ctaText: ad.ctaText || ad.buttonText || 'Learn More',
    })))
  } catch (error) {
    console.error('Ads list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()
    // Map 'poster' to 'image' for DB storage
    const adType = data.type === 'poster' ? 'image' : data.type || 'image'

    const ad = await db.customAd.create({
      data: {
        title: data.title,
        advertiser: data.advertiser,
        type: adType,
        imagesUrls: safeJsonStringify(data.imagesUrls || []),
        layout: data.layout || 'grid',
        videoUrl: data.videoUrl || null,
        videoThumbnailUrl: data.videoThumbnailUrl || null,
        skipAfterSeconds: data.skipAfterSeconds || 5,
        clickUrl: data.clickUrl || null,
        buttonText: data.buttonText || data.ctaText || 'Learn More',
        ctaText: data.ctaText || data.buttonText || 'Learn More',
        placement: data.placement || 'feed_inline',
        priority: data.priority || 1,
        frequency: data.frequency || 5,
        dailyCap: data.dailyCap || 0,
        targetStateIds: safeJsonStringify(data.targetStateIds || []),
        targetDistrictIds: safeJsonStringify(data.targetDistrictIds || []),
        targetMandalIds: safeJsonStringify(data.targetMandalIds || []),
        targetCategoryIds: safeJsonStringify(data.targetCategoryIds || []),
        impressionsLimit: data.impressionsLimit || 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
      },
    })
    await logAudit({
      adminId: admin.id,
      action: 'create',
      entity: 'ad',
      entityId: ad.id,
      ipAddress: getClientIp(request),
      changes: { title: data.title, advertiser: data.advertiser, type: adType, placement: data.placement },
    })
    return NextResponse.json({
      ...ad,
      type: ad.type === 'image' ? 'poster' : ad.type,
      imagesUrls: safeJsonParse<string[]>(ad.imagesUrls, []),
      targetStateIds: safeJsonParse<string[]>(ad.targetStateIds, []),
      targetCategoryIds: safeJsonParse<string[]>(ad.targetCategoryIds, []),
    }, { status: 201 })
  } catch (error) {
    console.error('Ad create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
