import { S3Client } from '@aws-sdk/client-s3'

export const R2_BUCKET = process.env.R2_BUCKET || 'voicestream'
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || 'https://pub-ebb3efc4808c4b6fbf35d3c6c26387d8.r2.dev').replace(/\/$/, '')

export function getS3Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.warn('R2 storage credentials missing from environment variables.')
  }

  return new S3Client({
    endpoint: endpoint || 'https://dummy.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: accessKeyId || 'dummy',
      secretAccessKey: secretAccessKey || 'dummy',
    },
    region: 'auto',
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

export const s3Client = getS3Client()

