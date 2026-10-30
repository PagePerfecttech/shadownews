import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedImageTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    ]
    const allowedVideoTypes = [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-matroska',
      'video/mpeg', 'video/avi', 'video/x-msvideo', 'video/ogg',
    ]
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.mp4', '.webm', '.mov', '.3gp', '.mkv', '.avi', '.ogg'
    ]

    const fileExt = path.extname(file.name).toLowerCase()
    const isImage = allowedImageTypes.includes(file.type) || file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(fileExt)
    const isVideo = allowedVideoTypes.includes(file.type) || file.type.startsWith('video/') || ['.mp4', '.webm', '.mov', '.3gp', '.mkv', '.avi', '.ogg'].includes(fileExt)

    if (!isImage && !isVideo) {
      return NextResponse.json({
        error: `File type '${file.type || fileExt}' is not allowed. Supported: images and videos (.mp4, .mov, .webm, .3gp)`
      }, { status: 400 })
    }

    // Validate file size: 100MB for video, 25MB for image
    const maxSizeBytes = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024
    const maxLimitLabel = isVideo ? '100MB' : '25MB'
    if (file.size > maxSizeBytes) {
      return NextResponse.json({
        error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed for ${isVideo ? 'video' : 'images'} is ${maxLimitLabel}.`
      }, { status: 400 })
    }

    // Generate unique filename
    const ext = fileExt || (isImage ? '.jpg' : '.mp4')
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${randomStr}${ext}`

    // Upload to Cloudflare R2
    const buffer = Buffer.from(await file.arrayBuffer())
    const effectiveContentType = file.type && file.type !== 'application/octet-stream'
      ? file.type
      : (isVideo ? 'video/mp4' : 'image/jpeg')

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: effectiveContentType,
      })
    )

    // Generate URLs
    const originalUrl = `${R2_PUBLIC_URL}/${filename}`
    const thumbnailUrl = isImage ? originalUrl : null

    // Save to media library in database
    const media = await db.media.create({
      data: {
        filename: file.name,
        originalUrl,
        thumbnailUrl,
        mimeType: effectiveContentType,
        size: file.size,
        alt: file.name,
        uploadedBy: formData.get('uploadedBy') as string || null,
      },
    })

    await logAudit({
      adminId: admin.id,
      action: 'upload',
      entity: 'media',
      entityId: media.id,
      ipAddress: getClientIp(request),
      changes: { filename: file.name, mimeType: file.type, size: file.size, originalUrl },
    })
    return NextResponse.json({
      id: media.id,
      url: originalUrl,
      thumbnailUrl,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    }, { status: 201 })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
