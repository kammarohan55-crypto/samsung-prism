# ITIS — Task Tracker

## Phase 0: Foundation & Project Memory
- [x] Create directory structure
- [x] Initialize backend (Express.js + package.json)
- [x] Initialize frontend (Vite + React)
- [x] Create OpenClaw workspace skeleton
- [x] Create project memory templates
- [x] Create README.md
- [x] Verification gate ✅

## Phase 1: Database & Identity
- [x] Create SQLite schema (13 tables)
- [x] Implement DB connection manager (sql.js)
- [x] Implement JWT auth middleware
- [x] Implement RBAC middleware
- [x] Create user/tenant CRUD routes
- [x] Create audit logging
- [x] Create seed script with demo data
- [x] Verification gate ✅

## Phase 2: OpenClaw Setup & Orchestration
- [x] Create SOUL.md orchestrator personality + routing rules
- [x] Create MEMORY.md persistent facts
- [x] Create HEARTBEAT.md scheduled tasks
- [x] Define 4 worker agents
- [x] Define 4 skills
- [x] Intent classifier (Gemini + keyword fallback)
- [ ] Configure openclaw.json (needs LLM API key)
- [ ] Test live gateway routing
- [/] Verification gate (workspace defined, gateway config pending)

## Phase 3: Document Ingestion & RAG
- [x] Create sample company docs (handbook, onboarding guide, benefits)
- [x] Build embedding + vector store pipeline (rag.js + gemini.js)
- [x] Build retrieval service with cosine similarity
- [x] Build citation formatter
- [/] Verification gate (code complete, needs API key for live test)

## Phase 4: Chat Orchestration & Reminders
- [x] Chat endpoint with intent classification
- [x] Chat history persistence
- [x] Worker routing (policy, checklist, metrics, reminders, tasks)
- [x] Quick actions UI
- [ ] Full OpenClaw gateway integration
- [/] Verification gate (working without live gateway)

## Phase 5: Telemetry Ingestion ✅ NEW
- [x] Create GitHub mock connector
- [x] Create Jira mock connector
- [x] Create Calendar mock connector
- [x] Create Slack metadata connector (privacy-first)
- [x] Create unified data generator (30-day realistic data)
- [x] Create event normalizer with validation
- [x] Create telemetry routes (ingest, generate, sources, stats)
- [x] Verification gate ✅ (1,148 events generated across 4 sources)

## Phase 6: Productivity Analytics ✅ NEW
- [x] Create analytics engine (cycle time, velocity, PR throughput, etc.)
- [x] Create summary generator (highlights, concerns, recommendations)
- [x] Enhanced analytics routes (metrics, trends, summary, team, team-health)
- [x] Compute team health score (0-100)
- [x] Compute per-person metrics
- [x] Week-over-week trend computation
- [x] Verification gate ✅

## Phase 7: Burnout & Overload Signals ✅ NEW
- [x] Create signals service (meeting overload, blocked tasks, etc.)
- [x] Create signals routes (alerts, health scores)
- [x] Per-person health indicators (green/yellow/red)
- [x] Neutral language, metadata-only analysis
- [x] Verification gate ✅

## Phase 8: Role-Based Dashboard ✅ COMPLETED
- [x] Manager dashboard with health score, trends, alerts, summary
- [x] Trend charts (area charts: velocity & PR throughput over 4 weeks)
- [x] Events by source bar chart
- [x] Weekly AI-generated summary card
- [x] Active signals/alerts section
- [x] Team view page with sortable directory + activity metrics
- [x] Admin panel with user management + telemetry controls
- [x] Data generation UI (admin triggers mock data)
- [x] Chat assistant page with quick actions
- [x] Onboarding checklist with progress tracking
- [x] Role-based route guarding (new hire sees only Assistant + Onboarding)
- [x] Premium dark theme with glassmorphism
- [x] Skeleton loading states, responsive CSS
- [x] Verification gate ✅

## Phases 9-11: Remaining
- [ ] Phase 9: Skills gap analysis, recommendations, scoring
- [ ] Phase 10: Security hardening, prompt injection, secret vault
- [ ] Phase 11: Demo polish, DEMO_SCRIPT.md, seeded journey
