import { Router } from 'express';
import { getOne, getAll } from '../db/db.js';
import { authenticate, authorize, tenantGuard } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, tenantGuard);

/**
 * GET /api/analytics/overview
 */
router.get('/overview', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const totalUsers = getOne('SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND is_active = 1', req.tenantId)?.count || 0;
  const newHires = getOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = 'new_hire' AND is_active = 1", req.tenantId)?.count || 0;
  const completedOnboarding = getOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND onboarding_status = 'completed' AND is_active = 1", req.tenantId)?.count || 0;

  const eventCounts = getAll(
    `SELECT source, COUNT(*) as count FROM events
     WHERE tenant_id = ? AND timestamp >= datetime('now', '-7 days')
     GROUP BY source`, req.tenantId
  );

  const latestMetrics = getAll(
    `SELECT metric_type, value, period_start, period_end FROM metrics
     WHERE tenant_id = ? AND period = 'weekly'
     ORDER BY computed_at DESC LIMIT 10`, req.tenantId
  );

  res.json({
    overview: {
      total_users: totalUsers, new_hires: newHires,
      completed_onboarding: completedOnboarding,
      onboarding_rate: totalUsers > 0 ? Math.round((completedOnboarding / totalUsers) * 100) : 0,
      event_counts: eventCounts, latest_metrics: latestMetrics
    }
  });
});

/**
 * GET /api/analytics/events
 */
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

/**
 * GET /api/analytics/onboarding
 */
router.get('/onboarding', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const progress = getAll(
    `SELECT u.id, u.display_name, u.role, u.hire_date, u.onboarding_status,
            COUNT(op.id) as total_tasks,
            SUM(CASE WHEN op.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
     FROM users u
     LEFT JOIN onboarding_progress op ON u.id = op.user_id
     WHERE u.tenant_id = ? AND u.is_active = 1
     GROUP BY u.id
     ORDER BY u.hire_date DESC`, req.tenantId
  );
  res.json({ onboarding: progress });
});

export default router;
