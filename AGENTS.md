# AGENTS.md

## ComSciSeat Project

ComSciSeat is a computer laboratory seat and table reservation system for Computer Science students. This repository is the backend service for authentication, lab/table availability, class schedule blocking, bookings, admin management, and reservation email notifications.

## Purpose

The backend exposes API endpoints used by the ComSciSeat frontend to:

- Authenticate KMITL users through Google OAuth.
- Issue and verify JWT-based sessions.
- Manage users, labs, tables, bookings, and class schedules.
- Prevent bookings when a lab is closed, already reserved, or blocked by a class schedule.
- Send reservation confirmation and cancellation emails.
- Provide admin views and operations for booking and schedule management.

## In Brief

- Runtime: Node.js with TypeScript ES modules.
- Web framework: Hono.
- Database access: Prisma Client with PostgreSQL.
- Validation: Zod with `@hono/zod-validator`.
- Tests: Vitest unit and integration suites.
- Default local server: `http://localhost:3000`.

## Architectural Overview

The backend follows a small route-service-model structure:

- `src/index.ts` creates the Hono app, configures CORS, and mounts API modules.
- `src/routes/*.routes.ts` defines HTTP endpoints, request validation, auth checks, and response shape.
- `src/services/*.service.ts` owns business rules and orchestration between models, email, auth, and scheduling logic.
- `src/models/*.model.ts` owns Prisma database queries.
- `src/dtos/*.dto.ts` owns Zod schemas for params, queries, and JSON bodies.
- `src/shared/database/prisma.ts` exports the Prisma client.
- `src/shared/middleware/auth.ts` verifies bearer tokens and attaches auth context.
- `src/lib/shared/utils/*` contains reusable utilities.
- `src/tests/unit` and `src/tests/integration` contain Vitest coverage.
- `prisma/schema.prisma` defines the PostgreSQL schema and generated Prisma client output.

Main API areas:

- `/api/auth`
- `/api/user`
- `/api/labs`
- `/api/tables`
- `/api/bookings`
- `/api/class_schedule`

## Tech Stack

- TypeScript
- Node.js
- Hono
- Prisma
- PostgreSQL
- Zod
- Vitest
- Google OAuth 2.0 via `google-auth-library`
- JWT via `jsonwebtoken`
- Resend for email
- Docker / Docker Compose

## Setup Instructions

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npm run generate
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

Docker Compose is available:

```bash
docker compose up --build
```

Environment variables are required for database, JWT, Google OAuth, and Resend email configuration. Do not read, print, commit, or edit `.env` files unless the user explicitly asks for a safe, specific change.

## Build and Test Commands

Use these commands from `/backend`:

```bash
npm run build
npm test
npm run test:run
npm run test:coverage
npm run test:integration:run
npm run test:integration:coverage
```

Notes:

- Integration tests use `.env.test`.
- Prisma generation is included in build and integration test scripts.
- If dependencies or external services are missing, explain the blocker and the command that failed.

## Coding Standard

- Follow the existing route-service-model layering.
- Keep request validation in `src/dtos` with Zod schemas.
- Keep HTTP-specific concerns in `src/routes`.
- Keep business rules in `src/services`.
- Keep database queries in `src/models`.
- Use strict TypeScript and avoid `any` unless matching an existing Hono context pattern or Prisma enum limitation.
- Use ES module imports with `.js` extensions for local TypeScript files, matching the current NodeNext setup.
- Prefer small, focused functions over broad rewrites.
- Preserve existing response conventions such as `{ success: true, data }` and `{ success: false, error }`.
- Add or update tests when changing behavior, validation, auth, booking rules, or database query logic.
- Avoid unrelated formatting churn.
- Do not edit generated output in `dist`, `coverage`, `coverage-integration`, or `src/generated` by hand.

## File Ownership

- `/backend` is owned by the backend implementation.
- `/frontend` is owned by the frontend implementation.
- Backend agents should work inside `/backend` unless the user explicitly asks for cross-repository or frontend changes.
- If a backend change requires a frontend contract update, document the required frontend change instead of editing `/frontend` without permission.

## Safety Constraints

- Do not read, print, edit, or expose `.env`, `.env.test`, or any secret-bearing files unless the user explicitly requests it.
- Do not commit secrets, tokens, database URLs, OAuth credentials, email keys, or private config.
- Do not run destructive commands such as `git reset --hard`, recursive deletes, or database resets without explicit user approval.
- Do not modify files outside `/backend` without explicit user approval.
- Do not overwrite user changes. Check the current file before editing if it may have been changed.
- Do not manually edit generated Prisma client files, build output, or coverage output.
- Be careful with database schema changes: update Prisma schema, generated client expectations, and tests together.
- Avoid logging sensitive auth tokens, OAuth payloads, full user records, or email secrets.

## Practical Agent Workflow

1. Read the relevant route, service, model, DTO, and tests before editing.
2. Make the smallest change that satisfies the requested behavior.
3. Run the narrowest relevant tests first.
4. Run `npm run build` or broader tests when touching shared types, Prisma, auth, or booking logic.
5. Report what changed, what was verified, and any remaining risk.

