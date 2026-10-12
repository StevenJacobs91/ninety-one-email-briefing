import { withoutTenant } from '../db.mjs'

// Replaces Supabase's handle_new_user() trigger. ON CONFLICT makes it safe
// under two simultaneous first sign-ins. DO UPDATE refreshes only the fields
// Entra owns; role and team_id belong to the application and are never reset.
export async function provisionProfile(pool, { oid, email, name, defaultTeamId }) {
  return withoutTenant(pool, async (c) => {
    const { rows } = await c.query(
      `insert into profiles (id, team_id, display_name, email)
            values ($1, $2, $3, $4)
       on conflict (id) do update
              set display_name = excluded.display_name,
                  email        = excluded.email
         returning id, team_id, role, display_name`,
      [oid, defaultTeamId, name ?? '', email])
    const p = rows[0]
    return { id: p.id, teamId: p.team_id, role: p.role, displayName: p.display_name }
  })
}
