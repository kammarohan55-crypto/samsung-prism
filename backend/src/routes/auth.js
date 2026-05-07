import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { newId, getOne, run, auditLog, saveDb } from '../db/db.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name, tenant_slug, role, department, hire_date } = req.body;
    if (!email || !password || !display_name || !tenant_slug) {
      return res.status(400).json({ error: 'Missing required fields: email, password, display_name, tenant_slug' });
    }

    let tenant = getOne('SELECT id FROM tenants WHERE slug = ?', tenant_slug);
    if (!tenant) {
      const tenantId = newId();
      run('INSERT INTO tenants (id, name, slug) VALUES (?, ?, ?)', tenantId, tenant_slug, tenant_slug);
      tenant = { id: tenantId };
      auditLog({ tenant_id: tenantId, action: 'TENANT_CREATED', resource_type: 'tenant', resource_id: tenantId });
    }

    const existing = getOne('SELECT id FROM users WHERE tenant_id = ? AND email = ?', tenant.id, email);
    if (existing) return res.status(409).json({ error: 'Email already registered in this tenant' });

    const userId = newId();
    const passwordHash = await bcrypt.hash(password, 12);

    run(
      `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role, department, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId, tenant.id, email, passwordHash, display_name, role || 'new_hire', department || null, hire_date || null
    );

    auditLog({ tenant_id: tenant.id, user_id: userId, action: 'USER_REGISTERED', resource_type: 'user', resource_id: userId });
    saveDb();

    const token = signToken(userId, tenant.id);
    res.status(201).json({
      user: { id: userId, email, display_name, role: role || 'new_hire', tenant_id: tenant.id },
      token
    });
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, tenant_slug } = req.body;
    if (!email || !password || !tenant_slug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tenant = getOne('SELECT id FROM tenants WHERE slug = ?', tenant_slug);
    if (!tenant) return res.status(401).json({ error: 'Invalid credentials' });

    const user = getOne('SELECT * FROM users WHERE tenant_id = ? AND email = ?', tenant.id, email);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      auditLog({ tenant_id: tenant.id, action: 'LOGIN_FAILURE', resource_type: 'auth', details: { email } });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    auditLog({ tenant_id: tenant.id, user_id: user.id, action: 'LOGIN_SUCCESS', resource_type: 'auth' });

    const token = signToken(user.id, tenant.id);
    res.json({
      user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role, tenant_id: tenant.id, onboarding_status: user.onboarding_status },
      token
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
