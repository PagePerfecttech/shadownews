import { db } from './db'

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
