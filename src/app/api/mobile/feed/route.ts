import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { safeJsonParse } from '@/lib/json-utils'
import { rankAndMixArticles } from '@/lib/recommendation-engine'
import { getCache, setCache, getFeedCacheHeaders } from '@/lib/cache'
import { injectAdsIntoFeedCards, getActiveCustomAds } from '@/lib/ad-engine'
import { generateRandomShortCode } from '@/lib/short-code'

const feedQuerySchema = z.object({
  village_id: z.string().cuid().optional(),
  mandal_id: z.string().cuid().optional(),
  assembly_id: z.string().cuid().optional(),
  district_id: z.string().cuid().optional(),
  state_id: z.string().cuid().optional(),
  category: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const parsed = feedQuerySchema.safeParse({
    village_id: searchParams.get('village_id') ?? undefined,
    mandal_id: searchParams.get('mandal_id') ?? undefined,
    assembly_id: searchParams.get('assembly_id') ?? undefined,
    district_id: searchParams.get('district_id') ?? undefined,
    state_id: searchParams.get('state_id') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    village_id,
    mandal_id: mandalId,
    assembly_id,
    district_id: districtId,
    state_id: stateId,
    category,
    page,
    limit,
  } = parsed.data

  try {
    // Resolve user from auth token
    let dbUser: any = null;
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      try {
        const decodedToken = await verifyFirebaseToken(authHeader);
        const phone = decodedToken?.phone_number || (decodedToken?.email ? `email_${decodedToken.email}` : decodedToken?.uid);
        if (phone) {
          dbUser = await db.user.findUnique({ where: { phone } });
        }
      } catch (e) {
        console.error('Invalid token in feed:', e);
      }
    }

    // Resolve location IDs: query params > user profile > undefined
    const finalVillageId = village_id || dbUser?.villageId || undefined;
    const finalMandalId = mandalId || dbUser?.mandalId || undefined;
    const finalAssemblyId = assembly_id || dbUser?.assemblyId || undefined;
    const finalDistrictId = districtId || dbUser?.districtId || undefined;
    const finalStateId = stateId || dbUser?.stateId || undefined;

    // Load category weight preferences for user
    const userPrefs: Record<string, number> = {};
    if (dbUser) {
      const prefs = await db.userPreference.findMany({
        where: { userId: dbUser.id },
      });
      for (const pref of prefs) {
        userPrefs[pref.categoryId] = pref.score;
      }
      
      // Initialize any categories chosen during onboarding but not yet customized by interactions
      const selectedCategories = safeJsonParse<string[]>(dbUser.preferredCategories || '[]', []);
      for (const catId of selectedCategories) {
        if (userPrefs[catId] === undefined) {
          userPrefs[catId] = 1.0; // higher initial score for onboarding interests
        }
      }
    }

    const baseWhere: Record<string, unknown> = {
      status: 'published',
      deletedAt: null,
      publishedAt: { lte: new Date() },
    }

    if (category) {
      baseWhere.categoryId = category
    }

    // Filter by location if explicitly requested via query params (e.g. from Location Tab)
    if (mandalId || districtId || assembly_id || village_id) {
      const locationConditions: any[] = [];
      if (village_id) locationConditions.push({ villageId: village_id });
      if (mandalId) locationConditions.push({ mandalId: mandalId });
      if (assembly_id) locationConditions.push({ assemblyId: assembly_id });
      if (districtId) locationConditions.push({ districtId: districtId });

      if (locationConditions.length > 0) {
        baseWhere.OR = locationConditions;
      }
    } else if (stateId) {
      baseWhere.stateId = stateId;
    }

    const selectFields = {
      id: true,
      shortCode: true,
      title: true,
      shortDesc: true,
      thumbnailUrl: true,
      imagesUrls: true,
      videoUrl: true,
      priority: true,
      publishedAt: true,
      viewsCount: true,
      sharesCount: true,
      mandalId: true,
      districtId: true,
      stateId: true,
      assemblyId: true,
      villageId: true,
      category: { select: { name: true, slug: true, color: true } },
      district: { select: { name: true } },
      mandal: { select: { name: true } },
      reporter: { select: { name: true, avatar: true } },
      admin: { select: { name: true, avatar: true } },
      tags: { select: { tag: { select: { name: true, slug: true } } } },
      sourceUrl: true,
      _count: {
        select: {
          comments: { where: { isActive: true } },
          reactions: true,
        }
      }
    };

    const offset = (page - 1) * limit;

    // Fast Multi-Replica / In-Memory Cache Key for Page 1 requests (15s TTL)
    const cacheKey = page === 1 ? `feed_p1_${mandalId || ''}_${districtId || ''}_${stateId || ''}_${category || ''}` : null;
    if (cacheKey) {
      const cachedData = await getCache<any>(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData, { headers: getFeedCacheHeaders(10, 30) });
      }
    }

    // Fetch candidate articles matching filters (tuned limit for fast DB performance)
    const candidateLimit = page === 1 ? Math.min(40, limit * 4) : Math.min(100, page * limit + 30);
    const candidates = await db.news.findMany({
      where: baseWhere,
      select: selectFields,
      orderBy: { publishedAt: 'desc' },
      take: candidateLimit,
    });

    const total = candidates.length >= candidateLimit ? candidateLimit + 10 : candidates.length + offset;

    const userLocation = {
      stateId: finalStateId,
      districtId: finalDistrictId,
      assemblyId: finalAssemblyId,
      mandalId: finalMandalId,
      villageId: finalVillageId,
    };

    // Rank and mix categories
    const rankedNews = rankAndMixArticles(candidates, userPrefs, userLocation);

    // Paginate from the ranked list
    const paginatedNews = rankedNews.slice(offset, offset + limit);

    // Format news items
    const formattedNews = paginatedNews.map((item) => {
      const parsedImages = safeJsonParse<string[]>(item.imagesUrls, []);
      let thumbnail = item.thumbnailUrl || (parsedImages.length > 0 ? parsedImages[0] : '');
      if (!thumbnail && item.videoUrl) {
        const ytMatch = item.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
        if (ytMatch && ytMatch[1]) {
          thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
        }
      }
      const reporterAvatar = item.reporter?.avatar || (item as any).admin?.avatar || '';
      const reporterName = item.reporter?.name || (item as any).admin?.name || 'Shadow News Reporter';
      const reporterObj = {
        name: reporterName,
        avatar: reporterAvatar || null,
      };
      let code = item.shortCode;
      if (!code || code.trim() === '') {
        if (item.id && item.id.length <= 5) {
          code = item.id;
        } else {
          code = generateRandomShortCode(5);
          db.news.update({ where: { id: item.id }, data: { shortCode: code } }).catch(() => {});
        }
      }

      return {
        ...item,
        shortCode: code,
        short_code: code,
        reporter: reporterObj,
        reporter_name: reporterName,
        reporter_image: reporterAvatar,
        thumbnailUrl: thumbnail,
        imagesUrls: parsedImages,
        videoUrl: item.videoUrl || null,
        video_url: item.videoUrl || null,
      };
    });

    // Unified Ad Injection with priority rotation and non-repeating guarantees
    const feed = await injectAdsIntoFeedCards(formattedNews, {
      stateId: finalStateId,
      districtId: finalDistrictId,
      mandalId: finalMandalId,
      categoryId: category,
    });

    // Inject Home Banner carousel on the first page
    if (page === 1) {
      const carouselAds = await getActiveCustomAds('home_banner', {
        stateId: finalStateId,
        districtId: finalDistrictId,
        mandalId: finalMandalId,
        categoryId: category,
      });

      if (carouselAds.length > 0) {
        feed.unshift({
          type: 'ad_slider',
          ads: carouselAds.slice(0, 6).map(ad => ({
            ...ad,
            imagesUrls: safeJsonParse<string[]>(ad.imagesUrls || '[]', []),
            targetStateIds: safeJsonParse<string[]>(ad.targetStateIds || '[]', []),
            targetDistrictIds: safeJsonParse<string[]>(ad.targetDistrictIds || '[]', []),
            targetMandalIds: safeJsonParse<string[]>(ad.targetMandalIds || '[]', []),
            targetCategoryIds: safeJsonParse<string[]>(ad.targetCategoryIds || '[]', []),
          }))
        } as any);
      }
    }

    const responsePayload = { feed, total, page, limit };
    if (cacheKey) {
      await setCache(cacheKey, responsePayload, 15);
    }

    return NextResponse.json(responsePayload, { headers: getFeedCacheHeaders(10, 30) });

  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
