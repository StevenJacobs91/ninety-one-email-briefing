// Supabase Edge Function: create-user
// Creates a new auth user + profile as an admin action.
//
// verify_jwt: FALSE — this project uses ES256 JWTs which the Supabase gateway
// cannot validate (it only supports HS256). We verify the token ourselves
// by calling adminClient.auth.getUser(jwt) which uses the auth service
// and supports ES256 natively.
//
// Request body:
//   { email: string, password: string, displayName: string, role: 'admin' | 'producer' | 'requester', restore?: boolean }
//
// If the email belongs to a login whose profile was removed, the response is 409 with
// code REMOVED_USER. Sending the same request with restore: true brings that user back:
// same login, password reset to the one supplied, profile recreated.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Finds an auth user by email (the admin API has no lookup by email, so page through).
async function findAuthUserByEmail(client: ReturnType<typeof createClient>, email: string) {
  const wanted = email.toLowerCase()
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) return null
    const match = data.users.find((u) => u.email?.toLowerCase() === wanted)
    if (match) return match
    if (data.users.length < 200) return null
  }
  return null
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
  let email: string, password: string, displayName: string, role: string, restore = false
  try {
    const body = await req.json()
    email = body.email?.trim()
    password = body.password
    displayName = body.displayName?.trim() || email
    role = body.role || 'requester'
    restore = body.restore === true
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
  const createArgs = {
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  }
  const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser(createArgs)

  // The email already has a login. If a profile still exists it is a real user; if not, the
  // user was removed and can be restored rather than created again.
  if (createError && /already.*(registered|exists)/i.test(createError.message)) {
    const orphan = await findAuthUserByEmail(adminClient, email)
    if (orphan) {
      const { data: existingProfile } = await adminClient
        .from('profiles').select('id').eq('id', orphan.id).maybeSingle()
      if (existingProfile) {
        return new Response(JSON.stringify({ error: 'A user with this email already exists.', code: 'USER_EXISTS' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!restore) {
        return new Response(JSON.stringify({
          error: 'This email belongs to a user who was removed. You can restore them instead.',
          code: 'REMOVED_USER',
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Restore: same login, new password, profile recreated with the details supplied.
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(orphan.id, {
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      })
      if (updateAuthError) {
        return new Response(JSON.stringify({ error: `Could not restore the login: ${updateAuthError.message}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const profile = { id: orphan.id, team_id: callerProfile.team_id, display_name: displayName, role }
      let { error: profileError } = await adminClient.from('profiles').upsert({ ...profile, email })
      if (profileError && /email/i.test(profileError.message)) {
        // Some schemas keep the email only on the login; retry without the column.
        ;({ error: profileError } = await adminClient.from('profiles').upsert(profile))
      }
      if (profileError) {
        return new Response(JSON.stringify({ error: `Could not restore the profile: ${profileError.message}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      console.log('create-user: restored', email, 'as', role, 'for team', callerProfile.team_id)
      return new Response(JSON.stringify({ userId: orphan.id, restored: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

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
