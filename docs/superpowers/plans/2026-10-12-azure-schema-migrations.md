# Azure Schema & Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce reproducible, idempotent SQL migrations that create the complete application schema on Azure Database for PostgreSQL, with Supabase `auth` dependencies replaced by Entra ID identifiers.

**Architecture:** A standalone `db/` workspace holding numbered `.sql` migrations and a ~60-line Node runner that applies them inside a transaction and records them in `schema_migrations`. Every migration is written `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so it converges an empty, partially-migrated, or complete database to the same end state. Tests run against a local PostgreSQL 17 container; the same migrations are then applied to Azure from inside the VNet.

**Tech Stack:** PostgreSQL 17, Node 24 (ESM, no build step), `pg`, `node:test`, Docker Compose.

**Spec:** `docs/azure-migration-spec.md`

## Global Constraints

- PostgreSQL **17** (Azure Flexible Server; source project ran 17.6).
- Node **24**, ESM only. The `db/` workspace is separate from the frontend `package.json`.
- Runtime dependency for `db/`: **`pg` only**. No ORM, no migration framework.
- All connections use TLS. Pool config sets `ssl: { rejectUnauthorized: true }` against Azure; local container uses `ssl: false`.
- Every migration is **idempotent** — re-running the full set against a complete database must succeed and change nothing.
- Migrations are **forward-only**. No down migrations.
- Column nullability, defaults and CHECK constraints **mirror the Supabase source exactly**, except the `auth.users` changes in §6 of the spec. Faithfulness keeps the reconciliation report clean.
- `column` is a reserved word. In `kanban_cards` it must always be written `"column"`.
- Identity columns hold the Entra ID **object ID (`oid`)** as `uuid`. There is no `auth` schema.
- No credentials in any committed file. Connection details come from environment variables only.
- British spelling in user-facing copy and in column names that already use it (`colour`).

## Review Focus

1. **Re-running migrations against a partially-migrated Azure database** must converge, not fail or destroy data — the stated reason for idempotency. Pinned in Task 1.
2. **Inserting a `kanban_cards` row for a team with no `kanban_columns` rows** must fail loudly on the composite foreign key rather than appear to work. This is the known production landmine. Pinned in Task 4.
3. **`progress` outside 0–100, and the `role` / `status` / `segment_type` enumerations** must be rejected by CHECK constraints, not silently stored. Pinned in Tasks 2, 4, 6.
4. **Deleting a team** must not leave orphaned rows in nine child tables. Behaviour must be explicit (RESTRICT), not whatever Postgres defaults to. Pinned in Task 2.
5. **`text[]` columns receiving `NULL` from a client that omitted the field** must behave predictably — the app sends `undefined` for unset regions/channels. Pinned in Task 4.

---

## Task 1: `db/` workspace, local Postgres, migration runner

**Files:**
- Create: `db/package.json`
- Create: `db/docker-compose.yml`
- Create: `db/migrate.mjs`
- Create: `db/lib/connect.mjs`
- Create: `db/.env.example`
- Create: `db/migrations/.gitkeep`
- Test: `db/test/runner.test.mjs`
- Modify: `.gitignore` (append `db/.env`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `db/lib/connect.mjs` → `export function poolConfig(env = process.env): object` and `export async function withClient(fn): Promise<any>`
  - `db/migrate.mjs` → CLI: `node migrate.mjs up`; `export async function runMigrations(client, dir): Promise<string[]>` returning applied filenames in order.

- [ ] **Step 1: Create the workspace manifest and local database**

`db/package.json`:
```json
{
  "name": "ni-briefing-db",
  "private": true,
  "type": "module",
  "scripts": {
    "db:up": "docker compose up -d && sleep 3",
    "db:down": "docker compose down -v",
    "migrate": "node migrate.mjs up",
    "test": "node --test test/"
  },
  "dependencies": { "pg": "^8.13.1" }
}
```

`db/docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: postgres
    ports: ["55432:5432"]
```

`db/.env.example`:
```
# Local development
PGHOST=localhost
PGPORT=55432
PGUSER=postgres
PGDATABASE=postgres
PGPASSWORD=localdev
PGSSL=off

# Azure (run from inside the VNet; never commit real values)
# PGHOST=psql-ny1emailbrief-dev-uks-001.postgres.database.azure.com
# PGPORT=5432
# PGUSER=ny1emailbriefing
# PGDATABASE=postgres
# PGPASSWORD=           # from Azure Key Vault, not this file
# PGSSL=require
```

- [ ] **Step 2: Write the failing test**

`db/test/runner.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let client
before(async () => {
  client = new pg.Client(poolConfig())
  await client.connect()
  await client.query('drop table if exists schema_migrations, widget')
})
after(async () => {
  await client.query('drop table if exists schema_migrations, widget')
  await client.end()
})

async function fixtureDir() {
  const dir = await mkdtemp(join(tmpdir(), 'mig-'))
  await writeFile(join(dir, '001_widget.sql'),
    'create table if not exists widget (id int primary key);')
  return dir
}

test('applies pending migrations in filename order', async () => {
  const dir = await fixtureDir()
  const applied = await runMigrations(client, dir)
  assert.deepEqual(applied, ['001_widget.sql'])
  const { rows } = await client.query("select to_regclass('public.widget') as t")
  assert.ok(rows[0].t)
})

test('re-running applies nothing and does not fail', async () => {
  const dir = await fixtureDir()
  await runMigrations(client, dir)
  const second = await runMigrations(client, dir)
  assert.deepEqual(second, [])
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd db && npm install && npm run db:up && npm test`
Expected: FAIL — `Cannot find module '../lib/connect.mjs'`

- [ ] **Step 4: Implement the connection helper and runner**

`db/lib/connect.mjs`:
```javascript
import pg from 'pg'

export function poolConfig(env = process.env) {
  const ssl = env.PGSSL === 'require' ? { rejectUnauthorized: true } : false
  return {
    host: env.PGHOST,
    port: Number(env.PGPORT ?? 5432),
    user: env.PGUSER,
    database: env.PGDATABASE,
    password: env.PGPASSWORD,
    ssl,
  }
}

export async function withClient(fn) {
  const client = new pg.Client(poolConfig())
  await client.connect()
  try { return await fn(client) } finally { await client.end() }
}
```

`db/migrate.mjs`:
```javascript
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withClient } from './lib/connect.mjs'

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

export async function runMigrations(client, dir = DEFAULT_DIR) {
  await client.query(`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )`)

  const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()
  const { rows } = await client.query('select filename from schema_migrations')
  const done = new Set(rows.map(r => r.filename))
  const applied = []

  for (const file of files) {
    if (done.has(file)) continue
    const sql = await readFile(join(dir, file), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations (filename) values ($1)', [file])
      await client.query('commit')
      applied.push(file)
      console.log(`applied ${file}`)
    } catch (err) {
      await client.query('rollback')
      throw new Error(`migration ${file} failed: ${err.message}`, { cause: err })
    }
  }
  return applied
}

if (process.argv[2] === 'up') {
  await withClient(c => runMigrations(c))
  console.log('migrations up to date')
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd db && npm test`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add db/ .gitignore
git commit -m "feat(db): add migration workspace, runner and local postgres"
```

---

## Task 2: Foundation — extensions, `teams`, `profiles`, `team_members`

Replaces the Supabase `auth.users` dependency. `profiles.id` becomes the Entra object ID.

**Files:**
- Create: `db/migrations/001_foundation.sql`
- Test: `db/test/foundation.test.mjs`

**Interfaces:**
- Consumes: `runMigrations` from Task 1.
- Produces: tables `teams(id uuid, name text, created_at timestamptz)`, `profiles(id uuid, team_id uuid, display_name text, role text, email text, preset_client_groups text[], preset_regions text[], created_at timestamptz)`, view `team_members`, function `set_updated_at()`.

- [ ] **Step 1: Write the failing test**

`db/test/foundation.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
})
after(async () => { await c.end() })

test('a profile keyed on an Entra object id can be created', async () => {
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(
    `insert into profiles (id, team_id, display_name, email, role)
     values ($1, $2, 'Test User', 'test@ninetyone.com', 'admin')`, [USER, TEAM])
  const { rows } = await c.query('select role, team_id from profiles where id = $1', [USER])
  assert.equal(rows[0].role, 'admin')
  assert.equal(rows[0].team_id, TEAM)
})

test('no auth schema is referenced anywhere', async () => {
  const { rows } = await c.query(`
    select count(*)::int n from pg_constraint
     where contype = 'f' and confrelid::regclass::text like 'auth.%'`)
  assert.equal(rows[0].n, 0)
})

test('an invalid role is rejected', async () => {
  await assert.rejects(
    c.query(`insert into profiles (id, team_id, display_name, role)
             values (gen_random_uuid(), $1, 'X', 'superuser')`, [TEAM]),
    /profiles_role_check/)
})

test('deleting a team with profiles is blocked, not silently cascaded', async () => {
  await assert.rejects(c.query('delete from teams where id = $1', [TEAM]),
    /violates foreign key constraint/)
})

test('team_members exposes email without an auth join', async () => {
  const { rows } = await c.query('select id, email, display_name, role, team_id from team_members where id = $1', [USER])
  assert.equal(rows[0].email, 'test@ninetyone.com')
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/foundation.test.mjs`
Expected: FAIL — `relation "teams" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/001_foundation.sql`:
```sql
-- Foundation: extensions, tenancy, identity.
-- profiles.id holds the Microsoft Entra ID object id (oid). There is no auth schema.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id                   uuid primary key,                  -- Entra ID object id (oid)
  team_id              uuid not null references public.teams (id) on delete restrict,
  display_name         text not null default '',
  email                text,
  role                 text not null default 'requester'
                       constraint profiles_role_check
                       check (role in ('admin', 'producer', 'requester')),
  preset_client_groups text[] not null default '{}'::text[],
  preset_regions       text[] not null default '{}'::text[],
  created_at           timestamptz default now()
);

create index if not exists profiles_team_id_idx on public.profiles (team_id);

-- Rebuilt from profiles alone; the Supabase version joined auth.users for email.
create or replace view public.team_members as
  select id, team_id, display_name, email, role,
         preset_client_groups, preset_regions, created_at
    from public.profiles;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/foundation.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/001_foundation.sql db/test/foundation.test.mjs
git commit -m "feat(db): add teams, profiles keyed on Entra oid, team_members view"
```

---

## Task 3: Core records — `settings`, `briefs`, `drafts`, `audit_log`

**Files:**
- Create: `db/migrations/002_core.sql`
- Test: `db/test/core.test.mjs`

**Interfaces:**
- Consumes: `teams`, `profiles` from Task 2.
- Produces: tables `settings`, `briefs`, `drafts`, `audit_log`. All user references point at `profiles(id)`.

- [ ] **Step 1: Write the failing test**

`db/test/core.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name, email)
                 values ($1, $2, 'Test User', 'test@ninetyone.com')`, [USER, TEAM])
})
after(async () => { await c.end() })

test('settings is one row per team', async () => {
  await c.query(`insert into settings (team_id, data) values ($1, '{"brandThemes":[]}'::jsonb)`, [TEAM])
  await assert.rejects(
    c.query(`insert into settings (team_id, data) values ($1, '{}'::jsonb)`, [TEAM]),
    /duplicate key value/)
})

test('a brief stores its payload and defaults to draft status', async () => {
  await c.query(`insert into briefs (team_id, brief_id, created_by, campaign_name, data)
                 values ($1, 'brief-1', $2, 'Taking Stock', '{"campaign":{}}'::jsonb)`, [TEAM, USER])
  const { rows } = await c.query('select status from briefs where brief_id = $1', ['brief-1'])
  assert.equal(rows[0].status, 'draft')
})

test('an invalid brief status is rejected', async () => {
  await assert.rejects(
    c.query(`insert into briefs (team_id, brief_id, status) values ($1, 'b2', 'published')`, [TEAM]),
    /briefs_status_check/)
})

test('a draft name is unique per user per team', async () => {
  await c.query(`insert into drafts (team_id, user_id, name) values ($1, $2, 'Q4 draft')`, [TEAM, USER])
  await assert.rejects(
    c.query(`insert into drafts (team_id, user_id, name) values ($1, $2, 'Q4 draft')`, [TEAM, USER]),
    /duplicate key value/)
})

test('audit entries reference profiles, not auth.users', async () => {
  await c.query(`insert into audit_log (team_id, user_id, user_email, action)
                 values ($1, $2, 'test@ninetyone.com', 'Signed in')`, [TEAM, USER])
  const { rows } = await c.query('select category from audit_log where action = $1', ['Signed in'])
  assert.equal(rows[0].category, 'general')
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/core.test.mjs`
Expected: FAIL — `relation "settings" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/002_core.sql`:
```sql
-- Core records. All user references point at profiles(id) (Entra oid).

create table if not exists public.settings (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null unique references public.teams (id) on delete restrict,
  data       jsonb not null default '{}'::jsonb,
  version    integer not null default 1,
  updated_at timestamptz default now()
);

create table if not exists public.briefs (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  brief_id      text not null,
  created_by    uuid references public.profiles (id) on delete set null,
  campaign_name text not null default '',
  email_type    text not null default '',
  theme         text not null default '',
  status        text not null default 'draft'
                constraint briefs_status_check check (status in ('draft', 'submitted')),
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists briefs_team_brief_idx on public.briefs (team_id, brief_id);

create table if not exists public.drafts (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null default '',
  campaign_name text not null default '',
  email_type    text not null default '',
  data          jsonb not null default '{}'::jsonb,
  saved_at      timestamptz default now()
);

-- Mirrors the Supabase migration "add_drafts_unique_constraint".
create unique index if not exists drafts_team_user_name_key
  on public.drafts (team_id, user_id, name);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete restrict,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  user_email  text not null default '',
  user_name   text not null default '',
  action      text not null,
  category    text not null default 'general',
  entity_type text,
  entity_id   text,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

create index if not exists audit_log_team_created_idx
  on public.audit_log (team_id, created_at desc);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/core.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/002_core.sql db/test/core.test.mjs
git commit -m "feat(db): add settings, briefs, drafts and audit_log"
```

---

## Task 4: Board — `kanban_columns`, `kanban_cards`

Carries the composite foreign key that caused the known production landmine: a card cannot exist for a team whose board columns have not been seeded.

**Files:**
- Create: `db/migrations/003_board.sql`
- Test: `db/test/board.test.mjs`

**Interfaces:**
- Consumes: `teams` from Task 2.
- Produces: `kanban_columns(id text, team_id uuid, …)` with composite PK `(id, team_id)`; `kanban_cards(…)` with composite FK `(team_id, "column") → kanban_columns(team_id, id)`; function `seed_default_columns(uuid)`.

- [ ] **Step 1: Write the failing test**

`db/test/board.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const BARE = '33333333-3333-3333-3333-333333333333'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2), ($3, $4)',
    [TEAM, 'Marketing', BARE, 'Unseeded Team'])
  await c.query('select seed_default_columns($1)', [TEAM])
})
after(async () => { await c.end() })

test('seeding creates the three default columns', async () => {
  const { rows } = await c.query(
    'select id from kanban_columns where team_id = $1 order by display_order', [TEAM])
  assert.deepEqual(rows.map(r => r.id), ['briefed', 'in-progress', 'distributed'])
})

test('seeding twice is safe', async () => {
  await c.query('select seed_default_columns($1)', [TEAM])
  const { rows } = await c.query(
    'select count(*)::int n from kanban_columns where team_id = $1', [TEAM])
  assert.equal(rows[0].n, 3)
})

test('a card for a team with no seeded columns is rejected', async () => {
  await assert.rejects(
    c.query(`insert into kanban_cards (team_id, brief_id, email_name)
             values ($1, 'b-x', 'Unseeded')`, [BARE]),
    /violates foreign key constraint/)
})

test('a card for a seeded team is accepted and defaults to briefed', async () => {
  await c.query(`insert into kanban_cards (team_id, brief_id, email_name)
                 values ($1, 'b-1', 'Taking Stock')`, [TEAM])
  const { rows } = await c.query(`select "column", comments from kanban_cards where brief_id = 'b-1'`)
  assert.equal(rows[0].column, 'briefed')
  assert.deepEqual(rows[0].comments, [])
})

test('progress outside 0-100 is rejected', async () => {
  await assert.rejects(
    c.query(`insert into kanban_cards (team_id, brief_id, progress)
             values ($1, 'b-2', 150)`, [TEAM]),
    /kanban_cards_progress_check/)
})

test('omitted array columns default to empty, not null', async () => {
  await c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'b-3')`, [TEAM])
  const { rows } = await c.query(`select region, channel, client_group from kanban_cards where brief_id = 'b-3'`)
  assert.deepEqual(rows[0].region, [])
  assert.deepEqual(rows[0].channel, [])
  assert.deepEqual(rows[0].client_group, [])
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/board.test.mjs`
Expected: FAIL — `function seed_default_columns(uuid) does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/003_board.sql`:
```sql
-- Campaign board. kanban_cards."column" is a reserved word and must stay quoted.

create table if not exists public.kanban_columns (
  id            text not null,
  team_id       uuid not null references public.teams (id) on delete cascade,
  label         text not null,
  display_order integer not null,
  colour        text,
  wip_limit     integer,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (id, team_id)
);

create table if not exists public.kanban_cards (
  id                    uuid primary key default gen_random_uuid(),
  team_id               uuid not null references public.teams (id) on delete restrict,
  brief_id              text not null,
  email_name            text not null default '',
  email_type            text not null default '',
  theme                 text not null default '',
  subject_line          text not null default '',
  region                text[] default '{}'::text[],
  channel               text[] default '{}'::text[],
  client_group          text[] default '{}'::text[],
  send_date             text,
  content_approval_date text,
  urgency               text not null default 'standard',
  "column"              text not null default 'briefed',
  submitted_at          timestamptz default now(),
  column_history        jsonb default '[]'::jsonb,
  notes                 text default '',
  tags                  text default '',
  assignee              text,
  start_date            date,
  progress              integer
                        constraint kanban_cards_progress_check
                        check (progress >= 0 and progress <= 100),
  comments              jsonb not null default '[]'::jsonb,
  created_at            timestamptz default now(),
  constraint kanban_cards_column_fkey
    foreign key (team_id, "column")
    references public.kanban_columns (team_id, id)
);

create index if not exists kanban_cards_assignee_idx
  on public.kanban_cards (team_id, assignee) where assignee is not null;

create index if not exists kanban_cards_comments_gin_idx
  on public.kanban_cards using gin (comments);

-- Every team needs board columns before any card can be inserted.
create or replace function public.seed_default_columns(p_team_id uuid)
returns void language sql as $$
  insert into public.kanban_columns (id, team_id, label, display_order, is_default)
  values ('briefed',     p_team_id, 'Briefed',     0, true),
         ('in-progress', p_team_id, 'In Progress', 1, false),
         ('distributed', p_team_id, 'Distributed', 2, false)
  on conflict (id, team_id) do nothing;
$$;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/board.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/003_board.sql db/test/board.test.mjs
git commit -m "feat(db): add kanban columns and cards with seeding helper"
```

---

## Task 5: Approvals — `approvals`, `approval_comments`

**Files:**
- Create: `db/migrations/004_approvals.sql`
- Test: `db/test/approvals.test.mjs`

**Interfaces:**
- Consumes: `teams`, `profiles`, `set_updated_at()`.
- Produces: `approvals`, `approval_comments` (self-referencing `parent_id`), both with `updated_at` triggers.

- [ ] **Step 1: Write the failing test**

`db/test/approvals.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c, approvalId
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Test User')`, [USER, TEAM])
  const { rows } = await c.query(
    `insert into approvals (team_id, brief_id, email_name, requested_by, requested_by_name, approver_role)
     values ($1, 'b-1', 'Taking Stock', $2, 'Test User', 'brand_guardian') returning id`, [TEAM, USER])
  approvalId = rows[0].id
})
after(async () => { await c.end() })

test('an approval defaults to pending at stage 1', async () => {
  const { rows } = await c.query('select status, stage, total_stages from approvals where id = $1', [approvalId])
  assert.equal(rows[0].status, 'pending')
  assert.equal(rows[0].stage, 1)
  assert.equal(rows[0].total_stages, 1)
})

test('an invalid approver role is rejected', async () => {
  await assert.rejects(
    c.query(`insert into approvals (team_id, brief_id, email_name, requested_by, requested_by_name, approver_role)
             values ($1, 'b-2', 'X', $2, 'T', 'ceo')`, [TEAM, USER]),
    /approvals_approver_role_check/)
})

test('comments thread via parent_id', async () => {
  const { rows: parent } = await c.query(
    `insert into approval_comments (team_id, approval_id, brief_id, author_id, author_name, author_role, body)
     values ($1, $2, 'b-1', $3, 'Test User', 'admin', 'Top level') returning id`, [TEAM, approvalId, USER])
  await c.query(
    `insert into approval_comments (team_id, approval_id, brief_id, parent_id, author_id, author_name, author_role, body)
     values ($1, $2, 'b-1', $3, $4, 'Test User', 'admin', 'Reply')`, [TEAM, approvalId, parent[0].id, USER])
  const { rows } = await c.query(
    'select count(*)::int n from approval_comments where parent_id = $1', [parent[0].id])
  assert.equal(rows[0].n, 1)
})

test('deleting an approval removes its comments', async () => {
  const { rows } = await c.query(
    `insert into approvals (team_id, brief_id, email_name, requested_by, requested_by_name, approver_role)
     values ($1, 'b-9', 'Temp', $2, 'T', 'legal') returning id`, [TEAM, USER])
  await c.query(
    `insert into approval_comments (team_id, approval_id, brief_id, author_id, author_name, author_role, body)
     values ($1, $2, 'b-9', $3, 'T', 'admin', 'x')`, [TEAM, rows[0].id, USER])
  await c.query('delete from approvals where id = $1', [rows[0].id])
  const { rows: left } = await c.query(
    'select count(*)::int n from approval_comments where approval_id = $1', [rows[0].id])
  assert.equal(left[0].n, 0)
})

test('updated_at advances on update', async () => {
  const { rows: before } = await c.query('select updated_at from approvals where id = $1', [approvalId])
  await c.query(`update approvals set status = 'approved' where id = $1`, [approvalId])
  const { rows: after } = await c.query('select updated_at from approvals where id = $1', [approvalId])
  assert.ok(after[0].updated_at > before[0].updated_at)
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/approvals.test.mjs`
Expected: FAIL — `relation "approvals" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/004_approvals.sql`:
```sql
create table if not exists public.approvals (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams (id) on delete restrict,
  brief_id          text not null,
  email_name        text not null,
  status            text not null default 'pending'
                    constraint approvals_status_check
                    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  requested_by      uuid not null references public.profiles (id) on delete restrict,
  requested_by_name text not null,
  requested_at      timestamptz not null default now(),
  decided_by        uuid references public.profiles (id) on delete set null,
  decided_by_name   text,
  decided_at        timestamptz,
  decision_comment  text,
  approver_role     text not null
                    constraint approvals_approver_role_check
                    check (approver_role in ('brand_guardian', 'legal', 'manager', 'reviewer')),
  approver_user_id  uuid references public.profiles (id) on delete set null,
  due_date          timestamptz,
  stage             integer not null default 1,
  total_stages      integer not null default 1,
  version_snapshot  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists approvals_team_brief_idx on public.approvals (team_id, brief_id);

create table if not exists public.approval_comments (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete restrict,
  approval_id  uuid not null references public.approvals (id) on delete cascade,
  brief_id     text not null,
  parent_id    uuid references public.approval_comments (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete restrict,
  author_name  text not null,
  author_role  text not null,
  body         text not null,
  comment_type text not null default 'suggestion'
               constraint approval_comments_comment_type_check
               check (comment_type in ('approval', 'change_request', 'suggestion', 'question', 'private_note')),
  category     text not null default 'general'
               constraint approval_comments_category_check
               check (category in ('brand', 'grammar', 'compliance', 'general')),
  is_resolved  boolean not null default false,
  resolved_by  uuid references public.profiles (id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists approval_comments_approval_idx
  on public.approval_comments (approval_id, created_at);

drop trigger if exists approvals_updated_at on public.approvals;
create trigger approvals_updated_at
  before update on public.approvals
  for each row execute function public.set_updated_at();

drop trigger if exists approval_comments_updated_at on public.approval_comments;
create trigger approval_comments_updated_at
  before update on public.approval_comments
  for each row execute function public.set_updated_at();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/approvals.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/004_approvals.sql db/test/approvals.test.mjs
git commit -m "feat(db): add approvals and threaded approval comments"
```

---

## Task 6: Analytics — `send_time_events`, `benchmark_entries`, `audience_health_snapshots`

**Files:**
- Create: `db/migrations/005_analytics.sql`
- Test: `db/test/analytics.test.mjs`

**Interfaces:**
- Consumes: `teams`, `profiles`.
- Produces: the three analytics tables.

- [ ] **Step 1: Write the failing test**

`db/test/analytics.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
})
after(async () => { await c.end() })

test('a send time event records day and hour', async () => {
  await c.query(`insert into send_time_events
    (team_id, brief_id, campaign_name, email_type, sent_at, day_of_week, hour_of_day, delivered)
    values ($1, 'b-1', 'Taking Stock', 'newsletter', now(), 2, 9, 1200)`, [TEAM])
  const { rows } = await c.query('select unique_ctr from send_time_events where brief_id = $1', ['b-1'])
  assert.equal(Number(rows[0].unique_ctr), 0)
})

test('an out-of-range hour is rejected', async () => {
  await assert.rejects(
    c.query(`insert into send_time_events
      (team_id, brief_id, campaign_name, email_type, sent_at, day_of_week, hour_of_day)
      values ($1, 'b-2', 'X', 'newsletter', now(), 2, 24)`, [TEAM]),
    /send_time_events_hour_of_day_check/)
})

test('an invalid benchmark source is rejected', async () => {
  await assert.rejects(
    c.query(`insert into benchmark_entries (team_id, label, email_category, source)
             values ($1, 'Industry', 'newsletter', 'guesswork')`, [TEAM]),
    /benchmark_entries_source_check/)
})

test('an invalid segment type is rejected', async () => {
  await assert.rejects(
    c.query(`insert into audience_health_snapshots (team_id, snapshot_date, segment_type, segment_value)
             values ($1, current_date, 'postcode', 'ZA')`, [TEAM]),
    /audience_health_snapshots_segment_type_check/)
})

test('a health snapshot accepts a valid risk level', async () => {
  await c.query(`insert into audience_health_snapshots
    (team_id, snapshot_date, segment_type, segment_value, risk_level, churn_score)
    values ($1, current_date, 'region', 'South Africa', 'high', 0.72)`, [TEAM])
  const { rows } = await c.query(`select list_size from audience_health_snapshots where segment_value = 'South Africa'`)
  assert.equal(rows[0].list_size, 0)
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/analytics.test.mjs`
Expected: FAIL — `relation "send_time_events" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/005_analytics.sql`:
```sql
create table if not exists public.send_time_events (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  brief_id      text not null,
  campaign_name text not null,
  email_type    text not null,
  sent_at       timestamptz not null,
  day_of_week   smallint not null
                constraint send_time_events_day_of_week_check
                check (day_of_week >= 0 and day_of_week <= 6),
  hour_of_day   smallint not null
                constraint send_time_events_hour_of_day_check
                check (hour_of_day >= 0 and hour_of_day <= 23),
  delivered     integer not null default 0,
  unique_clicks integer not null default 0,
  unique_ctr    numeric not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists send_time_events_team_sent_idx
  on public.send_time_events (team_id, sent_at desc);

create table if not exists public.benchmark_entries (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references public.teams (id) on delete restrict,
  label             text not null,
  email_category    text not null,
  period_label      text,
  avg_open_rate     numeric,
  avg_unique_ctr    numeric,
  avg_click_to_open numeric,
  avg_list_growth   numeric,
  notes             text,
  source            text not null default 'manual'
                    constraint benchmark_entries_source_check
                    check (source in ('manual', 'import', 'litmus', 'mailchimp', 'other')),
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists benchmark_entries_updated_at on public.benchmark_entries;
create trigger benchmark_entries_updated_at
  before update on public.benchmark_entries
  for each row execute function public.set_updated_at();

create table if not exists public.audience_health_snapshots (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  snapshot_date date not null,
  segment_type  text not null
                constraint audience_health_snapshots_segment_type_check
                check (segment_type in ('region', 'channel', 'client_group', 'email_type')),
  segment_value text not null,
  delivered     integer not null default 0,
  unique_clicks integer not null default 0,
  unique_ctr    numeric not null default 0,
  list_size     integer not null default 0,
  churn_score   numeric,
  risk_level    text
                constraint audience_health_snapshots_risk_level_check
                check (risk_level in ('low', 'medium', 'high', 'critical')),
  created_at    timestamptz not null default now()
);

create index if not exists audience_health_snapshots_team_date_idx
  on public.audience_health_snapshots (team_id, snapshot_date desc);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/analytics.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/005_analytics.sql db/test/analytics.test.mjs
git commit -m "feat(db): add send time, benchmark and audience health tables"
```

---

## Task 7: Planner scaffolding — `campaigns`, `campaign_briefs`, `planner_settings`

These three tables exist in the Supabase project but no application code queries them. They are carried over so the schemas match and the planner work can proceed later.

**Files:**
- Create: `db/migrations/006_planner.sql`
- Test: `db/test/planner.test.mjs`

**Interfaces:**
- Consumes: `teams`, `profiles`.
- Produces: `campaigns`, `campaign_briefs`, `planner_settings`.

- [ ] **Step 1: Write the failing test**

`db/test/planner.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Test User')`, [USER, TEAM])
})
after(async () => { await c.end() })

test('a campaign defaults to planning and the brand green', async () => {
  await c.query(`insert into campaigns (team_id, name, created_by) values ($1, 'Q1 Push', $2)`, [TEAM, USER])
  const { rows } = await c.query(`select status, colour, tags from campaigns where name = 'Q1 Push'`)
  assert.equal(rows[0].status, 'planning')
  assert.equal(rows[0].colour, '#134848')
  assert.deepEqual(rows[0].tags, [])
})

test('an invalid campaign status is rejected', async () => {
  await assert.rejects(
    c.query(`insert into campaigns (team_id, name, created_by, status) values ($1, 'Bad', $2, 'live')`, [TEAM, USER]),
    /campaigns_status_check/)
})

test('deleting a campaign removes its brief links', async () => {
  const { rows } = await c.query(
    `insert into campaigns (team_id, name, created_by) values ($1, 'Temp', $2) returning id`, [TEAM, USER])
  await c.query(`insert into campaign_briefs (team_id, campaign_id, brief_id, added_by)
                 values ($1, $2, 'b-1', $3)`, [TEAM, rows[0].id, USER])
  await c.query('delete from campaigns where id = $1', [rows[0].id])
  const { rows: left } = await c.query(
    'select count(*)::int n from campaign_briefs where campaign_id = $1', [rows[0].id])
  assert.equal(left[0].n, 0)
})

test('planner settings is one row per team', async () => {
  await c.query(`insert into planner_settings (team_id, config) values ($1, '{"view":"kanban"}'::jsonb)`, [TEAM])
  await assert.rejects(
    c.query(`insert into planner_settings (team_id) values ($1)`, [TEAM]),
    /duplicate key value/)
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/planner.test.mjs`
Expected: FAIL — `relation "campaigns" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/006_planner.sql`:
```sql
-- Carried over from Supabase for schema parity. No application code reads these yet.

create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete restrict,
  name        text not null,
  description text,
  status      text not null default 'planning'
              constraint campaigns_status_check
              check (status in ('planning', 'active', 'paused', 'completed', 'archived')),
  colour      text not null default '#134848',
  start_date  date,
  end_date    date,
  owner_id    uuid references public.profiles (id) on delete set null,
  created_by  uuid not null references public.profiles (id) on delete restrict,
  tags        text[] not null default '{}'::text[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create table if not exists public.campaign_briefs (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete restrict,
  campaign_id   uuid not null references public.campaigns (id) on delete cascade,
  brief_id      text not null,
  display_order integer not null default 0,
  added_by      uuid not null references public.profiles (id) on delete restrict,
  added_at      timestamptz not null default now()
);

create index if not exists campaign_briefs_campaign_idx
  on public.campaign_briefs (campaign_id, display_order);

create table if not exists public.planner_settings (
  team_id    uuid primary key references public.teams (id) on delete cascade,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/planner.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/006_planner.sql db/test/planner.test.mjs
git commit -m "feat(db): carry over campaigns, campaign_briefs and planner_settings"
```

---

## Task 8: Defence-in-depth RLS keyed on `app.team_id`

Implements spec §5.4. Replaces Supabase's JWT-based policies with policies that read a session variable the API sets per transaction.

> **Deployment order:** this migration must not reach Azure until the API sets `SET LOCAL app.team_id` on every transaction (subsystem 2). Applying it earlier locks out a connection that does not set the variable. Hold it behind the subsystem 2 release.
>
> **Hold lifted 2026-10-12** by subsystem 2 Task 8: `api/src/db.mjs` establishes the contract and `api/test/security/isolation.test.mjs` verifies it end to end. Apply 001–006, deploy the API, then 007 and 008.

**Files:**
- Create: `db/migrations/007_rls.sql`
- Test: `db/test/rls.test.mjs`

**Interfaces:**
- Consumes: every table from Tasks 2–7.
- Produces: role `app_user`; function `current_team_id()`; RLS policies on all 16 tables.

- [ ] **Step 1: Write the failing test**

`db/test/rls.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2), ($3, $4)',
    [A, 'Team A', B, 'Team B'])
  await c.query('select seed_default_columns($1), seed_default_columns($2)', [A, B])
  await c.query(`insert into kanban_cards (team_id, brief_id, email_name)
                 values ($1, 'a-1', 'Team A card'), ($2, 'b-1', 'Team B card')`, [A, B])
})
after(async () => { await c.end() })

async function asTeam(teamId, sql, params = []) {
  await c.query('begin')
  try {
    await c.query('set local role app_user')
    await c.query('select set_config($1, $2, true)', ['app.team_id', teamId])
    const res = await c.query(sql, params)
    await c.query('commit')
    return res
  } catch (e) { await c.query('rollback'); throw e }
}

test('a team sees only its own cards', async () => {
  const { rows } = await asTeam(A, 'select brief_id from kanban_cards')
  assert.deepEqual(rows.map(r => r.brief_id), ['a-1'])
})

test('a team cannot read another team rows', async () => {
  const { rows } = await asTeam(B, `select brief_id from kanban_cards where brief_id = 'a-1'`)
  assert.equal(rows.length, 0)
})

test('a team cannot update another team rows', async () => {
  const res = await asTeam(B, `update kanban_cards set notes = 'hacked' where brief_id = 'a-1'`)
  assert.equal(res.rowCount, 0)
})

test('a team cannot delete another team rows', async () => {
  const res = await asTeam(B, `delete from kanban_cards where brief_id = 'a-1'`)
  assert.equal(res.rowCount, 0)
})

test('inserting a row for another team is blocked', async () => {
  await assert.rejects(
    asTeam(B, `insert into kanban_cards (team_id, brief_id) values ($1, 'forged')`, [A]),
    /row-level security/)
})

test('every public table has RLS enabled', async () => {
  const { rows } = await c.query(`
    select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relname <> 'schema_migrations' and not c.relrowsecurity`)
  assert.deepEqual(rows.map(r => r.relname), [])
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/rls.test.mjs`
Expected: FAIL — `role "app_user" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/007_rls.sql`:
```sql
-- Defence in depth. The API sets `app.team_id` per transaction with SET LOCAL.
-- Without it, current_team_id() returns NULL and every policy denies.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end
$$;

grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant select on public.team_members to app_user;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;

create or replace function public.current_team_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.team_id', true), '')::uuid;
$$;

revoke execute on function public.current_team_id() from public;
grant execute on function public.current_team_id() to app_user;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','settings','briefs','drafts','audit_log',
    'kanban_columns','kanban_cards','approvals','approval_comments',
    'send_time_events','benchmark_entries','audience_health_snapshots',
    'campaigns','campaign_briefs','planner_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    execute format(
      'create policy %I on public.%I using (team_id = public.current_team_id())
         with check (team_id = public.current_team_id())',
      t || '_tenant', t);
  end loop;
end
$$;

-- teams has no team_id column; scope it by primary key instead.
alter table public.teams enable row level security;
alter table public.teams force row level security;
drop policy if exists teams_tenant on public.teams;
create policy teams_tenant on public.teams
  using (id = public.current_team_id())
  with check (id = public.current_team_id());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/rls.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/007_rls.sql db/test/rls.test.mjs
git commit -m "feat(db): add tenant RLS policies keyed on app.team_id"
```

---

## Task 9: Reconciliation report against the Azure database

Answers "we're not sure what the schema looks like" with evidence. Read-only; safe to run against Azure.

**Files:**
- Create: `db/verify.mjs`
- Create: `db/expected-schema.json`
- Test: `db/test/verify.test.mjs`
- Modify: `db/package.json` (add `"verify": "node verify.mjs"`)

**Interfaces:**
- Consumes: `withClient` from Task 1.
- Produces: `export async function compareSchema(client, expected): Promise<{missingTables: string[], extraTables: string[], missingColumns: string[], authReferences: string[]}>`; CLI `node verify.mjs` printing the report and exiting non-zero on any difference.

- [ ] **Step 1: Write the failing test**

`db/test/verify.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'
import { compareSchema } from '../verify.mjs'
import expected from '../expected-schema.json' with { type: 'json' }

let c
before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
})
after(async () => { await c.end() })

test('a fully migrated database reports no differences', async () => {
  const r = await compareSchema(c, expected)
  assert.deepEqual(r.missingTables, [])
  assert.deepEqual(r.missingColumns, [])
  assert.deepEqual(r.authReferences, [])
})

test('a dropped column is reported', async () => {
  await c.query('alter table kanban_cards drop column assignee')
  const r = await compareSchema(c, expected)
  assert.ok(r.missingColumns.includes('kanban_cards.assignee'))
  await c.query('alter table kanban_cards add column assignee text')
})

test('a dropped table is reported', async () => {
  await c.query('drop table planner_settings')
  const r = await compareSchema(c, expected)
  assert.ok(r.missingTables.includes('planner_settings'))
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && npm test -- test/verify.test.mjs`
Expected: FAIL — `Cannot find module '../verify.mjs'`

- [ ] **Step 3: Generate the expected schema and write the comparer**

Generate `db/expected-schema.json` from the freshly migrated local database:

```bash
cd db && node -e "
import('./lib/connect.mjs').then(async ({ withClient }) => {
  await withClient(async c => {
    const { rows } = await c.query(\`
      select table_name, column_name from information_schema.columns
       where table_schema='public' and table_name <> 'schema_migrations'
       order by table_name, column_name\`)
    const out = {}
    for (const r of rows) (out[r.table_name] ??= []).push(r.column_name)
    console.log(JSON.stringify(out, null, 2))
  })
})" > expected-schema.json
```

`db/verify.mjs`:
```javascript
import { withClient } from './lib/connect.mjs'
import expected from './expected-schema.json' with { type: 'json' }

export async function compareSchema(client, spec) {
  const { rows } = await client.query(`
    select table_name, column_name from information_schema.columns
     where table_schema = 'public' and table_name <> 'schema_migrations'`)

  const actual = {}
  for (const r of rows) (actual[r.table_name] ??= new Set()).add(r.column_name)

  const missingTables = Object.keys(spec).filter(t => !actual[t]).sort()
  const extraTables = Object.keys(actual).filter(t => !spec[t]).sort()
  const missingColumns = []
  for (const [table, cols] of Object.entries(spec)) {
    if (!actual[table]) continue
    for (const col of cols) if (!actual[table].has(col)) missingColumns.push(`${table}.${col}`)
  }

  const { rows: auth } = await client.query(`
    select conname, conrelid::regclass::text as tbl from pg_constraint
     where contype = 'f' and confrelid::regclass::text like 'auth.%'`)

  return {
    missingTables, extraTables, missingColumns: missingColumns.sort(),
    authReferences: auth.map(r => `${r.tbl} (${r.conname})`).sort(),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await withClient(c => compareSchema(c, expected))
  const problems =
    r.missingTables.length + r.missingColumns.length + r.authReferences.length

  console.log('\n=== Schema reconciliation ===')
  console.log('Missing tables :', r.missingTables.join(', ') || 'none')
  console.log('Missing columns:', r.missingColumns.join(', ') || 'none')
  console.log('auth.* FKs     :', r.authReferences.join(', ') || 'none')
  console.log('Extra tables   :', r.extraTables.join(', ') || 'none  (informational)')
  console.log(problems === 0 ? '\nSchema matches.' : `\n${problems} difference(s).`)
  process.exit(problems === 0 ? 0 : 1)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test -- test/verify.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Run the full suite**

Run: `cd db && npm test`
Expected: PASS, all suites.

- [ ] **Step 6: Commit**

```bash
git add db/verify.mjs db/expected-schema.json db/test/verify.test.mjs db/package.json
git commit -m "feat(db): add schema reconciliation report"
```

---

## Applying to Azure

From a workstation on the corporate network or VPN, or an Azure Cloud Shell inside the VNet. Migrations 001–006 only; hold 007 for subsystem 2 (see Task 8).

```bash
cd db
cp .env.example .env            # fill in Azure values; never commit this file
export PGSSL=require
npm run verify                  # before: what is actually there
npm run migrate                 # converges the schema
npm run verify                  # after: expect "Schema matches."
```

Then seed the first team and board columns:

```sql
insert into teams (name) values ('Ninety One Marketing') returning id;
select seed_default_columns('<team-id>');
```

Profiles are created automatically on first Entra sign-in (subsystem 2). To grant the first administrator before that exists, insert the row manually using the user's Entra object id:

```sql
insert into profiles (id, team_id, display_name, email, role)
values ('<entra-object-id>', '<team-id>', 'Steven Jacobs', 'steven.jacobs@ninetyone.com', 'admin');
```

---

## Self-review notes

- **Spec coverage:** §6 of the spec lists seven required data-model changes; all appear — `auth.users` FKs re-pointed (Tasks 2, 3, 5, 6, 7), `team_members` rebuilt (Task 2), `handle_new_user()` dropped in favour of API provisioning (noted in Task 2, implemented in subsystem 2), helper functions replaced by `current_team_id()` (Task 8), `pgcrypto` created (Task 2), `kanban_columns` seeding (Task 4).
- **Deliberate additions beyond the Supabase source:** foreign keys from `kanban_columns.team_id`, `approvals.team_id`, `approval_comments.team_id`, and the analytics tables to `teams(id)`, which the source lacked; and explicit `on delete` behaviour everywhere. Both tighten integrity and are safe on an effectively empty database. The reconciliation report will flag these as expected differences against any partially-migrated Azure copy.
- **Inferred, needs confirmation at execution time:** the `drafts` unique constraint is reconstructed as `(team_id, user_id, name)` from the Supabase migration named `add_drafts_unique_constraint`; the exact columns were not readable. If the Azure copy has a different unique index, Task 3's test will still pass but `npm run verify` will not flag it — check it by hand during the first Azure run.
