# The Ceylon Tea Experience — booking engine

Customer booking, PayHere payments, policy pages, and the staff dashboard. The public marketing site is a separate app.

## Routes

- `/` redirects to `/book`
- `/book` and `/book/result` — customer booking and payment status
- `/privacy-policy`, `/refund-policy`, `/terms-and-conditions`
- `/login` and `/dashboard` — staff

## Local setup

```bash
cp .env.example .env.local
npm ci
npx prisma generate
npm run dev
```

Do not set `NODE_ENV` in env files.
