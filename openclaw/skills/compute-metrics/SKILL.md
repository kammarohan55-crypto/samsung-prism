---
name: compute-metrics
description: Aggregate normalized telemetry events into team productivity metrics
---

# Compute Metrics Skill

## Workflow
1. Receive metric_type and time_range parameters
2. Query the events table filtered by tenant_id and time_range
3. Apply the appropriate computation formula:

### Formulas
- **velocity**: COUNT(events WHERE type='ticket_closed') in period
- **cycle_time**: AVG(ticket_closed.timestamp - ticket_started.timestamp) in days
- **lead_time**: AVG(ticket_closed.timestamp - ticket_created.timestamp) in days
- **pr_throughput**: COUNT(events WHERE type='pr_merged') in period
- **meeting_load_hours**: SUM(metadata.duration_min) / 60 WHERE source='calendar'
- **onboarding_completion_rate**: (completed_tasks / total_tasks) * 100

4. Store computed metric in metrics table
5. Return: { metric_type, value, period, dimensions }

## Parameters
- `metric_type` (string, required): One of the defined metric types
- `tenant_id` (string, required): Tenant scope
- `period` (string, default: 'weekly'): 'daily' | 'weekly' | 'monthly'
- `team_id` (string, optional): Filter by team/department

## Deterministic Guarantee
- Same input events + same time range = same output metric value
- All computations use SQL aggregations, not LLM inference
