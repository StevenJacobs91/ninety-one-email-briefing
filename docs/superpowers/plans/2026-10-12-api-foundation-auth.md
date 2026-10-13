# API Foundation & Entra ID Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Fastify API in `api/` that authenticates staff against Microsoft Entra ID, issues its own revocable session, and exposes a tenant-scoped database helper that every later endpoint must go through.

**Architecture:** OIDC authorization-code flow with PKCE against the Entra v2.0 endpoints. The API verifies the returned `id_token` against Entra's JWKS with `jose`, provisions a `profiles` row on first sign-in keyed on the Entra object id (`oid`), and creates a server-side session row. The browser holds only an opaque, signed, HTTP-only cookie. All database access goes through `withTenant()`, which opens a transaction, sets `app.team_id` transaction-locally so the RLS policies from subsystem 1 engage, and clears it on release.

**Tech Stack:** Node 24 (ESM), Fastify 5.12.5, @fastify/cookie 11.1.3, jose 6.2.12, pg 8.23.1, node:test.

**Spec:** `docs/azure-migration-spec.md` (§4 authentication, §5 security model)

**Depends on:** `docs/superpowers/plans/2026-10-12-azure-schema-migrations.md` (complete; migrations 001–006 applied, 007 held for this subsystem)

## Global Constraints

- Node **24**, ESM only. `api/` is its own workspace, separate from `db/` and the frontend.
- Runtime dependencies: **fastify, @fastify/cookie, jose, pg** — nothing else without a recorded ruling.
- Exact versions: `fastify@5.12.5`, `@fastify/cookie@11.1.3`, `jose@6.2.12`, `pg@8.23.1` (confirmed against the npm registry 2026-10-12).
- **No secret is ever logged, returned in a response body, or written to a file.** `ENTRA_CLIENT_SECRET`, `SESSION_COOKIE_SECRET` and `PGPASSWORD` come from the environment, sourced from Azure Key Vault in deployment.
- Every database call goes through `withTenant()`. A route handler that touches `pool.query` directly is a defect.
- `team_id` is taken from the session, **never** from a request body, query string or header.
- Session cookies: `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, signed.
- The ID token is verified with `algorithms: ['RS256']` pinned. Never trust an unverified claim.
- British spelling in user-facing copy.

## Review Focus

1. **A pooled connection serving a second request must not inherit the first request's `app.team_id`.** This is the breach subsystem 1's reviewer reproduced. Pinned in Task 2.
2. **A callback with a mismatched `state`, a replayed `code`, or a mismatched `nonce`** must be rejected, not merely logged. Pinned in Task 6.
3. **An `id_token` signed by the wrong key, for the wrong audience, from the wrong issuer, or expired** must be rejected. Pinned in Task 4.
4. **A session cookie that is expired, revoked, tampered with, or belongs to a removed profile** must authenticate nobody. Pinned in Task 7.
5. **A user whose Entra account exists but who has no `profiles` row** must be provisioned exactly once, even under two simultaneous sign-ins. Pinned in Task 6.

## Design decisions

Recorded here because they are the kind a reviewer should be able to challenge.

**No `@azure/msal-node`.** The flow we need is one redirect and one `POST` to the token endpoint; the only cryptography is JWT verification, which `jose` does. MSAL additionally manages a token cache and refresh lifecycle we deliberately do not use — we exchange the code once, read the identity claims, and issue our own session. Pulling in the SDK would add surface without removing responsibility. *If you would rather depend on Microsoft's SDK for auditability, that is a reasonable override; it changes Tasks 4–6 only.*

**Server-side sessions, not stateless JWT cookies.** Roles (`admin` / `producer` / `requester`) are edited in the app's own Users tab, and a stateless token would keep granting the old role until it expired. A `sessions` row is revocable, lets an admin sign someone out, and carries `team_id` so the RLS contract has a trustworthy source. Cost: one indexed lookup per request.

**PKCE state in a signed cookie, not a table.** `state`, `nonce` and `code_verifier` live for one redirect. A signed, ten-minute cookie avoids a table whose only job is garbage collection.

---

## Task 1: `api/` workspace, config, Fastify skeleton

**Files:**
- Create: `api/package.json`, `api/.env.example`, `api/src/config.mjs`, `api/src/app.mjs`, `api/src/server.mjs`
- Test: `api/test/config.test.mjs`, `api/test/health.test.mjs`, `api/test/helpers/env.mjs`
- Modify: `.gitignore` (append `api/.env`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `api/src/config.mjs` → `export function loadConfig(env = process.env): Config` where `Config = { port, appOrigin, cookieSecret, sessionTtlSeconds, defaultTeamId, entra: { tenantId, clientId, clientSecret, redirectUri }, pg: {...} }`. Throws listing **every** missing variable at once.
  - `api/src/app.mjs` → `export async function buildApp(config, opts = {}): Promise<FastifyInstance>`
  - `GET /healthz` → `200 { status: 'ok' }`

- [ ] **Step 1: Write the failing test**

`api/test/helpers/env.mjs`:
```javascript
export function testEnv(overrides = {}) {
  return {
    PORT: '0', APP_ORIGIN: 'http://localhost:5173',
    SESSION_COOKIE_SECRET: 'test-secret-at-least-32-chars-long!!',
    SESSION_TTL_SECONDS: '3600',
    DEFAULT_TEAM_ID: '11111111-1111-1111-1111-111111111111',
    ENTRA_TENANT_ID: 'test-tenant', ENTRA_CLIENT_ID: 'test-client',
    ENTRA_CLIENT_SECRET: 'test-client-secret',
    ENTRA_REDIRECT_URI: 'http://localhost:8080/auth/callback',
    PGHOST: 'localhost', PGPORT: '55432', PGUSER: 'postgres',
    PGDATABASE: 'postgres', PGPASSWORD: 'localdev', PGSSL: 'off',
    ...overrides,
  }
}
```

`api/test/config.test.mjs`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.mjs'
import { testEnv } from './helpers/env.mjs'

test('a complete environment loads', () => {
  const c = loadConfig(testEnv({ PORT: '8080' }))
  assert.equal(c.port, 8080)
  assert.equal(c.entra.clientId, 'test-client')
  assert.equal(c.sessionTtlSeconds, 3600)
})

test('every missing variable is reported at once, not just the first', () => {
  const { ENTRA_CLIENT_ID, PGHOST, ...rest } = testEnv()
  assert.throws(() => loadConfig(rest), (e) =>
    /ENTRA_CLIENT_ID/.test(e.message) && /PGHOST/.test(e.message))
})

test('a short cookie secret is rejected', () => {
  assert.throws(() => loadConfig(testEnv({ SESSION_COOKIE_SECRET: 'short' })),
    /SESSION_COOKIE_SECRET/)
})

test('the config never stringifies its secrets', () => {
  const c = loadConfig(testEnv())
  const dumped = JSON.stringify(c)
  assert.ok(!dumped.includes('test-client-secret'), 'client secret leaked into JSON')
  assert.ok(!dumped.includes('test-secret-at-least'), 'cookie secret leaked into JSON')
  assert.ok(!dumped.includes('localdev'), 'database password leaked into JSON')
})
```

`api/test/health.test.mjs`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.mjs'
import { loadConfig } from '../src/config.mjs'
import { testEnv } from './helpers/env.mjs'

test('healthz reports ok without touching the database', async () => {
  const app = await buildApp(loadConfig(testEnv()), { pool: null })
  const res = await app.inject({ method: 'GET', url: '/healthz' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { status: 'ok' })
  await app.close()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && npm install && node --test --test-concurrency=1 'test/**/*.test.mjs'`
Expected: FAIL — `Cannot find module '../src/config.mjs'`

- [ ] **Step 3: Implement config and the app**

`api/package.json`:
```json
{
  "name": "ni-briefing-api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.mjs",
    "start": "node src/server.mjs",
    "test": "node --test --test-concurrency=1 'test/**/*.test.mjs'"
  },
  "dependencies": {
    "@fastify/cookie": "11.1.3",
    "fastify": "5.12.5",
    "jose": "6.2.12",
    "pg": "8.23.1"
  }
}
```

`api/src/config.mjs`:
```javascript
const REQUIRED = [
  'APP_ORIGIN', 'SESSION_COOKIE_SECRET', 'DEFAULT_TEAM_ID',
  'ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET', 'ENTRA_REDIRECT_URI',
  'PGHOST', 'PGUSER', 'PGDATABASE', 'PGPASSWORD',
]

// Secrets are attached non-enumerably, so a stray JSON.stringify(config) or a
// logged error object cannot leak them.
function hide(target, values) {
  for (const [k, v] of Object.entries(values)) {
    Object.defineProperty(target, k, { value: v, enumerable: false, writable: false })
  }
  return target
}

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((k) => !env[k])
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  if (String(env.SESSION_COOKIE_SECRET).length < 32) {
    throw new Error('SESSION_COOKIE_SECRET must be at least 32 characters')
  }

  const entra = hide({
    tenantId: env.ENTRA_TENANT_ID,
    clientId: env.ENTRA_CLIENT_ID,
    redirectUri: env.ENTRA_REDIRECT_URI,
  }, { clientSecret: env.ENTRA_CLIENT_SECRET })

  const pg = hide({
    host: env.PGHOST, port: Number(env.PGPORT ?? 5432),
    user: env.PGUSER, database: env.PGDATABASE,
    ssl: env.PGSSL === 'off' || env.PGSSL === 'disable' ? false : { rejectUnauthorized: true },
  }, { password: env.PGPASSWORD })

  return hide({
    port: Number(env.PORT ?? 8080),
    appOrigin: env.APP_ORIGIN,
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS ?? 28800),
    defaultTeamId: env.DEFAULT_TEAM_ID,
    entra, pg,
  }, { cookieSecret: env.SESSION_COOKIE_SECRET })
}
```

`api/src/app.mjs`:
```javascript
import Fastify from 'fastify'
import cookie from '@fastify/cookie'

export async function buildApp(config, opts = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.cookie', 'req.headers.authorization'],
    },
    trustProxy: true,
  })

  await app.register(cookie, { secret: config.cookieSecret })
  app.decorate('config', config)

  app.get('/healthz', async () => ({ status: 'ok' }))

  return app
}
```

`api/src/server.mjs`:
```javascript
import { buildApp } from './app.mjs'
import { loadConfig } from './config.mjs'

const config = loadConfig()
const app = await buildApp(config)

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => app.close().then(() => process.exit(0)))
}

await app.listen({ port: config.port, host: '0.0.0.0' })
```

`api/.env.example`:
```
PORT=8080
APP_ORIGIN=http://localhost:5173
SESSION_COOKIE_SECRET=            # >= 32 chars; Key Vault in deployment
SESSION_TTL_SECONDS=28800
DEFAULT_TEAM_ID=                  # uuid of the seeded team

ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=              # Key Vault in deployment
ENTRA_REDIRECT_URI=http://localhost:8080/auth/callback

PGHOST=localhost
PGPORT=55432
PGUSER=postgres
PGDATABASE=postgres
PGPASSWORD=localdev
PGSSL=off
```

Append `api/.env` to `.gitignore`. The root `.env.*` pattern already carries a `!*.env.example` negation from subsystem 1, so `api/.env.example` commits normally — confirm with `git check-ignore -v api/.env.example`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && node --test --test-concurrency=1 'test/**/*.test.mjs'`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add api .gitignore
git commit -m "feat(api): add workspace, config loading and Fastify skeleton"
```

---

## Task 2: `withTenant()` — the tenant-scoped database helper

This is the security primitive. Subsystem 1's reviewer reproduced a cross-tenant breach caused by a session variable outliving its transaction on a pooled connection; this task is where that is prevented and pinned by tests.

**Files:**
- Create: `api/src/db.mjs`, `api/test/helpers/db.mjs`
- Test: `api/test/db.test.mjs`

**Interfaces:**
- Consumes: `config.pg` from Task 1.
- Produces:
  - `export function createPool(config): pg.Pool` — sets the `app_user` role on connect, clears `app.team_id` on release.
  - `export async function withTenant(pool, teamId, fn): Promise<T>`
  - `export async function withoutTenant(pool, fn): Promise<T>` — privileged; two legitimate callers only.

- [ ] **Step 1: Write the failing test**

`api/test/helpers/db.mjs`:
```javascript
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS = fileURLToPath(new URL('../../../db/migrations/', import.meta.url))

export async function resetSchema(pool) {
  const c = await pool.connect()
  try {
    await c.query('reset role')
    await c.query('drop schema public cascade; create schema public;')
    for (const f of (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()) {
      await c.query(await readFile(join(MIGRATIONS, f), 'utf8'))
    }
  } finally { c.release() }
}

export async function seedTeam(pool, id, name) {
  const c = await pool.connect()
  try {
    await c.query('reset role')
    await c.query('insert into teams (id, name) values ($1, $2)', [id, name])
    await c.query('select seed_default_columns($1)', [id])
  } finally { c.release() }
}
```

`api/test/db.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createPool, withTenant, withoutTenant } from '../src/db.mjs'
import { loadConfig } from '../src/config.mjs'
import { testEnv } from './helpers/env.mjs'
import { resetSchema, seedTeam } from './helpers/db.mjs'

const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'
let pool

before(async () => {
  pool = createPool(loadConfig(testEnv()))
  await resetSchema(pool)
  await seedTeam(pool, A, 'Team A')
  await seedTeam(pool, B, 'Team B')
  await withoutTenant(pool, (c) => c.query(
    `insert into kanban_cards (team_id, brief_id, email_name)
     values ($1, 'a-1', 'A card'), ($2, 'b-1', 'B card')`, [A, B]))
})
after(async () => { await pool.end() })

test('a tenant sees only its own rows', async () => {
  const rows = await withTenant(pool, A, async (c) =>
    (await c.query('select brief_id from kanban_cards')).rows)
  assert.deepEqual(rows.map((r) => r.brief_id), ['a-1'])
})

test('the tenant id does not survive onto the next checkout of the same connection', async () => {
  await withTenant(pool, A, (c) => c.query('select 1'))
  const leaked = await withoutTenant(pool, async (c) =>
    (await c.query(`select current_setting('app.team_id', true) as v`)).rows[0].v)
  assert.ok(leaked === null || leaked === '', `app.team_id leaked across checkouts: ${leaked}`)
})

test('an error inside the callback rolls back and does not commit', async () => {
  await assert.rejects(withTenant(pool, A, async (c) => {
    await c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'rollback-me')`, [A])
    throw new Error('boom')
  }), /boom/)
  const rows = await withTenant(pool, A, async (c) =>
    (await c.query(`select 1 from kanban_cards where brief_id = 'rollback-me'`)).rows)
  assert.equal(rows.length, 0)
})

test('writing a row for another tenant is refused by the database', async () => {
  await assert.rejects(
    withTenant(pool, B, (c) =>
      c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'forged')`, [A])),
    /row-level security/)
})

test('a null tenant id is refused before it reaches the database', async () => {
  await assert.rejects(withTenant(pool, null, (c) => c.query('select 1')),
    /teamId is required/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/db.test.mjs`
Expected: FAIL — `Cannot find module '../src/db.mjs'`

- [ ] **Step 3: Implement**

`api/src/db.mjs`:
```javascript
import pg from 'pg'

export function createPool(config) {
  const pool = new pg.Pool({
    host: config.pg.host, port: config.pg.port, user: config.pg.user,
    database: config.pg.database, password: config.pg.password, ssl: config.pg.ssl,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'ni-briefing-api',
  })

  // The app role must never be the table owner, or FORCE ROW LEVEL SECURITY is
  // the only thing standing between a bug and a cross-tenant read.
  pool.on('connect', (client) => {
    client.query('set role app_user').catch(() => {})
  })

  // Belt and braces for the contract in db/migrations/007_rls.sql. withTenant
  // already scopes app.team_id to a transaction; this guarantees that even a
  // stray SET cannot outlive the checkout and serve the next request under the
  // previous tenant's id.
  pool.on('release', (_err, client) => {
    client.query(`select set_config('app.team_id', '', false)`).catch(() => {})
  })

  return pool
}

export async function withTenant(pool, teamId, fn) {
  if (!teamId) throw new Error('withTenant: teamId is required')
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select set_config($1, $2, true)', ['app.team_id', teamId])
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// Privileged: runs outside any tenant scope. Only two callers are legitimate —
// resolving a session cookie to its profile, and provisioning a profile on
// first sign-in. Both happen before a tenant is known. Anything else is a bug.
export async function withoutTenant(pool, fn) {
  const client = await pool.connect()
  try {
    await client.query('reset role')
    return await fn(client)
  } finally {
    await client.query('set role app_user').catch(() => {})
    client.release()
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/db.test.mjs`
Expected: PASS, 5 tests. `PG_POOL_MAX=1` forces connection reuse so the leak test is meaningful.

- [ ] **Step 5: Commit**

```bash
git add api
git commit -m "feat(api): add tenant-scoped database helper with session reset on release"
```

---

## Task 3: `sessions` table

**Files:**
- Create: `db/migrations/008_sessions.sql`
- Test: `db/test/sessions.test.mjs`

**Interfaces:**
- Consumes: `teams`, `profiles`, `current_team_id()` from subsystem 1.
- Produces: table `sessions (id, profile_id, team_id, created_at, expires_at, revoked_at, user_agent, ip)` with a tenant policy.

- [ ] **Step 1: Write the failing test**

`db/test/sessions.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'
const TEMP = '33333333-3333-3333-3333-333333333333'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Tester')`, [USER, TEAM])
})
after(async () => { await c.end() })

test('a session is created with an expiry and no revocation', async () => {
  const { rows } = await c.query(
    `insert into sessions (profile_id, team_id, expires_at)
     values ($1, $2, now() + interval '8 hours') returning id, revoked_at`, [USER, TEAM])
  assert.ok(rows[0].id)
  assert.equal(rows[0].revoked_at, null)
})

test('removing a profile removes its sessions', async () => {
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Temp')`, [TEMP, TEAM])
  await c.query(`insert into sessions (profile_id, team_id, expires_at)
                 values ($1, $2, now() + interval '1 hour')`, [TEMP, TEAM])
  await c.query('delete from profiles where id = $1', [TEMP])
  const { rows } = await c.query('select count(*)::int n from sessions where profile_id = $1', [TEMP])
  assert.equal(rows[0].n, 0)
})

test('sessions is covered by the tenant policy like every other table', async () => {
  const { rows } = await c.query(
    `select relrowsecurity, relforcerowsecurity from pg_class where oid='public.sessions'::regclass`)
  assert.equal(rows[0].relrowsecurity, true)
  assert.equal(rows[0].relforcerowsecurity, true)
  const { rows: p } = await c.query(
    `select policyname from pg_policies where schemaname='public' and tablename='sessions'`)
  assert.deepEqual(p.map((r) => r.policyname), ['sessions_tenant'])
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd db && node --test --test-concurrency=1 test/sessions.test.mjs`
Expected: FAIL — `relation "sessions" does not exist`

- [ ] **Step 3: Write the migration**

`db/migrations/008_sessions.sql`:
```sql
-- Server-side sessions. The browser holds only an opaque id in a signed cookie;
-- revoking a row signs the user out immediately, which a stateless token cannot.

create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  team_id    uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  ip         inet
);
alter table public.sessions
  add column if not exists profile_id uuid,
  add column if not exists team_id    uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists user_agent text,
  add column if not exists ip         inet;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_profile_id_fkey') then
    alter table public.sessions add constraint sessions_profile_id_fkey
      foreign key (profile_id) references public.profiles (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sessions_team_id_fkey') then
    alter table public.sessions add constraint sessions_team_id_fkey
      foreign key (team_id) references public.teams (id) on delete restrict;
  end if;
end $$;

create index if not exists sessions_team_profile_idx on public.sessions (team_id, profile_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at)
  where revoked_at is null;

grant select, insert, update, delete on public.sessions to app_user;
alter table public.sessions enable row level security;
alter table public.sessions force row level security;
drop policy if exists sessions_tenant on public.sessions;
create policy sessions_tenant on public.sessions to app_user
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd db && npm test`
Expected: PASS, all suites including the new one.

- [ ] **Step 5: Regenerate the expected schema and commit**

Create `db/gen.mjs` with the content below, run it, then remove it:
```javascript
import { writeFile } from 'node:fs/promises'
import { withClient } from './lib/connect.mjs'
import { runMigrations } from './migrate.mjs'
import { snapshot } from './verify.mjs'
const out = await withClient(async (c) => {
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  return snapshot(c)
})
await writeFile('expected-schema.json', JSON.stringify(out, null, 2) + '\n')
```

```bash
cd db && node gen.mjs && npm run verify
cd .. && git add db && git commit -m "feat(db): add sessions table with tenant policy"
```

---

## Task 4: Entra discovery and ID-token verification

Pure functions over HTTP and crypto, testable without Entra by pointing them at a locally generated key set.

**Files:**
- Create: `api/src/auth/entra.mjs`, `api/test/helpers/fake-entra.mjs`
- Test: `api/test/auth/entra.test.mjs`

**Interfaces:**
- Consumes: `config.entra` from Task 1.
- Produces:
  - `export function discoveryUrl(tenantId): string`
  - `export async function getMetadata(config, fetchImpl = fetch): Promise<{authorization_endpoint, token_endpoint, jwks_uri, issuer}>`
  - `export async function verifyIdToken(token, { config, metadata, nonce }): Promise<{ oid, tid, email, name }>`
  - `export async function exchangeCode({ config, metadata, code, codeVerifier }, fetchImpl = fetch): Promise<{ id_token }>`

- [ ] **Step 1: Write the failing test**

`api/test/helpers/fake-entra.mjs`:
```javascript
import * as jose from 'jose'
import { createServer } from 'node:http'

// A local stand-in for Entra: real RS256 keys, a real JWKS endpoint, real HTTP.
// Nothing on the verification path is mocked — only the provider is local.
export async function startFakeEntra({ issuer, audience }) {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true })
  const jwk = await jose.exportJWK(publicKey)
  Object.assign(jwk, { kid: 'test-key-1', alg: 'RS256', use: 'sig' })

  let tokenResponse = null
  const server = createServer((req, res) => {
    if (req.url.startsWith('/keys')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ keys: [jwk] }))
    }
    if (req.url.startsWith('/token')) {
      res.writeHead(tokenResponse?.status ?? 200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(tokenResponse?.body ?? {}))
    }
    res.writeHead(404); res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`

  return {
    base,
    metadata: {
      issuer,
      jwks_uri: `${base}/keys`,
      token_endpoint: `${base}/token`,
      authorization_endpoint: `${base}/authorize`,
    },
    async mintIdToken(claims = {}, overrides = {}) {
      const payload = {
        oid: '99999999-9999-9999-9999-999999999999',
        preferred_username: 'tester@ninetyone.com',
        name: 'Test User',
        tid: 'test-tenant',
        ...claims,
      }
      for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k]
      return new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
        .setIssuer(overrides.issuer ?? issuer)
        .setAudience(overrides.audience ?? audience)
        .setIssuedAt()
        .setExpirationTime(overrides.exp ?? '5m')
        .sign(privateKey)
    },
    setTokenResponse(r) { tokenResponse = r },
    async stop() { await new Promise((r) => server.close(r)) },
  }
}
```

`api/test/auth/entra.test.mjs`:
```javascript
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import * as jose from 'jose'
import { verifyIdToken, exchangeCode } from '../../src/auth/entra.mjs'
import { loadConfig } from '../../src/config.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'
let entra, config

before(async () => {
  config = loadConfig(testEnv())
  entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
})
after(async () => { await entra.stop() })

test('a correctly signed token yields the Entra object id and email', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' })
  const claims = await verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' })
  assert.equal(claims.oid, '99999999-9999-9999-9999-999999999999')
  assert.equal(claims.email, 'tester@ninetyone.com')
  assert.equal(claims.name, 'Test User')
})

test('a token for another audience is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' }, { audience: 'someone-else' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }),
    (e) => e instanceof jose.errors.JWTClaimValidationFailed)
})

test('a token from another issuer is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' }, { issuer: 'https://evil.example/v2.0' })
  await assert.rejects(verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }))
})

test('an expired token is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' }, { exp: '-1m' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }),
    (e) => e instanceof jose.errors.JWTExpired)
})

test('a replayed token with the wrong nonce is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'different' }), /nonce/)
})

test('a token with no oid claim is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1', oid: undefined })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }), /oid|missing/)
})

test('a token from a different Entra tenant is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1', tid: 'another-tenant' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }), /tenant/)
})

test('a token endpoint error surfaces without leaking the client secret', async () => {
  entra.setTokenResponse({ status: 400, body: { error: 'invalid_grant' } })
  await assert.rejects(
    exchangeCode({ config, metadata: entra.metadata, code: 'c', codeVerifier: 'v' }),
    (e) => /invalid_grant/.test(e.message) && !e.message.includes(config.entra.clientSecret))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && node --test --test-concurrency=1 test/auth/entra.test.mjs`
Expected: FAIL — `Cannot find module '../../src/auth/entra.mjs'`

- [ ] **Step 3: Implement**

`api/src/auth/entra.mjs`:
```javascript
import * as jose from 'jose'

export function discoveryUrl(tenantId) {
  return `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`
}

let metadataCache = null

export async function getMetadata(config, fetchImpl = fetch) {
  if (metadataCache) return metadataCache
  const res = await fetchImpl(discoveryUrl(config.entra.tenantId))
  if (!res.ok) throw new Error(`Entra discovery failed: HTTP ${res.status}`)
  metadataCache = await res.json()
  return metadataCache
}

const jwksCache = new Map()
function jwks(metadata) {
  let set = jwksCache.get(metadata.jwks_uri)
  if (!set) {
    set = jose.createRemoteJWKSet(new URL(metadata.jwks_uri))
    jwksCache.set(metadata.jwks_uri, set)
  }
  return set
}

export async function verifyIdToken(token, { config, metadata, nonce }) {
  const { payload } = await jose.jwtVerify(token, jwks(metadata), {
    issuer: metadata.issuer,
    audience: config.entra.clientId,
    algorithms: ['RS256'],
    clockTolerance: '60 seconds',
    requiredClaims: ['oid', 'tid'],
  })

  // Checked only after the signature verifies. Never before.
  if (!nonce || payload.nonce !== nonce) {
    throw new Error('id_token nonce did not match the value issued for this sign-in')
  }
  if (payload.tid !== config.entra.tenantId) {
    throw new Error('id_token came from a different Entra tenant')
  }
  if (typeof payload.oid !== 'string' || payload.oid.length === 0) {
    throw new Error('id_token has no usable oid claim')
  }

  return {
    oid: payload.oid,
    tid: payload.tid,
    email: payload.preferred_username ?? payload.email ?? null,
    name: payload.name ?? '',
  }
}

export async function exchangeCode({ config, metadata, code, codeVerifier }, fetchImpl = fetch) {
  const body = new URLSearchParams({
    client_id: config.entra.clientId,
    client_secret: config.entra.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.entra.redirectUri,
    code_verifier: codeVerifier,
  })

  const res = await fetchImpl(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok || !json.id_token) {
    // json.error is Entra's own code. The request body is never echoed, so the
    // client secret cannot reach a log or an error response.
    throw new Error(`Entra token exchange failed: ${json.error ?? `HTTP ${res.status}`}`)
  }
  return json
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && node --test --test-concurrency=1 test/auth/entra.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add api
git commit -m "feat(api): verify Entra ID tokens against JWKS with pinned RS256"
```

---

## Task 5: `GET /auth/login` — redirect with PKCE

**Files:**
- Create: `api/src/auth/pkce.mjs`, `api/src/routes/auth.mjs`
- Modify: `api/src/app.mjs`
- Test: `api/test/auth/login.test.mjs`

**Interfaces:**
- Consumes: `getMetadata` (Task 4), the cookie plugin (Task 1).
- Produces:
  - `export function createVerifier(): string`, `export async function challengeFor(verifier): Promise<string>`, `export function randomToken(): string`
  - `GET /auth/login` → `302`; sets the signed, short-lived `ni_auth` cookie.
  - `export const AUTH_COOKIE = 'ni_auth'`, `export const SESSION_COOKIE = 'ni_session'`

- [ ] **Step 1: Write the failing test**

`api/test/auth/login.test.mjs`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { createVerifier, challengeFor } from '../../src/auth/pkce.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'

async function appWithFakeEntra() {
  const config = loadConfig(testEnv())
  const entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
  const app = await buildApp(config, { metadata: entra.metadata, pool: null })
  return { app, entra, config }
}

test('login redirects to Entra with PKCE and a state parameter', async () => {
  const { app, entra } = await appWithFakeEntra()
  const res = await app.inject({ method: 'GET', url: '/auth/login' })
  assert.equal(res.statusCode, 302)
  const target = new URL(res.headers.location)
  assert.equal(target.origin + target.pathname, entra.metadata.authorization_endpoint)
  assert.equal(target.searchParams.get('response_type'), 'code')
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(target.searchParams.get('code_challenge'))
  assert.ok(target.searchParams.get('state'))
  assert.ok(target.searchParams.get('nonce'))
  assert.match(target.searchParams.get('scope'), /openid/)
  await app.close(); await entra.stop()
})

test('login sets a signed, httpOnly, short-lived auth cookie', async () => {
  const { app, entra } = await appWithFakeEntra()
  const res = await app.inject({ method: 'GET', url: '/auth/login' })
  const cookie = res.cookies.find((c) => c.name === 'ni_auth')
  assert.ok(cookie, 'ni_auth cookie not set')
  assert.equal(cookie.httpOnly, true)
  assert.equal(cookie.sameSite, 'Lax')
  assert.ok(cookie.maxAge <= 600, 'auth cookie should be short-lived')
  await app.close(); await entra.stop()
})

test('two sign-ins get different state', async () => {
  const { app, entra } = await appWithFakeEntra()
  const a = await app.inject({ method: 'GET', url: '/auth/login' })
  const b = await app.inject({ method: 'GET', url: '/auth/login' })
  assert.notEqual(
    new URL(a.headers.location).searchParams.get('state'),
    new URL(b.headers.location).searchParams.get('state'))
  await app.close(); await entra.stop()
})

test('the challenge is the S256 hash of the verifier', async () => {
  const v = createVerifier()
  assert.equal(await challengeFor(v), createHash('sha256').update(v).digest('base64url'))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && node --test --test-concurrency=1 test/auth/login.test.mjs`
Expected: FAIL — `Cannot find module '../../src/auth/pkce.mjs'`

- [ ] **Step 3: Implement**

`api/src/auth/pkce.mjs`:
```javascript
import { randomBytes, createHash } from 'node:crypto'

export function createVerifier() {
  return randomBytes(32).toString('base64url')
}

export async function challengeFor(verifier) {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function randomToken() {
  return randomBytes(32).toString('base64url')
}
```

`api/src/routes/auth.mjs`:
```javascript
import { getMetadata } from '../auth/entra.mjs'
import { createVerifier, challengeFor, randomToken } from '../auth/pkce.mjs'

export const AUTH_COOKIE = 'ni_auth'
export const SESSION_COOKIE = 'ni_session'
const AUTH_COOKIE_TTL_SECONDS = 600

export async function authRoutes(app, { metadata: injectedMetadata, pool } = {}) {
  const config = app.config
  const metadataFor = async () => injectedMetadata ?? getMetadata(config)
  const secure = config.appOrigin.startsWith('https')

  app.get('/auth/login', async (req, reply) => {
    const metadata = await metadataFor()
    const state = randomToken()
    const nonce = randomToken()
    const verifier = createVerifier()

    reply.setCookie(AUTH_COOKIE, JSON.stringify({ state, nonce, verifier }), {
      path: '/auth', httpOnly: true, secure, sameSite: 'lax',
      signed: true, maxAge: AUTH_COOKIE_TTL_SECONDS,
    })

    const url = new URL(metadata.authorization_endpoint)
    url.searchParams.set('client_id', config.entra.clientId)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', config.entra.redirectUri)
    url.searchParams.set('response_mode', 'query')
    url.searchParams.set('scope', 'openid profile email')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('code_challenge', await challengeFor(verifier))
    url.searchParams.set('code_challenge_method', 'S256')

    return reply.redirect(url.toString(), 302)
  })
}
```

Modify `api/src/app.mjs` to register the routes before returning:
```javascript
import { authRoutes } from './routes/auth.mjs'
// ... after app.decorate('config', config):
  await app.register(authRoutes, { metadata: opts.metadata, pool: opts.pool })
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && node --test --test-concurrency=1 test/auth/login.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add api
git commit -m "feat(api): add Entra login redirect with PKCE and state"
```

---

## Task 6: `GET /auth/callback` — exchange, provision, create session

**Files:**
- Create: `api/src/auth/profiles.mjs`, `api/src/auth/sessions.mjs`
- Modify: `api/src/routes/auth.mjs`, `api/src/app.mjs`
- Test: `api/test/auth/callback.test.mjs`

**Interfaces:**
- Consumes: `exchangeCode`, `verifyIdToken` (Task 4); `withTenant`, `withoutTenant` (Task 2); `sessions` (Task 3).
- Produces:
  - `export async function provisionProfile(pool, { oid, email, name, defaultTeamId }): Promise<{ id, teamId, role, displayName }>`
  - `export async function createSession(pool, { profileId, teamId, ttlSeconds, userAgent, ip }): Promise<string>`
  - `export async function resolveSession(pool, id): Promise<Session|null>`
  - `export async function revokeSession(pool, id): Promise<void>`
  - `GET /auth/callback` → `302` to `config.appOrigin`, sets `ni_session`.

- [ ] **Step 1: Write the failing test**

`api/test/auth/callback.test.mjs`:
```javascript
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { createPool, withoutTenant } from '../../src/db.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { resetSchema, seedTeam } from '../helpers/db.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'
const TEAM = '11111111-1111-1111-1111-111111111111'
let app, entra, config, pool

before(async () => {
  config = loadConfig(testEnv())
  pool = createPool(config)
  entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
  app = await buildApp(config, { metadata: entra.metadata, pool })
})
after(async () => { await app.close(); await entra.stop(); await pool.end() })
beforeEach(async () => { await resetSchema(pool); await seedTeam(pool, TEAM, 'Marketing') })

async function startLogin() {
  const res = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(res.headers.location)
  return {
    state: url.searchParams.get('state'),
    nonce: url.searchParams.get('nonce'),
    cookie: res.cookies.find((c) => c.name === 'ni_auth').value,
  }
}

test('a valid callback provisions a profile and sets a session cookie', async () => {
  const { state, nonce, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })

  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })

  assert.equal(res.statusCode, 302)
  assert.equal(res.headers.location, config.appOrigin)
  const session = res.cookies.find((c) => c.name === 'ni_session')
  assert.ok(session)
  assert.equal(session.httpOnly, true)

  const rows = await withoutTenant(pool, async (c) =>
    (await c.query('select id, team_id, role from profiles')).rows)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, '99999999-9999-9999-9999-999999999999')
  assert.equal(rows[0].team_id, TEAM)
  assert.equal(rows[0].role, 'requester')
})

test('signing in twice does not create a second profile', async () => {
  for (let i = 0; i < 2; i++) {
    const { state, nonce, cookie } = await startLogin()
    entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
    await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
      cookies: { ni_auth: cookie } })
  }
  const rows = await withoutTenant(pool, async (c) =>
    (await c.query('select count(*)::int n from profiles')).rows)
  assert.equal(rows[0].n, 1)
})

test('an existing profile keeps its role; sign-in does not reset it to requester', async () => {
  const first = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce: first.nonce }) } })
  await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${first.state}`,
    cookies: { ni_auth: first.cookie } })
  await withoutTenant(pool, (c) => c.query(`update profiles set role = 'admin'`))

  const second = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce: second.nonce }) } })
  await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${second.state}`,
    cookies: { ni_auth: second.cookie } })

  const rows = await withoutTenant(pool, async (c) =>
    (await c.query('select role from profiles')).rows)
  assert.equal(rows[0].role, 'admin')
})

test('a mismatched state is rejected and creates no session', async () => {
  const { nonce, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
  const res = await app.inject({ method: 'GET', url: '/auth/callback?code=abc&state=forged',
    cookies: { ni_auth: cookie } })
  assert.equal(res.statusCode, 400)
  assert.ok(!res.cookies.some((c) => c.name === 'ni_session' && c.value))
})

test('a callback with no auth cookie is rejected', async () => {
  const res = await app.inject({ method: 'GET', url: '/auth/callback?code=abc&state=whatever' })
  assert.equal(res.statusCode, 400)
})

test('a token whose nonce does not match the sign-in is rejected', async () => {
  const { state, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce: 'other' }) } })
  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  assert.equal(res.statusCode, 401)
})

test('the auth cookie is cleared after the callback so the code cannot be replayed', async () => {
  const { state, nonce, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  const cleared = res.cookies.find((c) => c.name === 'ni_auth')
  assert.ok(cleared && (cleared.value === '' || cleared.maxAge === 0), 'ni_auth not cleared')
})

test('an error from Entra does not create a session', async () => {
  const { state, cookie } = await startLogin()
  entra.setTokenResponse({ status: 400, body: { error: 'invalid_grant' } })
  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  assert.equal(res.statusCode, 401)
  const rows = await withoutTenant(pool, async (c) =>
    (await c.query('select count(*)::int n from sessions')).rows)
  assert.equal(rows[0].n, 0)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/auth/callback.test.mjs`
Expected: FAIL — `Cannot find module '../../src/auth/profiles.mjs'`

- [ ] **Step 3: Implement**

`api/src/auth/profiles.mjs`:
```javascript
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
```

`api/src/auth/sessions.mjs`:
```javascript
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
```

Add to `api/src/routes/auth.mjs`, inside `authRoutes`:
```javascript
import { exchangeCode, verifyIdToken } from '../auth/entra.mjs'
import { provisionProfile } from '../auth/profiles.mjs'
import { createSession } from '../auth/sessions.mjs'

  app.get('/auth/callback', async (req, reply) => {
    const raw = req.cookies[AUTH_COOKIE]
    const unsigned = raw ? reply.unsignCookie(raw) : { valid: false }
    reply.clearCookie(AUTH_COOKIE, { path: '/auth' })

    if (!unsigned.valid) {
      return reply.code(400).send({ error: 'sign-in has expired; please start again' })
    }

    let state, nonce, verifier
    try { ({ state, nonce, verifier } = JSON.parse(unsigned.value)) }
    catch { return reply.code(400).send({ error: 'sign-in has expired; please start again' }) }

    if (!req.query.code || !req.query.state || req.query.state !== state) {
      return reply.code(400).send({ error: 'sign-in has expired; please start again' })
    }

    const metadata = await metadataFor()
    let claims
    try {
      const tokens = await exchangeCode(
        { config, metadata, code: req.query.code, codeVerifier: verifier })
      claims = await verifyIdToken(tokens.id_token, { config, metadata, nonce })
    } catch (err) {
      req.log.warn({ reason: err.message }, 'sign-in failed')
      return reply.code(401).send({ error: 'sign-in failed; please try again' })
    }

    const profile = await provisionProfile(pool, {
      oid: claims.oid, email: claims.email, name: claims.name,
      defaultTeamId: config.defaultTeamId,
    })

    const sessionId = await createSession(pool, {
      profileId: profile.id, teamId: profile.teamId,
      ttlSeconds: config.sessionTtlSeconds,
      userAgent: req.headers['user-agent'], ip: req.ip,
    })

    reply.setCookie(SESSION_COOKIE, sessionId, {
      path: '/', httpOnly: true, secure, sameSite: 'lax',
      signed: true, maxAge: config.sessionTtlSeconds,
    })

    return reply.redirect(config.appOrigin, 302)
  })
```

In `api/src/app.mjs`, create the pool when one is not injected, before registering routes:
```javascript
import { createPool } from './db.mjs'
// ...
  const pool = opts.pool === undefined ? createPool(config) : opts.pool
  if (pool) {
    app.decorate('pool', pool)
    if (opts.pool === undefined) app.addHook('onClose', async () => { await pool.end() })
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/auth/callback.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add api
git commit -m "feat(api): exchange Entra code, provision profile and create session"
```

---

## Task 7: Session authentication, `/auth/me`, `/auth/logout`, role guard

**Files:**
- Create: `api/src/auth/require-auth.mjs`
- Modify: `api/src/routes/auth.mjs`, `api/src/app.mjs`
- Test: `api/test/auth/session.test.mjs`

**Interfaces:**
- Consumes: `resolveSession`, `revokeSession` (Task 6).
- Produces:
  - `export function makeAuthenticate(pool)` → a `preHandler` populating `req.user = { id, profileId, teamId, role, displayName, email, sessionId }` or replying `401`.
  - `export function requireRole(...roles)` → a `preHandler` replying `403`.
  - `GET /auth/me` → `200` / `401`. `POST /auth/logout` → `204`, idempotent.

- [ ] **Step 1: Write the failing test**

`api/test/auth/session.test.mjs`:
```javascript
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { createPool, withoutTenant } from '../../src/db.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { resetSchema, seedTeam } from '../helpers/db.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'
const TEAM = '11111111-1111-1111-1111-111111111111'
let app, entra, config, pool

before(async () => {
  config = loadConfig(testEnv())
  pool = createPool(config)
  entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
  app = await buildApp(config, { metadata: entra.metadata, pool })
})
after(async () => { await app.close(); await entra.stop(); await pool.end() })
beforeEach(async () => { await resetSchema(pool); await seedTeam(pool, TEAM, 'Marketing') })

async function signIn() {
  const login = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(login.headers.location)
  entra.setTokenResponse({ status: 200,
    body: { id_token: await entra.mintIdToken({ nonce: url.searchParams.get('nonce') }) } })
  const cb = await app.inject({
    method: 'GET', url: `/auth/callback?code=abc&state=${url.searchParams.get('state')}`,
    cookies: { ni_auth: login.cookies.find((c) => c.name === 'ni_auth').value },
  })
  return cb.cookies.find((c) => c.name === 'ni_session').value
}

test('me returns the signed-in user', async () => {
  const session = await signIn()
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 200)
  assert.equal(res.json().email, 'tester@ninetyone.com')
  assert.equal(res.json().role, 'requester')
  assert.equal(res.json().teamId, TEAM)
})

test('me without a cookie is 401', async () => {
  const res = await app.inject({ method: 'GET', url: '/auth/me' })
  assert.equal(res.statusCode, 401)
})

test('a tampered session cookie is 401', async () => {
  const session = await signIn()
  const res = await app.inject({ method: 'GET', url: '/auth/me',
    cookies: { ni_session: session.slice(0, -4) + 'aaaa' } })
  assert.equal(res.statusCode, 401)
})

test('a revoked session stops working immediately', async () => {
  const session = await signIn()
  await app.inject({ method: 'POST', url: '/auth/logout', cookies: { ni_session: session } })
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 401)
})

test('an expired session is 401', async () => {
  const session = await signIn()
  await withoutTenant(pool, (c) =>
    c.query(`update sessions set expires_at = now() - interval '1 minute'`))
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 401)
})

test('removing the profile invalidates the session', async () => {
  const session = await signIn()
  await withoutTenant(pool, (c) => c.query('delete from profiles'))
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 401)
})

test('a role change takes effect on the next request without re-signing in', async () => {
  const session = await signIn()
  await withoutTenant(pool, (c) => c.query(`update profiles set role = 'admin'`))
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.json().role, 'admin')
})

test('logout is idempotent', async () => {
  const session = await signIn()
  const first = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { ni_session: session } })
  assert.equal(first.statusCode, 204)
  const second = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { ni_session: session } })
  assert.equal(second.statusCode, 204)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/auth/session.test.mjs`
Expected: FAIL — `Cannot find module '../../src/auth/require-auth.mjs'`

- [ ] **Step 3: Implement**

`api/src/auth/require-auth.mjs`:
```javascript
import { resolveSession } from './sessions.mjs'
import { SESSION_COOKIE } from '../routes/auth.mjs'

export function makeAuthenticate(pool) {
  return async function authenticate(req, reply) {
    const raw = req.cookies[SESSION_COOKIE]
    const unsigned = raw ? req.unsignCookie(raw) : { valid: false }
    if (!unsigned.valid) return reply.code(401).send({ error: 'not signed in' })

    const session = await resolveSession(pool, unsigned.value)
    if (!session) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      return reply.code(401).send({ error: 'not signed in' })
    }
    req.user = { ...session, sessionId: session.id }
  }
}

export function requireRole(...roles) {
  return async function roleGuard(req, reply) {
    if (!req.user) return reply.code(401).send({ error: 'not signed in' })
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'you do not have access to this' })
    }
  }
}
```

Add to `api/src/routes/auth.mjs`:
```javascript
import { revokeSession } from '../auth/sessions.mjs'

  app.get('/auth/me', { preHandler: app.authenticate }, async (req) => ({
    profileId: req.user.profileId, teamId: req.user.teamId,
    role: req.user.role, displayName: req.user.displayName, email: req.user.email,
  }))

  app.post('/auth/logout', async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE]
    const unsigned = raw ? req.unsignCookie(raw) : { valid: false }
    if (unsigned.valid) await revokeSession(pool, unsigned.value)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return reply.code(204).send()
  })
```

In `api/src/app.mjs`, decorate **before** registering the routes, since `app.authenticate` is referenced at route-definition time:
```javascript
import { makeAuthenticate } from './auth/require-auth.mjs'
// ... after the pool is created, before app.register(authRoutes, ...):
  app.decorate('authenticate', makeAuthenticate(pool))
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/auth/session.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add api
git commit -m "feat(api): add session authentication, /auth/me, logout and role guard"
```

---

## Task 8: Prove isolation end to end and release the RLS hold

Migration 007 has been held since subsystem 1 because it denies every connection that does not set `app.team_id`. Task 2 established that contract; this task verifies it through the real application path and releases the hold.

**Files:**
- Create: `api/test/security/isolation.test.mjs`, `api/README.md`
- Modify: `docs/superpowers/plans/2026-10-12-azure-schema-migrations.md`

**Interfaces:**
- Consumes: everything above. Produces no new runtime code.

- [ ] **Step 1: Write the failing test**

`api/test/security/isolation.test.mjs`:
```javascript
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPool, withTenant, withoutTenant } from '../../src/db.mjs'
import { loadConfig } from '../../src/config.mjs'
import { testEnv } from '../helpers/env.mjs'
import { resetSchema, seedTeam } from '../helpers/db.mjs'

const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'
let pool

before(async () => { pool = createPool(loadConfig(testEnv())) })
after(async () => { await pool.end() })
beforeEach(async () => {
  await resetSchema(pool)
  await seedTeam(pool, A, 'Team A')
  await seedTeam(pool, B, 'Team B')
  await withoutTenant(pool, async (c) => {
    await c.query(`insert into profiles (id, team_id, display_name) values
      ('aaaaaaaa-0000-0000-0000-000000000001', $1, 'A'),
      ('bbbbbbbb-0000-0000-0000-000000000002', $2, 'B')`, [A, B])
    await c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'a-1'), ($2, 'b-1')`, [A, B])
    await c.query('insert into settings (team_id) values ($1), ($2)', [A, B])
    await c.query(`insert into sessions (profile_id, team_id, expires_at) values
      ('aaaaaaaa-0000-0000-0000-000000000001', $1, now() + interval '1 hour'),
      ('bbbbbbbb-0000-0000-0000-000000000002', $2, now() + interval '1 hour')`, [A, B])
  })
})

test('no table is readable across tenants through the application path', async () => {
  for (const table of ['kanban_cards', 'settings', 'sessions', 'profiles']) {
    const rows = await withTenant(pool, A, async (c) =>
      (await c.query(`select team_id from ${table}`)).rows)
    assert.ok(rows.length > 0, `${table}: tenant A should see its own rows`)
    assert.ok(rows.every((r) => r.team_id === A), `${table}: tenant A saw another tenant's rows`)
  }
})

test('a cross-tenant write is refused on every tenant table', async () => {
  const tables = ['settings', 'briefs', 'drafts', 'audit_log', 'kanban_cards', 'approvals',
    'send_time_events', 'benchmark_entries', 'audience_health_snapshots',
    'campaigns', 'planner_settings', 'sessions']
  for (const table of tables) {
    await assert.rejects(
      withTenant(pool, B, (c) => c.query(`insert into ${table} (team_id) values ($1)`, [A])),
      (e) => /row-level security|null value|violates/.test(e.message),
      `${table}: a cross-tenant insert was not refused`)
  }
})

test('a connection that never sets a tenant sees nothing', async () => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query('select count(*)::int n from kanban_cards')
    assert.equal(rows[0].n, 0)
  } finally { client.release() }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd api && PG_POOL_MAX=1 node --test --test-concurrency=1 test/security/isolation.test.mjs`
Expected: FAIL until `008_sessions.sql` and the RLS policies are both present in the test schema.

If it still fails afterwards, the cause is a real isolation gap, not a missing migration. Use superpowers:systematic-debugging; do not relax an assertion to make it pass.

- [ ] **Step 3: Run both suites together**

Run: `cd db && npm test && cd ../api && npm test`
Expected: PASS, both green.

- [ ] **Step 4: Write the deployment note**

`api/README.md`:
```markdown
# Briefing Platform API

Fastify API for the Ninety One Briefing Platform. Authenticates against
Microsoft Entra ID and serves the React front end.

## Running locally

    cd db && npm run db:up && npm run migrate     # local postgres on :55432
    cd ../api && cp .env.example .env             # fill in the Entra values
    npm install && npm run dev

## Entra app registration

Register a confidential client in the Ninety One tenant with:

- Redirect URI (Web): `http://localhost:8080/auth/callback` for development,
  plus the deployed callback URL for each environment.
- Implicit grant and hybrid flows: **off**. This is an authorization-code client.
- API permissions: `openid`, `profile`, `email` (delegated). Nothing else.
- A client secret, stored in Azure Key Vault. Never in `.env` outside development.

## Database contract

Every query goes through `withTenant(pool, teamId, fn)`, which opens a
transaction and sets `app.team_id` transaction-locally so the row-level
security policies engage. `withoutTenant` exists for the two lookups that
happen before a tenant is known — resolving a session and provisioning a
profile on first sign-in — and is the only privileged path. A handler that
calls `pool.query` directly bypasses tenant isolation and is a defect.

## Deployment order

Migration `007_rls.sql` must not reach a shared environment before this API is
deployed: it denies every connection that does not set `app.team_id`. Apply
`001`–`006`, deploy the API, then apply `007` and `008`.
```

Then edit Task 8 of the subsystem 1 plan to record that the hold is lifted here.

- [ ] **Step 5: Commit**

```bash
git add api docs
git commit -m "feat(api): prove cross-tenant isolation end to end and release the RLS hold"
```

---

## Self-review notes

- **Spec coverage:** §4 is implemented in full — authorization-code with PKCE (Task 5), token validation (Task 4), the HTTP-only session cookie (Task 6), `profiles` keyed on the Entra `oid` replacing `handle_new_user()` (Task 6), and roles staying in `profiles` rather than Entra (pinned by Task 7's role-change test). §5 lands in Task 2 (`withTenant`), Task 8 (the cross-tenant suite §5.3 calls mandatory) and §5.4's `SET LOCAL` contract.
- **Deliberately out of scope:** data endpoints (subsystem 3), Pardot and Anthropic routes (subsystem 4), frontend rewiring (subsystem 5), Container Apps and Key Vault (subsystem 6). `/healthz` exists so subsystem 6 has a probe target.
- **Open question carried from spec §8.4:** `DEFAULT_TEAM_ID` puts every new user in one team. If Ninety One wants Entra group mapping instead, it changes `provisionProfile` only — the signature takes `defaultTeamId` as a parameter rather than reading config directly, so the swap is contained.
- **Unverified at plan time:** the Entra discovery document's exact `issuer` string for the Ninety One tenant, and whether `preferred_username` is populated for every staff account. Task 4 reads the issuer from discovery rather than hardcoding it, so a mismatch fails verification loudly instead of being silently accepted; `email` falls back through `preferred_username → email → null`. The first real sign-in against the tenant is the only thing that proves both.
- **Type consistency:** `AUTH_COOKIE` / `SESSION_COOKIE` are defined once in `routes/auth.mjs` and imported by `require-auth.mjs`; `withTenant(pool, teamId, fn)` keeps the same argument order in Tasks 2, 6 and 8; `provisionProfile` returns `{ id, teamId, role, displayName }` and Task 6's route consumes exactly those names.
