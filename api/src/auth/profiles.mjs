// Replaces Supabase's handle_new_user() trigger. The upsert lives in a
// SECURITY DEFINER function (db/migrations/009) because it runs before a tenant
// is known; the API stays as app_user throughout. ON CONFLICT makes it safe
// under two simultaneous first sign-ins, and it refreshes only the fields Entra
// owns — role and team_id belong to the application and are never reset.
export async function provisionProfile(pool, { oid, email, name, defaultTeamId }) {
  const { rows } = await pool.query(
    'select * from public.upsert_profile($1, $2, $3, $4)',
    [oid, defaultTeamId, name ?? '', email])
  const p = rows[0]
  return { id: p.id, teamId: p.team_id, role: p.role, displayName: p.display_name }
}
