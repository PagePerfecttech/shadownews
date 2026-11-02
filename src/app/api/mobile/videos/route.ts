import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const [videos, totalVideos, newsWithVideos, totalNewsVideos] = await Promise.all([
      db.video.findMany({
        where: { status: 'published', deletedAt: null },
        include: { 
          category: { select: { name: true, color: true } },
          _count: { select: { reactions: { where: { type: 'like' } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
      db.video.count({ where: { status: 'published', deletedAt: null } }),
      db.news.findMany({
        where: {
          status: 'published',
          deletedAt: null,
          videoUrl: { not: null },
        },
        include: {
          category: { select: { name: true, color: true } },
          reporter: { select: { name: true, avatar: true } },
          _count: { select: { reactions: { where: { type: 'like' } } } }
        },
        orderBy: { publishedAt: 'desc' },
        take: 60,
      }),
      db.news.count({
        where: {
          status: 'published',
          deletedAt: null,
          videoUrl: { not: null },
        }
      }),
    ])

    const formattedNewsVideos = newsWithVideos
      .filter((n) => n.videoUrl && n.videoUrl.trim().startsWith('http'))
      .map((n) => {
        let thumb = n.thumbnailUrl
        if (!thumb && n.videoUrl) {
          const ytMatch = n.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/)
          if (ytMatch && ytMatch[1]) {
            thumb = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`
          }
        }
        return {
          id: n.id,
          title: n.title,
          description: n.shortDesc || '',
          videoUrl: n.videoUrl,
          thumbnailUrl: thumb || '',
          duration: 0,
          categoryId: n.categoryId,
          status: n.status,
          viewsCount: n.viewsCount,
          createdAt: n.publishedAt || n.createdAt,
          category: n.category,
          reporter: n.reporter,
          _count: n._count,
          isNews: true,
        }
      })

    const allCombined = [...videos, ...formattedNewsVideos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const paginated = allCombined.slice((page - 1) * limit, page * limit)
    const total = totalVideos + totalNewsVideos

    return NextResponse.json({ videos: paginated, total, page, limit })
  } catch (error) {
    console.error('Videos error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
