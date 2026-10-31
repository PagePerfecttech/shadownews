import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logAudit, getClientIp } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      include: {
        state: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true } },
        mandal: { select: { id: true, name: true } },
        _count: {
          select: {
            bookmarks: true,
            comments: true,
            newsReactions: true,
            videoReactions: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get count of read interactions
    const [readCount, shareCount] = await Promise.all([
      db.userInteraction.count({
        where: { userId: user.id, type: 'view' },
      }),
      db.userInteraction.count({
        where: { userId: user.id, type: 'share' },
      }),
    ])

    // Fetch recent 5 bookmarks with news title
    const recentBookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        news: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            createdAt: true,
          },
        },
      },
    })

    // Fetch recent 5 comments with news title
    const recentComments = await db.comment.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        news: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Check if user is linked to an existing Reporter
    const phoneVariants = [
      user.phone,
      user.phone.replace('+91', ''),
      user.phone.startsWith('+91') ? user.phone : `+91${user.phone}`,
    ]
    const linkedReporter = await db.reporter.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(user.email ? [{ email: user.email }] : []),
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        earningsBalance: true,
        postingScope: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user,
      activity: {
        readCount,
        shareCount,
        bookmarksCount: user._count.bookmarks,
        commentsCount: user._count.comments,
        reactionsCount: user._count.newsReactions + user._count.videoReactions,
        recentBookmarks,
        recentComments,
      },
      linkedReporter,
    })
  } catch (error) {
    console.error('User detail fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const data = await request.json()

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}
    if (data.name !== undefined) updateData.name = data.name ? String(data.name).trim() : null
    if (data.email !== undefined) updateData.email = data.email ? String(data.email).trim() : null
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive)
    if (data.isPremium !== undefined) updateData.isPremium = Boolean(data.isPremium)
    if (data.preferredLanguage !== undefined) updateData.preferredLanguage = String(data.preferredLanguage)
    if (data.stateId !== undefined) updateData.stateId = data.stateId || null
    if (data.districtId !== undefined) updateData.districtId = data.districtId || null
    if (data.mandalId !== undefined) updateData.mandalId = data.mandalId || null
    if (data.notificationsEnabled !== undefined) updateData.notificationsEnabled = Boolean(data.notificationsEnabled)

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    })

    await logAudit({
      adminId: admin.id,
      action: 'update',
      entity: 'user',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: updateData,
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('User update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const user = await db.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await db.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        fcmToken: null,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'delete',
      entity: 'user',
      entityId: id,
      ipAddress: getClientIp(request),
      changes: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'User account soft-deleted successfully' })
  } catch (error) {
    console.error('User delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
