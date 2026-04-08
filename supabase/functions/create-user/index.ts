// Supabase Edge Function: create-user
// Creates a new auth user + profile as an admin action.
// Requires the caller to be authenticated with the 'admin' role.
//
// Request body:
//   { email: string, password: string, displayName: string, role: 'admin' | 'producer' | 'requester' }
//
// Response:
//   { userId: string } on success
//   { error: string }  on failure

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Extract bearer token from the Authorization header
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '').trim()

  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Admin client — privileged, used for all DB + Auth Admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Verify caller identity: pass their raw JWT to getUser()
  const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(jwt)

  if (authError || !callerUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check that the caller has the 'admin' role in their profile
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, team_id')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile) {
    return new Response(JSON.stringify({ error: 'Could not verify caller profile' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (callerProfile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Parse request body
  let email: string, password: string, displayName: string, role: string
  try {
    const body = await req.json()
    email = body.email?.trim()
    password = body.password
    displayName = body.displayName?.trim() || email
    role = body.role || 'requester'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'email and password are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!['admin', 'producer', 'requester'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Invalid role' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Create the auth user — email_confirm: true so they can log in immediately
  const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })

  if (createError || !newUserData?.user) {
    return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create user' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const newUserId = newUserData.user.id

  // Update the profile: correct team_id, display_name, and role
  // (The DB trigger creates it with first-team + requester — override both)
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      team_id: callerProfile.team_id,
      display_name: displayName,
      role,
    })
    .eq('id', newUserId)

  if (updateError) {
    console.error('Profile update failed:', updateError.message)
    return new Response(
      JSON.stringify({ userId: newUserId, warning: 'Profile role/name update failed: ' + updateError.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ userId: newUserId }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
