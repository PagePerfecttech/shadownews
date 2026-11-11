import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loginSchema } from '@/lib/schemas'
import { authLimiter } from '@/lib/ratelimit'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting
    const rateLimitResult = await authLimiter(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // SECURITY: Input validation
    let data
    try {
      data = loginSchema.parse(await request.json())
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Invalid email or password format', details: validationError },
        { status: 400 }
      )
    }

    const { email, password } = data

    const admin = await db.admin.findUnique({
      where: { email, isActive: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify hashed password using bcrypt
    let passwordMatch = false
    if (admin.passwordHash.startsWith('$2a$') || admin.passwordHash.startsWith('$2b$')) {
      passwordMatch = await bcrypt.compare(password, admin.passwordHash)
    } else {
      // SECURITY: Reject plaintext passwords - all admins must use bcrypt
      console.warn(`Login attempt with non-bcrypt password for admin: ${admin.email}`)
      passwordMatch = false
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const secret = new TextEncoder().encode(jwtSecret)
    const token = await new SignJWT({ adminId: admin.id, email: admin.email, role: admin.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    return NextResponse.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatar,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
