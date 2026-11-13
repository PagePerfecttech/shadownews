import { db } from '@/lib/db'
import { getPhoneVariants } from '@/lib/reporter-utils'

export async function getOrCreateUserFromToken(decodedToken: any) {
  const phoneSet = new Set<string>()
  const rawPhone = decodedToken.phone_number || (decodedToken.email ? `email_${decodedToken.email}` : decodedToken.uid)

  if (decodedToken.phone_number) {
    getPhoneVariants(decodedToken.phone_number).forEach(p => phoneSet.add(p))
  } else if (rawPhone) {
    phoneSet.add(rawPhone)
  }

  const userConditions: any[] = []
  if (decodedToken.uid) {
    userConditions.push({ id: decodedToken.uid })
  }
  if (phoneSet.size > 0) {
    userConditions.push({ phone: { in: Array.from(phoneSet) } })
  }
  if (decodedToken.email?.trim()) {
    userConditions.push({ email: { equals: decodedToken.email.trim(), mode: 'insensitive' } })
  }

  let user = await db.user.findFirst({
    where: {
      OR: userConditions,
      deletedAt: null,
    },
  })

  if (!user) {
    const digitsOnly = (decodedToken.phone_number || '').replace(/\D/g, '')
    const formattedPhone = (digitsOnly.length === 10) ? `+91${digitsOnly}` : rawPhone

    try {
      user = await db.user.create({
        data: {
          phone: formattedPhone,
          email: decodedToken.email || null,
          name: decodedToken.name || null,
          avatar: decodedToken.picture || null,
          lastActiveAt: new Date(),
        },
      })
    } catch {
      // In case of parallel race condition
      user = await db.user.findFirst({
        where: {
          OR: userConditions,
        },
      })
    }
  }

  return user
}
