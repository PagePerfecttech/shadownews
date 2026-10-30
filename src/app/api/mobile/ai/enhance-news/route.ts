import { NextRequest, NextResponse } from 'next/server'
import { generateGeminiNewsRewrite } from '@/lib/gemini-service'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'

// In-memory rate limiting map (Reporter ID -> timestamps[])
const rateLimitMap = new Map<string, number[]>()

export async function POST(request: NextRequest) {
  let title = '', content = ''
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Authentication required to use AI Rewrite' }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken)
    if (!reporter || reporter.status !== 'active') {
      return NextResponse.json({ error: 'Only active registered reporters may use AI Rewrite' }, { status: 403 })
    }

    // Rate limiting: Max 10 requests per hour per reporter
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const timestamps = (rateLimitMap.get(reporter.id) || []).filter(t => t > oneHourAgo)
    if (timestamps.length >= 10) {
      return NextResponse.json({ error: 'AI Rewrite limit reached (10/hour). Please try again later.' }, { status: 429 })
    }
    timestamps.push(now)
    rateLimitMap.set(reporter.id, timestamps)

    const body = await request.json()
    title = body.title || ''
    content = body.content || ''

    if (!title && !content) {
      return NextResponse.json({ error: 'Title or Content is required' }, { status: 400 })
    }

    const aiResult = await generateGeminiNewsRewrite(title, content)

    if (!aiResult) {
      // Fallback formatting if GEMINI_API_KEY is not configured
      const formattedTitle = (title || '').trim()
      const formattedDesc = (content || title || '').trim()
      return NextResponse.json({
        enhancedTitle: formattedTitle,
        enhancedDesc: formattedDesc,
        note: 'AI enhancement running in offline mode.'
      })
    }

    return NextResponse.json({
      enhancedTitle: aiResult.aiTitle,
      enhancedDesc: aiResult.aiContent || aiResult.aiShortDesc,
    })
  } catch (error) {
    console.error('ChatGPT AI enhance news error:', error)
    return NextResponse.json({
      enhancedTitle: title,
      enhancedDesc: content,
      error: 'AI enhancement temporarily unavailable.'
    })
  }
}
