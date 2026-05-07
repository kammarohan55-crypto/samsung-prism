# ITIS — Demo Script (2-Minute Hackathon Demo)

## Setup (Before Demo)
```bash
# Start backend
cd backend && node src/index.js

# Start frontend (separate terminal)
cd frontend && npx vite
```

## Story
> "ITIS is an integrated team intelligence system. It helps new hires complete onboarding with AI-powered assistance, while giving managers real-time visibility into team health, productivity, and burnout signals."

---

## Act 1: New Hire Experience (45 sec)

1. **Login as New Hire**: `newhire@acme.com / demo123 / acme`
2. **Point out**: Sidebar only shows Assistant + Onboarding (RBAC enforced)
3. **Chat**: Click "📋 My checklist" → Shows 50% progress with task details
4. **Chat**: Click "📖 Leave policy" → RAG-grounded answer with citations
5. **Onboarding page**: Click sidebar → Show interactive checklist with progress bar

> "Alex just joined. The AI assistant answers policy questions from real docs, tracks onboarding progress, and classifies intent to route to the right worker."

---

## Act 2: Manager Dashboard (45 sec)

1. **Switch accounts**: Logout → Login as `manager@acme.com / demo123`
2. **Dashboard loads**: Health score, metric cards, trend charts
3. **Scroll to show**:
   - Velocity & PR throughput trend (area chart, 4 weeks)
   - Events by source (bar chart)
   - Weekly AI summary (highlights, concerns, actions)
   - Onboarding progress chart
   - Active signals/alerts

> "Sarah, the engineering manager, gets a real-time view of team health. The system ingests data from GitHub, Jira, Calendar, and Slack to compute productivity metrics."

---

## Act 3: Team Intelligence (30 sec)

1. **Team page**: Click sidebar → Show sortable team directory
2. **Point out**: Per-person activity (commits, PRs, meetings, Slack), health dots
3. **Sort by meetings**: Show who has highest meeting load

> "Every team member has a health indicator. The system detects burnout signals like meeting overload — using metadata only, no message content."

---

## Act 4: Admin & Architecture (15 sec)

1. **Login as admin**: `admin@acme.com / demo123`
2. **Admin panel**: Show telemetry sources, event counts, data generation
3. **Mention architecture**: OpenClaw workspace, 4 worker agents, deterministic skills, RBAC, tenant isolation, audit logging

> "Under the hood: OpenClaw orchestrates 4 specialized agents. Everything is tenant-isolated, audit-logged, and secrets never reach the browser."

---

## Key Differentiators to Mention

- ⚡ **Bidirectional learning loop**: Onboarding helps employees → work signals improve analytics
- 🔒 **Privacy-first**: Metadata only, no message content analysis
- 🤖 **OpenClaw-native**: Gateway, agents, skills, memory — not just a chatbot
- 📊 **Real metrics**: Computed from events, not static data
- 🏥 **Burnout detection**: Respectful, sustained-pattern-only alerts
