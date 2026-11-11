import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { safeJsonParse } from '@/lib/json-utils'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = typeof (params as any).then === 'function' 
    ? await (params as any) 
    : params;
  
  const { id } = resolvedParams
  const news = await db.news.findUnique({
    where: { id },
  })

  if (!news) {
    return {
      title: 'News Not Found',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://m.shadownews.in'
  const images: string[] = safeJsonParse<string[]>(news.imagesUrls, [])
  let imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : `${baseUrl}/spotnewslogo.png`)
  if (imageUrl.startsWith('/')) {
    imageUrl = `${baseUrl}${imageUrl}`
  }

  const cleanDescription = (news.shortDesc || news.title || '').trim()

  return {
    title: `${news.title} | Shadow News`,
    description: cleanDescription,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/p/${id}`,
    },
    openGraph: {
      title: news.title,
      description: cleanDescription,
      url: `${baseUrl}/p/${id}`,
      type: 'article',
      siteName: 'Shadow News',
      locale: 'te_IN',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: news.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: news.title,
      description: cleanDescription,
      images: [imageUrl],
    }
  }
}

export default async function NewsPreviewPage({ params }: PageProps) {
  // Await params if it's a promise (Next.js 15 compatibility)
  const resolvedParams = typeof (params as any).then === 'function' 
    ? await (params as any) 
    : params;
  
  const { id } = resolvedParams

  const news = await db.news.findUnique({
    where: { id },
    include: {
      category: true,
      mandal: true,
      district: true,
      reporter: true,
    },
  })

  if (!news) {
    notFound()
  }

  // Parse imagesUrls safely
  const images: string[] = safeJsonParse<string[]>(news.imagesUrls, [])
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)
  const locationName = news.mandal?.name || news.district?.name || ''

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Image Section - aspect ratio 4/3 */}
        {imageUrl && (
          <div className="relative w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={news.title}
              className="w-full h-full object-cover rounded-b-xl"
            />
            {/* Watermark overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src="/spotnewslogo.png"
                alt="Watermark"
                className="w-28 h-auto opacity-15 object-contain"
              />
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Metadata Strip: card_strip, slogan, location */}
          <div className="mb-3 px-2 py-1.5 bg-black rounded-md flex justify-between items-center gap-2">
            <img
              src="/card_strip.jpeg"
              alt="Strip"
              className="h-6 object-contain"
            />
            
            {/* Slogan */}
            <div className="flex-1 text-center">
              <span className="text-[10px] font-bold text-white tracking-tight whitespace-nowrap">
                No.1 తెలుగు న్యూస్ డైలీ
              </span>
            </div>

            {/* Location */}
            {locationName && (
              <div className="flex items-center gap-0.5 text-white/80 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[11px] font-semibold">
                  {locationName}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">
            {news.title}
          </h1>
          <p className="text-gray-700 leading-relaxed text-sm mb-6 flex-1">
            {news.shortDesc}
          </p>

          {/* Reporter & Time Row */}
          <div className="flex items-center gap-2 mb-6 border-t border-gray-100 pt-4 mt-auto">
            {news.reporter && (
              <div className="flex items-center gap-1.5">
                {news.reporter.avatar ? (
                  <img
                    src={news.reporter.avatar}
                    alt={news.reporter.name || 'Reporter'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-700">
                  By {news.reporter.name || 'Reporter'}
                </span>
              </div>
            )}
            
            {news.reporter && <span className="text-gray-300 text-xs">•</span>}
            
            <span className="text-xs text-gray-500">
              {new Date(news.publishedAt || news.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          {/* CTA Button */}
          <a
            id="open-app-btn"
            href={`https://play.google.com/store/apps/details?id=com.shadownews.app`}
            className="w-full py-3.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold rounded-2xl text-center shadow-md shadow-red-200 transition-all block duration-200"
          >
            యాప్‌లో చదవండి (Open in App)
          </a>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            var isAndroid = /Android/i.test(navigator.userAgent);
            var btn = document.getElementById('open-app-btn');
            if (isAndroid) {
              var intentUrl = "intent://m.shadownews.in/p/${id}#Intent;scheme=https;package=com.shadownews.app;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.shadownews.app;end";
              if (btn) btn.href = intentUrl;
              setTimeout(function() {
                window.location.href = intentUrl;
              }, 300);
            }
          `
        }}
      />
      <p className="text-gray-400 text-xs mt-6">
        © {new Date().getFullYear()} Shadow News. All rights reserved.
      </p>
    </div>
  )
}
