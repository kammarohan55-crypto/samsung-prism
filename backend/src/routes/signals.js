/**
 * Signals Routes — Burnout/overload alerts and health indicators.
 */

import { Router } from 'express';
import { authenticate, authorize, tenantGuard } from '../middleware/auth.js';
import { detectSignals, computePersonHealth } from '../services/signals.js';

const router = Router();
router.use(authenticate, tenantGuard);

/** GET /api/signals/alerts — Active alerts for team */
router.get('/alerts', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  try {
    const alerts = detectSignals(req.tenantId);
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error('[signals/alerts]', err);
    res.status(500).json({ error: 'Failed to compute signals' });
  }
});

/** GET /api/signals/health — Per-person health indicators */
router.get('/health', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  try {
    const health = computePersonHealth(req.tenantId);
    res.json({ health });
  } catch (err) {
    console.error('[signals/health]', err);
    res.status(500).json({ error: 'Failed to compute health scores' });
  }
});

export default router;
