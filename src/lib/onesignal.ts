/**
 * OneSignal REST API Client for Server-Side Push Notifications
 */

export interface OneSignalNotificationPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, any>
  segments?: string[]
  externalUserIds?: string[]
}

/**
 * Sends a push notification to OneSignal subscribers using the REST API.
 */
export async function sendOneSignalNotification(payload: OneSignalNotificationPayload) {
  const appId = process.env.ONESIGNAL_APP_ID || 'eed09380-403a-4325-a8e3-9bf6bab20baa'
  const apiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!apiKey) {
    console.warn('[OneSignal] Missing ONESIGNAL_REST_API_KEY in environment. Skipping notification.')
    return null
  }

  try {
    const body: Record<string, any> = {
      app_id: appId,
      headings: { en: payload.title },
      contents: { en: payload.body },
    }

    if (payload.imageUrl && payload.imageUrl.startsWith('http')) {
      body.big_picture = payload.imageUrl
      body.ios_attachments = { id1: payload.imageUrl }
    }

    if (payload.data) {
      body.data = payload.data
    }

    if (payload.externalUserIds && payload.externalUserIds.length > 0) {
      body.include_aliases = { external_id: payload.externalUserIds }
      body.target_channel = 'push'
    } else {
      body.included_segments = payload.segments || ['Total Subscriptions']
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('[OneSignal] Failed to send push notification:', data)
    } else {
      console.log('[OneSignal] Push notification sent successfully. Notification ID:', data.id)
    }
    return data
  } catch (error) {
    console.error('[OneSignal] Error sending notification:', error)
    return null
  }
}

