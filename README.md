# TalentMatch Mini (ZaraClone)

A full-stack mini product that lets a candidate upload a resume, paste a job description, and receive an AI-powered match report.

## Implemented Scope

### MVP features
- Resume upload and job description input
- Match score (0 to 100)
- Missing skills and keyword gaps
- Strengths summary
- Saved comparison history
- Dashboard with recent matches

### Nice-to-have features included
- Multiple resumes per user
- Job recommendations based on selected resume
- Highlighted matched phrases in resume and JD
- Exportable PDF report
- Admin log page for match review

## Tech Stack
- Backend: Node.js + Express + PostgreSQL
- Frontend: React + browser-native CDN build
- Auth: JWT
- Upload parsing: PDF and text files

## Project Structure

- `backend/` API and matching service
- `frontend_clean/` React dashboard
- `docker-compose.yml` local PostgreSQL

## Data Model

Tables created in `backend/sql/schema.sql`:
- users
- resumes
- jobs
- matches
- match_feedback

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`

### Resumes
- `POST /resumes`
- `GET /resumes`

### Jobs
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/recommendations/:resumeId`

### Matches
- `POST /matches`
- `GET /matches/:id`
- `GET /matches/history`
- `GET /matches/dashboard/recent`
- `GET /matches/admin/logs` (admin only)
- `POST /matches/:id/feedback`

## Setup

### 1) Start PostgreSQL

```bash
docker compose up -d
```

This initializes schema automatically from `backend/sql/schema.sql`.

If you are on Windows and tables are missing after startup, apply schema manually:

```bash
Get-Content backend/sql/schema.sql | docker exec -i zaraclone-postgres-1 psql -U postgres -d resume_matcher
```

### 2) Configure backend env

Copy `backend/.env.example` to `backend/.env` and adjust values if needed.

Default local DB value:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55433/resume_matcher
```

### 3) Install dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

Frontend runs as a static page from `frontend_clean/index.html` and does not require npm packages.

### 4) Run backend

```bash
cd backend
npm run dev
```

### 5) Run frontend

```bash
cd frontend_clean
npm run dev
```

Frontend default URL is `http://localhost:5173`.
Backend default URL is `http://localhost:4000`.

### Demo login

Use these seeded credentials after starting the database:

- Email: `demo@talentmatch.local`
- Password: `TalentMatch123!`

## Continuous Integration

Backend CI is configured with GitHub Actions in `.github/workflows/backend-ci.yml`.

The workflow runs on every push and pull request, and performs:

- PostgreSQL service startup
- Database schema initialization from `backend/sql/schema.sql`
- Backend unit tests (`npm test`)
- Backend integration tests (`npm run test:integration`)

Run the same checks locally:

```bash
npm test --prefix backend
npm run test:integration --prefix backend
```

## Runbook

Use this section as the day-to-day operational quick reference.

### Start the full app

```bash
npm run dev
```

### Start services individually

```bash
npm run dev:backend
npm run dev:frontend
```

### Run tests

```bash
npm run test:backend
npm run test:integration
```

### Health checks

```bash
curl http://localhost:4000/health
```

If frontend auth/actions fail, check backend health first and ensure PostgreSQL is up.

## Deploy To Render

This repo includes a Render Blueprint file at `render.yaml`.

### Steps

1. Push this repository to GitHub.
2. In Render, click **New** -> **Blueprint**.
3. Connect this GitHub repository.
4. Render will create:
	- a PostgreSQL database (`zaraclone-db`)
	- a Node web service (`zaraclone-web`)
5. After deploy completes, open the web service URL.

Notes:
- The backend initializes `backend/sql/schema.sql` automatically on service startup.
- Frontend is served by the backend in production, so a single Render URL hosts both UI and API.

## Notes

- Matching logic is implemented as a modular service in `backend/src/services/matchingService.js` so it can later be extracted into a separate service.
- Parsed resume and job text are persisted in PostgreSQL.
- PDF export uses jsPDF on the client side.
