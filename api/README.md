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
