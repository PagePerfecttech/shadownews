import { db } from './db'

export interface GeminiRewriteResult {
  aiTitle: string
  aiShortDesc: string
  aiContent: string
}

/**
 * Rewrites news submissions into professional press-quality Telugu news using Google Gemini AI (Fast & Free).
 */
export async function generateGeminiNewsRewrite(
  title: string,
  content: string,
  shortDesc?: string
): Promise<GeminiRewriteResult | null> {
  try {
    // Look up Gemini API key from database Setting table or environment variables
    const dbGeminiSetting = await db.setting.findFirst({
      where: {
        key: {
          in: ['gemini_api_key', 'google_gemini_api_key', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'grok_api_key', 'xai_api_key'],
        },
      },
    })

    const apiKey = (dbGeminiSetting?.value?.trim()) ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GOOGLE_GEMINI_API_KEY?.trim()

    if (!apiKey) {
      console.warn('Google Gemini API Key is not configured in Admin Settings or environment. Skipping Gemini rewrite.')
      return null
    }

    const systemPrompt = `You are a senior Telugu chief news editor for 'Telangana Jyothi Spot News'.
Your objective is to rewrite the raw news submission into a highly professional, grammatically flawless, engaging, and clear Telugu news article.
Maintain complete factual accuracy, names, numbers, figures, and geographical/location context.

Respond ONLY with a valid JSON object matching this exact structure without markdown formatting or code fences:
{
  "aiTitle": "Rewritten professional Telugu headline",
  "aiShortDesc": "Rewritten concise 2-sentence Telugu summary",
  "aiContent": "Rewritten full professional Telugu news text"
}`

    const userPrompt = `RAW SUBMISSION:
Title: ${title}
Summary: ${shortDesc || ''}
Content: ${content || shortDesc || title}`

    // Resolve models: dynamically fetch models supported for this API key or use prioritized fallback
    const modelsToTry = await getGeminiModelsToTry(apiKey)
    let responseText = ''

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        })

        if (res.ok) {
          const data = await res.json()
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (responseText) {
            break // Successfully got content
          }
        } else {
          const errText = await res.text()
          console.warn(`Gemini model ${model} returned ${res.status}: ${errText}`)
          // If 404 (model not found), loop will try next model
        }
      } catch (err) {
        console.warn(`Failed call to Gemini model ${model}:`, err)
      }
    }

    if (!responseText) {
      console.error('No response received from any Google Gemini model')
      return null
    }

    let cleanJson = responseText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    let parsed: GeminiRewriteResult | null = null
    try {
      parsed = JSON.parse(cleanJson) as GeminiRewriteResult
    } catch {
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]) as GeminiRewriteResult
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

    console.warn('Gemini response did not match expected structure:', cleanJson)
    return null
  } catch (error) {
    console.error('Error during Google Gemini news rewrite:', error)
    return null
  }
}

/**
 * Queries Google's models endpoint to find the active models for this API key,
 * or returns a prioritized list of latest Gemini models (including gemini-3.8-flash).
 */
export async function getGeminiModelsToTry(apiKey: string): Promise<string[]> {
  const fallbackList = [
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
  ]

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    )
    if (listRes.ok) {
      const data = await listRes.json()
      if (Array.isArray(data?.models)) {
        const available = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''))

        // Prioritize flash models first, followed by others
        const flashModels = available.filter((m: string) => m.includes('flash'))
        const otherModels = available.filter((m: string) => !m.includes('flash'))
        const combined = [...flashModels, ...otherModels]

        if (combined.length > 0) {
          return combined
        }
      }
    }
  } catch (e) {
    // Ignore network error and proceed with fallback list
  }

  return fallbackList
}

// Backwards-compatible aliases
export const generateAINewsRewrite = generateGeminiNewsRewrite
export const generateGrokNewsRewrite = generateGeminiNewsRewrite
export type AIRewriteResult = GeminiRewriteResult

/**
 * Tests connection to Google Gemini API with a minimal ping prompt.
 */
export async function testGeminiConnection(overrideKey?: string): Promise<{
  success: boolean
  model?: string
  message: string
  latencyMs?: number
}> {
  const startTime = Date.now()
  let apiKey = overrideKey?.trim()

  if (!apiKey) {
    const dbGeminiSetting = await db.setting.findFirst({
      where: {
        key: {
          in: ['gemini_api_key', 'google_gemini_api_key', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'grok_api_key', 'xai_api_key'],
        },
      },
    })
    apiKey = dbGeminiSetting?.value?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GOOGLE_GEMINI_API_KEY?.trim()
  }

  if (!apiKey) {
    return {
      success: false,
      message: 'No Gemini API key provided or found in settings. Please enter your API key.',
    }
  }

  const modelsToTry = await getGeminiModelsToTry(apiKey)
  let lastError = ''

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Respond with OK.' }],
            },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          const latencyMs = Date.now() - startTime
          return {
            success: true,
            model,
            message: `Successfully connected to Google Gemini (${model})! Response received in ${latencyMs}ms.`,
            latencyMs,
          }
        }
      } else {
        const errJson = await res.json().catch(() => null)
        const errMsg = errJson?.error?.message || (await res.text().catch(() => `HTTP ${res.status}`))
        lastError = `Google Gemini error (${res.status}): ${errMsg}`
        
        // If API key is explicitly invalid, return early
        if (errMsg.toLowerCase().includes('api_key_invalid') || errMsg.toLowerCase().includes('api key not valid')) {
          return {
            success: false,
            message: 'Invalid Google Gemini API key. Please generate a new free key at aistudio.google.com',
          }
        }
      }
    } catch (err: any) {
      lastError = err?.message || 'Network connection failed'
    }
  }

  return {
    success: false,
    message: lastError || 'Failed to establish connection with Google Gemini models.',
  }
}

