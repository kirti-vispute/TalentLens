# TalentLens

AI-assisted resume screening and client shortlist portal, built for a
staffing firm's recruiters and their clients' hiring managers.

Built for the Isocode Labs Software Engineering Intern take-home, from the
brief: *"Staffing firm's AI resume screening tool and client shortlist
portal."* See [`TDD.pdf`](./TDD.pdf) (in the submission zip) for the full
technical design document, and [`deployment.md`](./deployment.md) for how
to run and deploy this.

## What it does

- **JD intake** — paste a job description, AI drafts an editable scorecard
  (must-have skills, experience band, notice cap).
- **Bulk CV upload** — PDF/DOCX resumes are parsed, scored against the
  scorecard, and ranked, with every match quoting the exact line it
  came from. Possible duplicates and low-confidence parses are flagged,
  never silently dropped.
- **Pipeline board** — Kanban view from sourced to joined.
- **Client portal** — masked candidate contacts; clients shortlist, reject
  with a reason, or propose an interview slot without emailing the
  recruiter.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Prisma + SQLite ·
Tailwind CSS v4 · Vitest.

## Quick start

See [`deployment.md`](./deployment.md) for full setup instructions.

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Tests

```bash
npm test
```
