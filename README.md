# The Ceylon Tea Experience — booking

Next.js app for customer booking, PayHere payments, booking policies, and the staff dashboard. The public marketing site (home, about, services, gallery, contact, partners, and blog) lives in the separate `ceylon-experience` website.

```text
app/
  page.js          / redirects to /book
  (booking)/book   customer booking and payment result
  (site)/          privacy, refund, and terms pages on the booking domain
  (staff)/         /login and /dashboard
  api/             route handlers
    auth/          staff login, refresh, logout, profile
    public/        booking catalog, promo codes, PayHere notify
    bookings/      staff booking administration
components/
  ui/              shared controls
  booking/         customer booking flow, header, and footer
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

Open http://localhost:3000. That address redirects to http://localhost:3000/book. Staff sign-in is at http://localhost:3000/login.

JWT secrets must be at least 32 characters. Do not set `NODE_ENV` in env files.
