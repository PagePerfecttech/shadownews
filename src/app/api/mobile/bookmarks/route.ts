import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse } from '@/lib/json-utils'
import { getOrCreateUserFromToken } from '@/lib/user-utils'

export async function GET(request: NextRequest) {
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

    const bookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      include: {
        news: {
          select: {
            id: true,
            title: true,
            shortDesc: true,
            thumbnailUrl: true,
            imagesUrls: true,
            publishedAt: true,
            category: { select: { name: true, color: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedBookmarks = bookmarks.map(b => {
      const parsedImages = safeJsonParse<string[]>(b.news.imagesUrls, []);
      const thumbnail = b.news.thumbnailUrl || (parsedImages.length > 0 ? parsedImages[0] : '');
      return {
        ...b,
        news: {
          ...b.news,
          thumbnailUrl: thumbnail,
          imagesUrls: parsedImages,
        }
      };
    });

    return NextResponse.json(mappedBookmarks)
  } catch (error) {
    console.error('Bookmarks fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { newsId, action } = data // action: 'add' or 'remove'

    if (!newsId) {
      return NextResponse.json({ error: 'newsId is required' }, { status: 400 })
    }

    if (action === 'add') {
      await db.bookmark.upsert({
        where: { userId_newsId: { userId: user.id, newsId } },
        update: {},
        create: { userId: user.id, newsId },
      })
    } else if (action === 'remove') {
      await db.bookmark.deleteMany({
        where: { userId: user.id, newsId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Bookmark action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
