import { NextRequest, NextResponse } from 'next/server'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import { findReporterFromToken } from '@/lib/reporter-utils'
import { requestReporterWithdrawal } from '@/lib/reward-engine'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let decodedToken
    try {
      decodedToken = await verifyFirebaseToken(authHeader)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reporter = await findReporterFromToken(decodedToken)
    if (!reporter) {
      return NextResponse.json({ error: 'Reporter profile not found' }, { status: 404 })
    }

    const body = await request.json()
    // Accept either direct amount in ₹ or coins (backwards compatible)
    let requestedInr = 0
    if (typeof body.amount === 'number' && body.amount > 0) {
      requestedInr = body.amount
    } else if (typeof body.coins === 'number' && body.coins > 0) {
      requestedInr = body.coins / 100 // 100 coins = ₹1
    } else {
      return NextResponse.json({ error: 'Please enter a valid withdrawal amount.' }, { status: 400 })
    }

    const payoutMethod = body.payoutMethod === 'bank_transfer' ? 'bank_transfer' : 'upi'

    const result = await requestReporterWithdrawal({
      reporterId: reporter.id,
      amount: requestedInr,
      payoutMethod,
      upiId: body.upiId,
      bankAccountNumber: body.bankAccountNumber,
      bankIfsc: body.bankIfsc,
      bankAccountName: body.bankAccountName,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      withdrawal: result.withdrawal,
      balanceAfter: result.balanceAfter,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Wallet withdraw error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
