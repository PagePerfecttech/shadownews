import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(authHeader);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    
    let bodyData: any = {}
    try {
      bodyData = await request.json()
    } catch {
      // Body may be empty on basic sync
    }

    const fcmToken = bodyData?.fcmToken || undefined
    const appVersion = bodyData?.appVersion || undefined
    const devicePlatform = bodyData?.devicePlatform || undefined
    const deviceModel = bodyData?.deviceModel || undefined

    const rawPhone = decodedToken.phone_number || (decodedToken.email ? `email_${decodedToken.email}` : decodedToken.uid);
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const phone = (digitsOnly.length === 10) ? `+91${digitsOnly}` : rawPhone;
    const phoneVariants = [rawPhone, phone, digitsOnly, `91${digitsOnly}`];
    
    let user = await db.user.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(decodedToken.email ? [{ email: decodedToken.email }] : [])
        ],
        deletedAt: null
      }
    });

    if (!user) {
      user = await db.user.create({
        data: {
          phone,
          email: decodedToken.email,
          name: decodedToken.name || null,
          avatar: decodedToken.picture || null,
          fcmToken: fcmToken || null,
          appVersion: appVersion || null,
          devicePlatform: devicePlatform || null,
          deviceModel: deviceModel || null,
          lastActiveAt: new Date(),
        }
      });
    } else {
      const updatePayload: Record<string, any> = { lastActiveAt: new Date() }
      if (fcmToken) updatePayload.fcmToken = fcmToken
      if (appVersion) updatePayload.appVersion = appVersion
      if (devicePlatform) updatePayload.devicePlatform = devicePlatform
      if (deviceModel) updatePayload.deviceModel = deviceModel

      user = await db.user.update({
        where: { id: user.id },
        data: updatePayload,
      });
    }

    // Check if user is an admin
    const email = decodedToken.email || null;
    let isAdmin = false;
    if (email) {
      const admin = await db.admin.findUnique({ where: { email } });
      if (admin && admin.isActive && !admin.deletedAt) {
        isAdmin = true;
      }
    }

    // Check if user is an active reporter
    const reporter = await findReporterFromToken(decodedToken);
    const isReporter = reporter && reporter.status === 'active' && !reporter.deletedAt;

    let role = 'user';
    if (isAdmin) role = 'admin';
    else if (isReporter) role = 'reporter';

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        role,
        isReporter: !!isReporter,
        reporterStatus: reporter?.status || null,
        reporterId: reporter?.id || null,
        reporterLevel: reporter?.role || null,
        postingScope: reporter?.postingScope || 'mandal',
        homeStateId: reporter?.stateId || null,
        homeDistrictId: reporter?.districtId || null,
        homeMandalId: reporter?.mandalId || null,
        allowedDistrictIds: reporter?.allowedDistrictIds ? (() => { try { return JSON.parse(reporter.allowedDistrictIds) } catch { return [] } })() : [],
        allowedMandalIds: reporter?.allowedMandalIds ? (() => { try { return JSON.parse(reporter.allowedMandalIds) } catch { return [] } })() : [],
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
