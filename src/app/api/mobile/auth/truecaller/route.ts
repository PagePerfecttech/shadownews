import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { auth } from '@/lib/firebase-admin'
import { safeJsonParse } from '@/lib/json-utils'

export async function POST(request: NextRequest) {
  try {
    const truecallerClientId = process.env.TRUECALLER_CLIENT_ID
    if (!truecallerClientId) {
      console.error('TRUECALLER_CLIENT_ID not configured')
      return NextResponse.json({ error: 'Truecaller not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { code, codeVerifier, payload, signature, signatureAlgorithm } = body

    let phone: string
    let name: string | undefined

    if (code && codeVerifier) {
      // 1. Exchange authorization code for token
      const tokenRes = await fetch('https://oauth-account-noneu.truecaller.com/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: truecallerClientId,
          code,
          code_verifier: codeVerifier,
        }),
      })

      if (!tokenRes.ok) {
        const errText = await tokenRes.text()
        console.error('Truecaller token exchange failed:', errText)
        return NextResponse.json({ error: 'Truecaller token exchange failed', details: errText }, { status: 400 })
      }

      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token

      if (!accessToken) {
        return NextResponse.json({ error: 'Access token missing' }, { status: 400 })
      }

      // 2. Fetch user profile information
      const userinfoRes = await fetch('https://oauth-account-noneu.truecaller.com/v1/userinfo', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!userinfoRes.ok) {
        const errText = await userinfoRes.text()
        console.error('Truecaller userinfo fetch failed:', errText)
        return NextResponse.json({ error: 'Truecaller userinfo fetch failed', details: errText }, { status: 400 })
      }

      const userinfo = await userinfoRes.json()
      const rawPhone = userinfo.phone_number
      if (!rawPhone) {
        return NextResponse.json({ error: 'Phone number missing in Truecaller profile' }, { status: 400 })
      }

      phone = rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone
      name = `${userinfo.given_name || ''} ${userinfo.family_name || ''}`.trim() || undefined
    } else {
      if (!payload || !signature) {
        return NextResponse.json({ error: 'Payload/signature or code/codeVerifier required' }, { status: 400 })
      }

      // 1. Fetch public keys from Truecaller
      const tcKeysRes = await fetch('https://api4.truecaller.com/v1/key', { method: 'GET' })
      const tcKeys = await tcKeysRes.json()
      
      // 2. Find matching key
      let isValid = false;
      for (const keyObj of tcKeys) {
         try {
           const verifier = crypto.createVerify('SHA512');
           verifier.update(payload);
           const verified = verifier.verify(keyObj.key, signature, 'base64');
           if (verified) {
              isValid = true;
              break;
           }
         } catch (e) {
            // ignore error with this key, try next
         }
      }

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid Truecaller Signature' }, { status: 401 })
      }

      // 3. Decode payload
      const decodedPayload = safeJsonParse<Record<string, any>>(Buffer.from(payload, 'base64').toString('utf8'), {})
      const rawPhone = decodedPayload.phoneNumber

      if (!rawPhone) {
        return NextResponse.json({ error: 'Phone number not found in Truecaller profile' }, { status: 400 })
      }

      phone = rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone
      name = `${decodedPayload.firstName || ''} ${decodedPayload.lastName || ''}`.trim() || undefined
    }

    // 4. Find or create user
    let user = await db.user.findUnique({ where: { phone } })
    if (!user) {
      user = await db.user.create({ 
         data: { 
           phone,
           name
         } 
      })
    }

    // 5. Generate Firebase Custom Token
    const customToken = await auth.createCustomToken(user.id, { phone_number: user.phone });

    return NextResponse.json({
      token: customToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        preferredLanguage: user.preferredLanguage,
      },
    })
  } catch (error) {
    console.error('Truecaller verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
