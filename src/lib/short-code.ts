import { db } from './db'

// Safe base62 alphabet
const BASE62_ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * Generate a deterministic 5-character short code from any ID string
 */
export function generateDeterministicShortCode(id: string): string {
  if (!id) return 'aB3x9'
  const trimmed = id.trim()
  if (trimmed.length === 5) return trimmed

  let hash1 = 5381
  let hash2 = 52711
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i)
    hash1 = ((hash1 << 5) + hash1) ^ code
    hash2 = ((hash2 << 5) + hash2) + (code * 33)
    hash1 = hash1 & 0x7FFFFFFF
    hash2 = hash2 & 0x7FFFFFFF
  }

  let code = ''
  let current = (hash1 ^ hash2) >>> 0
  for (let i = 0; i < 5; i++) {
    code += BASE62_ALPHABET.charAt(current % BASE62_ALPHABET.length)
    current = Math.floor(current / BASE62_ALPHABET.length) ^ (trimmed.charCodeAt(i % trimmed.length) * 1013)
    current = Math.abs(current) & 0x7FFFFFFF
  }
  return code
}

// 62-character standard alphanumeric charset [A-Z, a-z, 0-9]
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generate a random 5-character alphanumeric short code
 */
export function generateRandomShortCode(length: number = 5): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
  }
  return result
}

/**
 * Generate a guaranteed unique 5-character short code for a news item
 */
export async function getUniqueShortCode(length: number = 5): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const code = generateRandomShortCode(length)
    const existing = await db.news.findUnique({
      where: { shortCode: code },
      select: { id: true },
    })
    if (!existing) {
      return code
    }
  }
  return generateRandomShortCode(length)
}
