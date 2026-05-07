import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;
let dbPath = null;
let saveTimer = null;

/**
 * Initialize SQL.js and open/create the database.
 */
export async function initDb(path) {
  const SQL = await initSqlJs();
  dbPath = path || join(__dirname, '..', '..', '..', 'data', 'itis.db');

  // Ensure directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Apply schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Auto-save every 5 seconds if dirty
  scheduleSave();

  return db;
}

/**
 * Get the database instance. Must call initDb first.
 */
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Save database to disk.
 */
export function saveDb() {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

/**
 * Schedule periodic saves.
 */
function scheduleSave() {
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(() => saveDb(), 5000);
}

/**
 * Close the database and save.
 */
export function closeDb() {
  if (saveTimer) clearInterval(saveTimer);
  saveDb();
  if (db) { db.close(); db = null; }
}

/**
 * Generate a new UUID.
 */
export function newId() {
  return randomUUID();
}

// ── Query helpers that match better-sqlite3's synchronous API style ──

/**
 * Run a SQL statement with params. Returns { changes }.
 */
export function run(sql, ...params) {
  const database = getDb();
  database.run(sql, params);
  return { changes: database.getRowsModified() };
}

/**
 * Get one row. Returns object or undefined.
 */
export function getOne(sql, ...params) {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

/**
 * Get all rows. Returns array of objects.
 */
export function getAll(sql, ...params) {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Audit logger — records actions without exposing secrets.
 */
export function auditLog(entry) {
  run(
    `INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    entry.tenant_id || null,
    entry.user_id || null,
    entry.action,
    entry.resource_type,
    entry.resource_id || null,
    entry.details ? JSON.stringify(sanitizeDetails(entry.details)) : null,
    entry.ip_address || null
  );
  // Save after audit events
  saveDb();
}

/**
 * Strip sensitive fields from audit log details.
 */
function sanitizeDetails(details) {
  const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'apiKey', 'authorization', 'cookie'];
  if (typeof details !== 'object' || details === null) return details;
  const cleaned = { ...details };
  for (const key of Object.keys(cleaned)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      cleaned[key] = '[REDACTED]';
    }
  }
  return cleaned;
}
