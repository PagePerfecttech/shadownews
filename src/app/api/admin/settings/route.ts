import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit, getClientIp } from '@/lib/audit'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const settings = await db.setting.findMany({ orderBy: { key: 'asc' } })
    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
      settingsMap[s.key] = s.value
    }
    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Settings get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAuth(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const data = await request.json()

    const updates = Object.entries(data).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        update: { value: value === null || value === undefined ? '' : String(value) },
        create: { key, value: value === null || value === undefined ? '' : String(value) },
      })
    )

    await Promise.all(updates)
    await logAudit({
      adminId: admin.id,
      action: 'settings_update',
      entity: 'settings',
      ipAddress: getClientIp(request),
      changes: data,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
