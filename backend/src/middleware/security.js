/**
 * Security Middleware
 * - Response sanitizer: strip internal URLs, tokens
 * - Rate limiting on auth endpoints
 * - Prompt injection detection on chat input
 * - Security headers
 */

// ── Prompt Injection Patterns ──
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?(your|the)\s+rules/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /act\s+as\s+if\s+you\s+(are|were)\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /new\s+persona/i,
  /override\s+(your\s+)?instructions/i,
  /reveal\s+(your\s+)?(system|hidden|secret)\s+(prompt|instructions)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your\s+)?(system|hidden)\s+/i,
  /\bsudo\b/i,
  /\brm\s+-rf\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,
  /<script[\s>]/i,
  /javascript:/i,
  /data:text\/html/i,
];

// ── Sensitive Data Patterns ──
const SENSITIVE_PATTERNS = [
  /\b[A-Za-z0-9+/]{40,}\b/,  // long base64 tokens
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+/,  // JWT tokens
  /sk-[A-Za-z0-9]{20,}/,  // OpenAI keys
  /AIza[A-Za-z0-9_-]{30,}/,  // Google API keys
  /ghp_[A-Za-z0-9]{36}/,  // GitHub personal tokens
  /xoxb-[A-Za-z0-9-]+/,  // Slack bot tokens
  /password\s*[:=]\s*["']?[^\s"']+/i,
];

/**
 * Detect prompt injection attempts.
 * @param {string} text - User input text
 * @returns {{ isInjection: boolean, pattern: string|null, severity: string }}
 */
export function detectPromptInjection(text) {
  if (!text || typeof text !== 'string') return { isInjection: false, pattern: null, severity: 'none' };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isInjection: true,
        pattern: pattern.source.slice(0, 50),
        severity: text.toLowerCase().includes('ignore') || text.toLowerCase().includes('override') ? 'high' : 'medium',
      };
    }
  }

  return { isInjection: false, pattern: null, severity: 'none' };
}

/**
 * Sanitize response body to strip sensitive data before sending to client.
 */
export function sanitizeResponse(data) {
  if (typeof data === 'string') {
    let cleaned = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      cleaned = cleaned.replace(new RegExp(pattern.source, 'g'), '[REDACTED]');
    }
    return cleaned;
  }
  if (typeof data === 'object' && data !== null) {
    const cleaned = Array.isArray(data) ? [] : {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (['password', 'password_hash', 'token', 'secret', 'api_key', 'apikey', 'authorization', 'cookie'].some(s => lowerKey.includes(s))) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = sanitizeResponse(value);
      }
    }
    return cleaned;
  }
  return data;
}

/**
 * Rate limiter for auth endpoints (in-memory, simple).
 */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

export function rateLimiter(req, res, next) {
  const key = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, start: now });
    return next();
  }

  const entry = rateLimitStore.get(key);
  if (now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, start: now });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  next();
}

/**
 * Security headers middleware.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Chat input sanitizer middleware — detects injection and sanitizes.
 */
export function chatInputSanitizer(req, res, next) {
  if (req.body?.message) {
    const result = detectPromptInjection(req.body.message);
    if (result.isInjection) {
      // Log the attempt
      console.warn(`[SECURITY] Prompt injection detected from ${req.ip}:`, result.pattern);

      // Import auditLog lazily to avoid circular deps
      import('../db/db.js').then(({ auditLog }) => {
        auditLog({
          tenant_id: req.tenantId,
          user_id: req.user?.id,
          action: 'prompt_injection_attempt',
          resource_type: 'chat',
          details: { severity: result.severity, pattern: result.pattern },
          ip_address: req.ip,
        });
      }).catch(() => {});

      if (result.severity === 'high') {
        return res.status(400).json({
          error: 'Your message was flagged by our security system. Please rephrase your question.',
          flagged: true,
        });
      }
      // For medium severity, let it through but strip dangerous parts
      req.body.message = req.body.message
        .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[filtered]')
        .replace(/disregard\s+(all\s+)?previous/gi, '[filtered]')
        .replace(/override\s+(your\s+)?instructions/gi, '[filtered]');
    }

    // Basic XSS sanitization
    req.body.message = req.body.message
      .replace(/<script[^>]*>/gi, '')
      .replace(/<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  next();
}

// Cleanup rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > RATE_LIMIT_WINDOW * 2) rateLimitStore.delete(key);
  }
}, 60000);
