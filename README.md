# The Ceylon Tea Experience Booking Engine

Transactional booking, payment, and staff administration for **The Ceylon Tea Experience**.

The public marketing website is maintained separately at [www.theceylonteaexperience.com](https://www.theceylonteaexperience.com). This repository contains the booking, payment, admin, and supporting backend application. It is **not** a second copy of the marketing website.

Intended future public hostname (DNS is **not** configured from this repository):

```text
https://book.theceylonteaexperience.com
```

This codebase is **not production-ready** until private staging, PayHere sandbox testing, and a further security review are complete.

## Purpose

- Customer booking flow (`/book`)
- PayHere checkout and server-to-server notify
- Read-only payment result (`/book/result`)
- Staff dashboard (`/dashboard`)
- APIs, Prisma/MySQL, authentication, and security controls

## Architecture

```text
www.theceylonteaexperience.com
        │  Book Now (configured later)
        ▼
book.theceylonteaexperience.com
        ├── /                 → redirects to /book
        ├── /book             customer booking
        ├── /book/result      payment status (display only)
        └── /dashboard        staff/admin
```

Payment truth:

```text
Customer → PayHere checkout → PayHere notify (signature + merchant + amount + currency)
         → Payment/Booking updated → /book/result reads stored state
```

Admin:

```text
Bearer JWT → Next.js Proxy (valid JWT) → Route Handler requireAdmin (role === "admin")
```

Stack: Next.js 16 App Router, React 19, Prisma, MySQL, PayHere.

## Booking flow

1. Experience / program selection
2. Location, session, date, and time
3. Availability
4. Guest details
5. Promo / affiliate code
6. Price calculation
7. Payment choice
8. PayHere checkout
9. Result / confirmation (order reference; no query-string mutation)

## Admin dashboard

`/dashboard` retains bookings, programs, sessions, session types, locations, customers, leaders/agents, discounts, commissions, profile, and related APIs. Dashboard HTML is still client-gated (P1); APIs enforce admin authorization.

## Local setup

```bash
cp .env.example .env.local
# fill placeholders — never commit real values
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

JWT secrets must be at least 32 characters. Do not set `NODE_ENV` in `.env` files.

## Environment variables

See `.env.example` (names and placeholders only).

| Name | Ownership |
| --- | --- |
| `DATABASE_URL` | CREATE NEW RESOURCE (TCTE MySQL) |
| `JWT_ACCESS_SECRET` | GENERATE NEW |
| `JWT_REFRESH_SECRET` | GENERATE NEW |
| `JWT_ACCESS_EXPIRY` | GENERATE NEW (default `15m`) |
| `JWT_REFRESH_EXPIRY` | GENERATE NEW (default `7d`) |
| `PAYHERE_MERCHANT_ID` | TCTE ACCOUNT VALUE |
| `PAYHERE_MERCHANT_SECRET` | TCTE ACCOUNT VALUE |
| `PAYHERE_RETURN_URL` | ENVIRONMENT-SPECIFIC URL |
| `PAYHERE_CANCEL_URL` | ENVIRONMENT-SPECIFIC URL |
| `PAYHERE_NOTIFY_URL` | ENVIRONMENT-SPECIFIC URL |
| `PAYHERE_CHECKOUT_URL` | TCTE ACCOUNT VALUE (sandbox for staging) |
| `BOOKINGS_REPORT_API_KEY` | GENERATE NEW |
| `TRUST_PROXY` | ENVIRONMENT-SPECIFIC (`true` only behind a trusted proxy) |
| `ALLOW_SEED` | OPTIONAL (must not be true in production) |

Do not reuse secrets from the previous developer repository or SQL dump.

## Prisma / database

The schema is rebuilt from migrations. Do **not** import legacy SQL dumps.

```bash
npx prisma migrate deploy
```

`prisma/seed.js` refuses `NODE_ENV=production` unless `ALLOW_SEED=true`. Seed accounts are local fixtures only.

## Testing

```bash
npm test
npm run lint
npm run build
```

Synthetic HTTP tests (disposable MySQL, no production data):

```bash
bash tests/helpers/start-security-mysql.sh
# migrate, build, start, then:
node tests/security/synthetic-runtime-qa.mjs
```

## Security

See [docs/SECURITY.md](docs/SECURITY.md).

- Proxy is an initial request boundary, not the only authorization layer.
- Sensitive Route Handlers perform server-side authorization.
- Browser result/return URLs cannot confirm payment.
- PayHere notify is authoritative.
- Public API paths are explicitly classified.
- Customer dumps and real secrets must never be committed.

## PayHere sandbox

Use a TCTE-owned sandbox merchant. Configure return, cancel, and notify URLs for the **staging** host. Do not point staging at live credentials. Return/cancel URLs may include `order_id` for display lookup only.

## Staging

Private deployment only:

```text
new GitHub repo → fresh staging MySQL → fresh JWT/API secrets → PayHere Sandbox
```

Do not connect `book.theceylonteaexperience.com` until staging sign-off.

## Production prerequisites

- Branch protection, secret scanning, Dependabot
- Fresh TCTE-controlled production database
- Fresh secrets (never copied from the old repo)
- Live PayHere after sandbox sign-off
- HTTPS, backups, monitoring
- Final security review

Do not deploy from this README alone.

## Relationship to the marketing website

| Site | Repository | Role |
| --- | --- | --- |
| www.theceylonteaexperience.com | separate | Marketing, About, Gallery, Services, Journal |
| book.theceylonteaexperience.com | this repo | Booking, payment, admin |
