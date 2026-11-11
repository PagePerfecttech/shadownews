import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting (simple implementation)
// For production, use Redis with Upstash or similar
interface RateLimitStore {
  [key: string]: { count: number; resetTime: number }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Max requests within interval
  keyGenerator?: (request: NextRequest) => string
}

/**
 * Simple rate limiter middleware
 * For production, use Upstash Redis for distributed rate limiting
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { interval, maxRequests, keyGenerator } = config

  return async (request: NextRequest) => {
    const key = keyGenerator
      ? keyGenerator(request)
      : request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const now = Date.now()
    const record = store[key]

    // Clean up expired records
    if (record && record.resetTime < now) {
      delete store[key]
    }

    // Initialize or update record
    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + interval }
    } else if (store[key].count < maxRequests) {
      store[key].count++
    } else {
      // Rate limit exceeded
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)) } }
      )
    }

    return null // Continue to next handler
  }
}

// ============================================
// Pre-configured rate limiters
// ============================================

export const authLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
})

export const otpLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 OTP requests per minute per IP
})

export const apiLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
})

export const newsUploadLimiter = createRateLimiter({
  interval: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
})

export const searchLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 searches per minute
})

/**
 * Helper to apply rate limiter middleware
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: (req: NextRequest) => Promise<NextResponse | null>
) {
  const result = await limiter(request)
  if (result) {
    return result // Rate limited
  }
  return null // Continue
}

// ============================================
// For production: Upstash Redis rate limiter
// ============================================

/*
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export const productionAuthLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
})

export const productionOtpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
})
*/
