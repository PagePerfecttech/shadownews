import { google } from 'googleapis'
import { db } from './db'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import https from 'https'

import http from 'http'

const OAUTH2_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || 'dummy'
const OAUTH2_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || 'dummy'
const OAUTH2_REDIRECT_URI = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/youtube/callback` : 'http://localhost:3000/api/admin/youtube/callback'

export function getYoutubeOAuthClient() {
  return new google.auth.OAuth2(
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    OAUTH2_REDIRECT_URI
  )
}

export async function uploadToYouTubeShorts(videoId: string, title: string, description: string, fileUrl: string, isNews: boolean = false) {
  try {
    const refreshTokenSetting = await db.setting.findUnique({ where: { key: 'YOUTUBE_REFRESH_TOKEN' } })
    if (!refreshTokenSetting || !refreshTokenSetting.value) {
      console.error('YouTube refresh token not found in settings.')
      await updateStatus(videoId, isNews, 'failed')
      return
    }

    await updateStatus(videoId, isNews, 'uploading')

    const oauth2Client = getYoutubeOAuthClient()
    oauth2Client.setCredentials({ refresh_token: refreshTokenSetting.value })

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

    // Download video file locally first
    const tempFilePath = await downloadFile(fileUrl)

    const fullTitle = `${title} #shorts`.substring(0, 100)
    const fullDescription = `${description}\n\nDownload our app: https://m.shadownews.in\n#shorts #shadownews`

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: fullTitle,
          description: fullDescription,
          tags: ['shorts', 'news', 'telangana'],
          categoryId: '25', // News & Politics
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(tempFilePath),
      },
    })

    // Clean up temp file
    fs.unlinkSync(tempFilePath)

    if (res.data.id) {
      await updateStatus(videoId, isNews, 'published', res.data.id)
    } else {
      await updateStatus(videoId, isNews, 'failed')
    }
  } catch (error) {
    console.error('YouTube upload failed:', error)
    await updateStatus(videoId, isNews, 'failed')
  }
}

async function updateStatus(id: string, isNews: boolean, status: string, youtubeId?: string) {
  const data: any = { youtubePublishStatus: status }
  if (youtubeId) data.youtubeVideoId = youtubeId

  if (isNews) {
    await db.news.update({ where: { id }, data })
  } else {
    await db.video.update({ where: { id }, data })
  }
}

function downloadFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https')
    const httpModule = isHttps ? https : http
    
    // If it's a local file upload URL, it might just be relative path. 
    // Wait, the videoUrl in DB is probably absolute but if it's relative, we need to construct it.
    let fetchUrl = url
    if (url.startsWith('/uploads/')) {
        fetchUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${url}`
    }

    const uploadDir = path.join(process.cwd(), 'upload')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    const tempPath = path.join(uploadDir, `temp_${uuidv4()}.mp4`)
    const file = fs.createWriteStream(tempPath)
    
    httpModule.get(fetchUrl, (response: any) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(tempPath)
        })
      } else {
        reject(new Error(`Failed to download file: ${response.statusCode}`))
      }
    }).on('error', (err: any) => {
      fs.unlink(tempPath, () => {})
      reject(err)
    })
  })
}
