# Quizzer

A modern development upskilling platform featuring timed MCQ quizzes, curated SDE coding sheets, LeetCode/Codeforces profile sync, and interactive streaks with a 365-day contribution calendar grid. Built with **Next.js**, **Express**, **Prisma**, and **SQLite** / **PostgreSQL**.

## Features

- **Roles:** Admin (email whitelist) & Candidate
- **JWT authentication** with protected routes
- **Admin:** Create quizzes, MCQ questions, coding questions (internal compiler or external-only SDE sheet links), analytics, CSV export
- **Candidate:** Timed quizzes (with timer and auto-submit), curated SDE sheets (Apna College/Striver-style), and automated profile synchronization
- **Contribution Heatmap Grid**: 365-day horizontal activity grid mapping daily solved questions, consecutive "Active Days" streaks, and total points (Easy: 10, Medium: 20, Hard: 30)
- **External Coding support**: Supports external-only problems where users solve questions on external platforms (LeetCode/Codeforces) and manually mark them as solved to maintain streaks
- **Public Leaderboard** with real-time Socket.IO updates
- **Dark theme**, toasts, loading skeletons, search & filters
- **Production-ready** for ~150 concurrent users (with PostgreSQL + cluster mode)

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### 1. Install dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
```

Default `.env` uses SQLite (`file:./dev.db`) — no Docker required.

### 3. Database setup & seed

```bash
cd backend
npx prisma db push
npm run db:seed
```

### 4. Run the app

From the project root:

```bash
npm install
npm run dev
```

- **Frontend:** http://localhost:3000
- **API:** http://localhost:4000



### Registration & admin access

- **Anyone** can sign up with any valid email — they become a **Candidate**.
- **Admin** is only assigned if the email is listed in `ADMIN_EMAILS` in `backend/.env` (comma-separated).

Example — make yourself admin:

```env
ADMIN_EMAILS="admin@quizzer.dev,you@yourcompany.com"
```

Restart the backend after changing `.env`, then register or log in with that email.

### Login/signup not working?

1. **Backend must be running** on port 4000: `cd backend && npm run dev`
2. **Frontend** proxies `/api` to the backend — restart Next.js after config changes: `cd frontend && npm run dev`
3. Or run both from root: `npm run dev`

## Handle 150 concurrent users (production)

SQLite is fine for development only. For a live quiz with **~150 students at once**:

### 1. Use PostgreSQL

```bash
docker compose up -d
```

In `backend/prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

In `backend/.env`:

```env
DATABASE_URL="postgresql://quizzer:quizzer123@localhost:5432/quizzer?schema=public&connection_limit=25&pool_timeout=20"
NODE_ENV=production
WEB_CONCURRENCY=4
```

```bash
cd backend
npx prisma db push
npm run db:seed
```

### 2. Run API in cluster mode (multiple CPU cores)

```bash
cd backend
npm run start:prod
```

This starts several Node workers, compression, rate limits, and:

| Optimization | What it does |
|--------------|--------------|
| **Progress debouncing** | Saves answers every 4s max (not every click) — ~97% fewer DB writes |
| **Leaderboard cache** | 5s cache on public leaderboard |
| **Batch rank updates** | Single transaction when scoring |
| **DB indexes** | Faster leaderboard & attempt queries |
| **Rate limiting** | Protects against traffic spikes |
| **Graceful shutdown** | Flushes pending saves before exit |

### 3. Deploy tips

- Put **nginx** or a load balancer in front if running multiple machines
- Give the server at least **2 GB RAM** and **2 CPU cores**
- Health check: `GET /api/health`
- Monitor memory in the health response

## PostgreSQL (Production) — quick setup

1. Start Postgres: `docker compose up -d`
2. In `backend/prisma/schema.prisma`, set `provider = "postgresql"`
3. Update `DATABASE_URL` in `.env`
4. Run `npx prisma db push && npm run db:seed`

## Project Structure

```
quizer/
├── backend/           # Express API + Prisma
│   ├── prisma/        # Schema & seed
│   └── src/routes/    # auth, quizzes, attempts, admin, leaderboard
├── frontend/          # Next.js App Router
│   └── src/app/       # pages & dashboards
├── docker-compose.yml # PostgreSQL (optional)
└── package.json       # concurrent dev scripts
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Candidate signup |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Retrieve profile and automatically sync active days & points |
| GET | `/api/quizzes` | List quizzes (role-based) |
| POST | `/api/attempts/start/:quizId` | Start quiz attempt |
| POST | `/api/attempts/:id/submit` | Submit & score |
| GET | `/api/leaderboard/:quizId` | Public rankings |
| GET | `/api/coding/questions` | List coding practice sheet questions |
| POST | `/api/coding/questions/:id/submit` | Run and submit code against test cases (Easy: 10, Medium: 20, Hard: 30) |
| POST | `/api/coding/questions/:id/mark-solved` | Register external solves and reward points/streak manually |
| GET | `/api/coding/submissions` | Retrieve coding submissions for contribution calendar |
| GET | `/api/admin/quizzes/:id/analytics` | Admin analytics |
| GET | `/api/admin/quizzes/:id/export` | CSV export |

## License

MIT
