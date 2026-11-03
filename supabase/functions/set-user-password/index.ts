// Supabase Edge Function: set-user-password
// Lets an admin set a new password for a member of their own team (Settings → Users).
//
// verify_jwt: FALSE for the same reason as create-user and delete-user (ES256 tokens); the caller's
// token is verified here with adminClient.auth.getUser(jwt), and only admins may use it.
//
// Request body: { userId: string, password: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Passwords are hashed with bcrypt, which reads at most 72 bytes.
const MIN_LENGTH = 6
const MAX_BYTES = 72

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()
  if (!jwt) return json({ error: 'Missing authorization header' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(jwt)
  if (authError || !callerUser) {
    console.error('set-user-password: getUser failed:', authError?.message)
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles').select('role, team_id').eq('id', callerUser.id).single()
  if (callerError || !callerProfile) return json({ error: 'Could not verify caller profile' }, 403)
  if (callerProfile.role !== 'admin') return json({ error: 'Only admins can set passwords' }, 403)

  let userId: unknown, password: unknown
  try {
    ({ userId, password } = await req.json())
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (typeof userId !== 'string' || !userId) return json({ error: 'userId is required' }, 400)
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return json({ error: `The password must be at least ${MIN_LENGTH} characters.` }, 400)
  }
  if (new TextEncoder().encode(password).length > MAX_BYTES) {
    return json({ error: `The password is too long (at most ${MAX_BYTES} bytes).` }, 400)
  }

  // The member must be on the caller's team.
  const { data: target } = await adminClient
    .from('profiles').select('team_id').eq('id', userId).maybeSingle()
  if (!target) return json({ error: 'That user was not found' }, 404)
  if (target.team_id !== callerProfile.team_id) return json({ error: 'That user belongs to a different team' }, 403)

  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password })
  if (updateError) {
    console.error('set-user-password: updateUserById failed:', updateError.message)
    return json({ error: updateError.message }, 400)
  }

  // The password itself is never logged.
  console.log('set-user-password: password set for', userId, 'by', callerUser.id)
  return json({ ok: true }, 200)
})
