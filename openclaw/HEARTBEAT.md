# ITIS Heartbeat — Proactive Scheduled Tasks

## Daily Tasks (every 24 hours)

### Morning Briefing (9:00 AM)
- [ ] Check for onboarding tasks due today for all new hires
- [ ] Generate daily summary of yesterday's team events
- [ ] Identify any blocked Jira tickets > 2 days stale

### Reminder Check (every 4 hours)
- [ ] Query reminders table for due_at <= now AND status = 'pending'
- [ ] Send notifications for due reminders
- [ ] Mark sent reminders as status = 'sent'

## Weekly Tasks (Monday morning)

### Weekly Team Summary
- [ ] Compute weekly metrics: velocity, cycle time, PR throughput
- [ ] Identify top blockers and bottlenecks
- [ ] Generate manager summary for each team_lead and manager
- [ ] Check onboarding progress for new hires hired in last 30 days

### Onboarding Health Check
- [ ] For each new_hire with onboarding_status = 'in_progress':
  - Check if any tasks are overdue (> 7 days since expected completion)
  - If overdue, create a gentle nudge reminder
  - Update onboarding_completion_rate metric
