import { db } from './db'

export interface GrokRewriteResult {
  aiTitle: string
  aiShortDesc: string
  aiContent: string
}

/**
 * Rewrites news submissions into professional press-quality Telugu news using xAI Grok (grok-2-latest).
 */
export async function generateGrokNewsRewrite(
  title: string,
  content: string,
  shortDesc?: string
): Promise<GrokRewriteResult | null> {
  try {
    // Fetch Grok / xAI API key from database setting or environment variables
    const dbGrokSetting = await db.setting.findFirst({
      where: {
        key: {
          in: ['grok_api_key', 'xai_api_key', 'GROK_API_KEY', 'XAI_API_KEY'],
        },
      },
    })

    const apiKey = (dbGrokSetting?.value?.trim()) ||
      process.env.GROK_API_KEY?.trim() ||
      process.env.XAI_API_KEY?.trim()

    if (!apiKey) {
      console.warn('xAI Grok API Key is not configured. Skipping Grok AI news rewrite.')
      return null
    }

    const systemPrompt = `You are a senior Telugu chief news editor for 'Telangana Jyothi Spot News'.
Your objective is to rewrite the raw news submission into a highly professional, grammatically flawless, engaging, and clear Telugu news article.
Maintain complete factual accuracy, names, numbers, figures, and geographical/location context.

Respond ONLY with a valid JSON object matching this exact structure without markdown formatting, ticks, or code fences:
{
  "aiTitle": "Rewritten professional Telugu headline",
  "aiShortDesc": "Rewritten concise 2-sentence Telugu summary",
  "aiContent": "Rewritten full professional Telugu news text"
}`

    const userPrompt = `RAW SUBMISSION:
Title: ${title}
Summary: ${shortDesc || ''}
Content: ${content || shortDesc || title}`

    // Call xAI Grok API endpoint
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('xAI Grok API request failed:', res.status, errText)
      return null
    }

    const data = await res.json()
    const responseText = data?.choices?.[0]?.message?.content || ''

    if (!responseText) {
      console.error('No content received from xAI Grok API')
      return null
    }

    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // Try parsing as JSON; if Grok returned loose JSON or plain text with curly braces, extract the JSON object
    let parsed: GrokRewriteResult | null = null
    try {
      parsed = JSON.parse(cleanJson) as GrokRewriteResult
    } catch {
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as GrokRewriteResult
        } catch {}
      }
    }

    if (parsed && parsed.aiTitle && (parsed.aiContent || parsed.aiShortDesc)) {
      return {
        aiTitle: parsed.aiTitle.trim(),
        aiShortDesc: (parsed.aiShortDesc || parsed.aiTitle).trim(),
        aiContent: (parsed.aiContent || parsed.aiShortDesc || parsed.aiTitle).trim(),
      }
    }

    console.warn('Grok response did not match expected structure:', cleanJson)
    return null
  } catch (error) {
    console.error('Error during xAI Grok news rewrite:', error)
    return null
  }
}

// Backwards-compatible alias
export const generateAINewsRewrite = generateGrokNewsRewrite

