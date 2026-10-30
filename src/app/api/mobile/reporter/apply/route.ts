import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { z } from 'zod'
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'

const applyReporterSchema = z.object({
  name: z.string().max(100).optional(),
  phone: z.string().min(8).optional().nullable(),
  email: z.string().email().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  stateId: z.string().cuid('Invalid state ID'),
  districtId: z.string().cuid('Invalid district ID'),
  mandalId: z.string().cuid('Invalid mandal ID').optional().nullable(),
  beat: z.string().max(100).optional().nullable(),
  idProofUrl: z.string().url('Invalid ID proof URL').or(z.string().startsWith('data:image/')),
  avatar: z.string().url('Invalid avatar URL').or(z.string().startsWith('data:image/')).optional().nullable(),
})

async function uploadBase64Image(base64Str: string, prefix: string): Promise<string> {
  if (!base64Str.startsWith('data:image/')) return base64Str;

  const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const filename = `${prefix}-${timestamp}-${randomStr}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: `image/${matches[1]}`,
    })
  );

  return `${R2_PUBLIC_URL}/${filename}`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const data = await request.json()
    
    // Validate input
    const parsed = applyReporterSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const validatedData = parsed.data
    
    // Fallback phone number resolution logic (matches auth/sync)
    const rawPhone = decodedToken.phone_number || validatedData.phone || (decodedToken.email ? `email_${decodedToken.email}` : decodedToken.uid);

    if (!rawPhone) {
       return NextResponse.json({ error: 'Missing phone number' }, { status: 400 })
    }

    // Format phone to E.164 (+91XXXXXXXXXX) if 10-digit Indian number
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const phone = (digitsOnly.length === 10) ? `+91${digitsOnly}` : rawPhone;
    const phoneVariants = [rawPhone, phone, digitsOnly, `91${digitsOnly}`];

    // Check if already registered as a reporter
    let reporter = await db.reporter.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(validatedData.email ? [{ email: validatedData.email }] : [])
        ],
        deletedAt: null
      }
    });

    if (reporter) {
      return NextResponse.json({ message: 'Already registered as a reporter', reporter }, { status: 200 })
    }

    // Upload base64 images to R2
    const finalIdProofUrl = await uploadBase64Image(validatedData.idProofUrl, 'idproof');
    let finalAvatarUrl = validatedData.avatar || null;
    if (finalAvatarUrl) {
      finalAvatarUrl = await uploadBase64Image(finalAvatarUrl, 'avatar');
    }

    reporter = await db.reporter.create({
      data: {
        name: validatedData.name || phone,
        phone,
        email: validatedData.email || null,
        bio: validatedData.bio || null,
        stateId: validatedData.stateId,
        districtId: validatedData.districtId,
        mandalId: validatedData.mandalId || null,
        beat: validatedData.beat || null,
        idProofUrl: finalIdProofUrl,
        avatar: finalAvatarUrl,
        status: 'pending',
      }
    })

    return NextResponse.json({ message: 'Application submitted', reporter })
  } catch (error) {
    console.error('Reporter apply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
