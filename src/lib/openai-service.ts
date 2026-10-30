/**
 * Migration notice: OpenAI has been deprecated and replaced with xAI Grok.
 * This file maintains backwards compatibility by delegating all rewrites to Grok AI.
 */
import { generateGrokNewsRewrite, type GrokRewriteResult } from './grok-service'

export const generateAINewsRewrite = generateGrokNewsRewrite
export type AIRewriteResult = GrokRewriteResult
