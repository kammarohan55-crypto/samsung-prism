/**
 * Unified Data Generator
 * Creates 30 days of realistic telemetry data from all 4 connectors.
 * Each user gets role-appropriate activity patterns.
 */

import { generateGitHubEvents } from './connectors/github.js';
import { generateJiraEvents } from './connectors/jira.js';
import { generateCalendarEvents } from './connectors/calendar.js';
import { generateSlackEvents } from './connectors/slack.js';
import { normalizeEvent } from './normalizer.js';
import { run, getAll, newId, saveDb } from '../db/db.js';

/**
 * Generate and ingest 30 days of mock telemetry for a tenant.
 * @param {string} tenantId
 * @param {number} days - Number of days of data to generate (default 30)
 * @returns {{ total: number, bySource: Record<string, number> }}
 */
export async function generateTelemetryData(tenantId, days = 30) {
  console.log(`[data-gen] Generating ${days} days of telemetry for tenant ${tenantId}...`);

  // Get tenant users
  const users = getAll(
    'SELECT id, display_name, role, department FROM users WHERE tenant_id = ? AND is_active = 1',
    tenantId
  );

  if (users.length === 0) {
    console.log('[data-gen] No users found for tenant');
    return { total: 0, bySource: {} };
  }

  const actors = users.map(u => ({ id: u.id, name: u.display_name, role: u.role }));
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 86400000);

  // Generate from all connectors
  const githubEvents = generateGitHubEvents({
    actors: actors.filter(a => ['employee', 'new_hire', 'team_lead'].includes(a.role)),
    startDate, endDate, eventsPerDay: 5,
  });

  const jiraEvents = generateJiraEvents({
    actors,
    startDate, endDate, eventsPerDay: 4,
  });

  const calendarEvents = generateCalendarEvents({
    actors,
    startDate, endDate, meetingsPerDay: 3,
  });

  const slackEvents = generateSlackEvents({
    actors,
    startDate, endDate,
  });

  const allEvents = [...githubEvents, ...jiraEvents, ...calendarEvents, ...slackEvents];

  // Clear existing events for this tenant to avoid duplicates
  run('DELETE FROM events WHERE tenant_id = ?', tenantId);
  run('DELETE FROM metrics WHERE tenant_id = ?', tenantId);

  // Normalize and insert
  let inserted = 0;
  const bySource = {};

  for (const event of allEvents) {
    const normalized = normalizeEvent(event);
    if (!normalized.valid) continue;

    run(
      `INSERT INTO events (id, tenant_id, source, event_type, actor_id, actor_name, timestamp, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(), tenantId,
      normalized.source, normalized.event_type,
      normalized.actor_id || null, normalized.actor_name,
      normalized.timestamp,
      normalized.metadata ? JSON.stringify(normalized.metadata) : null
    );

    bySource[normalized.source] = (bySource[normalized.source] || 0) + 1;
    inserted++;
  }

  saveDb();
  console.log(`[data-gen] Generated ${inserted} events: ${JSON.stringify(bySource)}`);

  return { total: inserted, bySource };
}
