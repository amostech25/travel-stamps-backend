# Travel Stamps — Backend

A REST API for the Travel Stamps frontend: real password hashing, real sessions,
a real database, and one-vote-per-user likes enforced by a database constraint
rather than trusted client-side bookkeeping.

Stack: Node.js + Express + Prisma. SQLite for local development (zero setup);
swap one line for Postgres in production (see below).

## 1. Local setup

```bash
npm install
cp .env.example .env          # then edit JWT_SECRET at minimum
npx prisma migrate dev --name init
npm run seed                  # optional: creates the two sample profiles (Mara & Theo)
npm run dev                   # starts on http://localhost:4000
```

> **A note on this delivery:** in the sandboxed environment I built this in,
> `npx prisma migrate dev` couldn't complete because Prisma needs to download
> a native query-engine binary from `binaries.prisma.sh`, and that domain
> isn't reachable from that sandbox's network. Everything else was verified
> there — a full `npm install` succeeds, and every file passes a Node.js
> syntax check. The migration step will run normally on your machine, in CI,
> or on any standard host with normal internet access.

Health check: `GET http://localhost:4000/api/health` → `{ "ok": true }`

## 2. API reference

All endpoints are prefixed with `/api`. Auth uses an httpOnly session cookie
— the frontend must call `fetch(..., { credentials: "include" })` on every
request, and `FRONTEND_ORIGIN` in `.env` must exactly match the origin it's
served from (cookies + CORS won't work across a mismatch).

| Method | Path                        | Auth?      | Purpose |
|--------|-----------------------------|------------|---------|
| POST   | `/auth/signup`              | —          | Create account + bio in one call |
| POST   | `/auth/login`               | —          | Sign in |
| POST   | `/auth/logout`              | —          | Clear session |
| GET    | `/auth/me`                  | required   | Current signed-in user |
| GET    | `/profiles/:handle`         | optional   | Full public profile (bio, map, spots, like counts). Optional auth only affects `likedByViewer` flags. |
| PATCH  | `/profiles/me/bio`          | required   | Replace your own bio |
| POST   | `/profiles/me/photo`        | required   | Multipart upload, field name `photo` |
| POST   | `/spots`                    | required   | Add a spot (creates country/city if new) |
| POST   | `/spots/:id/references`     | required   | Add a reference link — must own the spot |
| POST   | `/spots/:id/like`           | required   | Toggle your like on a spot |
| GET    | `/search?q=...`             | optional   | Search by handle/name; empty `q` = recent directory listing |
| GET    | `/search/tags/:tag`         | —          | Users whose bio includes that traveller type |

Every write route validates its input with `zod` and returns `400` with
details on failure. Ownership is always derived from the session (`req.userId`),
never from a body field — there's no way to pass "act as this other user."

## 3. What "going live" actually requires

The code above is necessary but not sufficient. Before this is genuinely
public-facing, work through this list:

### Database
- Switch `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`
  and point `DATABASE_URL` at a managed Postgres instance (e.g. Neon,
  Supabase, RDS, Railway). SQLite is a single file on one machine — it
  cannot be shared across multiple app server instances, so it doesn't
  survive horizontal scaling or most container-based hosting (the
  filesystem is often ephemeral).
- Set up automated backups before real user data exists, not after.
- Run `prisma migrate deploy` (not `migrate dev`) in production/CI.

### File storage
- Uploaded photos currently save to local disk (`UPLOAD_DIR`) and are
  served by the app process itself. This breaks the moment you run more
  than one server instance (each has its own disk) and doesn't scale well
  for delivery speed. Move to object storage (S3, Cloudflare R2, or
  similar) plus a CDN in front of it; `processAndSaveImage` in
  `src/middleware/upload.js` is the one place that needs to change.
- **Content moderation isn't implemented.** File type/size are validated,
  but nothing screens image *content*. A public app accepting user photos
  needs at least automated moderation (many storage/CDN providers offer
  this as an add-on) and a human review/reporting path before launch.

### Auth & sessions
- Passwords are hashed with bcrypt (cost factor 12) — this part is real.
  Rotate `JWT_SECRET` if it's ever exposed, and never commit `.env`.
- Consider adding: email verification, password reset flow, and account
  deletion (a real public app collecting bios/photos should let people
  remove their data — see Privacy below).

### Transport & cookies
- Everything must run over HTTPS in production. Set `COOKIE_SECURE=true`
  only once it does — browsers silently drop secure cookies over plain
  HTTP, which would look like "login doesn't work."
- `FRONTEND_ORIGIN` must be the exact scheme+host+port your frontend is
  served from. `cors()` is configured to reject anything else when
  credentials are involved — this is intentional, not a bug to relax.

### Rate limiting & abuse
- Basic per-IP limits are in place for auth and likes (`src/middleware/rateLimit.js`).
  The default store is in-memory, which only enforces limits correctly on a
  single process. If you scale to multiple instances, switch to a shared
  store (e.g. `rate-limit-redis`) so limits apply globally, not per-instance.
- Consider CAPTCHA on signup if fake-account creation becomes a problem.

### Process management & hosting
- Don't run `node src/server.js` directly in production. Use a process
  manager (pm2, systemd) or, more simply, deploy as a container to a
  platform that handles restarts/health checks for you (Render, Fly.io,
  Railway, or a container service on your cloud of choice).
- Put a reverse proxy in front (nginx, Caddy, or your platform's built-in
  one) to terminate TLS and handle certificates (Let's Encrypt via certbot,
  or a platform-managed certificate).

### Observability
- Add structured logging (e.g. `pino`) and an error-tracking service (e.g.
  Sentry) before launch — `console.error` in the error handler is a
  placeholder, not a monitoring strategy.
- Add uptime monitoring on `/api/health`.

### CI/CD
- A minimal pipeline: on push to main — install, run `prisma migrate deploy`
  against a staging DB, run any tests, then deploy. Run migrations as a
  separate step from app startup, not inside `server.js`, so a bad
  migration doesn't get silently retried on every process restart.

### Privacy & legal
- This app stores names, bios, social links, and uploaded photos —
  personal data. Before public launch you'll want: a privacy policy, a way
  for users to export or delete their data, and awareness of which
  regulations apply to your users (GDPR if you have EU users, CCPA for
  California, etc.). None of that is implemented here — it's a legal/product
  decision as much as a code one.

### Frontend integration
- The HTML/JS frontend built earlier reads and writes through this
  sandbox's `window.storage` API. To use this backend, its data layer needs
  to be rewired to call these REST endpoints with
  `fetch(url, { credentials: "include" })` instead — happy to do that
  rewiring next if useful.
