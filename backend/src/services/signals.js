/**
 * Burnout & Overload Signals — metadata-only, privacy-first detection.
 * Signals use neutral language and trigger only on sustained patterns.
 */

import { getAll, getOne } from '../db/db.js';

const THRESHOLDS = {
  meeting_overload_hours: 25,
  meeting_overload_weeks: 2,
  blocked_days: 5,
  workload_imbalance_pct: 40,
  onboarding_stall_days: 7,
  after_hours_days: 3,
};

/**
 * Detect all signals for a tenant.
 * @returns {Array} Array of alert objects
 */
export function detectSignals(tenantId) {
  const alerts = [];
  const users = getAll('SELECT id, display_name, role, hire_date FROM users WHERE tenant_id = ? AND is_active = 1', tenantId);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

  for (const user of users) {
    // 1. Meeting overload
    const meetings = getAll(
      `SELECT metadata FROM events WHERE tenant_id = ? AND actor_id = ? AND source = 'calendar' AND event_type = 'meeting' AND timestamp >= ?`,
      tenantId, user.id, weekAgo
    );
    let meetingHours = 0;
    for (const m of meetings) { try { meetingHours += (JSON.parse(m.metadata)?.duration_min || 0) / 60; } catch {} }

    if (meetingHours > THRESHOLDS.meeting_overload_hours) {
      alerts.push({
        type: 'meeting_overload', severity: meetingHours > 30 ? 'high' : 'medium',
        user_id: user.id, user_name: user.display_name,
        message: `${user.display_name}'s schedule may be heavy — ${Math.round(meetingHours)}h of meetings this week`,
        metric: meetingHours, threshold: THRESHOLDS.meeting_overload_hours,
      });
    }

    // 2. Workload concentration
    const userTickets = getOne(
      `SELECT COUNT(*) as count FROM events WHERE tenant_id = ? AND actor_id = ? AND source = 'jira' AND event_type = 'ticket_closed' AND timestamp >= ?`,
      tenantId, user.id, weekAgo
    )?.count || 0;
    const totalTickets = getOne(
      `SELECT COUNT(*) as count FROM events WHERE tenant_id = ? AND source = 'jira' AND event_type = 'ticket_closed' AND timestamp >= ?`,
      tenantId, weekAgo
    )?.count || 1;
    const pct = Math.round((userTickets / totalTickets) * 100);
    if (pct > THRESHOLDS.workload_imbalance_pct && totalTickets > 5) {
      alerts.push({
        type: 'workload_imbalance', severity: 'medium',
        user_id: user.id, user_name: user.display_name,
        message: `${user.display_name} handled ${pct}% of closed tickets — consider distributing work`,
        metric: pct, threshold: THRESHOLDS.workload_imbalance_pct,
      });
    }

    // 3. Onboarding stall
    if (user.role === 'new_hire') {
      const lastCompleted = getOne(
        `SELECT MAX(completed_at) as last FROM onboarding_progress WHERE user_id = ? AND tenant_id = ? AND status = 'completed'`,
        user.id, tenantId
      );
      if (lastCompleted?.last) {
        const daysSince = Math.floor((now - new Date(lastCompleted.last)) / 86400000);
        if (daysSince > THRESHOLDS.onboarding_stall_days) {
          alerts.push({
            type: 'onboarding_stall', severity: daysSince > 14 ? 'high' : 'medium',
            user_id: user.id, user_name: user.display_name,
            message: `${user.display_name} hasn't completed an onboarding task in ${daysSince} days`,
            metric: daysSince, threshold: THRESHOLDS.onboarding_stall_days,
          });
        }
      }
    }
  }

  // 4. Blocked tickets (team-level)
  const blockedEvents = getAll(
    `SELECT metadata, actor_name FROM events WHERE tenant_id = ? AND source = 'jira' AND event_type = 'ticket_moved' AND timestamp >= ?`,
    tenantId, twoWeeksAgo
  );
  let blockedCount = 0;
  for (const e of blockedEvents) { try { if (JSON.parse(e.metadata)?.is_blocked) blockedCount++; } catch {} }
  if (blockedCount > 3) {
    alerts.push({
      type: 'blocked_tickets', severity: blockedCount > 5 ? 'high' : 'medium',
      message: `${blockedCount} blocked tickets in the past 2 weeks — may indicate process bottleneck`,
      metric: blockedCount, threshold: 3,
    });
  }

  return alerts.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return (sev[a.severity] || 2) - (sev[b.severity] || 2);
  });
}

/**
 * Per-person health indicator: green / yellow / red
 */
export function computePersonHealth(tenantId) {
  const users = getAll('SELECT id, display_name, role FROM users WHERE tenant_id = ? AND is_active = 1', tenantId);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  return users.map(user => {
    let score = 100;
    const meetings = getAll(
      `SELECT metadata FROM events WHERE tenant_id = ? AND actor_id = ? AND source = 'calendar' AND event_type = 'meeting' AND timestamp >= ?`,
      tenantId, user.id, weekAgo
    );
    let meetingHours = 0;
    for (const m of meetings) { try { meetingHours += (JSON.parse(m.metadata)?.duration_min || 0) / 60; } catch {} }
    if (meetingHours > 25) score -= 30;
    else if (meetingHours > 20) score -= 15;

    const status = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
    return { user_id: user.id, user_name: user.display_name, role: user.role, health_score: score, status, meeting_hours: Math.round(meetingHours * 10) / 10 };
  });
}
