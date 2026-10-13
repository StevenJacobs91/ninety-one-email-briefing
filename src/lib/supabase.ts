import { createClient } from '@supabase/supabase-js'
import { getEnv } from './env'

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'In production these come from window.__ENV__ (dist/env.js, written at startup); locally from .env.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
