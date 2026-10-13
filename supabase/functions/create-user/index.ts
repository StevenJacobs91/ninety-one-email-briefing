// Supabase Edge Function: create-user
// Creates a new auth user + profile as an admin action.
//
// verify_jwt: FALSE — this project uses ES256 JWTs which the Supabase gateway
// cannot validate (it only supports HS256). We verify the token ourselves
// by calling adminClient.auth.getUser(jwt) which uses the auth service
// and supports ES256 natively.
//
// Request body:
//   { email: string, password: string, displayName: string, role: 'admin' | 'producer' | 'requester' }

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

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()

  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Admin client — for privileged DB + Auth Admin operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Verify the caller's JWT using the auth service (supports ES256 tokens)
  const { data: { user: callerUser }, error: authError } = await adminClient.auth.getUser(jwt)
  if (authError || !callerUser) {
    console.error('create-user: getUser failed:', authError?.message)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check that the caller has admin role in their profile
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, team_id')
    .eq('id', callerUser.id)
    .single()

  if (profileError || !callerProfile) {
    return new Response(JSON.stringify({ error: 'Could not verify caller profile' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (callerProfile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'email and password are required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!['admin', 'producer', 'requester'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Invalid role' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const newUserId = newUserData.user.id

  // Update the profile with correct team_id, display_name, and role
  // (DB trigger creates it with first-team + requester — override both)
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ team_id: callerProfile.team_id, display_name: displayName, role })
    .eq('id', newUserId)

  if (updateError) {
    console.error('Profile update failed:', updateError.message)
    return new Response(
      JSON.stringify({ userId: newUserId, warning: 'Profile update failed: ' + updateError.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  console.log('create-user: created', email, 'as', role, 'for team', callerProfile.team_id)
  return new Response(JSON.stringify({ userId: newUserId }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
