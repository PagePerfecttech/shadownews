import { db } from '../src/lib/db'
import { generate5CharNewsId } from '../src/lib/id-generator'

async function migrate() {
  console.log('Querying news with null or empty shortCode...')
  const itemsWithoutCode = await db.news.findMany({
    where: {
      OR: [
        { shortCode: null },
        { shortCode: '' },
      ],
    },
    select: { id: true, title: true },
  })
  console.log(`Found ${itemsWithoutCode.length} articles to backfill shortCode.`)

  for (const item of itemsWithoutCode) {
    const code = await generate5CharNewsId()
    await db.news.update({
      where: { id: item.id },
      data: { shortCode: code },
    })
    console.log(`Assigned shortCode: ${code} -> ${item.id} (${item.title.substring(0, 30)})`)
  }

  const remaining = await db.news.count({
    where: {
      OR: [
        { shortCode: null },
        { shortCode: '' },
      ],
    },
  })
  console.log(`Migration complete. Remaining null or empty: ${remaining}`)
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
