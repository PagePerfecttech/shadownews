import { db } from './db'
import { jwtVerify } from 'jose'

export type AdminRole = 'admin' | 'editor' | 'moderator' | 'viewer'

/**
 * Role-based access control permissions
 * Define what actions each role can perform
 */
export const rolePermissions: Record<AdminRole, string[]> = {
  admin: [
    'news:create',
    'news:edit',
    'news:delete',
    'news:publish',
    'news:approve',
    'reporters:manage',
    'users:manage',
    'admin:manage',
    'settings:update',
    'audit:view',
  ],
  editor: [
    'news:create',
    'news:edit',
    'news:delete',
    'news:publish',
    'reporters:view',
    'audit:view',
  ],
  moderator: [
    'news:view',
    'news:approve',
    'reports:resolve',
    'audit:view',
  ],
  viewer: [
    'news:view',
    'reports:view',
  ],
}

/**
 * Verify admin role and check if they have permission
 */
export async function requireRole(adminId: string, requiredRoles: AdminRole[]) {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
  })

  if (!admin) {
    throw new Error('Admin not found')
  }

  if (!admin.isActive) {
    throw new Error('Admin account is inactive')
  }

  const adminRole = admin.role as AdminRole
  if (!requiredRoles.includes(adminRole)) {
    throw new Error(`Insufficient permissions. Required roles: ${requiredRoles.join(', ')}, got: ${adminRole}`)
  }

  return admin
}

/**
 * Check if admin has specific permission
 */
export async function requirePermission(adminId: string, permission: string) {
  const admin = await db.admin.findUnique({
    where: { id: adminId },
  })

  if (!admin || !admin.isActive) {
    throw new Error('Admin not found or inactive')
  }

  const adminRole = admin.role as AdminRole
  const permissions = rolePermissions[adminRole] || []

  if (!permissions.includes(permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }

  return admin
}

/**
 * Verify JWT token and extract admin info
 */
export async function verifyAdminToken(token: string) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET not configured')
  }

  try {
    const secret_ = new TextEncoder().encode(secret)
    const verified = await jwtVerify(token, secret_)
    return verified.payload as { adminId: string; email: string; role: string }
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Extract and verify admin from request header
 */
export async function extractAdminFromHeader(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const payload = await verifyAdminToken(token)

  return payload
}
