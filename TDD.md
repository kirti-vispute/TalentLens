# TalentLens — Technical Design Document

**Project:** AI resume screening & client shortlist portal
**Client brief:** Staffing firm — Noida, IT/banking/retail contract & permanent hiring
**GitHub repository:** https://github.com/kirti-vispute/TalentLens
**Live app:** https://talentlens-pink.vercel.app (Vercel, free Hobby plan — see `deployment.md` for how it's provisioned and two production-only bugs it surfaced)

---

## 1. Problem and scope

**Client:** a Noida-based staffing firm doing contract and permanent IT,
banking back-office, and retail hiring (120 staff, 70 recruiters,
Rs. 40–50 crore/year revenue).

**Problem:** recruiters read every CV in a pile by hand before they know
which ones are worth reading; shortlists take 5 days and reach clients as
emailed Excel sheets with no structured feedback loop.

**CORE BUILD scope** (what this submission ships end to end):

1. JD intake -> AI-drafted, recruiter-edited scorecard
2. Bulk CV upload (PDF/DOCX) -> parsed into candidate profiles
3. AI score per CV with quoted evidence per criterion
4. Client portal: masked-contact shortlist review, reject-with-reason,
   propose-interview
5. Pipeline board (sourced -> joined)
6. Two roles: **Recruiter** and **Client hiring manager**

Explicitly out of scope for this submission (per the brief): job board
integrations, video interviews, background verification, and payments —
none of those are mocked because the brief didn't ask for a payment flow
in the core build.

---

## 2. Architecture, and why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Server Actions) | One codebase for UI and backend; Server Actions remove an entire layer of hand-rolled API routes + fetch/JSON boilerplate for every mutation (upload, scoring, shortlist actions), which matters a lot for a 7-day solo build. |
| Database | **SQLite via Prisma** | Zero external services to provision for a reviewer running this locally. Prisma's schema is provider-agnostic — `deployment.md` documents the one-line swap to Postgres for a real multi-instance deployment. |
| Auth | **Hand-rolled JWT cookie + bcrypt**, no third-party auth library | The brief's two roles (recruiter, client) and access rules (company-scoped data) are simple enough that an auth library would be more surface area than it saves. `httpOnly`/`sameSite` cookie, 7-day expiry, bcrypt-hashed passwords. |
| Styling | **Tailwind CSS v4** | The brief explicitly weights design ("design counts as much as features"); utility classes plus a small set of CSS custom-property design tokens (`globals.css`) gave a consistent, restrained look fast, with light/dark support for free. |
| AI / scoring | **Deterministic, explainable, in-process** (no external LLM API) | See §4. This was a judgement call — detailed below. |
| Tests | **Vitest** | Fast, zero-config with the project's TypeScript/ESM setup. 17 unit tests cover the scoring and parsing engine, which is the one piece of logic in this app that must be *correct*, not just *present*. |

### Why routing/auth look the way they do (Next.js 16 specifics)

This project was built against Next.js 16, which renamed Middleware to
**Proxy** and changed its guidance: Proxy runs on *every* request
(including prefetches) and must stay cheap, so it is documented as doing
**optimistic, cookie-only checks** — never the sole authorization layer.
`src/proxy.ts` therefore only verifies the JWT's *signature* and role
claim to bounce an obviously-wrong request early (e.g. a client hitting
`/recruiter/*`). Every Server Action and every server component **still**
re-derives the session from the cookie and re-checks role and
`clientCompanyId` ownership against the database before touching data —
the proxy is a UX nicety, not the security boundary. This is called out
explicitly in Next's own authentication guide and is the pattern this
codebase follows throughout `src/lib/actions.ts`.

---

## 3. Data model

- `ClientCompany` has many `Requisition`s and many `User`s (role `CLIENT`).
- `Requisition` has many `Application`s (one per candidate who applied).
- `Candidate` has many `Application`s, and optionally references another
  `Candidate` via `duplicateOfId` (self-referencing, set when upload-time
  duplicate detection fires).
- `User` (either role) has many `AuditLog` entries; every mutating action
  on a `Requisition`, `Candidate`, or `Application` also writes one.

- **User** — `role` is `RECRUITER` or `CLIENT`; a `CLIENT` user carries a
  `clientCompanyId` and can only ever see `Requisition`/`Application` rows
  scoped to that company (enforced in every query and action, not just
  hidden in the UI).
- **Requisition** — one JD. `mustHaveSkills` / `niceToHaveSkills` are
  stored as JSON strings of `{skill, weight, required}` — this is the
  editable scorecard a recruiter approves before opening the role for CVs.
- **Candidate** — one parsed resume. `duplicateOfId` self-references
  another `Candidate` when upload-time duplicate detection fires. Fields
  the brief says must *never* enter scoring (`gender`, `age`,
  `maritalStatus`) exist on the model only because a real resume may
  state them in free text that gets parsed incidentally — they are never
  read by `scoreCandidate()` (see §4) and the UI never asks for or
  displays `age`/`maritalStatus`.
- **Application** — the join between one candidate and one requisition:
  score, evidence (JSON), pipeline `status`, and the recruiter
  open-before-send gate (`openedByRecruiter`).
- **AuditLog** — append-only; every mutating Server Action writes one row
  (who, what action, what entity). This is the DPDP-style "log of who
  viewed what" the brief's constraints section asks for, in its simplest
  possible form.

**Labeled assumption:** the brief gives sample rows with candidate IDs
like `CND-91022` but doesn't specify a schema for them — I treated those
as the resume *filename* prefix (`resumeFileName`) rather than a formal
external-ID field, since nothing in the brief says this ID is referenced
by any other system.

---

## 4. How the AI part works

**Design choice, stated plainly:** I did not wire this up to an external
LLM API. I built a **deterministic, rule-based scoring and extraction
engine** (`src/lib/scoring.ts`, `src/lib/parse.ts`, `src/lib/skills.ts`)
instead. This is a judgement call I'll defend in the interview; the
reasoning:

- The brief's hard requirement is **"AI score per CV with evidence lines
  quoted from the CV for each criterion"** and **"it never rejects
  anyone automatically... every score shows its evidence."** A
  rule-based matcher that is 100% explainable *by construction* satisfies
  this more directly than an LLM call that then needs a second layer of
  work to make its reasoning inspectable and reproducible.
- No API key needed to run this — "no secrets in the repository" is a
  hard requirement, and a reviewer running this locally shouldn't need to
  bring their own LLM credits just to see the feature work.
- It's deterministic and unit-testable (17 tests), which matters more to
  me for a hiring tool than a few extra points of recall from an LLM.

**What it actually does:**

1. **Skill extraction** (`skills.ts`): a curated dictionary maps canonical
   skills (`"Java"`, `"KYC"`, …) to surface-form synonyms. Matching is
   line-by-line and word-boundary aware, so every match carries the exact
   source line as its quoted evidence — never a guess.
2. **JD/resume field extraction** (`parse.ts`): regexes for experience
   ranges (`"5-8 years"`, `"6+ years"`), notice period
   (`"notice ... 60 days"`), email, phone, and a handful of known
   locations.
3. **Scoring** (`scoring.ts`, `scoreCandidate()`):
    - Each scorecard criterion contributes `weight` points if matched,
      `0` if not — summed and normalized to a skill-match fraction.
    - Experience and notice period use a **band-fit function**: full
      credit inside the JD's range, *linear partial credit* for a few
      years/days outside it rather than a hard cliff (a candidate at 4.5
      years for a 5–8 year role isn't worthless).
    - A missing **required** skill caps the final score at 50% of what it
      would have been — it doesn't zero it out, because the brief
      explicitly says low scorers must **stay searchable**, never be
      auto-rejected.
    - Final score: `(0.6 × skills + 0.25 × experience + 0.15 × notice) ×
      requiredGate × 100`, rounded to an integer 0–100.
4. **When it's wrong** (the brief's required failure-mode handling):
    - Every evidence line is either a quoted snippet or `null` — there is
      no "trust me" score with no backing text.
    - A resume under ~80 characters of extracted text, with zero
      recognised skills, or with no readable experience figure is flagged
      `lowConfidence: true` with specific, human-readable reasons shown in
      the UI ("Resume text is very short after parsing — check the
      original file.").
    - Nothing is rejected automatically — low scorers stay in the ranked
      list and the pipeline board.
    - A recruiter must explicitly **open and confirm** a CV
      (`openedByRecruiter`) before the "Send to client" action is even
      enabled — this is the "a recruiter must open a CV before submitting
      it" rule from the brief, enforced server-side in the Server Action,
      not just a disabled button.
5. **Bias masking:** `name`, `gender`, `age`, and `maritalStatus` are
   never passed into `scoreCandidate()` — only `resumeText`,
   `experienceYears`, and `noticeDays` are. The client portal additionally
   masks `email`/`phone` so clients review and act through TalentLens
   rather than contacting candidates directly.
6. **JD-side "AI":** `extractJDAction` drafts the initial scorecard from
   pasted JD text using the same parser, pre-filling must-have skills
   (first two skills found become `required: true`) — the recruiter edits
   every field before the requisition is created; nothing is auto-approved.

**Duplicate detection** (`findDuplicate()`): flags a strong match on
normalized email or phone (handles `+91` prefixes and formatting), or a
weaker exact-name collision that's surfaced but not auto-merged — a
recruiter decides. Exercised in the seed data with an intentional
duplicate pair ("Vikram Joshi" uploaded twice).

---

## 5. Main flows

**Recruiter:**
`/recruiter` (dashboard) -> `/recruiter/new` (paste JD -> AI drafts
scorecard -> edit -> create) -> `/recruiter/req/[id]` (bulk-upload CVs ->
ranked list with evidence -> open a CV -> send to client, or move it
through the pipeline board directly).

**Client:**
`/portal` (my requisitions) -> `/portal/req/[id]` (candidates currently
"with client" to act on, with masked contact details and quoted evidence
on request; previously-decided candidates shown read-only below) ->
shortlist / reject-with-reason / propose-interview.

**Auth:** `/login` -> Server Action verifies bcrypt hash -> signs a JWT ->
sets an httpOnly cookie -> redirects by role. `proxy.ts` optimistically
guards `/recruiter/*` and `/portal/*`; every page/action re-checks.

---

## 6. UI and design decisions

The brief is explicit that design is scored as much as features, and
names the look directly: *"clean layouts, white space, a restrained
palette and clear type, nothing on screen that lacks a purpose."*

- **Palette:** a near-neutral warm paper background with a single muted
  sage-green accent (`--accent`), full light/dark variants via
  `prefers-color-scheme`. No decorative color — status and score badges
  are the only places color carries meaning (red/amber/green mapped
  consistently to risk, not decoration).
- **Ranked list vs. pipeline board as tabs, not separate pages:** the
  brief's CORE BUILD asks for both a ranked list *and* a pipeline, but
  capping this at "6–8 screens" meant combining them as two views of one
  screen rather than a 7th/8th page — the data and the mental model
  (this requisition's candidates) are the same; only the view differs.
- **Evidence-first candidate drawer:** opens as a right-side panel over
  the ranked list rather than navigating away, so a recruiter can compare
  several candidates' evidence quickly without losing their place in the
  ranking — this directly serves the brief's ask that "the score, its
  evidence and the next action" be clear at a glance.
- **Client portal hides, not disables:** rather than a greyed-out
  "contact candidate" button, contact details are masked at the data
  layer (`maskEmail`/`maskPhone` run server-side before the client
  component ever receives the props) — there's no client-side bypass.
- **Empty, loading, and error states:** every list has a purpose-written
  empty state (not a blank page); every async action (`useTransition`)
  shows its own pending label ("Parsing & scoring…", "Signing in…");
  every mutating form surfaces its Server Action's error inline, never a
  silent failure.
- **Phone-width layout:** the brief calls this out specifically for the
  client portal ("the client portal should look clean and professional on
  a phone"). Tested at mobile viewport width — cards stack to a single
  column, the nav collapses, tables are given horizontal scroll rather
  than breaking.

---

## 7. Security and the brief's constraints

- **DPDP-style access control:** every `CLIENT` session is scoped to one
  `clientCompanyId`; both the Prisma `where` clause *and* an explicit
  post-fetch ownership check (`application.requisition.clientCompanyId
  !== session.clientCompanyId`) guard client-facing actions — defense in
  depth, not just a filtered query.
- **Audit log:** append-only `AuditLog` row on every login, upload,
  status change, client decision, and deletion.
- **Consent-based deletion:** `requestDeletionAction` hard-deletes a
  candidate's `Candidate` row and all linked `Application` rows, logging
  the action (who, when, reason) before the data is gone — satisfies
  "deletion on request" without pretending to be a full data-retention
  policy engine.
- **No secrets committed:** `.env` is gitignored; `.env.example` lists
  variable *names* only. Passwords are bcrypt-hashed (cost 10).
- **Input validation:** every Server Action validates its `FormData`
  with a zod schema before touching the database.

---

## 8. What we cut, and what's next

**Cut, deliberately, to ship the CORE BUILD well instead of the full
MUST HAVE list badly:**

- Deployed to Vercel's free tier with Prisma Postgres (free, Neon-backed)
  — see `deployment.md` for exactly how, including two bugs that only
  showed up once this ran in a real serverless environment (pdf-parse
  breaking every action, not just uploads; a missing worker file in the
  deployed bundle) and how they were fixed and verified against the live
  URL. Next step: a properly rotated `JWT_SECRET` and a custom domain,
  both trivial but out of scope for a demo deployment.
- No LLM API integration (see §4's reasoning) — a real next step worth
  exploring is a hybrid: keep the deterministic scorer as the
  *authoritative, explainable* score, and add an optional LLM pass that
  only *drafts* a plain-English summary of the evidence already
  collected, never a new score.
- No job-board/CV-source integrations, video interviews, or background
  verification — explicitly out of scope per the brief.
- No file storage for the original PDF/DOCX — only the extracted text is
  persisted. A recruiter can't re-download the original file today. Next
  step: object storage (S3-compatible) keyed by candidate, with the DB
  row holding a reference, not the bytes.
- Duplicate detection is single-signal-strong, not fuzzy — a typo'd email
  or a candidate with two different phone numbers won't be caught. Next
  step: a proper fuzzy-match library (e.g. Levenshtein on normalized
  name + phone) if false negatives turn out to matter in practice.
- No automated "weekly sample comparing AI ranks with recruiter choices"
  report mentioned as optional MUST HAVE depth — logged as a clear next
  step, not attempted given the 7-day core-build time budget.
- Pipeline status changes are a plain `<select>`, not drag-and-drop — a
  deliberate trade: full keyboard/screen-reader accessibility and zero
  extra dependency, at the cost of a less "notion-app" feel. Worth
  revisiting with a proper DnD library if this becomes the team's daily
  tool.

**Honestly, the limits as they stand today:**

- The skill dictionary is curated and finite — an unlisted skill (e.g. a
  very niche framework) will never match, by design, rather than
  hallucinate a match. This is a real ceiling on recall for JDs outside
  the dictionary's coverage; extending the dictionary is cheap and
  low-risk compared to anything that could produce an unexplainable match.
- Experience/notice extraction is regex-based and will miss unusual
  phrasing ("fresher", "immediate joiner") — the `lowConfidence` flag
  exists specifically so these cases are surfaced for manual review
  rather than silently mis-scored.
