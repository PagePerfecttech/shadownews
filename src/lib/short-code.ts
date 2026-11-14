import { db } from './db'

const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ' // Base56, excludes ambiguous 0, O, 1, l, I

/**
 * Generate a random 4-character alphanumeric short code
 */
export function generateRandomShortCode(length: number = 4): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
  }
  return result
}

/**
 * Generate a guaranteed unique 4-character short code for a news item
 */
export async function getUniqueShortCode(length: number = 4): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateRandomShortCode(length)
    const existing = await db.news.findUnique({
      where: { shortCode: code },
      select: { id: true },
    })
    if (!existing) {
      return code
    }
  }
  // Fallback to 5 chars if 4-char space ever collides heavily
  return generateRandomShortCode(5)
}
