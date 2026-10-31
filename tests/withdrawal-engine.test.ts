import { db } from '../src/lib/db'
import {
  requestReporterWithdrawal,
  completeReporterWithdrawal,
  rejectReporterWithdrawal,
} from '../src/lib/reward-engine'

async function runWithdrawalTests() {
  console.log('--- Starting Module 7 & 8: Withdrawal Engine Tests ---')

  const reporter = await db.reporter.findFirst({
    where: { status: 'active', deletedAt: null }
  })

  if (!reporter) {
    throw new Error('No approved reporter found to test withdrawals')
  }

  console.log(`[Setup] Using test reporter: ${reporter.name} (id: ${reporter.id}, balance: ₹${reporter.earningsBalance})`)

  // Ensure reporter has enough balance for test
  const testAmount = 500
  await db.reporter.update({
    where: { id: reporter.id },
    data: {
      earningsBalance: Math.max(reporter.earningsBalance, 2500),
      lastWithdrawalAt: null // reset cooldown for testing
    }
  })

  // Test 1: Minimum Amount Validation
  console.log('[Test 1] Testing minimum withdrawal amount validation...')
  const lowAmountRes = await requestReporterWithdrawal({
    reporterId: reporter.id,
    amount: 100, // below min ₹500
    payoutMethod: 'upi',
    upiId: 'test@upi',
  })
  if (lowAmountRes.success) throw new Error('Expected min amount validation failure for ₹100')
  console.log(`✓ Test 1 Passed: Correctly rejected below-minimum request (${lowAmountRes.error})`)

  // Test 2: Invalid UPI ID Regex Validation
  console.log('[Test 2] Testing invalid UPI regex...')
  const invalidUpiRes = await requestReporterWithdrawal({
    reporterId: reporter.id,
    amount: 500,
    payoutMethod: 'upi',
    upiId: 'invalid-upi-without-at',
  })
  if (invalidUpiRes.success) throw new Error('Expected invalid UPI failure')
  console.log(`✓ Test 2 Passed: Rejected invalid UPI format (${invalidUpiRes.error})`)

  // Test 3: Successful Withdrawal Request Creation & Ledger Debit
  console.log('[Test 3] Creating valid withdrawal request...')
  const initialRep = await db.reporter.findUnique({ where: { id: reporter.id } })
  const initialBalance = initialRep!.earningsBalance

  const validReq = await requestReporterWithdrawal({
    reporterId: reporter.id,
    amount: testAmount,
    payoutMethod: 'upi',
    upiId: 'sampleuser@okhdfcbank',
  })

  if (!validReq.success || !validReq.withdrawal) {
    throw new Error(`Failed to create withdrawal request: ${validReq.error}`)
  }

  const withdrawalId = validReq.withdrawal.id
  console.log(`[Test 3] Created withdrawal request #${withdrawalId}`)

  // Verify atomic ledger debit
  const postReqRep = await db.reporter.findUnique({ where: { id: reporter.id } })
  const expectedBalance = Math.round((initialBalance - testAmount) * 100) / 100
  if (Math.abs(postReqRep!.earningsBalance - expectedBalance) > 0.01) {
    throw new Error(`Balance not debited correctly. Expected: ${expectedBalance}, Found: ${postReqRep!.earningsBalance}`)
  }

  const txRow = await db.walletTransaction.findUnique({
    where: { id: validReq.withdrawal.walletTransactionId }
  })
  if (!txRow || txRow.type !== 'DEBIT' || txRow.status !== 'pending' || txRow.moneyAmount !== testAmount) {
    throw new Error('Ledger transaction record invalid')
  }
  console.log(`✓ Test 3 Passed: ₹${testAmount} debited atomically, ledger transaction #${txRow.id} created`)

  // Test 4: Duplicate Pending Request Prevention
  console.log('[Test 4] Testing duplicate pending request prevention...')
  const dupRes = await requestReporterWithdrawal({
    reporterId: reporter.id,
    amount: 500,
    payoutMethod: 'upi',
    upiId: 'sampleuser@okhdfcbank',
  })
  if (dupRes.success) throw new Error('Expected duplicate pending prevention failure')
  console.log(`✓ Test 4 Passed: Blocked duplicate pending request (${dupRes.error})`)

  // Test 5: Rejection and Automated Ledger Refund
  console.log('[Test 5] Rejecting withdrawal and testing refund...')
  const rejectRes = await rejectReporterWithdrawal({
    withdrawalId,
    rejectionReason: 'Test rejection - automated refund verification',
    adminName: 'Test Admin Runner'
  })
  if (!rejectRes.success) throw new Error(`Rejection failed: ${rejectRes.error}`)

  const refundedRep = await db.reporter.findUnique({ where: { id: reporter.id } })
  if (Math.abs(refundedRep!.earningsBalance - initialBalance) > 0.01) {
    throw new Error(`Refund failed. Expected: ${initialBalance}, Found: ${refundedRep!.earningsBalance}`)
  }

  const refundTx = await db.walletTransaction.findFirst({
    where: { referenceId: withdrawalId, txCategory: 'reversal' }
  })
  if (!refundTx || refundTx.type !== 'CREDIT' || refundTx.moneyAmount !== testAmount) {
    throw new Error('Refund reversal ledger row missing or invalid')
  }
  console.log(`✓ Test 5 Passed: Withdrawal rejected, ₹${testAmount} restored to reporter, reversal ledger logged`)

  // Test 6: Complete Payout with UTR
  console.log('[Test 6] Creating new request and testing payout completion with UTR...')
  await db.reporter.update({ where: { id: reporter.id }, data: { lastWithdrawalAt: null } })
  const payoutReq = await requestReporterWithdrawal({
    reporterId: reporter.id,
    amount: testAmount,
    payoutMethod: 'bank_transfer',
    bankAccountNumber: '918273645012',
    bankIfsc: 'HDFC0001234',
    bankAccountName: 'Test Reporter Name',
  })
  if (!payoutReq.success) throw new Error(`Payout request creation failed: ${payoutReq.error}`)

  const completeRes = await completeReporterWithdrawal({
    withdrawalId: payoutReq.withdrawal.id,
    transactionReference: 'UTR-20261031-TEST-9988',
    adminNotes: 'Settled via IMPS',
    adminName: 'Super Admin'
  })
  if (!completeRes.success) throw new Error(`Complete withdrawal failed: ${completeRes.error}`)

  const completedReq = await db.withdrawalRequest.findUnique({
    where: { id: payoutReq.withdrawal.id }
  })
  if (completedReq!.status !== 'completed' || completedReq!.transactionReference !== 'UTR-20261031-TEST-9988') {
    throw new Error('Withdrawal record not properly updated to completed status with UTR')
  }

  const completedTx = await db.walletTransaction.findUnique({
    where: { id: completedReq!.walletTransactionId! }
  })
  if (completedTx!.status !== 'completed') {
    throw new Error('Wallet transaction status not updated to completed')
  }
  console.log(`✓ Test 6 Passed: Marked paid with UTR UTR-20261031-TEST-9988 and ledger transaction finalized`)

  // Cleanup test records
  await db.withdrawalRequest.deleteMany({
    where: { id: { in: [withdrawalId, payoutReq.withdrawal.id] } }
  })
  await db.walletTransaction.deleteMany({
    where: { referenceId: { in: [withdrawalId, payoutReq.withdrawal.id] } }
  })
  console.log('[Cleanup] Test withdrawal artifacts cleaned up cleanly')

  console.log('\n--- ALL MODULE 7 & 8 WITHDRAWAL ENGINE TESTS PASSED (6/6)! ---')
}

runWithdrawalTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Test execution failed:', e)
    process.exit(1)
  })
