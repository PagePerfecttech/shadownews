import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { z } from 'zod'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getPhoneVariants } from '@/lib/reporter-utils'

const applyReporterSchema = z.object({
  name: z.string().max(100).optional().nullable(),
  phone: z.string().min(8).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  bio: z.string().max(500).optional().nullable().or(z.literal('')),
  stateId: z.string().min(1, 'State ID is required'),
  districtId: z.string().min(1, 'District ID is required'),
  mandalId: z.string().optional().nullable().or(z.literal('')),
  beat: z.string().max(100).optional().nullable().or(z.literal('')),
  idProofUrl: z.string().min(1, 'ID Proof is required'),
  avatar: z.string().optional().nullable().or(z.literal('')),
})

async function uploadBase64Image(base64Str: string, prefix: string): Promise<string> {
  if (!base64Str) return ''
  if (!base64Str.startsWith('data:image/')) return base64Str

  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data')
  }

  const rawExt = matches[1].toLowerCase()
  const extension = rawExt === 'jpeg' ? 'jpg' : rawExt
  const buffer = Buffer.from(matches[2], 'base64')

  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const filename = `${prefix}-${timestamp}-${randomStr}.${extension}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: `image/${rawExt}`,
    })
  )

  return `${R2_PUBLIC_URL}/${filename}`
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate input with flexible schema
    const parsed = applyReporterSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const validatedData = parsed.data

    // Sanitize empty strings
    const cleanEmail = validatedData.email?.trim() || null
    const cleanBio = validatedData.bio?.trim() || null
    const cleanMandalId = validatedData.mandalId?.trim() || null
    const cleanBeat = validatedData.beat?.trim() || 'general'
    const candidateName = validatedData.name?.trim() || (decodedToken as any).name || null

    // Determine phone number: from token, input, or user record
    let rawPhone = decodedToken.phone_number || validatedData.phone || null
    if (!rawPhone && decodedToken.uid) {
      const user = await db.user.findFirst({
        where: { id: decodedToken.uid },
        select: { phone: true, email: true },
      })
      if (user?.phone) rawPhone = user.phone
    }

    if (!rawPhone) {
      rawPhone = decodedToken.email ? `email_${decodedToken.email}` : decodedToken.uid
    }

    if (!rawPhone) {
      return NextResponse.json({ error: 'ఫోన్ నంబర్ తప్పనిసరి (Missing phone number)' }, { status: 400 })
    }

    const phoneVariants = getPhoneVariants(rawPhone)
    const phone = phoneVariants.find(p => p.startsWith('+91')) || rawPhone

    // Check if already registered or previously applied
    const existingReporter = await db.reporter.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
    })

    // Upload images to R2
    const finalIdProofUrl = await uploadBase64Image(validatedData.idProofUrl, 'idproof')
    let finalAvatarUrl: string | null = null
    if (validatedData.avatar && validatedData.avatar.trim()) {
      finalAvatarUrl = await uploadBase64Image(validatedData.avatar, 'avatar')
    }

    let reporter
    if (existingReporter) {
      if (existingReporter.deletedAt) {
        // Restore soft-deleted reporter and re-submit as pending
        reporter = await db.reporter.update({
          where: { id: existingReporter.id },
          data: {
            name: candidateName || existingReporter.name,
            email: cleanEmail || existingReporter.email,
            bio: cleanBio || existingReporter.bio,
            stateId: validatedData.stateId,
            districtId: validatedData.districtId,
            mandalId: cleanMandalId,
            beat: cleanBeat,
            idProofUrl: finalIdProofUrl || existingReporter.idProofUrl,
            avatar: finalAvatarUrl || existingReporter.avatar,
            status: 'pending',
            deletedAt: null,
          },
        })
        return NextResponse.json({
          message: 'మీ దరఖాస్తు విజయవంతంగా సమర్పించబడింది (Application re-submitted successfully)',
          reporter,
        })
      }

      if (existingReporter.status === 'active') {
        return NextResponse.json({
          message: 'మీరు ఇప్పటికే ధృవీకరించబడిన రిపోర్టర్‌గా ఉన్నారు (Already registered as an active reporter)',
          reporter: existingReporter,
        })
      }

      // If pending or rejected, update their submission
      reporter = await db.reporter.update({
        where: { id: existingReporter.id },
        data: {
          name: candidateName || existingReporter.name,
          email: cleanEmail || existingReporter.email,
          bio: cleanBio || existingReporter.bio,
          stateId: validatedData.stateId,
          districtId: validatedData.districtId,
          mandalId: cleanMandalId,
          beat: cleanBeat,
          idProofUrl: finalIdProofUrl || existingReporter.idProofUrl,
          avatar: finalAvatarUrl || existingReporter.avatar,
          status: 'pending',
        },
      })
      return NextResponse.json({
        message: 'మీ దరఖాస్తు నవీకరించబడింది (Application updated and pending review)',
        reporter,
      })
    }

    // Create new pending reporter
    reporter = await db.reporter.create({
      data: {
        name: candidateName || phone,
        phone,
        email: cleanEmail,
        bio: cleanBio,
        stateId: validatedData.stateId,
        districtId: validatedData.districtId,
        mandalId: cleanMandalId,
        beat: cleanBeat,
        idProofUrl: finalIdProofUrl,
        avatar: finalAvatarUrl,
        status: 'pending',
        role: 'junior',
        postingScope: 'mandal',
      },
    })

    return NextResponse.json({
      message: 'మీ దరఖాస్తు విజయవంతంగా సమర్పించబడింది (Application submitted successfully)',
      reporter,
    })
  } catch (error: any) {
    console.error('Reporter apply error:', error)
    return NextResponse.json({
      error: error?.message || 'సర్వర్ ఎర్రర్: దరఖాస్తు సమర్పించడంలో లోపం ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
    }, { status: 500 })
  }
}
