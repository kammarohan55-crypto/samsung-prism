---
name: generate-checklist
description: Generate a role-appropriate onboarding checklist for a new user
---

# Generate Checklist Skill

## Workflow
1. Receive user_id and role
2. Query onboarding_tasks WHERE target_role = role OR target_role = 'all'
3. For each task, check if onboarding_progress exists for this user
4. If no progress records exist, create them with status = 'pending'
5. Return ordered checklist: [{ task_id, title, description, category, status, order }]

## Parameters
- `user_id` (string, required): The user to generate checklist for
- `role` (string, required): User's role for task filtering
- `tenant_id` (string, required): Tenant scope

## Rules
- Tasks are ordered by order_index
- Never skip required tasks
- Categories: it, hr, people, engineering, compliance
- Status transitions: pending → in_progress → completed | skipped
