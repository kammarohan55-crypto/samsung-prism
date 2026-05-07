# Resume Packet

- **Current Phase**: 2 (OpenClaw Setup) — workspace defined, live gateway pending API key
- **Last Completed Step**: Full E2E verification — login → dashboard → chat → onboarding all passing
- **Current State**: Phases 0, 1 complete. Phase 2 partially done (workspace files created, gateway config needs API key). Phase 8 dashboard UI working. Frontend and backend both running and verified.
- **Known Issues**:
  - OpenClaw gateway not yet running live (needs `openclaw configure` with LLM API key)
  - Chat uses keyword-based intent classifier stub; needs OpenClaw gateway integration for real routing
  - RAG pipeline not yet connected (vector store + embedding API needed)
  - Chat markdown rendering not yet applied (shows raw `**bold**` syntax)
- **Next Step**: User provides LLM API key → configure openclaw.json → start gateway → integrate live routing
- **Architecture Decisions**:
  - sql.js instead of better-sqlite3 (Windows without Visual Studio C++)
  - OpenClaw 2026.5.4 native Windows (no WSL2 needed)
  - Express.js backend on 3001, Vite+React on 5173
  - SQLite single-file DB at data/itis.db
  - 13-table schema covering all layers
  - JWT auth with tenant isolation
  - RBAC: 6 roles (admin, hr, manager, team_lead, employee, new_hire)
