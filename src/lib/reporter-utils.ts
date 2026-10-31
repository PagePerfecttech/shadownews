import { db } from '@/lib/db'

export interface DecodedAuthToken {
  phone_number?: string
  email?: string
  uid?: string
}

/**
 * Normalizes phone numbers into all common variants (+91, 91, 10-digit)
 */
export function getPhoneVariants(phone?: string | null): string[] {
  if (!phone) return []
  const raw = phone.trim()
  const variants = new Set<string>([raw])
  
  const digitsOnly = raw.replace(/\D/g, '')
  if (digitsOnly.length === 10) {
    variants.add(digitsOnly)
    variants.add(`+91${digitsOnly}`)
    variants.add(`91${digitsOnly}`)
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const tenDigits = digitsOnly.substring(2)
    variants.add(tenDigits)
    variants.add(`+91${tenDigits}`)
    variants.add(digitsOnly)
  }
  
  return Array.from(variants)
}

/**
 * Searches for an active, non-deleted reporter matching phone variants or email.
 */
export async function findReporterFromToken(
  decodedToken: DecodedAuthToken,
  options?: { include?: any }
) {
  const phoneVariants = getPhoneVariants(decodedToken.phone_number)
  const email = decodedToken.email?.trim()

  const conditions: any[] = []

  if (phoneVariants.length > 0) {
    conditions.push({ phone: { in: phoneVariants } })
  }

  if (email) {
    conditions.push({ email: { equals: email, mode: 'insensitive' } })
  }

  if (conditions.length === 0) return null

  return db.reporter.findFirst({
    where: {
      OR: conditions,
      deletedAt: null,
    },
    include: options?.include,
  })
}

export interface ScopeCheckResult {
  allowed: boolean
  error?: string
  scope: 'mandal' | 'district' | 'state'
}

/**
 * Validates reporter posting scope:
 * - 'mandal': reporter can only post for their own mandal (or explicitly allowed mandals)
 * - 'district': reporter can post for any mandal in their district, or district-wide
 * - 'state': reporter can post for any district/mandal in their state, or state-wide
 * Admin can also provide explicit override in allowedDistrictIds / allowedMandalIds.
 */
export function checkReporterPostingScope(
  reporter: {
    id: string
    stateId: string
    districtId: string
    mandalId?: string | null
    role?: string
    postingScope?: string | null
    allowedDistrictIds?: string | null
    allowedMandalIds?: string | null
  },
  postTarget: {
    stateId: string
    districtId?: string | null
    mandalId?: string | null
  }
): ScopeCheckResult {
  // Determine effective scope: explicit postingScope or inferred from role
  let scope = (reporter.postingScope || '').toLowerCase()
  if (!['mandal', 'district', 'state'].includes(scope)) {
    const role = (reporter.role || '').toLowerCase()
    if (role.includes('state') || role.includes('chief') || role.includes('admin')) {
      scope = 'state'
    } else if (role.includes('district') || role.includes('senior') || role.includes('mandal_head')) {
      scope = 'district'
    } else {
      scope = 'mandal'
    }
  }

  // Parse custom overrides
  let customDistricts: string[] = []
  let customMandals: string[] = []
  try {
    if (reporter.allowedDistrictIds) customDistricts = JSON.parse(reporter.allowedDistrictIds)
    if (reporter.allowedMandalIds) customMandals = JSON.parse(reporter.allowedMandalIds)
  } catch {}

  // 1. Check State Match
  if (postTarget.stateId && postTarget.stateId !== reporter.stateId) {
    if (!customDistricts.includes(postTarget.districtId || '') && !customMandals.includes(postTarget.mandalId || '')) {
      return {
        allowed: false,
        scope: scope as any,
        error: 'మీకు కేటాయించిన రాష్ట్రం పరిధిలోనే వార్తలు పోస్ట్ చేయగలరు (You can only post news within your assigned state).',
      }
    }
  }

  // 2. State-level scope: can post state-wide, district-wide, or any mandal in state
  if (scope === 'state') {
    return { allowed: true, scope: 'state' }
  }

  // 3. District-level scope:
  if (scope === 'district') {
    if (!postTarget.districtId) {
      return {
        allowed: false,
        scope: 'district',
        error: 'జిల్లా స్థాయి రిపోర్టర్లు తప్పనిసరిగా జిల్లాను ఎంచుకోవాలి (District-level reporters must select a district).',
      }
    }

    if (postTarget.districtId !== reporter.districtId && !customDistricts.includes(postTarget.districtId)) {
      return {
        allowed: false,
        scope: 'district',
        error: 'మీకు కేటాయించిన జిల్లా లేదా అనుమతించిన జిల్లాల పరిధిలోనే పోస్ట్ చేయగలరు (You can only post within your assigned district).',
      }
    }

    return { allowed: true, scope: 'district' }
  }

  // 4. Mandal-level scope:
  if (!postTarget.mandalId) {
    return {
      allowed: false,
      scope: 'mandal',
      error: 'మండల స్థాయి రిపోర్టర్లు తప్పనిసరిగా తమ మండలాన్ని ఎంచుకోవాలి (Mandal-level reporters must select their assigned mandal).',
    }
  }

  if (postTarget.mandalId !== reporter.mandalId && !customMandals.includes(postTarget.mandalId)) {
    return {
      allowed: false,
      scope: 'mandal',
      error: 'మీకు కేటాయించిన మండలం పరిధిలోనే వార్తలు పోస్ట్ చేయగలరు (You can only post within your assigned mandal).',
    }
  }

  return { allowed: true, scope: 'mandal' }
}

