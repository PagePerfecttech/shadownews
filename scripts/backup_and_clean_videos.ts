import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const allVideos = await prisma.video.findMany({
    orderBy: { createdAt: 'desc' }
  })

  console.log(`Total videos in DB: ${allVideos.length}`)

  // Official channel ID: UC4MFxsRwnB2EnPYu4Bpntxw
  // Let's check videos by description or title or channel
  const thirdPartyVideos: any[] = []
  const officialVideos: any[] = []

  for (const v of allVideos) {
    const isThirdParty = 
      (v.description && (
        v.description.includes('TV9') || 
        v.description.includes('Sakshi') || 
        v.description.includes('NTV') || 
        v.description.includes('V6') || 
        v.description.includes('ABN')
      )) ||
      (v.title && (
        v.title.includes('TV9') || 
        v.title.includes('Sakshi') || 
        v.title.includes('NTV') || 
        v.title.includes('V6') || 
        v.title.includes('ABN')
      ))

    if (isThirdParty) {
      thirdPartyVideos.push(v)
    } else {
      officialVideos.push(v)
    }
  }

  console.log(`Found ${thirdPartyVideos.length} third-party videos and ${officialVideos.length} official videos.`)

  // Save backup to JSON
  const backupDir = path.join(__dirname, '../backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  const backupFile = path.join(backupDir, `videos_backup_${Date.now()}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(allVideos, null, 2))
  console.log(`Backed up all ${allVideos.length} videos to: ${backupFile}`)

  // Delete the third-party videos
  if (thirdPartyVideos.length > 0) {
    const deleteIds = thirdPartyVideos.map(v => v.id)
    const result = await prisma.video.deleteMany({
      where: { id: { in: deleteIds } }
    })
    console.log(`Deleted ${result.count} third-party videos from DB.`)
  }

  const remaining = await prisma.video.count()
  console.log(`Remaining videos in DB: ${remaining}`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
