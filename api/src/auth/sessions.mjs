import { createHash } from 'node:crypto'
import { withTenant } from '../db.mjs'

const INVALID_TEXT_REPRESENTATION = '22P02'

export function hashState(state) {
  return createHash('sha256').update(state).digest('hex')
}

export async function createSession(pool, { profileId, teamId, ttlSeconds, userAgent, ip }) {
  return withTenant(pool, teamId, async (c) => {
    const { rows } = await c.query(
      `insert into sessions (profile_id, team_id, expires_at, user_agent, ip)
       values ($1, $2, now() + make_interval(secs => $3), $4, $5) returning id`,
      [profileId, teamId, ttlSeconds, userAgent ?? null, ip ?? null])
    return rows[0].id
  })
}

// Runs before a tenant is known, so it goes through a SECURITY DEFINER
// function rather than an escalated connection. A malformed uuid is simply not
// a session; anything else is the database refusing us and must not be
// flattened into "not signed in".
export async function resolveSession(pool, id) {
  if (!id) return null
  let rows
  try {
    ({ rows } = await pool.query('select * from public.lookup_session($1)', [id]))
  } catch (err) {
    if (err.code === INVALID_TEXT_REPRESENTATION) return null
    throw err
  }
  if (!rows.length) return null
  const r = rows[0]
  return { id: r.id, profileId: r.profile_id, teamId: r.team_id,
           role: r.role, displayName: r.display_name, email: r.email }
}

export async function revokeSession(pool, id) {
  if (!id) return
  try {
    await pool.query('select public.revoke_session($1)', [id])
  } catch (err) {
    if (err.code !== INVALID_TEXT_REPRESENTATION) throw err
  }
}

export async function openAuthRequest(pool, state) {
  await pool.query('select public.open_auth_request($1)', [hashState(state)])
}

// Single use: the second call finds nothing to delete and returns false.
export async function claimAuthRequest(pool, state) {
  const { rows } = await pool.query('select public.claim_auth_request($1) as ok', [hashState(state)])
  return rows[0].ok === true
}
