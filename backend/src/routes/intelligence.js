/**
 * Intelligence Routes — Skills gap analysis, recommendations, and TTP metrics.
 */

import { Router } from 'express';
import { authenticate, authorize, tenantGuard } from '../middleware/auth.js';
import { analyzeSkillsGap, getRecommendations, getTeamProductivity } from '../services/skills-gap.js';

const router = Router();
router.use(authenticate, tenantGuard);

/** GET /api/intelligence/skills-gap/:userId — Skills gap analysis */
router.get('/skills-gap/:userId', (req, res) => {
  try {
    const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;
    const result = analyzeSkillsGap(userId, req.tenantId);
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  } catch (err) {
    console.error('[intelligence/skills-gap]', err);
    res.status(500).json({ error: 'Failed to analyze skills gap' });
  }
});

/** GET /api/intelligence/recommendations/:userId — Personalized recommendations */
router.get('/recommendations/:userId', (req, res) => {
  try {
    const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;
    const result = getRecommendations(userId, req.tenantId);
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  } catch (err) {
    console.error('[intelligence/recommendations]', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/** GET /api/intelligence/time-to-productivity — Team-wide TTP metrics */
router.get('/time-to-productivity', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  try {
    const result = getTeamProductivity(req.tenantId);
    res.json(result);
  } catch (err) {
    console.error('[intelligence/ttp]', err);
    res.status(500).json({ error: 'Failed to compute TTP metrics' });
  }
});

export default router;
