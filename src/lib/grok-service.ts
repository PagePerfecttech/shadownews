/**
 * Backwards compatibility: Delegates to Google Gemini AI service.
 */
import { generateGeminiNewsRewrite, type GeminiRewriteResult } from './gemini-service'

export const generateGrokNewsRewrite = generateGeminiNewsRewrite
export const generateAINewsRewrite = generateGeminiNewsRewrite
export type GrokRewriteResult = GeminiRewriteResult
export type AIRewriteResult = GeminiRewriteResult
