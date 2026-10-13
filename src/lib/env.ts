/**
 * Runtime environment config.
 *
 * In production the App Service startup command writes `dist/env.js`, which
 * sets `window.__ENV__` from the App Service application settings. Locally
 * (vite dev) that file doesn't exist, so we fall back to the build-time
 * `import.meta.env` values from `.env`.
 */

export interface RuntimeEnv {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv
  }
}

export function getEnv<K extends keyof RuntimeEnv>(key: K): string | undefined {
  const runtime = typeof window !== 'undefined' ? window.__ENV__?.[key] : undefined
  if (runtime) return runtime
  return import.meta.env[key]
}
