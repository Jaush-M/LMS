# Learning Management System

A college-grade web platform where students, educators, administrators, and super administrators manage course offerings, attendance, assignments, marking, and communication.

| Name                     | Student ID |
| ------------------------ | ---------- |
| Mohamed Jaushan Ibrahim  | S2401792   |
| Abdulla Mumin Mohamed    | S2401551   |
| Hussain Gaanith Abdhulla | S2301423   |

## Stack

- **Framework** — Next.js 16 / React 19
- **Runtime** — Bun 1.3
- **Database** — PostgreSQL 17 via Prisma 7
- **Auth** — Better Auth
- **Styling** — Tailwind CSS 4
- **Testing** — Vitest (unit) · Playwright (e2e)

## Roles

| Role                | Capabilities                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| Super Administrator | Manages administrators, system settings, institution-wide announcements   |
| Administrator       | Course setup, enrollments, class sessions, audit logs, user accounts      |
| Educator            | Attendance, assignments, marking, module content, module group chat       |
| Student             | Views materials, submits assignments, tracks attendance and final grades   |

## Demo (Docker)

Requires Docker. No other dependencies.

```bash
./scripts/demo.sh
```

This copies `.env.example` → `.env` if one doesn't exist, builds the image, starts all services, applies all migrations, and runs the demo seed automatically.

| Service  | URL                          | Default credentials          |
| -------- | ---------------------------- | ---------------------------- |
| App      | http://localhost:3000        | see accounts table below     |
| pgAdmin  | http://localhost:5050        | admin@lms.edu.mv / admin     |

To change ports, edit `APP_PORT`, `POSTGRES_PORT`, or `PGADMIN_PORT` in `.env`. `BETTER_AUTH_URL` is derived from `APP_PORT` automatically.

```bash
docker compose logs -f app   # watch migrations + seed progress
docker compose down -v       # tear down and wipe data
```

## Local development

1. Start a PostgreSQL instance and set `DATABASE_URL` in `.env`.
2. Install dependencies, run migrations, and seed:

```bash
bun install
bun run db:migrate
bun run db:seed:demo
bun run dev
```

## Demo accounts

All accounts use the password `Password@123`. Emails are lowercase.

| Role                | Email                   |
| ------------------- | ----------------------- |
| Super Administrator | sa000001@lms.edu.mv     |
| Administrator       | a000001@lms.edu.mv      |
| Administrator       | a000002@lms.edu.mv      |
| Educator            | e000001@lms.edu.mv      |
| Educator            | e000002@lms.edu.mv      |
| Student             | s000001@lms.edu.mv      |
| Student             | s000002@lms.edu.mv      |
| *(+ 20 more)*       | s000003–s000022         |

Three course offerings are seeded:

| Offering                                  | Students | Modules | Status                        |
| ----------------------------------------- | -------- | ------- | ----------------------------- |
| BSc Computer Science — January 2026       | 10       | 6       | Active                        |
| BSc Information Technology — Sep 2025     | 7        | 4       | Active, final grades released |
| Diploma Business Administration — May 2026| 5        | 3       | Active, just started          |

## Scripts

| Command                  | Description                                  |
| ------------------------ | -------------------------------------------- |
| `bun run dev`            | Start development server                     |
| `bun run build`          | Production build                             |
| `bun run lint`           | ESLint                                       |
| `bun run test`           | Vitest unit tests                            |
| `bun run test:e2e`       | Playwright end-to-end tests                  |
| `bun run db:migrate`     | Run pending Prisma migrations (dev)          |
| `bun run db:seed`        | Seed minimal data                            |
| `bun run db:seed:demo`   | Seed full demo dataset                       |
| `bun run db:reset`       | Reset and re-seed (minimal)                  |
| `bun run db:reset:demo`  | Reset and re-seed (demo)                     |

## Production

App only. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `NEXT_PUBLIC_BETTER_AUTH_URL` in the environment before running.

```bash
docker compose -f docker-compose.prod.yml up -d
```

Migrations are applied automatically on startup.
