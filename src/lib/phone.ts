/**
 * Phone number normalization and validation utilities
 * Ensures consistent phone number formatting across the application
 */

const INDIA_COUNTRY_CODE = '91'

/**
 * Normalize phone number to 10-digit format or with country code
 * Supports formats like:
 * - 1234567890
 * - +911234567890
 * - 911234567890
 * - 01234567890
 */
export function normalizePhone(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required')
  }

  // Remove all non-numeric characters except leading +
  let cleaned = phone.replace(/^(\+)?[\D]/, '$1').replace(/[\D]/g, '')

  // Remove leading +91 or 91
  if (cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2)
  }

  // Remove leading 0 (common in India for landlines converted to mobile)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }

  // Should be 10 digits now
  if (cleaned.length !== 10) {
    throw new Error('Invalid phone number format. Expected 10 digits.')
  }

  // Return with country code
  return INDIA_COUNTRY_CODE + cleaned
}

/**
 * Format phone for display (human-readable)
 * Formats like: +91 9876543210
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone)
  const countryCode = normalized.substring(0, 2)
  const number = normalized.substring(2)
  return `+${countryCode} ${number.substring(0, 4)} ${number.substring(4, 7)} ${number.substring(7)}`
}

/**
 * Format phone for internal storage (just digits with country code)
 * Format: 919876543210
 */
export function formatPhoneForStorage(phone: string): string {
  return normalizePhone(phone)
}

/**
 * Validate phone number without throwing error
 */
export function isValidPhone(phone: string): boolean {
  try {
    normalizePhone(phone)
    return true
  } catch {
    return false
  }
}

/**
 * Get phone variants for matching
 * Useful for finding users by any phone format they might have used
 */
export function getPhoneVariants(phone: string): string[] {
  try {
    const normalized = normalizePhone(phone)
    const cleaned = normalized.substring(2) // Remove country code

    return [
      normalized, // 919876543210
      '+' + normalized, // +919876543210
      '+91 ' + cleaned.substring(0, 4) + ' ' + cleaned.substring(4), // +91 9876 543210
      cleaned, // 9876543210
      '0' + cleaned, // 09876543210
    ]
  } catch {
    return [phone]
  }
}
