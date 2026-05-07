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
- [x] Verification gate ✅ (CRUD works, RBAC enforced, tenant isolation verified)

## Phase 2: OpenClaw Setup & Orchestration
- [x] Create SOUL.md orchestrator personality + routing rules
- [x] Create MEMORY.md persistent facts
- [x] Create HEARTBEAT.md scheduled tasks
- [x] Define 4 worker agents (onboarding-rag, metrics-analyzer, action-generator, doc-processor)
- [x] Define 4 skills (query-docs, compute-metrics, generate-checklist, create-reminder)
- [x] Intent classifier stub in chat route (will be replaced by OpenClaw gateway)
- [ ] Configure openclaw.json (needs LLM API key)
- [ ] Test live gateway routing
- [/] Verification gate (partial — workspace defined, gateway config pending API key)

## Phase 3: Document Ingestion & RAG
- [x] Create sample company docs (handbook, onboarding guide, benefits)
- [ ] Build embedding + vector store pipeline (needs LLM API key)
- [ ] Build retrieval service
- [ ] Build citation formatter
- [ ] Verification gate

## Phase 4: Chat Orchestration & Reminders
- [x] Chat endpoint with intent classification
- [x] Chat history persistence
- [ ] Full OpenClaw gateway integration
- [ ] Reminder scheduler
- [ ] Verification gate

## Phase 8: Role-Based Dashboard (partially complete)
- [x] Manager dashboard with metrics, charts, activity
- [x] New hire onboarding checklist view
- [x] Chat assistant page with quick actions
- [x] Role-based route guarding
- [x] Sidebar navigation
- [x] Login page with demo accounts
- [x] Premium dark theme design system
- [ ] HR view, Admin panel
- [/] Verification gate (core views working)

## Phases 5–11: Deferred
- Telemetry connectors, burnout signals, skills gap, security hardening, demo polish
