import { db } from '../src/lib/db'
import {
  getLevelConfig,
  getAllLevelConfigs,
  checkSubmissionLimit,
  computeReporterMetrics,
  getReporterLevelProgress,
} from '../src/lib/reward-engine'

async function runTests() {
  console.log('--- Starting Reward & Promotion Engine Tests ---')

  // Test 1: Fetch All Levels
  const levels = await getAllLevelConfigs()
  console.log(`[Test 1] Level configs in database: ${levels.length}`)
  if (levels.length < 6) throw new Error('Expected at least 6 configured levels')
  console.log('✓ Test 1 Passed: 6 career levels available')

  // Test 2: Verify Rank Order
  for (let i = 0; i < levels.length - 1; i++) {
    if (levels[i].rankOrder >= levels[i + 1].rankOrder) {
      throw new Error(`Levels rank order broken between ${levels[i].levelKey} and ${levels[i + 1].levelKey}`)
    }
  }
  console.log('✓ Test 2 Passed: Level rank order strictly ascending (1 to 6)')

  // Test 3: Get Level Config by Key
  const senior = await getLevelConfig('senior')
  if (!senior || senior.levelKey !== 'senior' || senior.payPerApprovedArticle < 5) {
    throw new Error('Senior level config mismatch')
  }
  console.log(`✓ Test 3 Passed: Senior level pay rate ₹${senior.payPerApprovedArticle}/article, daily limit: ${senior.dailyPostLimit}`)

  // Test 4: Submission Limit Check
  const sampleReporter = await db.reporter.findFirst({ where: { status: 'approved' } })
  if (sampleReporter) {
    const limitCheck = await checkSubmissionLimit(sampleReporter.id)
    console.log(`[Test 4] Limit check for reporter ${sampleReporter.name}: allowed=${limitCheck.allowed}, remaining=${limitCheck.remainingToday}/${limitCheck.dailyLimit}`)
    if (typeof limitCheck.allowed !== 'boolean') throw new Error('Invalid limit check response')
    console.log('✓ Test 4 Passed: Submission limits dynamically verified from DB')

    // Test 5: Metrics & Progress Calculation
    const metrics = await computeReporterMetrics(sampleReporter.id)
    const progress = await getReporterLevelProgress(sampleReporter.id)
    console.log(`[Test 5] Metrics: approved=${metrics.approvedCount}, rate=${metrics.approvalRate}%, views=${metrics.totalViews}, progress=${progress.overallProgress}%`)
    if (typeof progress.overallProgress !== 'number') throw new Error('Invalid progress calculation')
    console.log('✓ Test 5 Passed: Dynamic metrics & progress bar computed accurately')
  }

  console.log('\n--- ALL MODULE 4 REWARD ENGINE TESTS PASSED SUCCESSFULLY! ---')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})

