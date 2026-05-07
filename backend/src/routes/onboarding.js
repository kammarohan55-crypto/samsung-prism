import { Router } from 'express';
import { getOne, getAll, run, newId, saveDb } from '../db/db.js';
import { authenticate, tenantGuard } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, tenantGuard);

/**
 * GET /api/onboarding/tasks
 */
router.get('/tasks', (req, res) => {
  const tasks = getAll(
    `SELECT id, title, description, category, target_role, order_index
     FROM onboarding_tasks
     WHERE tenant_id = ? AND (target_role = ? OR target_role = 'all') AND is_active = 1
     ORDER BY order_index`,
    req.tenantId, req.user.role
  );
  res.json({ tasks });
});

/**
 * GET /api/onboarding/progress
 */
router.get('/progress', (req, res) => {
  const progress = getAll(
    `SELECT op.id, op.task_id, op.status, op.completed_at, op.notes,
            ot.title, ot.description, ot.category
     FROM onboarding_progress op
     JOIN onboarding_tasks ot ON op.task_id = ot.id
     WHERE op.user_id = ? AND op.tenant_id = ?
     ORDER BY ot.order_index`,
    req.user.id, req.tenantId
  );

  const total = progress.length;
  const completed = progress.filter(p => p.status === 'completed').length;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({ progress, summary: { total, completed, score } });
});

/**
 * PATCH /api/onboarding/progress/:taskId
 */
router.patch('/progress/:taskId', (req, res) => {
  const { status, notes } = req.body;
  if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const existing = getOne(
    'SELECT id FROM onboarding_progress WHERE user_id = ? AND task_id = ? AND tenant_id = ?',
    req.user.id, req.params.taskId, req.tenantId
  );

  if (existing) {
    run(
      `UPDATE onboarding_progress
       SET status = ?, notes = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END, updated_at = datetime('now')
       WHERE id = ?`,
      status, notes || null, status, existing.id
    );
  } else {
    run(
      `INSERT INTO onboarding_progress (id, user_id, task_id, tenant_id, status, notes, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END)`,
      newId(), req.user.id, req.params.taskId, req.tenantId, status, notes || null, status
    );
  }
  saveDb();
  res.json({ success: true });
});

export default router;
