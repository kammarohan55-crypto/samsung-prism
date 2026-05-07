/**
 * Telemetry Routes
 * Endpoints for event ingestion, mock data generation, and source listing.
 */

import { Router } from 'express';
import { authenticate, authorize, tenantGuard } from '../middleware/auth.js';
import { normalizeEvent } from '../services/normalizer.js';
import { generateTelemetryData } from '../services/data-generator.js';
import { run, newId, getAll, getOne, saveDb } from '../db/db.js';

const router = Router();
router.use(authenticate, tenantGuard);

/**
 * POST /api/telemetry/ingest — Ingest external events
 */
router.post('/ingest', authorize('admin', 'hr', 'manager', 'team_lead'), async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }

    let ingested = 0;
    let failed = 0;

    for (const raw of events) {
      const normalized = normalizeEvent(raw);
      if (!normalized.valid) {
        failed++;
        continue;
      }

      run(
        `INSERT INTO events (id, tenant_id, source, event_type, actor_id, actor_name, timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(), req.tenantId,
        normalized.source, normalized.event_type,
        normalized.actor_id, normalized.actor_name,
        normalized.timestamp,
        normalized.metadata ? JSON.stringify(normalized.metadata) : null
      );
      ingested++;
    }

    saveDb();
    res.json({ ingested, failed, total: events.length });
  } catch (err) {
    console.error('[telemetry/ingest]', err);
    res.status(500).json({ error: 'Failed to ingest events' });
  }
});

/**
 * POST /api/telemetry/generate — Generate mock telemetry data (admin only)
 */
router.post('/generate', authorize('admin', 'manager'), async (req, res) => {
  try {
    const days = Math.min(parseInt(req.body.days) || 30, 90);
    const result = await generateTelemetryData(req.tenantId, days);
    res.json({ message: `Generated ${result.total} events`, ...result });
  } catch (err) {
    console.error('[telemetry/generate]', err);
    res.status(500).json({ error: 'Failed to generate telemetry data' });
  }
});

/**
 * GET /api/telemetry/sources — List configured telemetry sources
 */
router.get('/sources', (req, res) => {
  const sources = getAll(
    `SELECT source, COUNT(*) as event_count,
            MIN(timestamp) as first_event, MAX(timestamp) as last_event
     FROM events WHERE tenant_id = ?
     GROUP BY source ORDER BY event_count DESC`,
    req.tenantId
  );

  res.json({
    sources: sources.map(s => ({
      name: s.source,
      event_count: s.event_count,
      first_event: s.first_event,
      last_event: s.last_event,
      status: 'connected',
    })),
    available: ['github', 'jira', 'calendar', 'slack'],
  });
});

/**
 * GET /api/telemetry/stats — Event statistics
 */
router.get('/stats', authorize('admin', 'hr', 'manager', 'team_lead'), (req, res) => {
  const totalEvents = getOne('SELECT COUNT(*) as count FROM events WHERE tenant_id = ?', req.tenantId)?.count || 0;

  const last7Days = getAll(
    `SELECT source, event_type, COUNT(*) as count
     FROM events WHERE tenant_id = ? AND timestamp >= datetime('now', '-7 days')
     GROUP BY source, event_type ORDER BY count DESC`,
    req.tenantId
  );

  const dailyCounts = getAll(
    `SELECT date(timestamp) as day, COUNT(*) as count
     FROM events WHERE tenant_id = ? AND timestamp >= datetime('now', '-30 days')
     GROUP BY date(timestamp) ORDER BY day ASC`,
    req.tenantId
  );

  res.json({ total_events: totalEvents, last_7_days: last7Days, daily_counts: dailyCounts });
});

export default router;
