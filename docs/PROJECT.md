# Project Plan — Freelancer Client Portal

> **Single source of truth.** Read this before starting any work on the project.
> Update the **Progress** and **Decision log** sections at the end of every step.

## 1. What we're building

A multi-tenant SaaS where freelancers and small agencies manage **clients**, track **time** on **projects**, generate **invoices** from that time, and get **paid** online. Think a small version of Harvest or Bonsai.

The app is a **portfolio showcase** for GitHub and Upwork, so:

- The demo must be understandable within 10 seconds by a non-technical client.
- A **one-click demo login** with realistic seeded data is required. Reviewers won't sign up.
- The README and code quality matter as much as the features.

## 2. How we work

The developer knows Node.js well (builds dedicated Express-style servers) but hasn't used Next.js for a couple of years. So:

1. **Build piece by piece.** One small, focused step at a time. Don't scaffold whole features in one go.
2. **Explain before and while building.** Each step says what we're doing and why. New Next.js concepts are explained by comparing them to the Express/Node equivalent.
3. **Stop after each step** so the developer can review, run it and ask questions before we move on.
4. **Check the real docs.** Next.js 16 differs from older versions and from model training data. Read `node_modules/next/dist/docs/` before writing Next.js code. The same goes for Prisma and Better Auth: check the docs for the installed version.
5. **Keep this file current.** Tick off progress and record decisions as we go.

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router), React 19, TypeScript | Already initialized. No `src/` dir: `app/` lives at the root. |
| Package manager | **npm** | `package-lock.json` exists. |
| Database | **PostgreSQL** | Local: Docker. Production: Neon or Supabase (free tier). |
| ORM | **Prisma** | Chosen over Drizzle by preference. |
| Auth | **Better Auth** + Prisma adapter + `organization` plugin | Email/password first. OAuth (GitHub/Google) optional later. |
| Email | **Nodemailer** (SMTP) + **React Email** templates | Dev: Mailpit (local inbox). Prod: any SMTP provider (Brevo, SES, …). |
| UI | **Tailwind CSS v4** + **shadcn/ui** | Tailwind already installed. |
| Charts | Recharts | Dashboard only. |
| Validation | **Zod** | Shared between forms and server actions. |
| Payments | **Stripe** (test mode) | Checkout + webhook. |
| PDF | TBD (`@react-pdf/renderer` likely) | Invoice export. |
| Testing | Vitest (logic), Playwright (1–2 E2E flows) | |
| Deploy | Vercel + GitHub Actions CI (lint, typecheck, test) | |

### Next.js 16 things to remember

- `middleware.ts` has been **renamed to `proxy.ts`**. Use it only for cheap, optimistic checks such as "has a session cookie → otherwise redirect". It is **not** where real authorization happens.
- **Cache Components** (`cacheComponents: true` + the `'use cache'` directive) is the new caching model. We decide whether to turn it on when we get to data fetching (see the decision log).
- Server Components are the default. Add `'use client'` only when a component needs state, effects or browser APIs.
- Mutations go through **Server Actions**. Use **Route Handlers** (`app/**/route.ts`) only for things that need a real HTTP endpoint: the Better Auth handler, the Stripe webhook, PDF download.
- Nodemailer, Prisma and Better Auth all need the **Node.js runtime**, which is the default. Never use the Edge runtime for them.

## 4. Architecture and conventions

### Folder layout (target)

```
app/
  (marketing)/            public landing page
  (auth)/                 sign-in, sign-up, forgot/reset password
  (app)/[orgSlug]/        the logged-in app, scoped to one organization
    dashboard/
    clients/
    projects/
    time/
    invoices/
    settings/
  i/[token]/              public invoice view + pay (for the client)
  api/auth/[...all]/      Better Auth route handler
  api/stripe/webhook/     Stripe webhook
components/               shared UI (shadcn in components/ui)
lib/
  db.ts                   Prisma client singleton
  auth.ts                 Better Auth server config
  auth-client.ts          Better Auth client helpers
  mailer.ts               Nodemailer transport + sendEmail()
  validations/            Zod schemas
server/                   data access + business logic ("service layer")
  clients.ts, projects.ts, invoices.ts, ...
emails/                   React Email templates
prisma/
  schema.prisma
  migrations/
  seed.ts
docs/
  PROJECT.md              this file
```

### Rules

- **Tenant isolation:** every query on tenant data is scoped by `organizationId`. The service layer in `server/` takes the org ID from the verified session and membership, **never from client input**. Pages and actions call `server/*`, not Prisma directly.
- **Authorization lives next to the data.** Every server action and service function checks the session and the user's role. `proxy.ts` is only a convenience redirect.
- **Money** is stored as integer **cents**, with a currency code on the organization.
- **Time** is stored in UTC. Durations are stored in **seconds**.
- **Validation:** every server action parses its input with Zod before touching the DB.
- **Code style:** single quotes, 3-space indentation, JSX attributes in single quotes (matches the developer's formatting in `app/`).
- **Secrets** live in `.env` (git-ignored). Every variable is documented in `.env.example`.

## 5. Data model (draft)

Better Auth generates and owns: `User`, `Session`, `Account`, `Verification`, and through the organization plugin `Organization`, `Member`, `Invitation`. We extend `Organization` with app settings.

Our own models (all carry `organizationId`):

| Model | Key fields |
|---|---|
| **Organization** (extended) | `currency`, `defaultHourlyRate`, invoice numbering prefix/counter, business details for invoices |
| **Client** | `name`, `email`, `company`, `address`, `notes`, `archivedAt` |
| **Project** | `clientId`, `name`, `hourlyRate` (cents, overrides org default), `status` (active/archived), `color` |
| **TimeEntry** | `projectId`, `userId`, `description`, `startedAt`, `endedAt?` (null = timer running), `durationSec`, `billable`, `invoiceLineId?` |
| **Invoice** | `clientId`, `number`, `status` (DRAFT/SENT/PAID/OVERDUE/VOID), `issueDate`, `dueDate`, `subtotal`, `tax`, `total` (cents), `publicToken`, `paidAt?` |
| **InvoiceLine** | `invoiceId`, `description`, `quantity`, `unitPrice`, `amount` (cents) |
| **Payment** | `invoiceId`, `amount`, `stripeSessionId`, `status`, `paidAt` |

Relationships: Organization → Clients → Projects → TimeEntries. Invoice → InvoiceLines ← TimeEntries (once billed). Invoice → Payments.

We'll refine this (indexes, constraints, enums) in the schema step and keep this table in sync.

## 6. Auth design (Better Auth)

- **Sessions** are stored in the DB (`Session` table). The browser holds an HTTP-only cookie with the session token. Optionally we enable the cookie cache to skip the DB lookup on each request.
- **Endpoints** are served by one catch-all route handler: `app/api/auth/[...all]/route.ts`.
- **Schema changes** (e.g. adding a plugin): `npm run auth:generate` writes Better Auth's models into `prisma/schema.prisma`, then `npm run db:migrate -- --name <name>` creates and applies the migration. Better Auth's own `migrate` command is not used with Prisma.
- **Server side:** `auth.api.getSession({ headers })` in Server Components, Server Actions and Route Handlers. This is our `req.user`.
- **Client side:** `authClient.signIn.email()`, `signUp.email()`, `signOut()`, `useSession()`.
- **Email/password** with verification email and password reset. Both call our `sendEmail()` (Nodemailer).
- **Organization plugin:** create a workspace on sign-up, invite members by email, roles `owner`/`admin`/`member`.
- **Demo login:** a button that signs into the seeded demo account. The demo data is reset periodically, or protected from destructive actions (decide later).

## 7. Roadmap

Each phase is split into small steps when we start it.

### Phase 0: Foundations
- [x] Walk through the fresh Next.js 16 project (what each file does)
- [x] Local Postgres via Docker Compose (+ Mailpit)
- [x] Prisma setup: config, schema, client singleton (`lib/db.ts`), connection verified. First migration moves to Phase 1 (Better Auth tables are the first real models).
- [x] `.env.example` (`.gitignore` now allows it), npm scripts (`typecheck`, `db:generate`, `db:migrate`, `db:deploy`, `db:studio`, `postinstall: prisma generate`)

### Phase 1: Auth and organizations
- [x] Better Auth + Prisma adapter, route handler, **first migration** (auth tables)
- [ ] Nodemailer mailer + first email template
- [ ] Sign up / sign in / sign out pages
- [ ] Email verification + password reset
- [ ] Organization creation, `[orgSlug]` routing, org switcher
- [ ] `proxy.ts` optimistic redirect + real checks in the layout/service layer
- [ ] Invitations + roles

### Phase 2: App shell and UI
- [ ] shadcn/ui setup, app layout (sidebar, header, user menu)
- [ ] Landing page

### Phase 3: Clients and projects
- [ ] Clients CRUD (list with search/pagination, create/edit, archive)
- [ ] Projects CRUD (linked to client, rate, status)

### Phase 4: Time tracking
- [ ] Start/stop timer (one running timer per user)
- [ ] Manual entries, edit, delete
- [ ] Weekly timesheet view

### Phase 5: Invoices
- [ ] Create invoice from unbilled time (+ manual lines)
- [ ] Invoice numbering, status transitions
- [ ] PDF export
- [ ] Send invoice email with public link
- [ ] Public invoice page `/i/[token]`

### Phase 6: Payments
- [ ] Stripe Checkout from the public invoice page
- [ ] Webhook → Payment record → invoice PAID
- [ ] Overdue status

### Phase 7: Dashboard
- [ ] Revenue per month, hours per project, outstanding balance (SQL aggregates)
- [ ] Charts

### Phase 8: Polish and ship
- [ ] Seed script with realistic demo data + demo login
- [ ] Tests (Vitest + Playwright)
- [ ] GitHub Actions CI
- [ ] Deploy (Vercel + Neon/Supabase + SMTP provider + Stripe test keys)
- [ ] README: live link, screenshots/GIF, ER diagram, design decisions

## 8. Progress

_Update at the end of each step: what was done and what's next._

- **2026-09-25:** Stack chosen, this plan written. Repo is a fresh `create-next-app` (Next 16.3.6, React 19.2, Tailwind v4). **Next step:** Phase 0, walk through the fresh project.
- **2026-09-25:** Walkthrough of the generated project done (routing by folders, layouts, Server Components, config files). **Next step:** Phase 0.2, local Postgres + Mailpit via Docker Compose.
- **2026-09-25:** Added `docker-compose.yml`: Postgres 18 (`localhost:5432`, db `saas_app`, user/pass `postgres`) and Mailpit (SMTP `localhost:1025`, inbox http://localhost:8025). **Next step:** Phase 0.3, Prisma setup.
- **2026-09-25:** Prisma 7.10.0 installed (pinned) with `@prisma/adapter-pg`. `prisma.config.ts` loads `.env` via dotenv; client generated to `lib/generated/prisma` (git-ignored); `lib/db.ts` singleton verified against Postgres 18. **Next step:** Phase 0.4, `.env.example` + npm scripts.
- **2026-09-25:** Phase 0 done. `.env.example` added (only `DATABASE_URL` so far; each step adds its own vars). npm scripts added; `postinstall` verified to regenerate the client on a clean install. **Next step:** Phase 1.1, Better Auth + Prisma adapter, route handler, first migration.
- **2026-09-25:** Better Auth 1.7.6 installed; `lib/auth.ts` (Prisma adapter, email/password, `nextCookies`); `/api/auth/[...all]` route handler; first migration `add_auth_tables` (user, session, account, verification). Verified with curl: sign-up sets `better-auth.session_token` cookie, get-session works, wrong password rejected, password stored as scrypt hash. **Next step:** Phase 1.2, Nodemailer mailer + first email template.

## 9. Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-09-25 | App idea: freelancer client portal (clients, time, invoices, payments) | Relatable to Upwork clients; rich relational data; covers the full stack |
| 2026-09-25 | Prisma over Drizzle | Developer preference |
| 2026-09-25 | Better Auth over Auth.js | Built-in email/password, DB sessions, organization plugin; Auth.js is now maintained by the Better Auth team, who recommend Better Auth for new projects |
| 2026-09-25 | Nodemailer (SMTP) over Resend SDK | Developer familiarity; not tied to one provider |
| 2026-09-25 | Org scoping via `[orgSlug]` in the URL | Explicit, shareable URLs; clear tenant boundary. Can revisit. |
| 2026-09-25 | Prisma **7.10.0**, pinned exact | npm `latest` tag for `prisma` points to 8.0 RC; `@prisma/client` latest is 7.10. Stay on stable. Note: prisma.io docs now describe v8. |
| 2026-09-25 | Config file named `prisma.config.ts` | `prisma init` 7.10 generated `prisma7.config.ts`; the standard name loads fine and is what docs/tools expect |
| 2026-09-25 | No `import 'server-only'` in `lib/db.ts` | Scripts outside Next (seed, Better Auth CLI) import it; put `server-only` on `server/*` modules instead |
| 2026-09-25 | First migration deferred to Better Auth step | Avoid a throwaway model; auth tables are the first real schema |
| 2026-09-25 | Ignore `npm audit` highs from the Prisma CLI (`deepmerge-ts`, `mysql2`) | Dev-only CLI deps, not shipped; `audit fix --force` would downgrade to Prisma 6. Recheck on Prisma upgrades. |
| 2026-09-25 | Better Auth **1.7.6**, pinned exact; CLI via `npx auth@1.7.6` (`auth:generate` script) | The old `@better-auth/cli` package is stale (1.4); the CLI now ships as the `auth` package. Pin CLI to the library version. |
| _open_ | Enable Cache Components? | Decide in Phase 3 when we fetch data |
| _open_ | PDF library | Decide in Phase 5 |
| _open_ | Demo account protection strategy | Decide in Phase 8 |
