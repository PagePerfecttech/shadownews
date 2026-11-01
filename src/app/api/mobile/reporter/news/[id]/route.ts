import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken);
    if (!reporter) {
      return NextResponse.json({ error: 'Not a reporter' }, { status: 403 })
    }

    const news = await db.news.findFirst({
      where: { id, reporterId: reporter.id, deletedAt: null }
    })

    if (!news) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 })
    }

    return NextResponse.json(news)
  } catch (error) {
    console.error('Fetch reporter news detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken);
    if (!reporter) {
      return NextResponse.json({ error: 'Not a reporter' }, { status: 403 })
    }

    const existingNews = await db.news.findFirst({
      where: { id, reporterId: reporter.id, deletedAt: null }
    })

    if (!existingNews) {
      return NextResponse.json({ error: 'News article not found' }, { status: 404 })
    }

    if (existingNews.status === 'published') {
      return NextResponse.json(
        { error: 'ప్రచురించబడిన వార్తలను సవరించడానికి అనుమతి లేదు. దయచేసి అడ్మిన్‌ను సంప్రదించండి. (Published articles cannot be edited directly by reporters. Please contact admin.)' },
        { status: 403 }
      )
    }

    let title, shortDesc, categoryId, districtId, mandalId, thumbnailUrl, videoUrl, customLink;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title') as string;
      shortDesc = formData.get('shortDesc') as string;
      categoryId = formData.get('categoryId') as string;
      districtId = formData.get('districtId') as string;
      mandalId = formData.get('mandalId') as string;
      customLink = formData.get('customLink') as string;
      thumbnailUrl = formData.get('thumbnailUrl') as string;
      videoUrl = formData.get('videoUrl') as string;
    } else {
      const data = await request.json();
      title = data.title;
      shortDesc = data.shortDesc;
      categoryId = data.categoryId;
      districtId = data.districtId;
      mandalId = data.mandalId;
      customLink = data.customLink || data.sourceUrl;
      thumbnailUrl = data.thumbnailUrl;
      videoUrl = data.videoUrl;
    }

    const updatedNews = await db.news.update({
      where: { id: existingNews.id },
      data: {
        title: title || existingNews.title,
        shortDesc: shortDesc !== undefined ? shortDesc : existingNews.shortDesc,
        categoryId: categoryId || existingNews.categoryId,
        districtId: districtId || existingNews.districtId,
        mandalId: mandalId !== undefined ? mandalId : existingNews.mandalId,
        thumbnailUrl: thumbnailUrl || existingNews.thumbnailUrl,
        videoUrl: videoUrl !== undefined ? videoUrl : existingNews.videoUrl,
        sourceUrl: customLink || existingNews.sourceUrl,
        status: reporter.canPublishDirectly ? 'published' : 'pending_review',
      }
    })

    return NextResponse.json({ message: 'News updated successfully', news: updatedNews })
  } catch (error: any) {
    console.error('Update reporter news error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
