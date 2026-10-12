import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'
import { compareSchema } from '../verify.mjs'
import expected from '../expected-schema.json' with { type: 'json' }

let c
const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'

before(async () => { c = new pg.Client(poolConfig()); await c.connect() })
after(async () => { await c.end() })

async function fresh() {
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
}
async function seedTwoTeams() {
  await c.query('insert into teams (id, name) values ($1, $2), ($3, $4)', [A, 'Team A', B, 'Team B'])
  await c.query('select seed_default_columns($1), seed_default_columns($2)', [A, B])
}

// ---- C1: convergence on a drifted database -------------------------------
test('C1 migrations converge when a table pre-exists without later columns', async () => {
  await c.query('drop schema public cascade; create schema public;')
  await c.query(`create extension if not exists pgcrypto`)
  await c.query(`create table public.teams (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now())`)
  // an older kanban_cards: no assignee / start_date / progress / comments
  await c.query(`create table public.kanban_cards (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams (id),
    brief_id text not null, email_name text not null default '', "column" text not null default 'briefed')`)
  await runMigrations(c)
  const { rows } = await c.query(`select column_name from information_schema.columns
    where table_name='kanban_cards' and column_name in ('assignee','start_date','progress','comments')`)
  assert.deepEqual(rows.map(r => r.column_name).sort(), ['assignee', 'comments', 'progress', 'start_date'])
})

// ---- C2: constraints reconciled on a pre-existing table -------------------
test('C2 the composite FK and progress CHECK are added to a pre-existing table', async () => {
  const { rows: fk } = await c.query(`select 1 from pg_constraint where conname='kanban_cards_column_fkey'`)
  const { rows: ck } = await c.query(`select 1 from pg_constraint where conname='kanban_cards_progress_check'`)
  assert.equal(fk.length, 1, 'composite FK missing after convergence')
  assert.equal(ck.length, 1, 'progress CHECK missing after convergence')
})

// ---- C2b: verify.mjs must notice a missing constraint ---------------------
test('C2b verify reports a dropped constraint, not just a dropped column', async () => {
  await fresh()
  await c.query('alter table kanban_cards drop constraint kanban_cards_progress_check')
  const r = await compareSchema(c, expected)
  assert.ok(r.missingConstraints.includes('kanban_cards_progress_check'),
    `expected missingConstraints to include it, got ${JSON.stringify(r.missingConstraints)}`)
})

// ---- I13: real idempotency, re-executing the SQL bodies -------------------
test('I13 re-executing every migration body against a complete schema succeeds', async () => {
  await fresh()
  const first = await compareSchema(c, expected)
  await c.query('drop table schema_migrations')
  const applied = await runMigrations(c)
  assert.equal(applied.length, 7, 'expected all 7 bodies to re-execute')
  const second = await compareSchema(c, expected)
  assert.deepEqual(second, first, 'schema changed after re-running the bodies')
})

// ---- I2: the view must not bypass RLS -------------------------------------
test('I2 team_members is scoped to the caller team', async () => {
  await fresh(); await seedTwoTeams()
  await c.query(`insert into profiles (id, team_id, display_name, email) values
    (gen_random_uuid(), $1, 'A user', 'a@x.com'), (gen_random_uuid(), $2, 'B user', 'b@x.com')`, [A, B])
  let rows
  await c.query('begin')
  try {
    await c.query('set local role app_user')
    await c.query(`select set_config('app.team_id', $1, true)`, [A])
    ;({ rows } = await c.query('select email from team_members'))
    await c.query('commit')
  } catch (e) { await c.query('rollback'); throw e }
  assert.deepEqual(rows.map(r => r.email), ['a@x.com'])
})

// ---- I3: provisioning a new team must remain possible ---------------------
test('I3 the owning role can still create a team after RLS is applied', async () => {
  await fresh()
  // Asserted structurally: this session is a superuser and bypasses RLS, so a
  // bare insert would pass even unfixed. FORCE on teams is what blocks the
  // non-superuser owning role on Azure from ever provisioning a tenant.
  const { rows: f } = await c.query(
    `select relforcerowsecurity from pg_class where oid='public.teams'::regclass`)
  assert.equal(f[0].relforcerowsecurity, false,
    'FORCE RLS on teams makes tenant provisioning impossible for the Azure owning role')
  const { rows } = await c.query(`insert into teams (name) values ('Ninety One Marketing') returning id`)
  assert.ok(rows[0].id)
})

// ---- I4: app_user must not own the migration ledger -----------------------
test('I4 app_user cannot write schema_migrations', async () => {
  await fresh()
  await c.query('begin')
  try {
    await c.query('set local role app_user')
    await assert.rejects(c.query('delete from schema_migrations'), /permission denied/)
  } finally { await c.query('rollback') }
})

// ---- I6: text[] receiving an explicit NULL --------------------------------
test('I6 an explicit NULL into an array column is rejected, not stored', async () => {
  await fresh(); await seedTwoTeams()
  await assert.rejects(
    c.query(`insert into kanban_cards (team_id, brief_id, region) values ($1, 'n-1', $2)`, [A, null]),
    /not-null constraint/)
})

// ---- I8: brief_id uniqueness ---------------------------------------------
test('I8 a duplicate brief_id for the same team is rejected', async () => {
  await fresh(); await seedTwoTeams()
  await c.query(`insert into briefs (team_id, brief_id) values ($1, 'dup-1')`, [A])
  await assert.rejects(
    c.query(`insert into briefs (team_id, brief_id) values ($1, 'dup-1')`, [A]),
    /duplicate key value/)
})

// ---- I9: updated_at maintained everywhere it exists -----------------------
test('I9 every table with updated_at has a trigger maintaining it', async () => {
  await fresh()
  const { rows } = await c.query(`
    select c.relname from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      join information_schema.columns col
        on col.table_name=c.relname and col.table_schema='public' and col.column_name='updated_at'
     where n.nspname='public' and c.relkind='r'
       and not exists (select 1 from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal)
     order by 1`)
  assert.deepEqual(rows.map(r => r.relname), [])
})

// ---- I7: team_id indexed on every RLS-policied table ----------------------
test('I7 every policied table has an index leading with team_id', async () => {
  await fresh()
  const { rows } = await c.query(`
    select t.tablename from pg_policies p
      join pg_tables t on t.tablename=p.tablename and t.schemaname='public'
     where p.schemaname='public' and t.tablename <> 'teams'
       and not exists (
         select 1 from pg_index i
           join pg_class ic on ic.oid=i.indexrelid
           join pg_class tc on tc.oid=i.indrelid
          where tc.relname=t.tablename and i.indisvalid
            and (select attname from pg_attribute
                  where attrelid=i.indrelid and attnum=i.indkey[0]) = 'team_id'
            and i.indpred is null)
     group by t.tablename order by 1`)
  assert.deepEqual(rows.map(r => r.tablename), [])
})

// ---- C3 / I1: the session-variable contract -------------------------------
test('C3 a transaction-local team id does not survive the transaction', async () => {
  await fresh()
  await c.query('begin')
  await c.query(`select set_config('app.team_id', $1, true)`, [A])
  await c.query('commit')
  const { rows } = await c.query(`select current_setting('app.team_id', true) as v`)
  assert.ok(rows[0].v === null || rows[0].v === '', `GUC leaked after commit: ${rows[0].v}`)
})

test('I1 an unset team id denies rather than exposing rows', async () => {
  await fresh(); await seedTwoTeams()
  let rows
  await c.query('begin')
  try {
    await c.query('set local role app_user')
    ;({ rows } = await c.query('select id from kanban_columns'))
  } finally { await c.query('rollback') }
  assert.equal(rows.length, 0)
})

// ---- I14: documented delete behaviour across every child table ------------
test('I14 deleting a team is blocked by each restricting child table', async () => {
  const restricting = ['profiles', 'settings', 'briefs', 'drafts', 'audit_log', 'kanban_cards',
    'approvals', 'approval_comments', 'send_time_events', 'benchmark_entries',
    'audience_health_snapshots', 'campaigns', 'campaign_briefs']
  const { rows } = await (async () => {
    await fresh()
    return c.query(`select conrelid::regclass::text as tbl, confdeltype from pg_constraint
      where contype='f' and confrelid='public.teams'::regclass order by 1`)
  })()
  const byTable = Object.fromEntries(rows.map(r => [r.tbl.replace('public.', ''), r.confdeltype]))
  for (const t of restricting) {
    assert.equal(byTable[t], 'r', `${t}.team_id should RESTRICT on team delete, got '${byTable[t]}'`)
  }
  for (const t of ['kanban_columns', 'planner_settings']) {
    assert.equal(byTable[t], 'c', `${t}.team_id is documented as CASCADE, got '${byTable[t]}'`)
  }
})

// ---- I11: TLS must not fail open ------------------------------------------
test('I11 TLS is only disabled by an explicit opt-out', async () => {
  assert.deepEqual(poolConfig({ PGSSL: 'require' }).ssl, { rejectUnauthorized: true })
  assert.deepEqual(poolConfig({ PGSSL: 'true' }).ssl, { rejectUnauthorized: true })
  assert.deepEqual(poolConfig({ PGSSL: 'REQUIRE' }).ssl, { rejectUnauthorized: true })
  assert.deepEqual(poolConfig({}).ssl, { rejectUnauthorized: true })
  assert.equal(poolConfig({ PGSSL: 'off' }).ssl, false)
  assert.equal(poolConfig({ PGSSL: 'disable' }).ssl, false)
  assert.throws(() => poolConfig({ PGSSL: 'maybe' }), /PGSSL/)
})

// ---- I10: concurrent migration runs are serialised ------------------------
test('I10 the migration runner takes and releases an advisory lock', async () => {
  await fresh()
  const { rows } = await c.query(`select count(*)::int n from pg_locks where locktype='advisory'`)
  assert.equal(rows[0].n, 0, 'advisory lock not released after the run')
})
