import { Router } from 'express';
import { getOne, getAll, run, newId, auditLog, saveDb } from '../db/db.js';
import { authenticate, authorize, tenantGuard } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, tenantGuard);

/**
 * GET /api/users
 */
router.get('/', (req, res) => {
  const managerRoles = ['admin', 'hr', 'manager', 'team_lead'];
  if (managerRoles.includes(req.user.role)) {
    const users = getAll(
      `SELECT id, email, display_name, role, department, onboarding_status, hire_date, created_at
       FROM users WHERE tenant_id = ? AND is_active = 1`, req.tenantId
    );
    return res.json({ users });
  }
  const user = getOne(
    `SELECT id, email, display_name, role, department, onboarding_status, hire_date, created_at
     FROM users WHERE id = ? AND tenant_id = ?`, req.user.id, req.tenantId
  );
  res.json({ users: user ? [user] : [] });
});

/**
 * GET /api/users/:id
 */
router.get('/:id', (req, res) => {
  const managerRoles = ['admin', 'hr', 'manager', 'team_lead'];
  if (!managerRoles.includes(req.user.role) && req.params.id !== req.user.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const user = getOne(
    `SELECT id, email, display_name, role, department, onboarding_status, hire_date, created_at
     FROM users WHERE id = ? AND tenant_id = ?`, req.params.id, req.tenantId
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

/**
 * PATCH /api/users/:id
 */
router.patch('/:id', (req, res) => {
  const { display_name, department, role, onboarding_status } = req.body;

  if (role && !['admin', 'hr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only admin/hr can change roles' });
  }

  const isOwnProfile = req.params.id === req.user.id;
  const isManager = ['admin', 'hr', 'manager'].includes(req.user.role);
  if (!isOwnProfile && !isManager) return res.status(403).json({ error: 'Insufficient permissions' });

  const sets = [];
  const vals = [];
  if (display_name) { sets.push('display_name = ?'); vals.push(display_name); }
  if (department) { sets.push('department = ?'); vals.push(department); }
  if (role) { sets.push('role = ?'); vals.push(role); }
  if (onboarding_status) { sets.push('onboarding_status = ?'); vals.push(onboarding_status); }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  sets.push("updated_at = datetime('now')");
  run(`UPDATE users SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, ...vals, req.params.id, req.tenantId);

  auditLog({
    tenant_id: req.tenantId, user_id: req.user.id,
    action: 'USER_UPDATED', resource_type: 'user', resource_id: req.params.id,
    details: { fields: Object.keys(req.body) }
  });
  saveDb();

  const updated = getOne(
    'SELECT id, email, display_name, role, department, onboarding_status FROM users WHERE id = ? AND tenant_id = ?',
    req.params.id, req.tenantId
  );
  res.json({ user: updated });
});

export default router;
