/**
 * Backwards compatibility: Delegates to Google Gemini AI service.
 */
import { generateGeminiNewsRewrite, type GeminiRewriteResult } from './gemini-service'

export const generateAINewsRewrite = generateGeminiNewsRewrite
export type AIRewriteResult = GeminiRewriteResult
