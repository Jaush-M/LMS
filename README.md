# Learning Management System

A college-grade web platform where students, educators, administrators, and super administrators manage course offerings, attendance, assignments, marking, and communication.

| Name                     | Student ID |
| ------------------------ | ---------- |
| Mohamed Jaushan Ibrahim  | S2401792   |
| Abdulla Mumin Mohamed    | S2401551   |
| Hussain Gaanith Abdhulla | S2301423   |

## Stack

- **Framework** — Next.js 16 / React 19
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

## Development

### Docker (recommended)

```bash
docker compose -f docker-compose.dev.yml up --watch
```

Starts the app on `http://localhost:3000`, PostgreSQL on `5432`, and pgAdmin on `http://localhost:5050`.

### Local

1. Start a PostgreSQL instance and set `DATABASE_URL` in `.env`.
2. Install dependencies and run migrations:

```bash
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

## Seeded accounts

All seeded accounts use the password `Password@123`.

| Role                | Institutional email     | Status   | Notes                              |
| ------------------- | ----------------------- | -------- | ---------------------------------- |
| Super Administrator | SA000001@lms.edu.mv     | Active   |                                    |
| Administrator       | A000001@lms.edu.mv      | Active   |                                    |
| Educator            | E000001@lms.edu.mv      | Active   |                                    |
| Student             | S000001@lms.edu.mv      | Active   | Enrolled in January 2025 offering  |
| Student             | S000002@lms.edu.mv      | Inactive | Must change password on first sign-in |
| Student             | S000003@lms.edu.mv      | Disabled | Cannot sign in                     |
| Student             | S000004@lms.edu.mv      | Active   | Must change password on first sign-in |
| Student             | S000005@lms.edu.mv      | Inactive | Must change password on first sign-in |
| Student             | S000006@lms.edu.mv      | Active   | Enrolled in January 2025 offering  |
| Student             | S000007@lms.edu.mv      | Active   | Enrollment test account            |

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `bun run dev`        | Start development server             |
| `bun run build`      | Production build                     |
| `bun run lint`       | ESLint                               |
| `bun run test`       | Vitest unit tests                    |
| `bun run test:e2e`   | Playwright end-to-end tests          |
| `bun run db:migrate` | Run pending Prisma migrations        |
| `bun run db:seed`    | Seed the database                    |
| `bun run db:reset`   | Reset and re-seed the database       |

## Production

```bash
docker compose up -d
```
