import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const gpsSchema = z.object({
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  ipFallback: z.boolean().optional(),
})

function cleanName(str: string): string {
  if (!str) return ''
  return str
    .replace(/[\u2010-\u2015\u2212]/g, '-') // Normalize all unicode dashes/en-dashes to standard hyphen
    .replace(/district/gi, '')
    .replace(/mandal/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    let body = {}
    try {
      body = await request.json()
    } catch (_) {}

    const parsed = gpsSchema.safeParse(body)
    const latitude = parsed.success ? parsed.data.latitude : null
    const longitude = parsed.success ? parsed.data.longitude : null
    const ipFallback = parsed.success ? parsed.data.ipFallback : false

    let stateName = ''
    let districtName = ''
    let mandalName = ''
    let villageName = ''

    const hasGps = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude) && (latitude !== 0 || longitude !== 0)

    // 1. Try Google Maps Geocoding if key is present
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (hasGps && apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        const res = await fetch(url)
        const data = await res.json()
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          for (const result of data.results) {
            const components = result.address_components || []
            for (const comp of components) {
              if (comp.types.includes('administrative_area_level_1') && !stateName) {
                stateName = comp.long_name
              }
              if (comp.types.includes('administrative_area_level_2') && !districtName) {
                districtName = comp.long_name
              }
              if (
                (comp.types.includes('locality') ||
                 comp.types.includes('administrative_area_level_3') ||
                 comp.types.includes('sublocality_level_1')) &&
                !mandalName
              ) {
                mandalName = comp.long_name
              }
              if (comp.types.includes('sublocality') && !villageName) {
                villageName = comp.long_name
              }
            }
          }
        }
      } catch (e) {
        console.error('Google Geocoding API fetch error:', e)
      }
    }

    // 2. OpenStreetMap Nominatim Geocoding if GPS provided and components missing
    if (hasGps && (!stateName || !districtName || !mandalName)) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'ShadowNewsServer/1.0 (contact@shadownews.in)' }
        })
        const data = await res.json()
        if (data && data.address) {
          const addr = data.address
          if (!stateName) stateName = addr.state || addr.region || ''
          // In India Nominatim:
          // addr.state_district is usually the district (e.g. 'Medchal–Malkajgiri', 'NTR District')
          // addr.county is usually the mandal (e.g. 'Kukatpally mandal', 'Vijayawada Urban Mandal')
          if (!districtName) {
            districtName = addr.state_district || addr.district || addr.city || ''
          }
          if (!mandalName) {
            mandalName = addr.county || addr.town || addr.city_district || addr.suburb || addr.municipality || ''
          }
          if (!villageName) {
            villageName = addr.suburb || addr.village || addr.neighbourhood || addr.residential || ''
          }
        }
      } catch (e) {
        console.error('OSM Geocoding API fetch error:', e)
      }
    }

    // 3. IP Geolocation Fallback if GPS was missing/failed or ipFallback requested
    if ((!stateName || !districtName) && (ipFallback || !hasGps)) {
      try {
        const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
        const ip = forwarded ? forwarded.split(',')[0].trim() : ''
        const ipUrl = ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')
          ? `http://ip-api.com/json/${ip}`
          : 'http://ip-api.com/json'
        
        const ipRes = await fetch(ipUrl, { signal: AbortSignal.timeout(4000) })
        const ipData = await ipRes.json()
        if (ipData && ipData.status === 'success') {
          if (!stateName) stateName = ipData.regionName || ''
          if (!districtName) districtName = ipData.city || ''
        }
      } catch (e) {
        console.error('IP Geolocation fallback error:', e)
      }
    }

    // Cleaned strings
    const rawDistrict = cleanName(districtName)
    const rawMandal = cleanName(mandalName)
    const rawState = cleanName(stateName)

    // Resolve State: Match Telangana (TG) or Andhra Pradesh (AP)
    let stateObj = null
    if (rawState) {
      stateObj = await db.state.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: rawState, mode: 'insensitive' } },
            { code: { equals: rawState, mode: 'insensitive' } },
          ]
        }
      })
    }

    // Default to Telangana if not explicitly AP
    if (!stateObj) {
      if (/andhra/i.test(stateName) || /AP/i.test(stateName)) {
        stateObj = await db.state.findUnique({ where: { code: 'AP' } })
      } else {
        stateObj = await db.state.findUnique({ where: { code: 'TG' } })
      }
    }

    if (!stateObj) {
      stateObj = await db.state.findFirst({ where: { isActive: true, deletedAt: null } })
    }

    if (!stateObj) {
      return NextResponse.json({ error: 'No state records found in database' }, { status: 404 })
    }

    // Resolve District within the matched State
    let districtObj = null
    if (rawDistrict && stateObj) {
      // 1. Direct contains or equals
      districtObj = await db.district.findFirst({
        where: {
          stateId: stateObj.id,
          isActive: true,
          deletedAt: null,
          name: { contains: rawDistrict, mode: 'insensitive' }
        }
      })

      // 2. Try matching without hyphens/spaces (e.g. Medchal-Malkajgiri vs Medchal Malkajgiri)
      if (!districtObj) {
        const simplified = rawDistrict.replace(/[-\s]/g, '')
        const allDistricts = await db.district.findMany({
          where: { stateId: stateObj.id, isActive: true, deletedAt: null }
        })
        districtObj = allDistricts.find(d => {
          const dSimp = d.name.replace(/[-\s]/g, '').toLowerCase()
          return dSimp.includes(simplified.toLowerCase()) || simplified.toLowerCase().includes(dSimp)
        }) || null
      }
    }

    // If district not resolved, try matching district by mandal name or city name
    if (!districtObj && rawMandal && stateObj) {
      districtObj = await db.district.findFirst({
        where: {
          stateId: stateObj.id,
          isActive: true,
          deletedAt: null,
          name: { contains: rawMandal, mode: 'insensitive' }
        }
      })
    }

    // Fallback District: Capital / Major district (Hyderabad for TG, NTR for AP)
    if (!districtObj && stateObj) {
      const defaultDistName = stateObj.code === 'AP' ? 'NTR' : 'Hyderabad'
      districtObj = await db.district.findFirst({
        where: {
          stateId: stateObj.id,
          name: { contains: defaultDistName, mode: 'insensitive' },
          isActive: true,
          deletedAt: null
        }
      })
      if (!districtObj) {
        districtObj = await db.district.findFirst({
          where: { stateId: stateObj.id, isActive: true, deletedAt: null }
        })
      }
    }

    if (!districtObj) {
      return NextResponse.json({ error: 'No district records found in database' }, { status: 404 })
    }

    // Resolve Mandal within the matched District
    let matchedMandal = null
    if (rawMandal) {
      // 1. Try exact or contains in matched district
      matchedMandal = await db.mandal.findFirst({
        where: {
          districtId: districtObj.id,
          isActive: true,
          deletedAt: null,
          name: { contains: rawMandal, mode: 'insensitive' }
        },
        include: {
          assembly: true,
          villages: { where: { isActive: true, deletedAt: null } }
        }
      })

      // 2. Try reverse contains (e.g. "Vijayawada Urban" containing "Vijayawada")
      if (!matchedMandal) {
        const districtMandals = await db.mandal.findMany({
          where: { districtId: districtObj.id, isActive: true, deletedAt: null },
          include: {
            assembly: true,
            villages: { where: { isActive: true, deletedAt: null } }
          }
        })
        const cleanTarget = rawMandal.toLowerCase()
        matchedMandal = districtMandals.find(m => {
          const mLower = m.name.toLowerCase()
          return cleanTarget.includes(mLower) || mLower.includes(cleanTarget)
        }) || null
      }
    }

    // If mandal not matched by rawMandal, try matching by villageName/suburb
    if (!matchedMandal && villageName) {
      const cleanVillage = cleanName(villageName).toLowerCase()
      const districtMandals = await db.mandal.findMany({
        where: { districtId: districtObj.id, isActive: true, deletedAt: null },
        include: {
          assembly: true,
          villages: { where: { isActive: true, deletedAt: null } }
        }
      })
      matchedMandal = districtMandals.find(m => {
        const mLower = m.name.toLowerCase()
        return cleanVillage.includes(mLower) || mLower.includes(cleanVillage)
      }) || null
    }

    // Fallback Mandal: First mandal in matched district or matching district name
    if (!matchedMandal) {
      matchedMandal = await db.mandal.findFirst({
        where: {
          districtId: districtObj.id,
          name: { contains: districtObj.name, mode: 'insensitive' },
          isActive: true,
          deletedAt: null
        },
        include: {
          assembly: true,
          villages: { where: { isActive: true, deletedAt: null } }
        }
      })

      if (!matchedMandal) {
        matchedMandal = await db.mandal.findFirst({
          where: { districtId: districtObj.id, isActive: true, deletedAt: null },
          include: {
            assembly: true,
            villages: { where: { isActive: true, deletedAt: null } }
          }
        })
      }
    }

    if (!matchedMandal) {
      return NextResponse.json({ error: 'No mandal found for district' }, { status: 404 })
    }

    // Resolve Assembly: use mandal's assembly or first assembly in district
    let assemblyObj = matchedMandal.assembly
    if (!assemblyObj) {
      assemblyObj = await db.assembly.findFirst({
        where: { districtId: districtObj.id, isActive: true, deletedAt: null }
      })
    }

    // Resolve Village: check if villageName matches any village in this mandal
    let villageObj = null
    const villages = matchedMandal.villages || []
    if (villageName && villages.length > 0) {
      const cleanV = cleanName(villageName).toLowerCase()
      villageObj = villages.find(v => v.name.toLowerCase().includes(cleanV) || cleanV.includes(v.name.toLowerCase())) || null
    }
    if (!villageObj && villages.length > 0) {
      villageObj = villages[0]
    }

    return NextResponse.json({
      success: true,
      state: {
        id: stateObj.id,
        name: stateObj.name,
        code: stateObj.code,
      },
      district: {
        id: districtObj.id,
        name: districtObj.name,
      },
      assembly: assemblyObj ? {
        id: assemblyObj.id,
        name: assemblyObj.name,
      } : null,
      mandal: {
        id: matchedMandal.id,
        name: matchedMandal.name,
      },
      village: villageObj ? {
        id: villageObj.id,
        name: villageObj.name,
      } : null,
    })
  } catch (error) {
    console.error('GPS matching error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
