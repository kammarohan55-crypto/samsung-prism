/**
 * Mock Jira Connector
 * Generates realistic ticket lifecycle events with story points and sprints.
 */

const TICKET_TITLES = [
  'User auth flow improvements',
  'Dashboard performance optimization',
  'API rate limiting implementation',
  'Database migration script',
  'Add search functionality',
  'Fix notification delivery',
  'Implement file upload service',
  'Update security headers',
  'Add audit logging',
  'Create onboarding wizard',
  'Fix pagination edge cases',
  'Implement caching layer',
  'Add email template system',
  'Fix timezone handling',
  'Implement SSO integration',
];

const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

/**
 * Generate mock Jira events for a time range.
 */
export function generateJiraEvents({ actors, startDate, endDate, eventsPerDay = 3 }) {
  const events = [];
  const dayMs = 86400000;
  const days = Math.ceil((endDate - startDate) / dayMs);
  let ticketCounter = 100;

  for (let d = 0; d < days; d++) {
    const dayStart = new Date(startDate.getTime() + d * dayMs);
    const dow = dayStart.getDay();
    if (dow === 0 || dow === 6) continue;

    const dailyCount = Math.max(1, Math.round(eventsPerDay + (Math.random() - 0.5) * 2));

    for (let i = 0; i < dailyCount; i++) {
      const actor = actors[Math.floor(Math.random() * actors.length)];
      const hour = 9 + Math.floor(Math.random() * 9);
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(dayStart);
      timestamp.setHours(hour, minute, 0, 0);

      const eventType = pickWeighted([
        { value: 'ticket_created', weight: 2 },
        { value: 'ticket_moved', weight: 4 },
        { value: 'ticket_closed', weight: 2 },
        { value: 'ticket_assigned', weight: 1.5 },
        { value: 'ticket_commented', weight: 1 },
        { value: 'sprint_completed', weight: 0.1 },
      ]);

      const title = TICKET_TITLES[Math.floor(Math.random() * TICKET_TITLES.length)];
      const ticketId = `ITIS-${ticketCounter++}`;
      const meta = buildJiraMeta(eventType, title, ticketId, actors);

      events.push({
        source: 'jira',
        event_type: eventType,
        actor_id: actor.id,
        actor_name: actor.name,
        timestamp: timestamp.toISOString(),
        metadata: meta,
      });
    }
  }

  return events;
}

function buildJiraMeta(eventType, title, ticketId, actors) {
  const storyPoints = [1, 2, 3, 5, 8, 13][Math.floor(Math.random() * 6)];
  const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];

  switch (eventType) {
    case 'ticket_created':
      return { ticket_id: ticketId, title, story_points: storyPoints, priority, status: 'backlog' };
    case 'ticket_moved': {
      const fromIdx = Math.floor(Math.random() * (STATUSES.length - 1));
      return {
        ticket_id: ticketId, title,
        from: STATUSES[fromIdx],
        to: STATUSES[fromIdx + 1],
        story_points: storyPoints,
        is_blocked: Math.random() < 0.1,
      };
    }
    case 'ticket_closed':
      return { ticket_id: ticketId, title, story_points: storyPoints, resolution: Math.random() > 0.15 ? 'done' : 'wont_do' };
    case 'ticket_assigned': {
      const assignee = actors[Math.floor(Math.random() * actors.length)];
      return { ticket_id: ticketId, title, assignee_name: assignee.name };
    }
    case 'ticket_commented':
      return { ticket_id: ticketId, title, comment_count: Math.floor(Math.random() * 5) + 1 };
    case 'sprint_completed':
      return { sprint_name: `Sprint ${Math.floor(Math.random() * 20) + 1}`, velocity: Math.floor(Math.random() * 30) + 15, planned: Math.floor(Math.random() * 35) + 20 };
    default:
      return { ticket_id: ticketId, title };
  }
}

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}
