import jwt from 'jsonwebtoken';
import { getOne, auditLog } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Authenticate JWT token from Authorization header.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getOne(
      'SELECT id, tenant_id, email, display_name, role, department, onboarding_status, is_active FROM users WHERE id = ?',
      decoded.userId
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    auditLog({ action: 'AUTH_FAILURE', resource_type: 'auth', details: { reason: err.message } });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * RBAC middleware factory.
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      auditLog({
        tenant_id: req.user.tenant_id, user_id: req.user.id,
        action: 'ACCESS_DENIED', resource_type: req.originalUrl,
        details: { required_roles: allowedRoles, user_role: req.user.role }
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Tenant isolation middleware.
 */
export function tenantGuard(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  req.tenantId = req.user.tenant_id;

  const requestedTenant = req.query.tenant_id || req.body?.tenant_id;
  if (requestedTenant && requestedTenant !== req.tenantId) {
    auditLog({
      tenant_id: req.user.tenant_id, user_id: req.user.id,
      action: 'TENANT_VIOLATION', resource_type: req.originalUrl,
      details: { requested: requestedTenant, actual: req.tenantId }
    });
    return res.status(403).json({ error: 'Tenant access violation' });
  }
  next();
}

/**
 * Sign a JWT.
 */
export function signToken(userId, tenantId) {
  return jwt.sign({ userId, tenantId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '24h' });
}
