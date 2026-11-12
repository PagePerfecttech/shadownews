import { z } from 'zod'

/**
 * Environment variable validation schema
 * Ensures all critical environment variables are present and valid
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid DATABASE_URL'),
  DIRECT_URL: z.string().url('Invalid DIRECT_URL'),

  // R2 Storage
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY required'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET required'),
  R2_PUBLIC_URL: z.string().url('Invalid R2_PUBLIC_URL'),
  R2_ENDPOINT: z.string().url('Invalid R2_ENDPOINT'),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

  // Admin
  ADMIN_EMAIL: z.string().email('Invalid ADMIN_EMAIL'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid NEXT_PUBLIC_APP_URL').optional(),
  NEXT_PUBLIC_API_URL: z.string().url('Invalid NEXT_PUBLIC_API_URL').optional(),

  // Optional: External services
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  TRUECALLER_CLIENT_ID: z.string().optional(),
  FIREBASE_ADMIN_SDK_KEY: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_REST_API_KEY: z.string().optional(),
})

/**
 * Validate and parse environment variables
 * Throws an error if validation fails
 */
export function validateEnv() {
  const env = envSchema.safeParse(process.env)

  if (!env.success) {
    const missingVars = Object.entries(env.error.flatten().fieldErrors)
      .map(([key, errors]) => `${key}: ${errors?.[0]}`)
      .join('\n  ')

    throw new Error(`Environment validation failed:\n  ${missingVars}`)
  }

  return env.data
}

/**
 * Parse environment variables
 * Call this at application startup
 */
let parsedEnv: z.infer<typeof envSchema> | null = null

export function getEnv() {
  if (!parsedEnv) {
    parsedEnv = validateEnv()
  }
  return parsedEnv
}

// Export typed environment variables
export const env = process.env as z.infer<typeof envSchema>
