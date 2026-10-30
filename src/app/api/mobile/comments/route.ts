import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const newsId = searchParams.get('newsId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!newsId) {
      return NextResponse.json({ error: 'newsId is required' }, { status: 400 })
    }

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: {
          newsId,
          isActive: true,
          parentId: null, // Only top-level comments
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
          replies: {
            where: { isActive: true },
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
            orderBy: { createdAt: 'asc' },
            take: 5, // Limit replies per comment
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.comment.count({
        where: { newsId, isActive: true, parentId: null },
      }),
    ])

    return NextResponse.json({ comments, total, page, limit })
  } catch (error) {
    console.error('Comments fetch error:', error)
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

    const phone = decodedToken.phone_number || (decodedToken.email ? `email_${decodedToken.email}` : decodedToken.uid);
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = await request.json()
    const { newsId, content, parentId } = data

    if (!newsId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: 'newsId and content are required' }, { status: 400 })
    }

    if (content.trim().length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })
    }

    const comment = await db.comment.create({
      data: {
        userId: user.id,
        newsId,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Comment create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
