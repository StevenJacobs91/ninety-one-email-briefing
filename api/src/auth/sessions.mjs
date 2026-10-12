import { withTenant, withoutTenant } from '../db.mjs'

export async function createSession(pool, { profileId, teamId, ttlSeconds, userAgent, ip }) {
  return withTenant(pool, teamId, async (c) => {
    const { rows } = await c.query(
      `insert into sessions (profile_id, team_id, expires_at, user_agent, ip)
       values ($1, $2, now() + make_interval(secs => $3), $4, $5) returning id`,
      [profileId, teamId, ttlSeconds, userAgent ?? null, ip ?? null])
    return rows[0].id
  })
}

// Privileged by necessity: the tenant is unknown until the session is read.
// A malformed uuid is simply not a session, so a cast error resolves to null.
export async function resolveSession(pool, id) {
  if (!id) return null
  try {
    return await withoutTenant(pool, async (c) => {
      const { rows } = await c.query(
        `select s.id, s.profile_id, s.team_id, p.role, p.display_name, p.email
           from sessions s join profiles p on p.id = s.profile_id
          where s.id = $1 and s.revoked_at is null and s.expires_at > now()`, [id])
      if (!rows.length) return null
      const r = rows[0]
      return { id: r.id, profileId: r.profile_id, teamId: r.team_id,
               role: r.role, displayName: r.display_name, email: r.email }
    })
  } catch { return null }
}

export async function revokeSession(pool, id) {
  if (!id) return
  try {
    await withoutTenant(pool, (c) =>
      c.query('update sessions set revoked_at = now() where id = $1', [id]))
  } catch { /* a malformed id revokes nothing */ }
}
