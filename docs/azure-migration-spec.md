# Azure Migration — Architecture Spec

**Status:** Draft, pending two confirmations (§8)
**Date:** 2026-10-12
**Supersedes for backend:** the Supabase sections of `TECH_STACK.md` and `HANDOVER.md`
**Decision:** Remove Supabase entirely. Data in Azure Database for PostgreSQL. App hosted in Azure.

---

## 1. Why this is not a connection-string change

A browser cannot open a TCP connection to PostgreSQL. Today the React SPA talks HTTP to Supabase, which provides four services. Azure Database for PostgreSQL replaces exactly one of them.

| Supabase service in use today | Used by | Azure equivalent |
|---|---|---|
| **PostgREST** — HTTP data API that `@supabase/supabase-js` speaks | `supabaseQueries.ts`, `approvalsService.ts`, `auditLog.ts`, 4 contexts | **None** — must be built |
| **GoTrue** — sign-in, JWT issuing, `auth.users` table | `AuthContext`, `LoginPage` (6 call sites) | **None** — Entra ID + API sessions |
| **RLS keyed on JWT claims** — `get_my_team_id()`, `get_my_role()` | Every table (16) | Policies survive, **enforcement does not** (§5) |
| **Edge Functions (Deno)** — `brand-guardian-ai`, `create-user` | 2 `functions.invoke` call sites | Routes in the new API |

### Current coupling (measured 2026-10-12, commit `8a1c296`)

| Metric | Count |
|---|---|
| Files importing the Supabase client | 3 |
| `supabase.*` call sites | 25 |
| `supabase.auth.*` call sites | 6 |
| `functions.invoke` call sites | 2 |

Data access is funnelled through `src/lib/supabaseQueries.ts`, which is the single most important fact for estimating this work. Once an API exists with matching semantics, the frontend change is contained to that file, the four contexts, and `AuthContext`.

---

## 2. Target architecture

```
Browser (React SPA, unchanged UI)
   │  HTTPS, session cookie
   ▼
Azure Container Apps — API tier  (Node 24 + Fastify + TypeScript)
   │  ├── Entra ID OIDC (sign-in, token validation)
   │  ├── Tenant isolation enforced per request (§5)
   │  └── pg connection pool, VNet-integrated
   ▼
Azure Database for PostgreSQL — Flexible Server (private endpoint)
   psql-ny1emailbrief-dev-uks-001 · DB `postgres` · schema `public`
```

**Front end:** Azure Static Web Apps or App Service. The Vite build is unchanged — still a static bundle, still two build-time env vars (now pointing at the API, not Supabase).

**Why Container Apps for the API:** it supports VNet integration, which is mandatory — the database has no public endpoint (confirmed: `psql-ny1emailbrief-dev-uks-001...` resolves only to a `privatelink` CNAME with no public A record). Anything outside the VNet, including Vercel, cannot reach it.

---

## 3. Networking constraint (verified)

```
psql-ny1emailbrief-dev-uks-001.postgres.database.azure.com
  → CNAME ff4caf98c6fb.privatelink.postgres.database.azure.com
  → no public A record
```

Consequences:
1. The API **must** run inside the VNet (or peered network).
2. Schema migrations must be run from inside the network — a VPN-connected workstation, an Azure Cloud Shell in the VNet, or a CI job with a VNet-integrated runner. They cannot be run from an arbitrary developer laptop.
3. Local development needs a decision: either developers work over VPN, or a local Postgres container is used for dev with migrations applied to both. **Recommend the local container** — faster, no VPN dependency, and it forces migrations to be reproducible.
4. Require TLS. Azure Flexible Server enforces it; the pool config must set `ssl: { rejectUnauthorized: true }` with the Azure root CA, not `false`.

---

## 4. Authentication design

**Assumption pending confirmation (§8): Microsoft Entra ID.**

- Sign-in: OIDC authorization code flow with PKCE, Entra ID tenant.
- The API validates the Entra token, then issues its own short-lived **HTTP-only, Secure, SameSite=Lax session cookie**. The SPA never stores a token in `localStorage` — an improvement on today, where the Supabase session sits in browser storage.
- `profiles` is keyed on the Entra **object ID (`oid`)**, replacing `auth.users.id`.
- First sign-in provisions a `profiles` row (replacing the `handle_new_user()` trigger) with role `requester` and a `team_id` resolved by a rule to be confirmed (default team, or Entra group mapping).
- Roles (`admin` / `producer` / `requester`) stay in `profiles.role`, not in Entra, so admins can manage them in the existing Users settings tab without touching Azure AD.

**What disappears:** `create-user` Edge Function, the sign-up form, password reset, and all password handling. Users exist because they exist in Entra.

---

## 5. ⚠️ The security model changes — this is the main risk

Today, tenant isolation is enforced **by the database**. Every one of the 16 tables has RLS policies scoping rows to the caller's `team_id`, resolved through `get_my_team_id()` which reads the request's JWT claims. A bug in application code cannot leak another team's data, because Postgres refuses to return the rows.

After migration, the API connects as a single application role. **RLS policies will still exist but will no longer constrain anything**, because nothing sets the claims they read. Isolation becomes application code.

This must be designed in deliberately, not left implicit:

1. **Every query takes `teamId` from the authenticated session, never from the request body or query string.** A client-supplied `team_id` is an authorization bug.
2. **One data-access module owns the SQL.** No ad-hoc queries in route handlers.
3. **A cross-tenant test suite is mandatory** — for each resource, a test asserting that team A's session cannot read, update or delete team B's row. This is the single most valuable test suite in the migration and the project has no tests at all today.
4. **Optional hardening worth considering:** keep RLS active and have the API `SET LOCAL app.team_id` per transaction, rewriting policies to read `current_setting('app.team_id')`. This preserves database-level enforcement as a second line of defence. Costs a transaction wrapper on every request; recommended given this is client data.

---

## 6. Data model changes required

| Current | Problem on Azure | Resolution |
|---|---|---|
| `profiles.id` → FK `auth.users(id)` | No `auth` schema | Drop FK; `profiles.id` becomes the Entra `oid` (uuid) |
| `briefs.created_by`, `drafts.user_id`, `audit_log.user_id` → FK `auth.users(id)` | Same | Re-point to `profiles(id)` |
| `team_members` view joins `auth.users` for email | Same | `profiles.email` already exists — rebuild the view from `profiles` alone |
| `handle_new_user()` trigger on `auth.users` | No trigger source | Replaced by API provisioning on first sign-in (§4) |
| `get_my_team_id()`, `get_my_role()` | Read JWT claims that no longer exist | Drop, or rewrite against `current_setting('app.team_id')` if §5.4 is adopted |
| `gen_random_uuid()` defaults | `pgcrypto` may not be installed | `CREATE EXTENSION IF NOT EXISTS pgcrypto;` |
| `kanban_cards` composite FK → `kanban_columns` | Carries over | Still must seed `kanban_columns` per team or inserts fail |

**Data volume is trivial:** 12 rows total in the Supabase project, all in `drafts`. There is effectively nothing to migrate — this is a schema exercise, not a data exercise. Do not over-engineer the cutover.

---

## 7. Subsystems — six plans, not one

Each produces working, testable software on its own. Order matters; 1 and 2 are prerequisites for the rest.

| # | Subsystem | Deliverable | Depends on |
|---|---|---|---|
| 1 | **Schema & migrations** | Reproducible migrations in-repo creating all 16 tables, the view, indexes, constraints with §6 applied; runs against local Postgres and Azure | §8 answers |
| 2 | **API foundation + auth** | Fastify app, Entra OIDC, session cookie, `profiles` provisioning, health check, VNet-deployed | 1 |
| 3 | **Data endpoints** | Routes mirroring `supabaseQueries.ts` + `approvalsService.ts` + `auditLog.ts`, with the cross-tenant test suite from §5.3 | 2 |
| 4 | **Function replacements** | `brand-guardian-ai` → API route calling Anthropic; `create-user` → removed (§4) | 2 |
| 5 | **Frontend rewiring** | Replace the client in 3 files, 25 call sites; delete `@supabase/supabase-js` | 3, 4 |
| 6 | **Hosting & CI** | Container Apps + Static Web Apps, env/secrets in Key Vault, deploy pipeline | 2, 5 |

**Testing note:** the project has zero tests today. Subsystem 3 introduces the first suite, and it should be the tenant-isolation suite. That is not optional scope.

---

## 8. Blocking questions

Implementation plans with real code cannot be written until these are answered.

1. **What is actually in the Azure database right now?** "Already migrated" needs verifying — specifically whether the `auth.users` foreign keys survived, since they cannot have. Run the queries in §9 and paste the output.
2. **Entra ID confirmed for sign-in?** (§4) If not, the alternative is email/password owned by our API, which adds password hashing, reset flows and session management to subsystem 2.

**Lower priority, needed before subsystem 2:**
3. Who operates the Azure resources — can this project create Container Apps, or does IT provision them?
4. `team_id` on first sign-in: single default team, or mapped from Entra groups?
5. Local dev: VPN to Azure, or local Postgres container? (Recommend container — §3.3.)

---

## 9. Verification queries

Run from a machine on the corporate network or VPN, against the Azure database.

```sql
-- Tables present
SELECT table_name FROM information_schema.tables
 WHERE table_schema='public' ORDER BY 1;

-- Foreign keys: anything still pointing at auth.users is broken
SELECT conname, conrelid::regclass AS tbl, confrelid::regclass AS refs
  FROM pg_constraint
 WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY 2;

-- RLS policies carried over?
SELECT schemaname, tablename, policyname FROM pg_policies
 WHERE schemaname='public' ORDER BY tablename;

-- Helper functions carried over?
SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY 1;

-- Does an auth schema exist at all?
SELECT EXISTS(SELECT 1 FROM information_schema.schemata
               WHERE schema_name='auth') AS auth_schema_exists;

-- Extensions
SELECT extname FROM pg_extension ORDER BY 1;

-- Row counts, to confirm whether data came across
SELECT 'profiles' t, COUNT(*) FROM profiles
UNION ALL SELECT 'briefs', COUNT(*) FROM briefs
UNION ALL SELECT 'kanban_cards', COUNT(*) FROM kanban_cards
UNION ALL SELECT 'drafts', COUNT(*) FROM drafts
UNION ALL SELECT 'settings', COUNT(*) FROM settings;
```

---

## 10. Credential handling

The connection details shared on 2026-10-12 included a plaintext password. Treat it as exposed and rotate it as part of this work.

Target state: the API reads its connection string from **Azure Key Vault** via managed identity — no database password in `.env` files, CI variables, or source control. Nothing in this repository should ever contain it.

Separately, the Pardot OAuth client secret is currently stored in the `settings` JSONB blob and read into the browser (see `TECH_STACK.md` §3). The API tier is the natural place to fix that: move Pardot calls server-side so the secret never leaves Azure. Worth folding into subsystem 4.
