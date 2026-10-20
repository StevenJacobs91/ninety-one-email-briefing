// Supabase Edge Function: delete-user
// Removes a team member completely: their login (auth user) and their profile.
// Removing only the profile leaves the login behind, which stops the same email
// from being added again.
//
// verify_jwt: FALSE for the same reason as create-user (ES256 tokens); the caller's
// token is verified here with adminClient.auth.getUser(jwt).
//
// Request body: { userId: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
    console.error('delete-user: getUser failed:', authError?.message)
    return json({ error: 'Unauthorized' }, 401)
  }

  const { data: callerProfile, error: callerError } = await adminClient
    .from('profiles').select('role, team_id').eq('id', callerUser.id).single()
  if (callerError || !callerProfile) return json({ error: 'Could not verify caller profile' }, 403)
  if (callerProfile.role !== 'admin') return json({ error: 'Only admins can remove users' }, 403)

  let userId: string
  try {
    userId = (await req.json()).userId
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!userId || typeof userId !== 'string') return json({ error: 'userId is required' }, 400)
  if (userId === callerUser.id) return json({ error: 'You cannot remove your own account' }, 400)

  // The target must be on the caller's team.
  const { data: target } = await adminClient
    .from('profiles').select('role, team_id').eq('id', userId).maybeSingle()
  if (target && target.team_id !== callerProfile.team_id) {
    return json({ error: 'That user belongs to a different team' }, 403)
  }

  // Never remove the team's last admin.
  if (target?.role === 'admin') {
    const { count } = await adminClient
      .from('profiles').select('id', { count: 'exact', head: true })
      .eq('team_id', callerProfile.team_id).eq('role', 'admin')
    if ((count ?? 0) <= 1) return json({ error: 'You cannot remove the last admin' }, 400)
  }

  // Remove the login first; a missing login is fine (an earlier removal may have left only a profile).
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError && !/not.?found/i.test(deleteError.message)) {
    console.error('delete-user: deleteUser failed:', deleteError.message)
    return json({ error: `Could not remove the login: ${deleteError.message}` }, 400)
  }

  // The profile normally goes with the login; make sure nothing is left behind.
  const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId)
  if (profileError) {
    console.error('delete-user: profile delete failed:', profileError.message)
    return json({ error: `The login was removed but the profile could not be: ${profileError.message}` }, 400)
  }

  console.log('delete-user: removed', userId, 'for team', callerProfile.team_id)
  return json({ ok: true }, 200)
})
