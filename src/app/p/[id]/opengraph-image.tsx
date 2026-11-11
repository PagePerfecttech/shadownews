import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { safeJsonParse } from '@/lib/json-utils'
import fs from 'fs'
import path from 'path'

export const alt = 'News Card'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Image({ params }: { params: { id: string } }) {
  const resolvedParams = typeof (params as any).then === 'function' ? await (params as any) : params;
  const { id } = resolvedParams;

  const news = await db.news.findUnique({
    where: { id },
    include: { category: true, reporter: true, mandal: true, district: true }
  })

  if (!news) {
    return new ImageResponse(
      (
        <div style={{ fontSize: 48, background: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          News Not Found
        </div>
      ),
      { ...size }
    )
  }

  const images = safeJsonParse<string[]>(news.imagesUrls, [])
  const imageUrl = news.thumbnailUrl || (images.length > 0 ? images[0] : null)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://m.shadownews.in'
  
  let finalImageUrl = imageUrl
  if (imageUrl && imageUrl.startsWith('/')) {
    finalImageUrl = `${baseUrl}${imageUrl}`
  }

  const locationName = news.mandal?.name || news.district?.name || ''

  // Load card_strip.jpeg as base64 for reliable server-side rendering
  let cardStripBase64 = ''
  try {
    const filePath = path.join(process.cwd(), 'public', 'card_strip.jpeg')
    const fileBuffer = fs.readFileSync(filePath)
    cardStripBase64 = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`
  } catch (e) {
    console.error('Error reading card_strip.jpeg:', e)
  }

  // Load spotnewslogo.png as base64 for watermark rendering
  let spotNewsLogoBase64 = ''
  try {
    const filePath = path.join(process.cwd(), 'public', 'spotnewslogo.png')
    const fileBuffer = fs.readFileSync(filePath)
    spotNewsLogoBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`
  } catch (e) {
    console.error('Error reading spotnewslogo.png:', e)
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Top Image Section (approx 60% of height) */}
        <div style={{ display: 'flex', width: '100%', height: '360px', position: 'relative' }}>
          {finalImageUrl ? (
            <img src={finalImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#e5e7eb' }} />
          )}

          {/* Watermark overlay */}
          {spotNewsLogoBase64 ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <img
                src={spotNewsLogoBase64}
                style={{
                  width: '240px',
                  height: 'auto',
                  opacity: 0.15,
                  objectFit: 'contain'
                }}
              />
            </div>
          ) : null}

          {/* Reporter Badge */}
          <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            left: '20px', 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            padding: '8px 16px', 
            borderRadius: '24px',
            display: 'flex'
          }}>
            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
              By {news.reporter?.name || 'Shadow News'}
            </span>
          </div>
        </div>

        {/* Bottom Text Section */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '24px 40px',
          height: '270px',
          justifyContent: 'space-between'
        }}>
          {/* Metadata Strip: card_strip, slogan, location */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#000000', // black background strip
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <img
              src={cardStripBase64}
              style={{ height: '32px', objectFit: 'contain' }}
            />
            
            <span style={{ 
              color: '#FFFFFF', // white slogan color
              fontSize: '18px', 
              fontWeight: 'bold',
            }}>
              No.1 తెలుగు న్యూస్ డైలీ
            </span>

            {locationName ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#E0E0E0', fontSize: '18px', fontWeight: 'bold' }}>
                  📍 {locationName}
                </span>
              </div>
            ) : <div />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: '#111111', 
              lineHeight: 1.2,
              maxHeight: '80px',
              overflow: 'hidden'
            }}>
              {news.title}
            </span>
            <span style={{ 
              fontSize: '22px', 
              color: '#555555', 
              marginTop: '8px',
              lineHeight: 1.4,
              maxHeight: '60px',
              overflow: 'hidden'
            }}>
              {news.shortDesc}
            </span>
          </div>

          {/* Reporter & Time Row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderTop: '1px solid #E5E7EB', 
            paddingTop: '16px', 
            marginTop: '16px' 
          }}>
            <span style={{ color: '#555555', fontSize: '20px', fontWeight: 'bold' }}>
              By {news.reporter?.name || 'Shadow News'}
            </span>
            <span style={{ color: '#888888', fontSize: '18px' }}>
              {new Date(news.publishedAt || news.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
