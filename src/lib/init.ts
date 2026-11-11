/**
 * Application initialization
 * Run this at app startup to validate configuration
 */

import { validateEnv } from './env'

let initialized = false

export function initializeApp() {
  if (initialized) return

  try {
    console.log('[INIT] Validating environment variables...')
    validateEnv()
    console.log('[INIT] Environment validation passed ✓')
    initialized = true
  } catch (error) {
    console.error('[INIT] FATAL: Environment validation failed')
    console.error(error)
    process.exit(1)
  }
}

// Auto-initialize on module load if in production
if (process.env.NODE_ENV === 'production') {
  initializeApp()
}
