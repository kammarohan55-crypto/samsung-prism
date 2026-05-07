import { initDb, newId, run, closeDb, saveDb } from './db.js';
import bcrypt from 'bcryptjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', '..', 'data');
mkdirSync(dataDir, { recursive: true });

console.log('[seed] Seeding database with demo data...');
await initDb(join(dataDir, 'itis.db'));

// ── Tenant ──
const tenantId = newId();
run('INSERT OR IGNORE INTO tenants (id, name, slug) VALUES (?, ?, ?)', tenantId, 'Acme Corp', 'acme');

// ── Users ──
const pwHash = bcrypt.hashSync('demo123', 12);
const users = [
  { role: 'admin', email: 'admin@acme.com', name: 'Admin User', dept: 'Engineering' },
  { role: 'manager', email: 'manager@acme.com', name: 'Sarah Chen', dept: 'Engineering' },
  { role: 'team_lead', email: 'lead@acme.com', name: 'James Wilson', dept: 'Engineering' },
  { role: 'hr', email: 'hr@acme.com', name: 'Priya Sharma', dept: 'People Ops' },
  { role: 'new_hire', email: 'newhire@acme.com', name: 'Alex Rivera', dept: 'Engineering' },
  { role: 'employee', email: 'dev@acme.com', name: 'Jordan Lee', dept: 'Engineering' },
];

const userIds = {};
for (const u of users) {
  const id = newId();
  userIds[u.role] = id;
  run(
    `INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, display_name, role, department, hire_date, onboarding_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, tenantId, u.email, pwHash, u.name, u.role, u.dept,
    u.role === 'new_hire' ? '2026-05-01' : '2025-01-15',
    u.role === 'new_hire' ? 'in_progress' : 'completed'
  );
}

// ── Onboarding Tasks ──
const tasks = [
  { title: 'Complete IT Setup', desc: 'Set up laptop, email, VPN access, and dev environment', cat: 'it', order: 1 },
  { title: 'Read Employee Handbook', desc: 'Review company policies, values, and code of conduct', cat: 'hr', order: 2 },
  { title: 'Meet Your Manager', desc: 'Schedule and complete a 1-on-1 with your direct manager', cat: 'people', order: 3 },
  { title: 'Set Up Dev Environment', desc: 'Clone repos, install dependencies, run first build', cat: 'engineering', order: 4 },
  { title: 'Complete Security Training', desc: 'Finish the mandatory security awareness course', cat: 'compliance', order: 5 },
  { title: 'Review Benefits Package', desc: 'Enroll in health, dental, and retirement plans', cat: 'hr', order: 6 },
  { title: 'Join Team Channels', desc: 'Join relevant Slack channels and introduce yourself', cat: 'people', order: 7 },
  { title: 'First Code Review', desc: 'Submit your first PR and receive a code review', cat: 'engineering', order: 8 },
];

const taskIds = [];
for (const t of tasks) {
  const id = newId();
  taskIds.push(id);
  run(
    `INSERT INTO onboarding_tasks (id, tenant_id, title, description, category, target_role, order_index)
     VALUES (?, ?, ?, ?, ?, 'new_hire', ?)`,
    id, tenantId, t.title, t.desc, t.cat, t.order
  );
}

// ── Onboarding Progress ──
const progressStatuses = ['completed', 'completed', 'completed', 'in_progress', 'pending', 'pending', 'completed', 'pending'];
for (let i = 0; i < taskIds.length; i++) {
  run(
    `INSERT INTO onboarding_progress (id, user_id, task_id, tenant_id, status, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId(), userIds.new_hire, taskIds[i], tenantId, progressStatuses[i],
    progressStatuses[i] === 'completed' ? '2026-05-03' : null
  );
}

// ── Sample Events ──
const now = new Date();
const eventData = [
  { source: 'github', type: 'pr_opened', actor: 'Jordan Lee', days: -1 },
  { source: 'github', type: 'pr_merged', actor: 'Jordan Lee', days: -1 },
  { source: 'github', type: 'pr_opened', actor: 'Alex Rivera', days: 0 },
  { source: 'github', type: 'commit', actor: 'Jordan Lee', days: -2 },
  { source: 'jira', type: 'ticket_created', actor: 'Sarah Chen', days: -1 },
  { source: 'jira', type: 'ticket_moved', actor: 'Jordan Lee', days: 0, meta: { from: 'In Progress', to: 'Review' } },
  { source: 'jira', type: 'ticket_closed', actor: 'Jordan Lee', days: -2 },
  { source: 'calendar', type: 'meeting', actor: 'Sarah Chen', days: 0, meta: { duration_min: 30, title: 'Sprint Planning' } },
  { source: 'calendar', type: 'meeting', actor: 'Sarah Chen', days: -1, meta: { duration_min: 60, title: 'Team Standup' } },
  { source: 'calendar', type: 'meeting', actor: 'James Wilson', days: 0, meta: { duration_min: 45, title: '1:1 with Alex' } },
  { source: 'slack', type: 'channel_activity', actor: 'Alex Rivera', days: 0, meta: { channel: '#onboarding', message_count: 5 } },
  { source: 'slack', type: 'channel_activity', actor: 'Jordan Lee', days: -1, meta: { channel: '#engineering', message_count: 12 } },
];

for (const e of eventData) {
  const ts = new Date(now.getTime() + e.days * 86400000).toISOString();
  run(
    `INSERT INTO events (id, tenant_id, source, event_type, actor_name, timestamp, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId(), tenantId, e.source, e.type, e.actor, ts, e.meta ? JSON.stringify(e.meta) : null
  );
}

// ── Sample Metrics ──
const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
const weekEnd = now.toISOString().split('T')[0];
const metrics = [
  { type: 'cycle_time', value: 3.2 },
  { type: 'lead_time', value: 5.8 },
  { type: 'velocity', value: 21 },
  { type: 'pr_throughput', value: 8 },
  { type: 'meeting_load_hours', value: 12.5 },
  { type: 'onboarding_completion_rate', value: 50 },
];

for (const m of metrics) {
  run(
    `INSERT INTO metrics (id, tenant_id, metric_type, period, period_start, period_end, value)
     VALUES (?, ?, ?, 'weekly', ?, ?, ?)`,
    newId(), tenantId, m.type, weekStart, weekEnd, m.value
  );
}

saveDb();
closeDb();
console.log('[seed] Done. Demo credentials:');
console.log('  Tenant: acme');
console.log('  New hire: newhire@acme.com / demo123');
console.log('  Manager: manager@acme.com / demo123');
console.log('  Admin:   admin@acme.com / demo123');
