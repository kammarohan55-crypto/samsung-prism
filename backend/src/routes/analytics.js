/**
 * Analytics Routes — Team metrics, trends, summaries, and health.
 */

import { Router } from 'express';
import { getOne, getAll } from '../db/db.js';
import { authenticate, authorize, tenantGuard } from '../middleware/auth.js';
import { computeMetrics, computeAndStoreMetrics, computeTrends, computePersonMetrics, computeTeamHealth } from '../services/analytics-engine.js';
import { generateWeeklySummary } from '../services/summary-generator.js';

const router = Router();
router.use(authenticate, tenantGuard);

/** GET /api/analytics/overview — Dashboard overview */
router.get('/overview', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const totalUsers = getOne('SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND is_active = 1', req.tenantId)?.count || 0;
  const newHires = getOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = 'new_hire' AND is_active = 1", req.tenantId)?.count || 0;
  const completedOnboarding = getOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND onboarding_status = 'completed' AND is_active = 1", req.tenantId)?.count || 0;

  const eventCounts = getAll(
    `SELECT source, COUNT(*) as count FROM events WHERE tenant_id = ? AND timestamp >= datetime('now', '-7 days') GROUP BY source`, req.tenantId
  );

  // Use computed metrics instead of stored ones
  const metrics = computeMetrics(req.tenantId);
  const latestMetrics = Object.entries(metrics).map(([type, value]) => ({
    metric_type: type, value,
    period_start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
  }));

  const healthScore = computeTeamHealth(req.tenantId);

  res.json({
    overview: {
      total_users: totalUsers, new_hires: newHires,
      completed_onboarding: completedOnboarding,
      onboarding_rate: totalUsers > 0 ? Math.round((completedOnboarding / totalUsers) * 100) : 0,
      event_counts: eventCounts, latest_metrics: latestMetrics,
      health_score: healthScore,
    }
  });
});

/** GET /api/analytics/metrics — Computed metrics */
router.get('/metrics', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 90);
  const metrics = computeMetrics(req.tenantId, 'weekly', days);
  res.json({ metrics, period_days: days });
});

/** GET /api/analytics/trends — Week-over-week trend data */
router.get('/trends', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const weeks = Math.min(parseInt(req.query.weeks) || 4, 12);
  const trends = computeTrends(req.tenantId, weeks);
  res.json({ trends });
});

/** GET /api/analytics/summary — AI-generated weekly summary */
router.get('/summary', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const summary = generateWeeklySummary(req.tenantId);
  res.json(summary);
});

/** GET /api/analytics/team — Per-person metrics */
router.get('/team', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const team = computePersonMetrics(req.tenantId);
  res.json({ team });
});

/** GET /api/analytics/team-health — Composite health score */
router.get('/team-health', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const healthScore = computeTeamHealth(req.tenantId);
  const metrics = computeMetrics(req.tenantId);
  res.json({ health_score: healthScore, metrics });
});

/** GET /api/analytics/events */
router.get('/events', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const source = req.query.source;
  let query = 'SELECT id, source, event_type, actor_name, timestamp, metadata FROM events WHERE tenant_id = ?';
  const params = [req.tenantId];
  if (source) { query += ' AND source = ?'; params.push(source); }
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  const events = getAll(query, ...params);
  const parsed = events.map(e => ({ ...e, metadata: e.metadata ? JSON.parse(e.metadata) : null }));
  res.json({ events: parsed });
});

/** GET /api/analytics/onboarding */
router.get('/onboarding', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const progress = getAll(
    `SELECT u.id, u.display_name, u.role, u.hire_date, u.onboarding_status,
            COUNT(op.id) as total_tasks,
            SUM(CASE WHEN op.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
     FROM users u LEFT JOIN onboarding_progress op ON u.id = op.user_id
     WHERE u.tenant_id = ? AND u.is_active = 1 GROUP BY u.id ORDER BY u.hire_date DESC`, req.tenantId
  );
  res.json({ onboarding: progress });
});

export default router;
