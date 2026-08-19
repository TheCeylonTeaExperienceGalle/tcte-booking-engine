# TCTE booking security

This document describes the **current** P0 security boundary for the booking engine. It is not a production-go-live certificate.

- Proxy is an initial request boundary, **not** the only authorization layer.
- Sensitive Route Handlers perform server-side authorization (`requireAuthenticatedUser` / `requireAdmin`).
- Browser result/return URLs cannot confirm payment.
- PayHere server-to-server notification is authoritative (signature, merchant, amount, currency, idempotency, terminal states).
- Public API paths are explicitly classified. `/api/booking` is not a prefix of `/api/bookings`.
- Customer/database dumps and real secrets must never be committed.

Missing role means no privilege. There is no `role || "admin"` fallback.

## Path classification

| Path | Class | Notes |
| --- | --- | --- |
| `POST /api/booking` | PUBLIC | Customer checkout |
| `/api/public/*` | PUBLIC | Catalog, promo, PayHere notify |
| `POST /api/discount-rules/calculate` | PUBLIC | Public pricing helper |
| `/api/auth/*` | AUTH | Login/refresh/logout; profile and logout-all re-check the access token |
| `/api/bookings-report` | API KEY | `BOOKINGS_REPORT_API_KEY` Bearer. Proxy does not require dashboard JWT so external POS/report clients keep working |
| `/api/bookings`, `/api/bookings/*/manage` | ADMIN | Customer PII and payment mutations |
| `/api/programs`, `/api/sessions`, `/api/session-types`, `/api/locations` | ADMIN | Catalog administration |
| `/api/leaders`, `/api/customers` | ADMIN | Personally identifiable records |
| `/api/discount-rules` (except calculate), `/api/commission-rules`, `/api/commissions` | ADMIN | Financial rules |
| `/api/dashboard/stats`, `/api/availability`, `/api/users` | ADMIN | Admin dashboard |

## Payments

Allowed payment transitions implemented in `lib/security/payhere.js`:

- `PENDING → SUCCESS | FAILED | CANCELED`
- `SUCCESS` is terminal (replays do not downgrade)
- `FAILED` and `CANCELED` are terminal

Booking status follows the payment update inside the same Prisma transaction.

## Dashboard HTML

`/dashboard` still uses a client localStorage gate. That is P1. Authentication of APIs remains the security boundary. `/dashboard` and `/login` send `X-Robots-Tag: noindex, nofollow` for search engines; that is **not** an access control.

Do not set `NODE_ENV` in `.env` files. Next.js sets it automatically (`next dev` → development, `next build`/`next start` → production). Setting `NODE_ENV=development` during `next build` can fail prerender of `/_global-error`.

Do not commit database dumps. This booking-engine repository must never contain `thec_reviva_latest.sql` or any customer export.
