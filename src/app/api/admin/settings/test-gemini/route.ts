import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { testGeminiConnection } from '@/lib/gemini-service'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let apiKey: string | undefined
    try {
      const body = await request.json()
      apiKey = body?.apiKey?.trim()
    } catch {
      // Body might be empty, will fallback to db/env key
    }

    const result = await testGeminiConnection(apiKey)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in test-gemini route:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Unexpected server error while testing Gemini connection.',
      },
      { status: 500 }
    )
  }
}

