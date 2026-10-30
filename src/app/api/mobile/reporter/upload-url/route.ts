import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken)
    if (!reporter || reporter.status !== 'active' || reporter.deletedAt) {
      return NextResponse.json({ error: 'Not an active reporter' }, { status: 403 })
    }

    const body = await request.json()
    const { filename, contentType, type } = body

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 })
    }

    const ext = filename.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg')
    const prefix = type === 'video' ? 'reporter-video' : 'reporter-media'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const key = `${prefix}-${timestamp}-${randomStr}.${ext}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    const publicUrl = `${R2_PUBLIC_URL}/${key}`

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl,
      key,
    })
  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}

