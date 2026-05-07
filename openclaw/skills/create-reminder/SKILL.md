---
name: create-reminder
description: Create a structured reminder with title, due date, and recipient
---

# Create Reminder Skill

## Workflow
1. Parse the user's message to extract:
   - `title`: what to remind about
   - `due_at`: when (parse natural language dates: "Friday", "in 3 days", "May 10")
   - `user_id`: who to remind (default: current user)
2. Validate all required fields are present
3. If any field is ambiguous, ask for clarification before proceeding
4. Insert into reminders table: { id, tenant_id, user_id, title, message, due_at, status: 'pending' }
5. Return confirmation: "✅ Reminder set: '{title}' due {due_at}"

## Parameters
- `message` (string, required): The user's natural language reminder request
- `user_id` (string, required): Current user's ID
- `tenant_id` (string, required): Tenant scope

## Validation Rules
- due_at must be in the future
- title must not be empty
- If due_at cannot be parsed, respond: "I couldn't determine the due date. Could you specify when you'd like to be reminded?"
