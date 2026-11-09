# Deployment

## Live app

**https://talentlens-pink.vercel.app** — deployed on Vercel (free Hobby
plan), database on Prisma Postgres (free tier, Neon-backed), both
provisioned through Vercel's own integration so no separate signups were
needed. Demo logins below.

## Running locally

**Prerequisites:** Node.js 20+, npm, and a Postgres database (a free one
works fine — see "Getting a free Postgres database" below).

1. Clone the repository and install dependencies:
   ```bash
   git clone <GITHUB_URL>
   cd talentlens
   npm install
   ```
2. Copy the environment template and fill it in:
   ```bash
   cp .env.example .env
   ```
   Set `DATABASE_URL` to your Postgres connection string, and `JWT_SECRET`
   to any long random string (e.g.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. Create the database schema and load sample data:
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — it redirects to `/login`.
5. Run the test suite:
   ```bash
   npm test
   ```

To reset the database back to a clean seeded state at any point:
```bash
npm run db:reset
```

### Getting a free Postgres database

Any of these work with zero cost:
- **Vercel Postgres** (what this submission uses) — `npx vercel link`,
  then `npx vercel install prisma/prisma-postgres`, then
  `npx vercel env pull .env.local` to get the connection string locally.
- **Neon** (neon.tech) — free tier, standalone signup.
- **Supabase** (supabase.com) — free tier, standalone signup.

## Demo login details (for the reviewer)

| Role | Email | Password |
|---|---|---|
| Recruiter | `recruiter@talentlens.app` | `Demo@1234` |
| Client — Northbridge Technologies | `client.northbridge@talentlens.app` | `Demo@1234` |
| Client — Meridian Bank Ops | `client.meridian@talentlens.app` | `Demo@1234` |
| Client — Oakridge Retail | `client.oakridge@talentlens.app` | `Demo@1234` |

These accounts and passwords exist only in the seed script (not committed
as real data) and are for demo/review purposes only.

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string for Prisma. |
| `JWT_SECRET` | Yes | Signs the session cookie. Must be a long random string, different per environment. |

No values are committed anywhere in this repository — only variable
*names* appear in `.env.example`. Vercel's own project env vars (set via
`vercel env add` / the dashboard) hold the real production values.

## How it's deployed

1. **Hosting:** Vercel (free Hobby plan), linked via `vercel link` and
   deployed with `vercel --prod`. Deployment protection (Vercel's SSO
   wall, on by default for new projects) was explicitly disabled so the
   app is publicly reachable without a Vercel login.
2. **Database:** Prisma Postgres, provisioned with
   `vercel install prisma/prisma-postgres` — this installs it as a
   Vercel Marketplace integration and auto-populates `DATABASE_URL` (and
   a few related variables) as project environment variables, so no
   separate database-provider signup was needed.
3. **Schema + seed:** `npx prisma db push` against the production
   `DATABASE_URL`, then `npx tsx prisma/seed.ts`, run once locally with
   the production connection string loaded (`vercel env pull`).
4. **Secrets:** `JWT_SECRET` was added with `vercel env add JWT_SECRET
   production` (and `preview`) — never committed, never echoed into any
   log.
5. File uploads (CV parsing) happen in-request via Server Actions — no
   separate object storage is needed for this submission's scope, since
   the resume text is extracted and stored in the database, not the
   original file.

### A real bug this surfaced, and the fix

Two issues only showed up once this ran on Vercel's actual serverless
runtime (both invisible in local dev):

- **pdf-parse broke every Server Action, not just uploads.** `cv-parse.ts`
  statically imported `pdf-parse` at module load time; because it's
  imported from the same `actions.ts` file as every other Server Action,
  *logging in* pulled in `pdfjs-dist`, which throws
  (`ReferenceError: DOMMatrix is not defined`) in a plain Node serverless
  function with no canvas/browser globals. Fixed by making that import
  dynamic (`await import("pdf-parse")`), so it only loads when a PDF is
  actually being parsed, and by stubbing a minimal `DOMMatrix` before
  that import (pdfjs-dist expects the global to exist even for pure text
  extraction, no rendering involved).
- **The PDF worker file was missing from the deployed bundle.**
  `pdfjs-dist` requires its `pdf.worker.mjs` by a dynamic path Next's
  build-time file tracer can't see, so it was silently left out of the
  Vercel function (`Cannot find module '...pdf.worker.mjs'`). Fixed with
  `outputFileTracingIncludes` in `next.config.ts`, forcing that file into
  every route's trace explicitly.

Both were confirmed fixed by dispatching a real file upload against the
live production URL, not just redeploying and hoping.

## Security notes relevant to deployment

- Passwords are hashed with bcrypt; never stored or logged in plain text.
- The session cookie is `httpOnly`, `sameSite=lax`, and `secure` in
  production.
- Every Server Action re-derives the session from the cookie and
  re-checks role and company ownership — the UI hiding a button is not
  treated as access control.
- No secrets or real personal data are committed; `.env` and `.env.local`
  are gitignored and only `.env.example` (names, no values) is tracked.
