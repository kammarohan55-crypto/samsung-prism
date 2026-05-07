/**
 * Event Normalizer
 * Validates and normalizes events from all connectors into a unified schema.
 */

const VALID_SOURCES = ['github', 'jira', 'trello', 'calendar', 'slack', 'system'];

/**
 * Normalize a raw event into the unified schema.
 * @param {Object} raw - Raw event from a connector
 * @returns {Object} Normalized event with `valid` flag
 */
export function normalizeEvent(raw) {
  // Validate required fields
  if (!raw.source || !raw.event_type || !raw.timestamp) {
    return { valid: false, reason: 'Missing required fields' };
  }

  if (!VALID_SOURCES.includes(raw.source)) {
    return { valid: false, reason: `Invalid source: ${raw.source}` };
  }

  // Validate timestamp
  const ts = new Date(raw.timestamp);
  if (isNaN(ts.getTime())) {
    return { valid: false, reason: 'Invalid timestamp' };
  }

  // Sanitize metadata — remove any potentially sensitive fields
  const metadata = raw.metadata ? sanitizeMetadata(raw.metadata) : null;

  return {
    valid: true,
    source: raw.source,
    event_type: raw.event_type.toLowerCase().trim(),
    actor_id: raw.actor_id || null,
    actor_name: raw.actor_name || 'Unknown',
    timestamp: ts.toISOString(),
    metadata,
  };
}

/**
 * Validate a batch of events.
 * @param {Array} events
 * @returns {{ valid: Array, invalid: Array }}
 */
export function validateBatch(events) {
  const valid = [];
  const invalid = [];

  for (const event of events) {
    const result = normalizeEvent(event);
    if (result.valid) {
      valid.push(result);
    } else {
      invalid.push({ event, reason: result.reason });
    }
  }

  return { valid, invalid };
}

/**
 * Strip sensitive fields from event metadata.
 */
function sanitizeMetadata(meta) {
  if (typeof meta !== 'object' || meta === null) return meta;

  const sensitiveKeys = ['token', 'secret', 'password', 'api_key', 'authorization', 'cookie', 'email_body', 'message_content'];
  const cleaned = { ...meta };

  for (const key of Object.keys(cleaned)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      cleaned[key] = '[REDACTED]';
    }
  }

  return cleaned;
}
