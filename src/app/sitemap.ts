import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const revalidate = 3600 // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://shadownews.com'

  // Fetch static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-conditions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/reporter-guidelines`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contact-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  try {
    // Automatically fetch all published news articles
    const articles = await db.news.findMany({
      where: {
        status: 'published',
        deletedAt: null,
      },
      select: {
        id: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 5000, // Limit to 5,000 latest articles per sitemap chunk
    })

    const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${baseUrl}/p/${article.id}`,
      lastModified: article.updatedAt || article.publishedAt || new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    return [...staticRoutes, ...articleRoutes]
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error)
    return staticRoutes
  }
}
