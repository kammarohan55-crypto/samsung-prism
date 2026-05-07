# ITIS Persistent Memory

## System Facts
- System name: Integrated Team Intelligence System (ITIS)
- Architecture: OpenClaw gateway → orchestrator → 4 domain workers
- Backend: Express.js on port 3001
- Frontend: Vite+React on port 5173
- Database: SQLite via sql.js at data/itis.db
- Demo tenant: "acme" (Acme Corp)

## Demo Users
| Role | Email | Name |
|------|-------|------|
| admin | admin@acme.com | Admin User |
| manager | manager@acme.com | Sarah Chen |
| team_lead | lead@acme.com | James Wilson |
| hr | hr@acme.com | Priya Sharma |
| new_hire | newhire@acme.com | Alex Rivera |
| employee | dev@acme.com | Jordan Lee |

## Worker Agents
1. **onboarding-rag**: Answers HR/policy questions using RAG, manages checklists
2. **metrics-analyzer**: Computes team velocity, cycle time, blockers, meeting load
3. **action-generator**: Creates reminders, action items, nudges
4. **doc-processor**: Ingests, chunks, and embeds documents

## Key Decisions
- Privacy-first: analytics use metadata only, not message content
- RBAC: new_hire sees only own data; manager+ sees team data
- Citations required on all factual policy answers
- sql.js used instead of better-sqlite3 (Windows compatibility)

## Conversation History Highlights
- (to be populated during runtime)
