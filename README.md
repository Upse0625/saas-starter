# Saasly Starter

Production-grade SaaS foundation. Skip 8 months of plumbing.

This is the auth, billing, multi-tenancy, and API layer you rewrite on every SaaS — built once, properly, in TypeScript. Clone it, point it at your Stripe and Resend accounts, and start building your actual product.

## What's included

- ✅ JWT auth with httpOnly cookies + per-device session revocation
- ✅ Two-factor authentication (TOTP via authenticator apps, with recovery codes)
- ✅ Multi-tenant organizations with roles (owner / admin / member)
- ✅ Email invitations with token-based acceptance + decline (email-match verified)
- ✅ Stripe billing — Checkout + Customer Portal + signature-verified webhooks (3 tiers wired)
- ✅ Public REST API at `/v1` with SHA-256-hashed API keys + per-key rate limiting
- ✅ Audit log — 21 action types, IP + user-agent capture, paginated viewer
- ✅ Email verification + password reset (Resend integration, console fallback in dev)
- ✅ Production-tested SQLite with WAL mode + auto-migration on boot
- ✅ TypeScript strict mode, zero `any` in `app/` and `lib/`

## Live demo

**[saas.drodriguez.site](https://saas.drodriguez.site)** — try it before you buy. Sign up, enable 2FA, create an API key, invite a teammate, open the audit log. What you see is exactly what's in this repo.

## Quick start

```bash
# 1. Clone and enter
git clone <your-repo-url> saasly && cd saasly

# 2. Install dependencies (npm, pnpm, or bun all work)
npm install

# 3. Create your .env and generate a signing secret
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 4. Create the database (all tables + indexes)
npm run db:migrate

# 5. Run it
npm run dev          # http://localhost:3000
```

> Shortcut: `npm run setup` runs steps 2–4 in one command. Then add a `JWT_SECRET` and `npm run dev`.
> Optional: `npm run db:seed` loads a demo org and three logins (`demo@example.com` / `demo1234`).

The app boots with **only `JWT_SECRET` set** — email and billing are optional and degrade gracefully until you add their keys.

## Setup guide

### Resend (transactional email)

Used for email verification, password reset, and invitation emails. Without it, those emails print to the server console (fine for local dev).

1. Create an account at **[resend.com](https://resend.com)**.
2. Verify your sending domain at **[resend.com/domains](https://resend.com/domains)**.
3. Create an API key at **[resend.com/api-keys](https://resend.com/api-keys)**.
4. Add to `.env`:

```bash
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=noreply@yourdomain.com   # must be on a domain you verified above
```

### Stripe (billing)

Used for subscription Checkout, the Customer Portal, and plan-change webhooks. Without it, the billing UI renders but checkout is disabled.

1. Grab your secret key at **[dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)** (start with **test mode** keys).
2. Create two products with recurring prices at **[dashboard.stripe.com/products](https://dashboard.stripe.com/products)** — one for Pro, one for Enterprise. Copy each **price ID** (starts with `price_`).
3. Create a webhook at **[dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)** pointing to `{NEXT_PUBLIC_APP_URL}/api/stripe/webhook`, subscribe to `checkout.session.completed` and the `customer.subscription.*` events, then copy the **signing secret** (`whsec_…`).
4. Add to `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Database

Ships with **SQLite** (via `better-sqlite3`) in WAL mode. Zero setup — the file is created and migrated automatically.

```bash
DB_PATH=./local.db   # defaults here; point at a mounted volume in Docker
```

Schema lives in `lib/db/schema.ts` (Drizzle) plus the full migrator in `lib/db/index.ts` and the standalone `scripts/migrate.mjs`.

**Moving to Postgres:** the ORM layer is Drizzle, so the typed queries port cleanly — swap `drizzle-orm/better-sqlite3` for `drizzle-orm/postgres-js` and update `drizzle.config.ts`. Be aware that several hot-path routes use raw `better-sqlite3` (`sqlite.prepare(...)`) for speed; you'll need to port those handful of raw queries too. It's a focused afternoon, not a rewrite.

## What's NOT included

Read this before you buy — it's as important as the feature list.

- **No production email by default.** Ships with a placeholder Resend key; verification/reset/invite emails log to the console until you add a real key (see above).
- **No Stripe products created.** Ships in test mode with no price IDs. You create your own products and paste the IDs. The billing code is real and signature-verified — the catalog is yours to define.
- **Rate limiting is in-memory.** Token-bucket limiter that's correct for a single instance and resets on restart. For multi-instance/serverless, swap `lib/rate-limit.ts` for a Redis-backed store (the interface is ~15 lines).
- **SQLite by default.** Comfortable for thousands of users on one box. For horizontal scale, migrate to Postgres (notes above).
- **"Delete organization" is disabled** in the demo (one button, guarded by `title="Feature not implemented in demo"` in `app/(dashboard)/settings/page.tsx`). Wiring it up is a small handler — left out so a demo click can't nuke data.
- **No test suite.** This is production-ready application code, not a test harness. There are no unit/e2e tests included; add your own around your business logic.

## Architecture decisions

- **Next.js 16 App Router** (not Pages Router) — server components for data-fetching pages, route handlers for the API, and edge middleware for route protection. It's the current, supported model.
- **Drizzle over Prisma** — no codegen step, no separate query engine binary, synchronous SQLite access, and SQL you can actually read. Lighter to ship and to reason about.
- **SQLite by default** — most SaaS apps die with zero users, not from a database bottleneck. WAL-mode SQLite handles real traffic, deploys as a single file, and removes a whole class of infra. Drizzle keeps the door open to Postgres when you actually need it.
- **JWT over server sessions** — stateless auth in an httpOnly cookie, but with a `sessions` table for revocation, so you get the best of both: no per-request session lookup on the hot path, plus per-device "log out everywhere".
- **Resend over SendGrid/Postmark** — a clean modern API, generous free tier, and the integration here gracefully no-ops (console-logs) without a key, so the app runs day one.
- **Stripe Checkout over Elements** — Stripe hosts the payment page, so you inherit their PCI scope, SCA handling, and conversion-tuned UI for free. Elements is more work for control you probably don't need yet.

## Tech stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router) | 16.2.4 |
| UI | React | 19.2.4 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS | ^4 |
| Icons | lucide-react | ^0.473.0 |
| ORM | Drizzle ORM | ^0.45.2 |
| Database | better-sqlite3 (SQLite, WAL) | ^12.9.0 |
| Auth (JWT) | jose | ^6.2.3 |
| Password hashing | bcryptjs | ^3.0.3 |
| 2FA | otplib + qrcode | ^12.0.1 / ^1.5.4 |
| Billing | stripe + @stripe/stripe-js | ^22.1.0 / ^9.4.0 |
| Email | resend | ^6.12.2 |

## Project structure

```text
saasly/
├── app/
│   ├── (marketing)/            # public landing page
│   ├── (auth)/                 # login, signup
│   ├── (dashboard)/            # dashboard + settings (members, billing, API keys, security, activity)
│   ├── invite/[token]/         # invitation acceptance / decline page
│   ├── verify-email/[token]/   # email verification
│   ├── reset-password/[token]/ # password reset
│   ├── forgot-password/
│   ├── api/
│   │   ├── auth/               # login, signup, logout, 2fa/*, sessions, verify, reset
│   │   ├── org/                # members, invitations
│   │   ├── invitations/[token]/# GET details, accept, decline
│   │   ├── keys/               # API key CRUD
│   │   ├── stripe/             # checkout, portal, webhook
│   │   └── audit/              # paginated audit log
│   └── v1/                     # public REST API: me, members, usage (Bearer API key)
├── lib/
│   ├── auth.ts                 # JWT, cookies, session creation + revocation
│   ├── totp.ts                 # 2FA secret/QR/verify + recovery codes
│   ├── api-key.ts              # key generation + SHA-256 hashing + verification
│   ├── audit.ts                # audit() writer + listAuditLogs()
│   ├── rate-limit.ts           # in-memory token-bucket limiter
│   ├── stripe.ts               # plan catalog + Stripe client
│   ├── email.ts                # Resend wrapper (console fallback)
│   ├── format.ts               # small formatting helpers
│   ├── utils.ts                # nanoid, slugify, etc.
│   └── db/
│       ├── schema.ts           # Drizzle schema
│       └── index.ts            # client + auto-migration
├── scripts/
│   ├── migrate.mjs             # create all tables + indexes (db:migrate)
│   └── seed.mjs                # demo org + logins (db:seed)
├── .env.example                # every env var, documented
├── Dockerfile                  # Next.js standalone production image
└── proxy.ts                    # edge middleware: route protection
```

## Support

- **Email:** drodguez1080@gmail.com
- **Issues:** open a GitHub issue on the repo you receive after purchase.
- **Pull requests** are welcome — fixes and improvements that benefit everyone get merged.

## License

MIT, with one restriction: you can use this in unlimited personal and commercial projects and modify it however you like — but you may **not** resell or redistribute it as a competing starter template / boilerplate product. Build your apps with it; don't repackage and sell it. Full text in [`LICENSE`](./LICENSE).

## Built by

**Damian Rodriguez** — [drodriguez.site](https://drodriguez.site)

> I built Pocket Root ([pocketroot.com](https://pocketroot.com)) on the same architecture. This starter is what I wished I had when I started.
