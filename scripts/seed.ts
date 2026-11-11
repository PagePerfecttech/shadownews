import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedData } from './seed_data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Super Admin (with hashed password)
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@shadownews.com' },
    update: {},
    create: {
      email: 'admin@shadownews.com',
      passwordHash: hashedPassword,
      name: 'Super Admin',
      role: 'super_admin',
      isActive: true,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // 3. Create States, Districts, and Mandals
  let totalDistricts = 0;
  let totalMandals = 0;
  for (const stateData of seedData.states) {
    const state = await prisma.state.upsert({
      where: { code: stateData.code },
      update: {},
      create: { name: stateData.name, code: stateData.code, isActive: true },
    })
    console.log(`✅ State created: ${state.name}`)

    const districts = seedData.districts[stateData.code as keyof typeof seedData.districts] || []
    for (const d of districts) {
      const district = await prisma.district.upsert({
        where: { id: `${state.id}-${d.name.toLowerCase().replace(/\s+/g, '-')}` },
        update: {},
        create: { name: d.name, stateId: state.id, isActive: true },
      })
      totalDistricts++;

      for (const mName of d.mandals) {
        await prisma.mandal.upsert({
          where: { id: `${district.id}-${mName.toLowerCase().replace(/\s+/g, '-')}` },
          update: {},
          create: { name: mName, districtId: district.id, isActive: true },
        })
        totalMandals++;
      }
    }
  }
  console.log(`✅ ${totalDistricts} districts and ${totalMandals} mandals created across ${seedData.states.length} states`)

  // 5. Create Categories (single language)
  const categoriesData = [
    { name: 'Politics', slug: 'politics', color: '#DC2626' },
    { name: 'Crime', slug: 'crime', color: '#7C3AED' },
    { name: 'Sports', slug: 'sports', color: '#059669' },
    { name: 'Entertainment', slug: 'entertainment', color: '#D97706' },
    { name: 'Business', slug: 'business', color: '#2563EB' },
    { name: 'Technology', slug: 'technology', color: '#0891B2' },
    { name: 'Education', slug: 'education', color: '#4F46E5' },
    { name: 'Health', slug: 'health', color: '#16A34A' },
    { name: 'Agriculture', slug: 'agriculture', color: '#65A30D' },
    { name: 'Infrastructure', slug: 'infrastructure', color: '#9333EA' },
  ]
  for (let i = 0; i < categoriesData.length; i++) {
    const cat = categoriesData[i]
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, color: cat.color, sortOrder: i, isActive: true },
    })
  }
  console.log(`✅ ${categoriesData.length} categories created`)

  // 6. Create Tags
  const tags = [
    { name: 'Elections', slug: 'elections', type: 'event' },
    { name: 'KCR', slug: 'kcr', type: 'person' },
    { name: 'Revanth Reddy', slug: 'revanth-reddy', type: 'person' },
    { name: 'Hyderabad', slug: 'hyderabad', type: 'topic' },
    { name: 'Irrigation', slug: 'irrigation', type: 'topic' },
    { name: 'IT Sector', slug: 'it-sector', type: 'topic' },
    { name: 'Farmer Loan', slug: 'farmer-loan', type: 'topic' },
    { name: 'Tollywood', slug: 'tollywood', type: 'topic' },
    { name: 'Cricket', slug: 'cricket', type: 'topic' },
    { name: 'Festivals', slug: 'festivals', type: 'event' },
  ]
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: { name: tag.name, slug: tag.slug, type: tag.type, isTrending: Math.random() > 0.5, isActive: true },
    })
  }
  console.log(`✅ ${tags.length} tags created`)

  // 10. Create Default Settings
  const defaultSettings = [
    { key: 'admob_enabled', value: 'false', description: 'AdMob enabled' },
    { key: 'admob_banner_id', value: '', description: 'AdMob Banner Ad Unit ID' },
    { key: 'admob_interstitial_id', value: '', description: 'AdMob Interstitial Ad Unit ID' },
    { key: 'admob_native_id', value: '', description: 'AdMob Native Ad Unit ID' },
    { key: 'admob_rewarded_id', value: '', description: 'AdMob Rewarded Ad Unit ID' },
    { key: 'admob_frequency_cap', value: '5', description: 'Ad frequency cap per session' },
    { key: 'custom_banner_enabled', value: 'true', description: 'Custom banner ads enabled' },
    { key: 'custom_banner_image_url', value: 'https://placehold.co/800x100/DC2626/white?text=Shadow+News+Banner+Ad', description: 'Custom banner ad image URL' },
    { key: 'custom_banner_link_url', value: 'https://shadownews.vercel.app', description: 'Custom banner ad click URL' },
    { key: 'force_update_android', value: '1.0.0', description: 'Minimum Android version' },
    { key: 'force_update_ios', value: '1.0.0', description: 'Minimum iOS version' },
    { key: 'force_update_hard_block', value: 'false', description: 'Hard block outdated apps' },
    { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode enabled' },
    { key: 'maintenance_message', value: '', description: 'Maintenance mode message' },
    { key: 'feature_comments', value: 'true', description: 'Comments feature enabled' },
    { key: 'feature_dark_mode', value: 'true', description: 'Dark mode feature enabled' },
    { key: 'feature_video_section', value: 'true', description: 'Video section enabled' },
    { key: 'feature_notifications', value: 'true', description: 'Push notifications enabled' },
    { key: 'feature_bookmarks', value: 'true', description: 'Bookmarks feature enabled' },
    { key: 'feature_share', value: 'true', description: 'Share feature enabled' },
    { key: 'otp_code', value: '1234', description: 'Current OTP code for testing' },
  ]
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log(`✅ ${defaultSettings.length} settings created`)

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
