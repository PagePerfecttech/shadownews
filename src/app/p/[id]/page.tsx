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
  const news = await db.news.findFirst({
    where: {
      OR: [
        { id },
        { shortCode: id },
      ],
    },
  })

  if (!news) {
    return {
      title: 'News Not Found | Shadow News',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.shadownews.in'
  const images: string[] = safeJsonParse<string[]>(news.imagesUrls, [])
  let imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : `${baseUrl}/logo.png`)
  if (imageUrl.startsWith('/')) {
    imageUrl = `${baseUrl}${imageUrl}`
  }

  const cleanDescription = (news.shortDesc || news.title || '').trim()
  const code = news.shortCode || id

  return {
    title: `${news.title} | Shadow News`,
    description: cleanDescription,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/p/${code}`,
    },
    openGraph: {
      title: news.title,
      description: cleanDescription,
      url: `${baseUrl}/p/${code}`,
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
  const resolvedParams = typeof (params as any).then === 'function' 
    ? await (params as any) 
    : params;
  
  const { id } = resolvedParams

  const news = await db.news.findFirst({
    where: {
      OR: [
        { id },
        { shortCode: id },
      ],
    },
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

  const code = news.shortCode || id
  const images: string[] = safeJsonParse<string[]>(news.imagesUrls, [])
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)
  const locationName = news.mandal?.name || news.district?.name || ''
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.shadownews.app'

  return (
    <div className="min-h-screen bg-[#F1F3F5] text-gray-900 antialiased font-sans flex flex-col pb-24">
      {/* 1. TOP STICKY APP DOWNLOAD / OPEN BANNER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Shadow News Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-sm border border-red-100"
          />
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">Shadow News</h2>
            <p className="text-[11px] text-gray-500">తెలుగు వార్తలు ఎప్పటికప్పుడు</p>
          </div>
        </div>
        <button
          onClick={undefined}
          id="top-open-btn"
          className="open-app-trigger px-3.5 py-1.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-full shadow-sm transition active:scale-95"
        >
          యాప్‌లో తెరవండి
        </button>
      </header>

      {/* 2. MAIN NEWS ARTICLE CARD */}
      <main className="max-w-lg w-full mx-auto px-3 pt-3 flex-1">
        <article className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          {/* Article Media Photo */}
          {imageUrl && (
            <div className="relative w-full aspect-[16/10] bg-gray-900 overflow-hidden">
              <img
                src={imageUrl}
                alt={news.title}
                className="w-full h-full object-cover"
              />
              {/* Subtle Brand Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <img
                  src="/logo.png"
                  alt="Watermark"
                  className="w-32 h-32 object-contain"
                />
              </div>
              {/* Category Pill Overlay */}
              {news.category?.name && (
                <span className="absolute top-3 left-3 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow">
                  {news.category.name}
                </span>
              )}
            </div>
          )}

          {/* Article Content */}
          <div className="p-4 sm:p-5 flex flex-col">
            {/* Metadata Bar */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2.5 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                {locationName && (
                  <span className="font-semibold text-red-600 flex items-center gap-0.5">
                    📍 {locationName}
                  </span>
                )}
                {locationName && <span>•</span>}
                <span>
                  {new Date(news.publishedAt || news.createdAt).toLocaleDateString('te-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {news.reporter?.name && (
                <span className="text-gray-600 font-medium">
                  రిపోర్టర్: {news.reporter.name}
                </span>
              )}
            </div>

            {/* Headline */}
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug mb-3">
              {news.title}
            </h1>

            {/* Description / Body */}
            <div className="text-gray-800 text-[15px] sm:text-base leading-relaxed mb-6 whitespace-pre-line font-normal">
              {news.content || news.shortDesc || ''}
            </div>

            {/* Download App In-Feed Call To Action Card */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100 text-center mb-2">
              <p className="text-sm font-bold text-gray-900 mb-1">
                ఇలాంటి మరిన్ని తాజా వార్తల కోసం
              </p>
              <p className="text-xs text-gray-600 mb-3">
                షాడో న్యూస్ అధికారిక యాప్‌ను డౌన్‌లోడ్ చేసుకోండి.
              </p>
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-bold rounded-xl shadow-md transition active:scale-95"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.32 0 .62.1.86.29l12.43 8.5c.61.42.76 1.25.34 1.86-.1.14-.22.26-.34.34L5.36 21.71c-.24.19-.54.29-.86.29-.83 0-1.5-.67-1.5-1.5z" />
                </svg>
                Google Play లో డౌన్‌లోడ్ చేయండి
              </a>
            </div>
          </div>
        </article>
      </main>

      {/* 3. FIXED BOTTOM BAR (DIRECT APP OPEN OR PLAY STORE DOWNLOAD) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">Shadow News App</p>
            <p className="text-[11px] text-gray-500 truncate">నోటిఫికేషన్స్ & వీడియోలు</p>
          </div>
          <button
            id="bottom-open-btn"
            className="open-app-trigger px-5 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            యాప్‌లో తెరవండి (Open)
          </button>
        </div>
      </div>

      {/* 4. SMART CLIENT-SIDE INTENT SCRIPT */}
      {/* If app is installed, smoothly wakes app to this article. If not installed, user stays on web & can click download */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var articleCode = ${JSON.stringify(code)};
              var playStoreLink = ${JSON.stringify(playStoreUrl)};
              var isAndroid = /Android/i.test(navigator.userAgent);

              // Standard Android Intent syntax
              var directAppIntent = "intent://www.shadownews.in/p/" + articleCode + "#Intent;scheme=https;package=com.shadownews.app;S.browser_fallback_url=" + encodeURIComponent(playStoreLink) + ";end";

              function openInAppOrStore() {
                if (isAndroid) {
                  window.location.href = directAppIntent;
                } else {
                  window.location.href = playStoreLink;
                }
              }

              // Bind all open buttons
              var buttons = document.querySelectorAll('.open-app-trigger');
              buttons.forEach(function(btn) {
                btn.addEventListener('click', openInAppOrStore);
              });

              // On page load for Android: attempt silent check to launch the app if installed
              if (isAndroid) {
                // If user tapped a link directly from WhatsApp/Telegram, attempt smooth app link open
                var silentIntent = "intent://www.shadownews.in/p/" + articleCode + "#Intent;scheme=https;package=com.shadownews.app;end";
                var iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = silentIntent;
                document.body.appendChild(iframe);
                setTimeout(function() {
                  if (iframe && iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                  }
                }, 1000);
              }
            })();
          `,
        }}
      />
    </div>
  )
}
