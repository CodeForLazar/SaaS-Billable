@AGENTS.md

# Billable

A multi-tenant SaaS for freelancers (clients, projects, time tracking, invoices, Stripe payments)
built with Next.js 16, Prisma 7, Better Auth and shadcn/ui on Base UI. It's a portfolio project, so
code quality and the README matter as much as features.

## Documentation

- `docs/ARCHITECTURE.md`: stack, data model, conventions and how each feature works. Read it
  before changing code, follow its conventions, and keep it current when something changes.
- `docs/DECISIONS.md`: the decision log. Add a row (date, decision, why) for every significant
  technical choice.

@docs/ARCHITECTURE.md

## Commands

- `docker compose up -d`: Postgres 18 (localhost:5432) and Mailpit (inbox at localhost:8025)
- `npm run dev`: the developer's dev server on port 3000. Don't stop or restart it.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`: run all four before
  proposing a commit. Date code must also pass with `TZ=UTC npm test`.
- `npm run db:migrate -- --name <name>`: after a schema change. When it needs a confirmation in a
  non-interactive shell, write the SQL with `prisma migrate diff` (see ARCHITECTURE.md). Then
  restart the dev server (it keeps the old Prisma client).
- To check a change end to end, build and start on another port:
  `npm run build && BETTER_AUTH_URL=http://localhost:3100 npx next start -p 3100`.

## Where code goes

- `app/`: routes. Pages and Server Actions call `server/*`, never Prisma directly.
- `server/`: service layer (`import 'server-only'`); every function checks membership and role.
- `lib/`: code built on a package. `utils/`: plain TypeScript, no packages. `validations/`: Zod.
- `tests/unit/`: Vitest tests. Logic worth testing goes in `utils/` or `lib/`, not `server/`.

## Working agreements

- **Never commit without asking.** Show the changes, propose commit messages, and commit only
  after a yes. Stage files by explicit path (never `git add .`): the developer edits files in
  parallel. Never push.
- Never run `npm audit fix --force`.
- Test data: only create and delete your own records (e.g. `cc-*@example.com`); never wipe tables
  or the Mailpit inbox.
- Read the installed docs before writing Next.js code (`node_modules/next/dist/docs/`); the same
  goes for Prisma and Better Auth. Their APIs differ from older versions.
- Work in small steps and stop after each one for review.
