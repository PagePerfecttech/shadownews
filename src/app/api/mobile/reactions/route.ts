import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { getOrCreateUserFromToken } from '@/lib/user-utils'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const user = await getOrCreateUserFromToken(decodedToken);
    if (!user) {
       return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = await request.json()
    const { newsId, videoId, type = 'like', action } = data // action: 'add' or 'remove'

    if (!newsId && !videoId) {
      return NextResponse.json({ error: 'newsId or videoId is required' }, { status: 400 })
    }

    if (newsId) {
      if (action === 'add') {
        await db.newsReaction.upsert({
          where: { userId_newsId: { userId: user.id, newsId } },
          update: { type },
          create: { userId: user.id, newsId, type },
        })
      } else if (action === 'remove') {
        await db.newsReaction.deleteMany({
          where: { userId: user.id, newsId },
        })
      }
    } else if (videoId) {
      if (action === 'add') {
        await db.videoReaction.upsert({
          where: { userId_videoId: { userId: user.id, videoId } },
          update: { type },
          create: { userId: user.id, videoId, type },
        })
      } else if (action === 'remove') {
        await db.videoReaction.deleteMany({
          where: { userId: user.id, videoId },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reaction action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
