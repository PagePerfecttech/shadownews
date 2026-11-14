import { db } from '../src/lib/db'
import { generateRandomShortCode } from '../src/lib/short-code'

async function main() {
  const allNews = await db.news.findMany({ select: { id: true, shortCode: true } })
  console.log(`Found ${allNews.length} articles to update with 5-character short codes`)
  
  const usedCodes = new Set<string>()
  let count = 0

  for (const item of allNews) {
    let code = generateRandomShortCode(5)
    while (usedCodes.has(code)) {
      code = generateRandomShortCode(5)
    }
    usedCodes.add(code)

    await db.news.update({
      where: { id: item.id },
      data: { shortCode: code }
    })
    count++
  }

  console.log(`Successfully assigned unique 5-character alphanumeric short codes to ${count} news articles.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
