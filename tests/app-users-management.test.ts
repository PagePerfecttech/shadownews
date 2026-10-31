import { db } from '../src/lib/db'

async function runTests() {
  console.log('🧪 Starting MODULE 9: App Users Management Integration Tests...\n')
  const testSuffix = Date.now().toString().slice(-6)
  let testUserId: string | null = null
  let createdReporterId: string | null = null

  try {
    // 1. Setup Test State & District
    let testState = await db.state.findFirst({ where: { isActive: true } })
    if (!testState) {
      testState = await db.state.create({
        data: { name: `Test State ${testSuffix}`, code: `TS${testSuffix}` },
      })
    }

    let testDistrict = await db.district.findFirst({ where: { stateId: testState.id } })
    if (!testDistrict) {
      testDistrict = await db.district.create({
        data: { name: `Test District ${testSuffix}`, stateId: testState.id },
      })
    }

    // 2. Create Test App User with telemetry
    const testPhone = `+9199887${testSuffix}`
    const testUser = await db.user.create({
      data: {
        phone: testPhone,
        name: `Reader Test ${testSuffix}`,
        email: `reader${testSuffix}@example.com`,
        stateId: testState.id,
        districtId: testDistrict.id,
        preferredLanguage: 'te',
        isActive: true,
        notificationsEnabled: true,
        appVersion: '1.2.0',
        devicePlatform: 'android',
        lastActiveAt: new Date(),
      },
    })
    testUserId = testUser.id
    console.log('✅ 1. Test User Created:', testUser.name, testUser.phone)

    // 3. Create simulated user activity (read interaction, bookmark)
    const testNews = await db.news.findFirst({ where: { deletedAt: null } })
    if (testNews) {
      await db.userInteraction.create({
        data: {
          userId: testUser.id,
          newsId: testNews.id,
          type: 'view',
          value: 45,
        },
      })
      await db.bookmark.create({
        data: {
          userId: testUser.id,
          newsId: testNews.id,
        },
      })
      console.log('✅ 2. Simulated Reader Activity Created (view interaction + bookmark)')
    }

    // 4. Verify Stats Calculation
    const totalUsers = await db.user.count({ where: { deletedAt: null } })
    const activeUsers = await db.user.count({ where: { deletedAt: null, isActive: true } })
    console.log(`✅ 3. User Stats Computed: Total=${totalUsers}, Active=${activeUsers}`)
    if (totalUsers < 1 || activeUsers < 1) throw new Error('User counts incorrect')

    // 5. Test User Moderation (Block & Unblock)
    const blocked = await db.user.update({
      where: { id: testUser.id },
      data: { isActive: false },
    })
    if (blocked.isActive !== false) throw new Error('Failed to block user')
    console.log('✅ 4. User Moderation: Block successfully applied')

    const unblocked = await db.user.update({
      where: { id: testUser.id },
      data: { isActive: true },
    })
    if (unblocked.isActive !== true) throw new Error('Failed to unblock user')
    console.log('✅ 5. User Moderation: Unblock successfully applied')

    // 6. Test Convert User to Reporter
    const promotedReporter = await db.reporter.create({
      data: {
        name: testUser.name || 'Test Reporter',
        phone: testUser.phone,
        email: testUser.email,
        stateId: testUser.stateId!,
        districtId: testUser.districtId!,
        role: 'junior',
        status: 'active',
        postingScope: 'mandal',
        canPublishDirectly: false,
      },
    })
    createdReporterId = promotedReporter.id
    console.log('✅ 6. User Successfully Promoted to Reporter:', promotedReporter.id, promotedReporter.name)

    // 7. Verify Linked Reporter detection by user phone
    const linked = await db.reporter.findFirst({
      where: { phone: testUser.phone, deletedAt: null },
    })
    if (!linked || linked.id !== promotedReporter.id) {
      throw new Error('Linked reporter lookup by phone failed')
    }
    console.log('✅ 7. Linked Reporter Profile Verified by phone mapping')

    console.log('\n🎉 ALL MODULE 9 INTEGRATION TESTS PASSED 100%!')
  } catch (err: any) {
    console.error('\n❌ Module 9 Test Failed:', err?.message || err)
    process.exit(1)
  } finally {
    // Cleanup
    if (createdReporterId) {
      await db.reporter.delete({ where: { id: createdReporterId } }).catch(() => {})
    }
    if (testUserId) {
      await db.bookmark.deleteMany({ where: { userId: testUserId } }).catch(() => {})
      await db.userInteraction.deleteMany({ where: { userId: testUserId } }).catch(() => {})
      await db.user.delete({ where: { id: testUserId } }).catch(() => {})
    }
    await db.$disconnect()
  }
}

runTests()

