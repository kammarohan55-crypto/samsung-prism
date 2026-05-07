# Resume Packet

- **Current Phase**: 8 (completing) — Phases 0-8 substantially done
- **Last Completed Step**: Full verification — admin data generation → dashboard → team view → new hire RBAC → chat → onboarding
- **Current State**: Phases 0-8 complete. Rich telemetry data (1,148 events across 4 sources). Analytics engine computing real metrics. Burnout signals detecting patterns. Dashboard showing trends, alerts, weekly summary. Team view with per-person metrics. Admin panel with data generation. New hire experience with RBAC enforcement.
- **Known Issues**:
  - Gemini API key not configured (chat uses keyword-based fallback, RAG answers from pre-seeded vectors)
  - OpenClaw gateway not running live (workspace defined, needs API key)
  - Phases 9 (Skills Gap), 10 (Security Hardening), 11 (Demo Polish) not yet started
- **Next Step**: Phase 11 demo polish → DEMO_SCRIPT.md → final verification
- **Architecture Decisions**:
  - sql.js for Windows compatibility
  - Gemini API for LLM (with keyword fallback when no API key)
  - 4 mock connectors (GitHub, Jira, Calendar, Slack) generating realistic telemetry
  - Analytics engine computes metrics from events (not static seed data)
  - Privacy-first signals: metadata-only, neutral language
  - Express.js on 3001, Vite+React on 5173
  - 13-table SQLite schema, JWT auth, 6-role RBAC
