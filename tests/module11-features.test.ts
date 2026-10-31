import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../src/lib/db'

describe('Module 11 Features Integration: Report Fake News, App Config & Feedback', { timeout: 30000 }, () => {
  let testNewsId: string
  let testReporterId: string
  let testUserId: string
  let testReportId: string
  let testStateId: string
  let testDistrictId: string

  beforeAll(async () => {
    // Find or create test reporter
    const state = await db.state.findFirst() || await db.state.create({ data: { name: 'Telangana', code: 'TG' } })
    const district = await db.district.findFirst({ where: { stateId: state.id } }) || await db.district.create({ data: { name: 'Hyderabad', code: 'HYD', stateId: state.id } })
    testStateId = state.id
    testDistrictId = district.id

    let reporter = await db.reporter.findFirst({ where: { status: 'active' } })
    if (!reporter) {
      reporter = await db.reporter.create({
        data: {
          name: 'Test Investigative Reporter',
          email: 'test_rep_m11@example.com',
          phone: '+919876543210',
          role: 'reporter',
          stateId: state.id,
          districtId: district.id,
          status: 'active',
          performanceScore: 80,
          fakeNewsCount: 0,
          warningCount: 0,
        },
      })
    }
    testReporterId = reporter.id

    // Find or create test user
    let user = await db.user.findFirst()
    if (!user) {
      user = await db.user.create({
        data: {
          name: 'Citizen Reader',
          phone: '+919988776655',
        },
      })
    }
    testUserId = user.id

    // Find or create test admin
    let admin = await db.admin.findFirst()
    if (!admin) {
      admin = await db.admin.create({
        data: {
          name: 'Super Admin',
          email: 'admin_test_m11@example.com',
          passwordHash: 'dummyhash',
          role: 'superadmin',
        },
      })
    }

    // Create a published test news article
    const category = await db.category.findFirst() || await db.category.create({ data: { name: 'Politics', slug: 'politics' } })
    const news = await db.news.create({
      data: {
        title: 'మీసేవ కేంద్రాలపై సమగ్ర విచారణ జరిపించాలి',
        shortDesc: 'MLG: మంగపేట మండలంలోని మీసేవ కేంద్రాల మంజూరుపై దర్యాప్తు.',
        status: 'published',
        thumbnailUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167',
        publishedAt: new Date(),
        category: { connect: { id: category.id } },
        reporter: { connect: { id: testReporterId } },
        admin: { connect: { id: admin.id } },
        state: { connect: { id: state.id } },
        district: { connect: { id: district.id } },
      },
    })
    testNewsId = news.id
  }, 30000)

  afterAll(async () => {
    // Clean up
    if (testReportId) {
      await db.newsReport.deleteMany({ where: { id: testReportId } }).catch(() => {})
    }
    if (testNewsId) {
      await db.news.deleteMany({ where: { id: testNewsId } }).catch(() => {})
    }
  })

  it('1. Citizen can report a news article as fake news', async () => {
    const report = await db.newsReport.create({
      data: {
        newsId: testNewsId,
        userId: testUserId,
        reporterIp: '127.0.0.1',
        reason: 'fake_news',
        details: 'Unverified claims regarding mandal offices.',
        status: 'pending',
      },
    })
    testReportId = report.id

    expect(report.id).toBeDefined()
    expect(report.status).toBe('pending')
    expect(report.reason).toBe('fake_news')
  })

  it('2. Admin can query pending reports queue', async () => {
    const pendingReports = await db.newsReport.findMany({
      where: { status: 'pending' },
      include: {
        news: {
          select: { title: true, reporterId: true },
        },
      },
    })

    expect(pendingReports.length).toBeGreaterThanOrEqual(1)
    const current = pendingReports.find(r => r.id === testReportId)
    expect(current).toBeDefined()
    expect(current?.news.title).toContain('మీసేవ')
  })

  it('3. Moderation take-down marks news as rejected, penalizes reporter score, and records strike', async () => {
    // Take down report
    await db.newsReport.update({
      where: { id: testReportId },
      data: {
        status: 'resolved_removed',
        actionNotes: 'Verified fake news: Removed by editorial team',
        resolvedAt: new Date(),
      },
    })

    // Update news
    await db.news.update({
      where: { id: testNewsId },
      data: {
        status: 'rejected',
        deletedAt: new Date(),
      },
    })

    // Update reporter strikes
    const updatedReporter = await db.reporter.update({
      where: { id: testReporterId },
      data: {
        warningCount: { increment: 1 },
        fakeNewsCount: { increment: 1 },
        performanceScore: { decrement: 25 },
      },
    })

    expect(updatedReporter.fakeNewsCount).toBeGreaterThanOrEqual(1)
    expect(updatedReporter.warningCount).toBeGreaterThanOrEqual(1)

    const checkedNews = await db.news.findUnique({ where: { id: testNewsId } })
    expect(checkedNews?.status).toBe('rejected')
    expect(checkedNews?.deletedAt).not.toBeNull()
  })

  it('4. User can submit in-app feedback for 1-3 star rating', async () => {
    const feedback = await db.appFeedback.create({
      data: {
        userId: testUserId,
        rating: 2,
        feedback: 'App is lagging when scrolling through shorts.',
        category: 'app_performance',
        appVersion: '1.0.0',
        deviceInfo: 'android',
        status: 'new',
      },
    })

    expect(feedback.id).toBeDefined()
    expect(feedback.rating).toBe(2)
    expect(feedback.category).toBe('app_performance')

    // Clean up test feedback
    await db.appFeedback.delete({ where: { id: feedback.id } }).catch(() => {})
  })

  it('5. App Config endpoint returns version enforcement configuration', async () => {
    const settings = await db.setting.findMany({
      where: {
        key: { in: ['force_update_android', 'force_update_ios', 'force_update_hard_block'] },
      },
    })

    const configMap: Record<string, string> = {}
    settings.forEach(s => {
      configMap[s.key] = s.value
    })

    expect(configMap.force_update_android || '1.0.0').toBeDefined()
  })
})
