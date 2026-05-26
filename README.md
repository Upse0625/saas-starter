# SaaS Starter

> A multi-tenant SaaS foundation with auth, 2FA, team orgs, billing, and a public API. Part of [drodriguez.site](https://drodriguez.site) — a portfolio of production full-stack demos by Damian Rodriguez.

**Live demo:** https://saas.drodriguez.site

## What it demonstrates
- Stateful JWT sessions (signed with `jose`, HS256) backed by a `sessions` table so individual sessions can be revoked, not just expired
- TOTP two-factor auth with QR-code enrollment and one-time recovery codes (`otplib` + `qrcode`)
- Token-based email flows (verification, password reset, org invitations) with a console fallback when no mail provider is configured
- A hashed-secret API key scheme (`sk_live_` prefix, SHA-256 at rest, short display prefix) powering a separate public `/v1` API
- Per-key in-memory rate limiting with standard `X-RateLimit-*` / `Retry-After` headers
- Multi-tenant data model: organizations, members with roles (owner/admin/member), and invitations
- An append-only audit log that records security-relevant actions, including every authenticated API call
- Optional real Stripe billing (checkout, customer portal, webhooks) that degrades gracefully to a no-op when keys are absent

## Tech stack
- **Next.js 16** (App Router, React 19) — built with Next.js standalone output
- **TypeScript** + **Tailwind CSS 4**
- **better-sqlite3** with **Drizzle ORM** (`drizzle-kit` for studio)
- **jose** — JWT signing/verification
- **bcryptjs** — password hashing
- **otplib** + **qrcode** — TOTP 2FA
- **stripe** + **@stripe/stripe-js** — billing (optional)
- **resend** — transactional email (optional)

## Features
- Email/password signup and login with bcrypt hashing
- Email verification and password reset via expiring tokens
- TOTP 2FA: setup, enable, disable, login challenge, and recovery codes
- Active session listing and revocation
- Organizations with role-based membership and email invitations
- API key management — create, list, and revoke keys (Settings → API Keys)
- Public REST API under `/v1` authenticated by Bearer API key
- Audit log of account and org activity
- Stripe checkout, billing portal, and webhook handling across Starter/Pro/Enterprise plans

## Running locally
### Prerequisites
- Node 22+, pnpm 10

### Setup
```bash
pnpm install
pnpm db:seed   # creates local.db and seeds demo users + an org
pnpm dev
```
Open http://localhost:3000

The SQLite database (`local.db` by default) is created and migrated automatically on first import — `pnpm db:seed` just populates it with demo data. Use `pnpm db:studio` to browse it with Drizzle Studio.

### Demo credentials
Seeded by `scripts/seed.mjs` into the **Acme Corp** org (Pro plan):

| Email | Password | Role |
| --- | --- | --- |
| `demo@example.com` | `demo1234` | owner |
| `alice@example.com` | `alice1234` | admin |
| `bob@example.com` | `bob1234` | member |

### Environment variables
None are required for local development — auth falls back to an insecure dev signing key, and email/Stripe degrade to no-ops. In production, `JWT_SECRET` is mandatory (the app refuses to start without it).

| Variable | Required? | What it does | Default |
| --- | --- | --- | --- |
| `JWT_SECRET` | Required in production | Signing key for session JWTs. Falls back to `AUTH_SECRET`, then a dev-only key outside production. | dev-only insecure key |
| `DB_PATH` | No | SQLite database file path. | `./local.db` |
| `NEXT_PUBLIC_APP_URL` | No | Base URL used in email links. | `http://localhost:3001` |
| `APP_NAME` | No | Product name shown in emails and as the TOTP issuer. | `SaaS Starter` |
| `EMAIL_FROM` | No | From address for outgoing email. | `noreply@example.com` |
| `RESEND_API_KEY` | Optional | Enables real email via Resend. Without it, emails print to the server console. | unset |
| `STRIPE_SECRET_KEY` | Optional | Enables Stripe billing. Without it, billing endpoints are disabled. | unset |
| `STRIPE_PRO_PRICE_ID` | Optional | Stripe price ID for the Pro plan. | unset |
| `STRIPE_ENTERPRISE_PRICE_ID` | Optional | Stripe price ID for the Enterprise plan. | unset |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key for the client. | unset |

## API reference
The `/v1` API is a public, key-authenticated REST surface separate from the cookie-authenticated dashboard. Create a key in **Settings → API Keys** (it's shown once, at creation) and send it as a Bearer token:

```bash
curl https://saas.drodriguez.site/v1/me \
  -H "Authorization: Bearer sk_live_..."
```

All endpoints are scoped to the org that owns the key, rate-limited to **60 requests/min per key**, and audited as `api_key.used`. Missing or malformed keys return `401`; rate-limit breaches return `429` with `Retry-After`.

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/v1/me` | The key owner's user (id, email, name) and their organization (id, name, slug, plan). |
| `GET` | `/v1/members` | All members of the org, each with role and join date. |
| `GET` | `/v1/usage` | Audit-event counts for the org over a 30-day window: `total_events` and a `by_action` breakdown. |

## Architecture notes
- **Sessions are revocable.** The JWT carries a `sessionId` that's checked against a `sessions` row on each request, so a session can be killed server-side. JWTs without a `sessionId` (legacy cookies) are accepted to avoid logging existing users out.
- **API keys are never stored in plaintext.** Only the SHA-256 hash and a short display prefix are persisted; the full key is shown once at creation.
- **Rate limiting is in-memory** (a `Map` of token buckets with periodic sweeping). This is intentionally single-instance — fine for a demo, but a shared store (e.g. Redis) would be needed to scale horizontally.
- **Stripe is optional by design.** `getStripe()` returns `null` when no secret key is set, and billing routes short-circuit, so the demo runs without any payment credentials.
- **The DB self-migrates.** `lib/db` runs `CREATE TABLE IF NOT EXISTS` on import with WAL mode and tuned pragmas — no separate migration step for the demo.

## Deployment
Containerized with the included `Dockerfile` (Next.js standalone) and served behind nginx + Let's Encrypt on a VPS. The image pre-seeds a `seed.db` at build time; the entrypoint copies it to the persistent `DB_PATH` on first boot. Full orchestration in the [Portfolio monorepo](https://github.com/Upse0625/Portfolio).

## License
For portfolio/demonstration use.
