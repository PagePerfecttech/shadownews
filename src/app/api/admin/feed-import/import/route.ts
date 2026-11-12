import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { RawFeedItem, getFallbackImage } from '@/lib/feed-parser'
import { processArticleWithAIAgent, AIProcessOptions } from '@/lib/feed-ai-agent'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { items, options = {} }: { items: RawFeedItem[]; options: AIProcessOptions & { status?: string } } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided for import' }, { status: 400 })
    }

    // 1. Fetch categories, states, and districts
    const [categories, states, districts] = await Promise.all([
      db.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
      }),
      db.state.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
      }),
      db.district.findMany({
        where: { isActive: true },
        select: { id: true, name: true, stateId: true },
      }),
    ])

    if (categories.length === 0 || states.length === 0) {
      return NextResponse.json(
        { error: 'Database missing active categories or states' },
        { status: 500 }
      )
    }

    const importedResults: any[] = []
    const skippedItems: any[] = []
    const targetStatus = options.status === 'draft' ? 'draft' : 'published'

    for (const item of items) {
      try {
        // Deduplicate check
        const existing = await db.news.findFirst({
          where: {
            OR: [
              ...(item.link ? [{ sourceUrl: item.link }] : []),
              { title: item.title },
            ],
          },
        })

        if (existing) {
          skippedItems.push({ title: item.title, reason: 'Already exists in database' })
          continue
        }

        // Process item through AI Agent
        const processed = await processArticleWithAIAgent(item, {
          categories,
          states,
          districts,
          options,
        })

        const finalThumbnail = item.thumbnailUrl || getFallbackImage(processed.categorySlug)
        const finalTitle = options.autoRewrite !== false ? processed.aiTitle : item.title
        const finalShortDesc = options.autoRewrite !== false ? processed.aiShortDesc : (item.description || item.title)
        const finalContent = options.autoRewrite !== false ? processed.aiContent : (item.content || item.description || item.title)

        // Create News record
        const createdNews = await db.news.create({
          data: {
            title: finalTitle,
            shortDesc: finalShortDesc.substring(0, 500),
            content: finalContent,
            aiTitle: processed.aiTitle,
            aiShortDesc: processed.aiShortDesc,
            aiContent: processed.aiContent,
            aiStatus: processed.aiStatus,
            sourceType: 'feed_import',
            sourceUrl: item.link || null,
            externalLink: item.link || null,
            thumbnailUrl: finalThumbnail,
            imagesUrls: JSON.stringify([finalThumbnail]),
            status: targetStatus,
            priority: 'normal',
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            categoryId: processed.categoryId,
            stateId: processed.stateId,
            districtId: processed.districtId || null,
            createdBy: admin.id,
            approvedBy: targetStatus === 'published' ? admin.id : null,
            approvedAt: targetStatus === 'published' ? new Date() : null,
          },
        })

        // Upsert tags & link NewsTag relations
        if (processed.tags && processed.tags.length > 0) {
          for (const tagName of processed.tags) {
            try {
              const slug = tagName.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F]+/g, '-').replace(/(^-|-$)/g, '') || `tag-${Date.now()}`
              const tag = await db.tag.upsert({
                where: { slug },
                update: {},
                create: {
                  name: tagName,
                  slug,
                  type: 'topic',
                },
              })

              await db.newsTag.upsert({
                where: {
                  newsId_tagId: {
                    newsId: createdNews.id,
                    tagId: tag.id,
                  },
                },
                update: {},
                create: {
                  newsId: createdNews.id,
                  tagId: tag.id,
                },
              })
            } catch {
              // Ignore single tag conflict
            }
          }
        }

        importedResults.push({
          id: createdNews.id,
          originalTitle: item.title,
          aiTitle: createdNews.title,
          category: processed.categorySlug,
          district: processed.districtName || 'State/General',
          stateCode: processed.stateCode,
          status: targetStatus,
          thumbnailUrl: finalThumbnail,
        })
      } catch (err: any) {
        console.error(`Failed to import item: ${item.title}`, err)
        skippedItems.push({ title: item.title, reason: err.message || 'Processing error' })
      }
    }

    // Log admin audit
    if (importedResults.length > 0) {
      await logAudit({
        adminId: admin.id,
        action: 'create',
        entity: 'feed_import',
        entityId: importedResults[0].id,
        ipAddress: getClientIp(request),
        changes: {
          importedCount: importedResults.length,
          skippedCount: skippedItems.length,
          targetStatus,
        },
      })
    }

    return NextResponse.json({
      success: true,
      importedCount: importedResults.length,
      skippedCount: skippedItems.length,
      imported: importedResults,
      skipped: skippedItems,
    })
  } catch (error: any) {
    console.error('Error during feed import:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

