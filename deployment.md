# Deployment

## Running locally

**Prerequisites:** Node.js 20+, npm.

1. Clone the repository and install dependencies:
   ```bash
   git clone <GITHUB_URL>
   cd talentlens
   npm install
   ```
2. Copy the environment template and generate a session secret:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set `JWT_SECRET` to any long random string (e.g.
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   `DATABASE_URL` can stay as `file:./dev.db` for local SQLite.
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

To reset the database back to a clean seeded state at any point, stop the
dev server (SQLite locks the file while it's running) and run:
```bash
rm -f prisma/dev.db prisma/dev.db-journal
npm run db:push
npm run db:seed
```

## Demo login details (for the reviewer)

| Role | Email | Password |
|---|---|---|
| Recruiter | `recruiter@talentlens.app` | `Demo@1234` |
| Client — Northbridge Technologies | `client.northbridge@talentlens.app` | `Demo@1234` |
| Client — Meridian Bank Ops | `client.meridian@talentlens.app` | `Demo@1234` |

These accounts and passwords exist only in the seed script (not committed
as real data) and are for demo/review purposes only.

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite connection string for Prisma (`file:./dev.db` locally). |
| `JWT_SECRET` | Yes | Signs the session cookie. Must be a long random string, different per environment. |

No values are committed anywhere in this repository — only variable
*names* appear in `.env.example`.

## How it's deployed

This submission is a local, runnable project. If deployed to a hosting
platform (e.g. Vercel, Render, Fly.io), the steps are:

1. Provision a persistent database. SQLite works for a demo, but a
   single-writer file database does not suit a serverless/multi-instance
   host — swap `DATABASE_URL` to a hosted Postgres instance and change
   `datasource db { provider = "sqlite" }` to `"postgresql"` in
   `prisma/schema.prisma` (the rest of the Prisma code is
   provider-agnostic).
2. Set `DATABASE_URL` and `JWT_SECRET` as the platform's environment
   variables (never committed).
3. Run `npx prisma db push` (or a proper migration) once against the
   production database, then `npx tsx prisma/seed.ts` if you want the
   same demo accounts there.
4. Build with `npm run build`, start with `npm run start`.
5. File uploads (CV parsing) happen in-request via Server Actions — no
   separate object storage is needed for this submission's scope, since
   the resume text is extracted and stored in the database, not the
   original file.

**Live app URL:** not deployed for this submission — see the TDD's
"What we cut" section.

## Security notes relevant to deployment

- Passwords are hashed with bcrypt; never stored or logged in plain text.
- The session cookie is `httpOnly`, `sameSite=lax`, and `secure` in
  production.
- Every Server Action re-derives the session from the cookie and
  re-checks role and company ownership — the UI hiding a button is not
  treated as access control.
- No secrets or real personal data are committed; `.env` is gitignored
  and only `.env.example` (names, no values) is tracked.
