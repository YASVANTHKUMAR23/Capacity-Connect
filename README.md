# Capacity Connect — Monorepo Architecture & Deployment Guide

**Institutional Capacity Building & Learning Management Platform**  
*Customized for the India Meteorological Department (IMD) / Ministry of Earth Sciences (MoES)*

---

## 1. Project Directory Overview

```text
Capacity Connect/
├── .env.example                    # Full-stack unified environment template
├── .gitignore                      # Monorepo version control ignore rules
├── package.json                    # Root workspace manager & multi-service commands
├── docker-compose.yml              # Multi-container orchestration (Backend + Frontend + Nginx)
├── nginx.conf                      # Production reverse proxy configuration
├── Prompts/                        # Architecture & module design documents
├── backend/                        # NestJS + TypeScript + Prisma + Neon PostgreSQL API
│   ├── Dockerfile                  # Production multi-stage Docker build for backend
│   ├── .env.example                # Backend-specific environment variables
│   ├── prisma/                     # Database schema and SQL migrations
│   └── src/                        # Modular monolith source code (Auth, Users, Sessions, etc.)
└── capacityconnect---frontend/     # React 19 + TypeScript + Vite + Tailwind CSS v4 UI
    ├── instruction.md              # Frontend component and architecture manual
    └── src/                        # Admin, Trainer, and Trainee portals
```

---

## 2. Quickstart for Local Development

### Prerequisites
- **Node.js**: v20+ or v22+
- **pnpm**: `corepack enable && corepack prepare pnpm@latest --activate`

### Step 1: Install Dependencies
```bash
# In the root directory (install dev orchestration tools):
npm install

# In the backend directory:
cd backend
pnpm install
cd ..

# In the frontend directory:
cd capacityconnect---frontend
npm install
cd ..
```

### Step 2: Configure Environment Variables
Copy `.env.example` in the root directory:
```bash
cp .env.example .env
cp .env.example backend/.env
```
Ensure you provide:
- `DATABASE_URL` & `DIRECT_URL` (Neon PostgreSQL)
- `GEMINI_API_KEY` (Google Gemini API for AI assistants)
- `JWT_ACCESS_SECRET` & `REFRESH_TOKEN_SECRET`

### Step 3: Run Database Migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Step 4: Run Both Services Concurrently
From the root directory:
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000/api/v1`
- **Swagger Documentation**: `http://localhost:3000/api/docs`

---

## 3. Production Deployment with Docker Compose

To deploy the complete stack using containerization:

```bash
docker compose up --build -d
```
The stack spins up:
1. `backend`: NestJS runtime exposing port 3000.
2. `frontend`: Static React build served via Nginx on port 80 with automatic `/api/` reverse proxying.

To tear down:
```bash
docker compose down
```
