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
| UI | **Tailwind CSS v4** + **shadcn/ui** (preset `base-nova`, built on **Base UI**) | Add components with `npx shadcn@latest add <name>`; they land in `components/ui`. Icons: `lucide-react`. |
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
- **Errors:** *expected* errors (bad input, wrong password) are **returned** from actions and shown in the form; *unexpected* errors are **thrown** and caught by `error.tsx` boundaries. In Next 16 the boundary's "try again" is **`retry()`** (re-fetches), not `reset()`. In production, server error messages are replaced by a generic message + `digest` ID; the real error is logged via `instrumentation.ts` → `onRequestError`. Use `notFound()` for missing *or other-tenant* records.
- **Troubleshooting:** if `next build` panics with `TurbopackInternalError … was canceled` (seen after a failed build), the build cache in `.next` is corrupted: `rm -rf .next` and build again.
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
  schema/                 multi-file schema: Prisma reads every .prisma file here
    schema.prisma         generator + datasource only
    auth.prisma           models owned by Better Auth (generated by its CLI)
    client.prisma, project.prisma, ...   our models, one file per domain
  migrations/
  seed.ts
docs/
  PROJECT.md              this file
```

### Rules

- **Tenant isolation:** every workspace page and service function starts with `requireMembership(orgSlug)` from `server/organizations.ts` (no session → `/sign-in`; not a member → `notFound()`, same as a non-existent workspace; else `{ session, organization, role }`). Every query on tenant data is scoped by `organizationId`. The service layer in `server/` takes the org ID from the verified session and membership, **never from client input**. Pages and actions call `server/*`, not Prisma directly.
- **Permissions:** `can(role, { resource: ['action'] })` from `lib/permissions.ts`, built on Better Auth's default roles (owner: everything; admin: everything except deleting the workspace; member: no management rights). Handles combined roles (`"admin,member"`); unknown roles get nothing. In the browser it only hides UI; the server checks again. Our own resources (clients, invoices…) will be added to these roles later.
- **Server Actions with a bound argument** (`action.bind(null, orgSlug)`): bound values are sent by the browser and can be tampered with, so treat them as input (the service re-checks them with `requireMembership`).
- **After a mutation**, call `refresh()` from `next/cache` in the Server Action to re-render the current page's server data (Next 16). `revalidatePath`/`revalidateTag` are for invalidating *cached* data.
- **Authorization lives next to the data.** Every server action and service function checks the session and the user's role. `proxy.ts` is only a convenience redirect.
- **Money** is stored as integer **cents**, with a currency code on the organization.
- **Time** is stored in UTC. Durations are stored in **seconds**.
- **Validation:** every server action parses its input with Zod before touching the DB.
- **Code style:** enforced by **Prettier** (`.prettierrc.json`): 100 columns, 3-space indent, single quotes (also in JSX), no trailing commas; JSON keeps 2 spaces. `npm run format` / `npm run format:check`. Not formatted: `components/ui/` (shadcn), generated code, migrations, Markdown (`.prettierignore`). Run `npm run format` before committing. Exception: `components/ui/*` is generated by shadcn and keeps its own formatting.
- **Public pages:** `proxy.ts` treats every path as protected except `PUBLIC_PATHS` (exact) and `PUBLIC_PREFIXES` (e.g. `/accept-invitation/`). **Add every new public page** (e.g. the public invoice page `/i/[token]` in Phase 5, the landing page's sub-pages) **to `PUBLIC_PATHS`**, or signed-out visitors get redirected to `/sign-in`.
- **Reserved slugs:** workspace URLs live at the site root (`/<slug>/…`), so `lib/slug.ts` has `RESERVED_SLUGS`. **Add every new top-level route in `app/` to that list.**
- **Menu radio items close the menu only with `closeOnClick`** (Base UI default: stay open). Use it for single-choice actions like picking a role.
- **Buttons that submit need `type='submit'`**: Base UI's `Button` defaults to `type='button'`, which never submits a form (a `formAction` on it silently does nothing).
- **UI:** build pages from shadcn components (`components/ui`). A link styled as a button: `className={cn(buttonVariants({ variant }))}`. Without `cn()` the base and variant classes conflict (e.g. no outline border). Use theme colors (`bg-background`, `text-muted-foreground`, `bg-primary`...) instead of raw Tailwind colors so dark mode and theming work.
- **Secrets** live in `.env` (git-ignored). Every variable is documented in `.env.example` **and typed in `env.d.ts`** (editor autocomplete for `process.env`).

## 5. Data model (draft)

Better Auth generates and owns: `User`, `Session`, `Account`, `Verification`, and through the organization plugin `Organization`, `Member`, `Invitation`, all in `prisma/schema/auth.prisma`. We extend `Organization` with app settings.

Our own models each go in their own file in `prisma/schema/` (e.g. `client.prisma`).

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
- **Schema changes** (e.g. adding a plugin): `npm run auth:generate` writes Better Auth's models into `prisma/schema/auth.prisma` (the file must exist, or the CLI creates a full standalone schema), then `npm run db:migrate -- --name <name>` creates and applies the migration. Better Auth's own `migrate` command is not used with Prisma.
- **Migrations when `migrate dev` needs confirmation** (e.g. adding a unique constraint prints a warning and prompts): in a non-interactive shell, write the SQL with `prisma migrate diff --from-config-datasource --to-schema prisma/schema --script` into `prisma/migrations/<UTC timestamp>_<name>/migration.sql`, then run `prisma migrate deploy`.
- **Server side:** `auth.api.getSession({ headers })` in Server Components, Server Actions and Route Handlers. This is our `req.user`.
- **Client side:** `authClient.signIn.email()`, `signUp.email()`, `signOut()`, `useSession()`.
- **Email/password** with verification email and password reset. Both call our `sendEmail()` (Nodemailer).
- **Email verification is required:** sign-up creates the user but no session and redirects to `/check-email`. The link (`/api/auth/verify-email?...&callbackURL=/sign-in`) marks the email verified and signs the user in; `/sign-in` forwards signed-in users to the app, and shows a message for `?error=INVALID_TOKEN|TOKEN_EXPIRED`. Signing in unverified is rejected (`EMAIL_NOT_VERIFIED`) and sends a fresh link. Links expire after 1 hour.
- **No email enumeration:** sign-up with an existing email returns the same response as a new one (Better Auth behaviour when verification is required).
- **Password reset:** `/forgot-password` → `requestPasswordReset` (same response for unknown emails) → email link `/api/auth/reset-password/<token>?callbackURL=/reset-password` → Better Auth forwards to `/reset-password?token=…` (or `?error=INVALID_TOKEN`) → `resetPassword` → `/sign-in?reset=success`. Tokens are single-use, expire after 1 h; a reset **revokes all sessions** and marks the email verified.
- **Emails are sent in the background** via `advanced.backgroundTasks.handler` → Next's `after()`: the response doesn't wait for SMTP (no timing leak) and serverless hosts keep running until the email is sent.
- **Organization plugin:** create a workspace on sign-up, invite members by email, roles `owner`/`admin`/`member`. Tables: `organization` (unique `slug`), `member` (user ↔ organization + `role`, a plain string), `invitation`. The creator becomes `owner`. `session.activeOrganizationId` remembers the last-used org, but **the URL slug is the source of truth** for which org a request is about.
- **`proxy.ts`** (Next 16's middleware, Node.js runtime): if the path isn't public and there's **no session cookie** (`getSessionCookie`, handles the `__Secure-` prefix), redirect to `/sign-in`. It never validates the cookie or touches the DB; forged/expired cookies pass and are rejected by the pages. It does **not** redirect signed-in users away from auth pages (an expired cookie would loop). Matcher skips `/api/`, `_next/static`, `_next/image` and files with an extension.
- **Routing:** `/dashboard` is only a redirect ("take me to my workspace"): `user.lastActiveOrganizationId` (if still a member) → first membership → `/create-workspace`. `/[orgSlug]` → `/[orgSlug]/dashboard`.
- **Last-used workspace:** `user.lastActiveOrganizationId` is a Better Auth `additionalField` with `input: false` (clients get `FIELD_NOT_ALLOWED` if they try to set it). `app/(app)/[orgSlug]/layout.tsx` updates it with `after()` when the workspace changes. (We don't rely on `session.activeOrganizationId`: every sign-in starts a new session.)
- **Workspace switcher** (`components/workspace-switcher.tsx`, client): data comes from the server as props; switching = navigating to `/<slug>/dashboard`. Uses `DropdownMenuLinkItem`, a small addition to `components/ui/dropdown-menu.tsx` wrapping Base UI's `Menu.LinkItem` with `render={<Link />}`.
- **`server/` modules start with `import 'server-only'`**: importing them from a Client Component fails the build (verified).
- **Note:** deleting a user removes their memberships (cascade) but **not** organizations they own; handle that explicitly if we add account deletion.
- **Invitations:** owners/admins invite by email with role `member` or `admin` (`INVITABLE_ROLES`; owner is not invitable). `server/members.ts` `inviteMember()` checks membership + `can(role, { invitation: ['create'] })`, then `auth.api.createInvitation` with the org ID from the membership. Better Auth enforces it again (members → 403, admins can't invite owners, no duplicates, 48 h expiry, max 100 pending) and calls `sendInvitationEmail` (`emails/invitation.tsx`) with a link to `/accept-invitation/<id>` (reserved slug; must become a public path in step 3).
- **`redirectTo` after sign-in/sign-up:** `/sign-in?redirectTo=/path&email=…` (links built with `authHref()`). Always passed through `safeRedirectPath()` (`lib/safe-redirect.ts`): only same-site paths, everything else is dropped (**open-redirect protection**; tested against `https://`, `//`, backslash, tab and `javascript:` tricks). The email-confirmation link carries it too (`callbackURL=/sign-in?redirectTo=…`), so new users return to where they started.
- **Accepting invitations:** `/accept-invitation/[id]` is public. `server/invitations.ts` reads the invitation (pending + not expired); the page shows: invalid → message; signed out → sign in / create account (email pre-filled, `redirectTo` back); wrong account → "sign in as <invitee>" (signs out first); invitee → Accept/Decline (Better Auth checks recipient + verified email). Already a member → straight to the workspace.
- **Managing members** (`/[orgSlug]/settings/members`): per-row "⋯" menu (change role, remove with confirmation), cancel invitation, leave workspace. The server computes which actions each row offers (no menu on your own row; only owners see/touch owners; only owners can assign `owner`). Better Auth enforces: permissions, only owners change/remove owners or grant owner, **never zero owners** (demote/remove/leave). Service functions in `server/members.ts` map its error codes to friendly messages. Feedback via toasts (`sonner`, `<Toaster theme='light' />` in the root layout).
- **Calling Server Actions from event handlers** (not forms): `startTransition(async () => { const r = await action(...); toast(...) })`. Plain arguments, validated with Zod in the action; `refresh()` updates the page.
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
- [x] Nodemailer mailer + first email template
- [x] Sign up / sign in / sign out pages
- [x] Email verification
- [x] Password reset
- [x] Organization plugin + migration `add_organizations` (organization, member, invitation, `session.activeOrganizationId`)
- [x] "Create your workspace" page (users without an organization)
- [x] `[orgSlug]` routing with a server-side membership check (replaces `/dashboard`)
- [x] Organization switcher + remember the last-used workspace across sign-ins
- [x] `proxy.ts` optimistic redirect (real checks stay in pages + `server/`)
- [x] Members page (read-only) `/[orgSlug]/settings/members` + `can()` permission helper
- [x] Invite by email (owners/admins): form, email template, sending
- [x] Accept an invitation (signed out / no account yet / wrong account / invalid cases)
- [x] Manage members: change role, remove member, cancel invitation, leave workspace (never zero owners)

### Phase 2: App shell and UI
- [x] shadcn/ui setup (done early, during Phase 1.3)
- [ ] App layout (sidebar, header, user menu)
- [ ] Error handling: `app/error.tsx`, `app/(app)/error.tsx` (keeps the app layout), `app/global-error.tsx`, styled `app/not-found.tsx`, `instrumentation.ts` with `onRequestError` logging. Show the error `digest` as a reference ID.
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
- **2026-09-25:** `lib/mailer.ts` (`sendEmail({ to, subject, react })`: renders React Email to HTML + plain text, sends via Nodemailer SMTP). First template `emails/verify-email.tsx`. SMTP env vars added (Mailpit locally). Test email delivered to Mailpit. `npm run email:dev` previews templates on http://localhost:3001. **Next step:** Phase 1.3, sign up / sign in / sign out pages.
- **2026-09-25:** `/sign-up`, `/sign-in` pages (route group `(auth)`), Server Actions `signUp`/`signIn`/`signOut` in `app/(auth)/actions.ts` (Zod validation → `auth.api.*` → `redirect`), forms use `useActionState` for errors + pending state. `lib/session.ts` `getSession()` helper. Temporary `/dashboard` page (protected, shows user, sign-out button). Verified in Chrome: validation errors, sign up, redirects both ways, sign out clears cookie, duplicate email + wrong password messages, sign in. **Next step:** Phase 1.4, email verification + password reset.
- **2026-09-25:** shadcn/ui set up early (developer's request): `components.json`, theme variables in `globals.css`, components `button`, `input`, `label`, `field`, `card`, `alert`, `separator`. Auth pages and dashboard rebuilt with them; temporary `Field` component removed. Fixed font variable (`--font-sans`) in `app/layout.tsx`. Re-verified the full auth flow in Chrome. **Next step:** Phase 1.4, email verification + password reset.
- **2026-09-26:** Email verification: `requireEmailVerification`, `sendOnSignUp`, `sendOnSignIn`, `autoSignInAfterVerification`, 1 h expiry; emails via `after()`. New `/check-email` page; `/sign-in` shows invalid/expired-link messages. Verified end-to-end in Chrome + Mailpit (sign-up → email → unverified sign-in rejected + resent → bad link message → link signs in → dashboard; duplicate sign-up indistinguishable). **Next step:** Phase 1.4b, password reset.
- **2026-09-26:** Password reset: `emails/reset-password.tsx`, `sendResetPassword` + `revokeSessionsOnPasswordReset` + `onPasswordReset` (marks email verified) in `lib/auth.ts`, actions `requestPasswordReset`/`resetPassword`, pages `/forgot-password` and `/reset-password`, "Forgot password?" link + success notice on `/sign-in`. Shared `newPassword` Zod rule. Verified end-to-end in Chrome + Mailpit (unknown vs known email same message, validation, reset, other device signed out, old password rejected, new works, link reuse rejected, unverified user can sign in after reset). **Next step:** Phase 1.5, organizations.
- **2026-09-26:** Split the Prisma schema into `prisma/schema/` (`schema.prisma` = generator + datasource, `auth.prisma` = Better Auth models). `prisma.config.ts` points at the folder; `auth:generate` writes to `auth.prisma` via `--output`. Verified: schema valid, client generated to the same path, `migrate diff` against the DB is empty, `auth:generate` reports up to date, and a dry run with the organization plugin adds its models to a copy of `auth.prisma` without adding a generator/datasource. **Next step:** Phase 1.5, organizations.
- **2026-09-26:** Organization plugin added with defaults (`organization()` before `nextCookies()`); `auth:generate` added Organization/Member/Invitation to `auth.prisma`; migration `add_organizations` applied. Verified via API: create org → creator is `owner`, duplicate slug rejected, `check-slug` works, new org becomes the session's active org. Added `@@unique([organizationId, userId])` on `Member` (migration `member_unique_per_organization`); verified the CLI preserves it on rewrite and the DB rejects duplicate memberships. **Next step:** Phase 1.5 step 2, "Create your workspace" page.
- **2026-09-26:** `/create-workspace` (in `(auth)` for the card layout): form with name + URL slug; the slug follows the name (`slugify`) until edited; Zod rules incl. reserved slugs; `createWorkspace` action → `auth.api.createOrganization` (creator = owner), taken slug shown on the field. Temporary `/dashboard` now redirects users without a workspace to `/create-workspace` and lists workspaces. Verified in Chrome: signed-out redirect, slug suggestion, manual slug kept, reserved + taken slug errors, values kept after errors, created org in DB with role owner. **Next step:** Phase 1.5 step 3, `[orgSlug]` routing with membership check.
- **2026-09-26:** `server/organizations.ts` (`requireMembership`, `listMemberships`, `getHomeWorkspaceSlug`, all `server-only`). Pages `/[orgSlug]` (redirect) and `/[orgSlug]/dashboard` (placeholder: org name, role, workspace links, sign out, `generateMetadata` title). `/dashboard` is now a redirect. `createWorkspace` redirects to `/<slug>/dashboard`. Verified in Chrome: other user's workspace → 404, unknown slug → 404, signed out → `/sign-in`, `/sign-in` not captured by `[orgSlug]`, workspace links, sign-in lands in a workspace; build fails when a Client Component imports `server/organizations.ts`. **Next step:** Phase 1.5 step 4, organization switcher.
- **2026-09-26:** Workspace switcher (shadcn dropdown-menu + new `DropdownMenuLinkItem`) on the workspace dashboard. `user.lastActiveOrganizationId` (migration `user_last_active_organization`) set by the new `[orgSlug]/layout.tsx` via `after()`; `/dashboard` uses it. Verified in Chrome: menu lists workspaces with a check on the current one, mouse + keyboard switching, last-used workspace restored after sign-out/in, client can't set the field (`FIELD_NOT_ALLOWED`), a foreign workspace id in the field is ignored. **Next step:** Phase 1.6, `proxy.ts` optimistic redirect.
- **2026-09-26:** `proxy.ts` added. Verified with curl: public pages 200; `/api/*`, `/next.svg`, `/favicon.ico` untouched; no cookie → 307 `/sign-in` for `/dashboard`, `/create-workspace`, workspace URLs and even `/a/b/c` (no such page: proves the proxy acts first); forged cookie → passes the proxy, rejected by the page (`/sign-in`), `/a/b/c` → 404, `/sign-in` → 200 (no loop); real session → `/dashboard` → `/create-workspace`. Build lists `ƒ Proxy (Middleware)`. **Next step:** Phase 1.7, invitations + roles.
- **2026-09-26:** Phase 1.7 split into 4 steps. Step 1: `lib/permissions.ts` (`can()`), `server/members.ts` (`getMembersOverview`: members for everyone, pending non-expired invitations only for roles with `invitation:create`), page `/[orgSlug]/settings/members` (shadcn table + badges), temporary link from the dashboard. Verified in Chrome with owner/admin/member/outsider: all members see the member list, only owner + admin see invitations (expired + accepted ones filtered out), outsider → 404. **Next step:** Phase 1.7 step 2, invite by email.
- **2026-09-26:** Invite by email: `emails/invitation.tsx`, `sendInvitationEmail` in `lib/auth.ts`, `inviteMember()` service, `inviteMemberAction` (Zod, bound `orgSlug`, `refresh()`), invite card on the members page (email + role via shadcn `native-select`), `accept-invitation` reserved. Verified end-to-end (Chrome + Mailpit): owner and admin invite, email arrives with the accept link, list refreshes without reload, duplicate/existing-member/invalid-email errors, member sees no form and gets 403 calling Better Auth directly, admin can't invite an owner (403). **Next step:** Phase 1.7 step 3, accept an invitation.
- **2026-09-26:** Accept an invitation: `lib/safe-redirect.ts` (`safeRedirectPath`, `authHref`), `redirectTo` + email pre-fill on sign-in/sign-up (also through the email-confirmation link), `server/invitations.ts` (`getOpenInvitation`, `acceptInvitation`, `declineInvitation`), page `/accept-invitation/[id]` with 4 states, actions accept/decline/switch account, proxy `PUBLIC_PREFIXES`. Verified end-to-end (Chrome + Mailpit): existing user signs in and accepts (role admin), new user signs up + confirms email and returns to accept, wrong account switches and declines (status rejected), used/expired links invalid, `redirectTo=https://evil.example` ignored. Found + fixed: Base UI `Button` defaults to `type="button"`. **Next step:** Phase 1.7 step 4, manage members.
- **2026-09-26:** Manage members: service functions `updateMemberRole`, `removeMember`, `cancelInvitation` (checks the invitation belongs to this workspace), `leaveWorkspace`; actions called from click handlers; `MemberActions` (dropdown with role radio group + remove dialog), cancel button, leave dialog; shadcn `alert-dialog` + `sonner`. `getMembersOverview` returns per-row `canChangeRole`/`canRemove` and `assignableRoles`. Verified end-to-end: owner changes role/removes/cancels, only owner can't leave (friendly toast), admin gets no menu on owner and no "Owner" option, API attacks blocked (403: member self-promotes, admin demotes owner; 400: last owner demotes self), ownership hand-over then leave. Found + fixed: role menu stayed open (`closeOnClick`). **Phase 1 complete.** **Next step:** Phase 2, app shell (sidebar, header, user menu) + error handling.

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
| 2026-09-25 | Nodemailer **10.0.10** + React Email **6.11.0** (single `react-email` package), pinned | `@react-email/components` is deprecated; v6 exports components and `render` from `react-email`. Nodemailer 10 ships its own types, so no `@types/nodemailer`. |
| 2026-09-25 | Auth forms call **Server Actions** that use `auth.api.*`, not the browser `authClient` | Matches our "mutations via Server Actions + Zod" rule; forms work without JS; errors handled on the server. `authClient` stays available for client-only needs (e.g. `useSession`). |
| 2026-09-25 | Auth checks in **pages** (and later the service layer), not layouts | Next docs: layouts don't re-render on navigation, so a layout check can be skipped |
| 2026-09-25 | Zod **4.6.5**, pinned | Current major; use `z.email()`, `z.flattenError()` |
| 2026-09-25 | shadcn **`base-nova`** preset (Base UI underneath) | Current shadcn CLI default. Components look the same as the Radix version; examples online may use Radix's `asChild` where Base UI uses a `render` prop. |
| 2026-09-25 | shadcn's **`cn` package** instead of `clsx` + `tailwind-merge` | Added by the CLI; official shadcn package (github.com/shadcn-ui/cn). `lib/utils.ts` re-exports it. |
| 2026-09-25 | Dark mode is **class-based** (`.dark` on `<html>`), not OS-based | shadcn's theme uses `@custom-variant dark`. The app is light-only until we add a theme toggle (optional, Phase 8). |
| 2026-09-25 | Inputs refilled after a failed action use `key={value}` | Base UI warns when an uncontrolled input's `defaultValue` changes; a key remounts it instead |
| 2026-09-26 | **Require email verification** before sign-in | Realistic SaaS flow; prevents fake sign-ups and enumeration. Seeded demo account will be pre-verified. |
| 2026-09-26 | Better Auth background tasks run through Next's **`after()`** | Don't block responses on SMTP; works on serverless (Vercel) without `@vercel/functions` |
| 2026-09-26 | Type env vars with a hand-written **`env.d.ts`** (`NodeJS.ProcessEnv`), not `experimental.typedEnv` | `typedEnv` is experimental and generates types from the local `.env` only (nothing on a fresh clone/CI). `env.d.ts` is stable, committed, and documents the vars. |
| 2026-09-26 | Password reset **revokes all sessions** and **marks the email verified** | Reset is often done after a compromise; using the emailed link proves inbox ownership, so no second confirmation email |
| 2026-09-26 | **Multi-file Prisma schema** (`prisma/schema/`), one file per domain | Developer's preference; easier to navigate. Better Auth's CLI can only write one file, so all its models share `auth.prisma`. Runtime schema check uses the generated client, not the files, so it's unaffected. |
| 2026-09-26 | **`@@unique([organizationId, userId])` on `Member`** (hand-added in `auth.prisma`) | Better Auth only prevents duplicate memberships in code; now the database guarantees it. Verified the CLI keeps hand-added attributes when it rewrites the file. |
| 2026-09-26 | Remember the last workspace on the **user** (`lastActiveOrganizationId`), not the session | Each sign-in creates a new session, so a session field forgets it. Written from the workspace layout with `after()`, only when it changes. |
| 2026-09-26 | `proxy.ts` is **protect-by-default with a public allowlist**, one direction only (no cookie → `/sign-in`) | Workspace URLs are dynamic, so protected paths can't be listed. Redirecting signed-in users away from auth pages in the proxy would loop on expired cookies; pages do that with a real check. |
| 2026-09-26 | Invitation page readable **without signing in** (by its random id) | The invitee may have no account yet; the id only appears in their email, like a reset link. Accepting requires being signed in as the invited email (Better Auth). |
| 2026-09-26 | **Prettier config in the repo**, matching the developer's VS Code settings | Same formatting for everyone, CI and Claude; the one-time reformat is its own `style:` commit so it doesn't hide real changes |
| _open_ | Enable Cache Components? | Decide in Phase 3 when we fetch data |
| _open_ | PDF library | Decide in Phase 5 |
| _open_ | Demo account protection strategy | Decide in Phase 8 |
| _open_ | React Hook Form for complex forms? | Proposal: keep `useActionState` for simple forms; use RHF (+ `zodResolver`, same Zod schemas, server still validates) for the invoice editor (`useFieldArray`, live totals). Decide in Phase 5. |
