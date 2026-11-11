import { z } from 'zod'

// ============================================
// Authentication Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
})

export const phoneAuthSchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/, 'Invalid phone number'),
})

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/, 'Invalid phone number'),
  otp: z.string().regex(/^\d{4,6}$/, 'Invalid OTP format'),
})

export const firebaseTokenSchema = z.object({
  idToken: z.string().min(1, 'ID token required'),
})

// ============================================
// News Schemas
// ============================================

export const newsCreateSchema = z.object({
  title: z.string().min(5, 'Title too short').max(200, 'Title too long'),
  shortDesc: z.string().max(500, 'Short description too long').optional().nullable(),
  content: z.string().min(10, 'Content too short').max(50000, 'Content too long'),
  categoryId: z.string().cuid('Invalid category ID'),
  stateId: z.string().cuid('Invalid state ID'),
  districtId: z.string().cuid('Invalid district ID').optional().nullable(),
  mandalId: z.string().cuid('Invalid mandal ID').optional().nullable(),
  thumbnailUrl: z.string().url('Invalid thumbnail URL'),
  imagesUrls: z.array(z.string().url()).optional().default([]),
  videoUrl: z.string().url().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high', 'breaking']).default('normal'),
  isFeatured: z.boolean().default(false),
  externalLink: z.string().url().optional().nullable(),
})

export const newsUpdateSchema = newsCreateSchema.partial()

export const newsListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'archived', 'scheduled']).optional(),
  categoryId: z.string().cuid().optional(),
  stateId: z.string().cuid().optional(),
  districtId: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20).transform(n => Math.min(n, 100)),
  offset: z.number().int().min(0).default(0),
  search: z.string().max(100).optional(),
})

// ============================================
// Reporter Schemas
// ============================================

export const reporterApplySchema = z.object({
  name: z.string().min(2, 'Name too short').max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10,13}$/, 'Invalid phone number'),
  stateId: z.string().cuid(),
  districtId: z.string().cuid(),
  beat: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  idProofUrl: z.string().url().optional(),
})

export const reporterUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  upiId: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(20).optional(),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional(),
  bankAccountName: z.string().max(100).optional(),
})

// ============================================
// User Schemas
// ============================================

export const userSyncSchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/, 'Invalid phone number'),
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
  preferredLanguage: z.enum(['te', 'en', 'hi']).default('te'),
  preferredCategories: z.array(z.string().cuid()).optional(),
  stateId: z.string().cuid().optional(),
  districtId: z.string().cuid().optional(),
})

export const userPreferencesSchema = z.object({
  preferredLanguage: z.enum(['te', 'en', 'hi']).optional(),
  preferredCategories: z.array(z.string().cuid()).optional(),
  notificationsEnabled: z.boolean().optional(),
  notifyBreaking: z.boolean().optional(),
  notifyLocation: z.boolean().optional(),
})

// ============================================
// Location Schemas
// ============================================

export const stateSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().regex(/^[A-Z]{2,3}$/, 'Invalid state code').length(2),
  isActive: z.boolean().default(true),
})

export const districtSchema = z.object({
  name: z.string().min(2).max(100),
  stateId: z.string().cuid(),
  isActive: z.boolean().default(true),
})

export const mandalSchema = z.object({
  name: z.string().min(2).max(100),
  districtId: z.string().cuid(),
  assemblyId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
})

// ============================================
// Common Schemas
// ============================================

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).transform(n => Math.min(n, 100)),
  offset: z.number().int().min(0).default(0),
})

export const searchSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(100).default(20),
})

export const idSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
})

export const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const phoneSchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/, 'Invalid phone number'),
})

// ============================================
// Media Schemas
// ============================================

export const mediaUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().regex(/^(image|video)\//),
  size: z.number().max(104857600), // 100MB limit
  alt: z.string().max(255).optional(),
})

// ============================================
// Admin Schemas
// ============================================

export const adminSettingsSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().max(500).optional(),
})

// Export all types for use in endpoints
export type LoginInput = z.infer<typeof loginSchema>
export type NewsCreate = z.infer<typeof newsCreateSchema>
export type NewsUpdate = z.infer<typeof newsUpdateSchema>
export type ReporterApply = z.infer<typeof reporterApplySchema>
export type UserSync = z.infer<typeof userSyncSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
