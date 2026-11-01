# The Ceylon Tea Experience

One Next.js app for the public site, customer booking, and staff dashboard. Route groups keep those areas separate without changing URLs.

```text
app/
  (site)/          public pages: /, /about, /services, /gallery, /contact, policies
  (booking)/book   customer booking and payment result
  (staff)/         /login and /dashboard
  api/             route handlers
    auth/          staff login, refresh, logout, profile
    public/        booking catalog, promo codes, PayHere notify
    bookings/      staff booking administration
components/
  ui/              shared controls
  booking/         customer booking flow
  bookings/        staff booking screens
  dashboard/       staff shell, permissions context, user and role management
lib/               auth, database, pricing helpers
prisma/            MySQL schema and migrations
```

## Local setup

```bash
cp .env.example .env.local
npm ci
npx prisma generate
npm run dev
```

Open http://localhost:3000. Staff sign-in is at http://localhost:3000/login.

JWT secrets must be at least 32 characters. Do not set `NODE_ENV` in env files.
