# ITIS — Integrated Team Intelligence System

> A hackathon-grade AI platform that unifies onboarding assistance, productivity analytics, and team intelligence through OpenClaw-orchestrated agent workflows.

## Architecture

- **Orchestration**: OpenClaw gateway with orchestrator + 4 domain workers
- **Knowledge**: RAG pipeline with LanceDB vector store and citation-grounded answers
- **Telemetry**: Normalized event ingestion from GitHub, Jira, Calendar, Slack
- **Dashboard**: React-based particular-role analytics views
- **Security**: RBAC, tenant isolation, audit logging, secret protection

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit .env with your API keys

# 3. Initialize database
cd backend && npm run db:init

# 4. Start OpenClaw gateway
cd ../openclaw && npx openclaw gateway start

# 5. Start backend
cd ../backend && npm run dev

# 6. Start frontend
cd ../frontend && npm run dev
```

## Project Structure

```
├── openclaw/          # OpenClaw agents, skills, memory
├── backend/           # Express.js API server
├── frontend/          # Vite + React dashboard
├── docs/              # Company documents for RAG
├── data/              # SQLite DBs, vector store
├── tests/             # Test suites
└── memory/            # Project checkpoints
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Orchestration | OpenClaw 2026.5.4 |
| Backend | Express.js (Node.js) |
| Frontend | Vite + React |
| Database | SQLite (better-sqlite3) |
| Vector Store | LanceDB |
| Auth | JWT + bcrypt |
| Charts | Recharts |
