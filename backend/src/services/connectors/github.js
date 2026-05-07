/**
 * Mock GitHub Connector
 * Generates realistic PR, commit, review, and issue events.
 */

const PR_TITLES = [
  'Fix auth middleware token validation',
  'Add pagination to user list API',
  'Refactor database connection pooling',
  'Update dependencies to latest versions',
  'Implement rate limiting on API endpoints',
  'Add unit tests for analytics engine',
  'Fix CSS layout issues on dashboard',
  'Optimize vector search performance',
  'Add RBAC middleware to new routes',
  'Implement webhook handler for events',
  'Fix memory leak in websocket handler',
  'Add dark mode toggle to settings',
  'Migrate from REST to GraphQL queries',
  'Fix cross-tenant data leakage bug',
  'Add export functionality for reports',
];

const BRANCHES = ['main', 'develop', 'feature/auth', 'feature/dashboard', 'fix/performance', 'release/v2'];

/**
 * Generate mock GitHub events for a time range.
 * @param {Object} opts
 * @param {string[]} opts.actors - Array of {id, name} objects
 * @param {Date} opts.startDate
 * @param {Date} opts.endDate
 * @param {number} opts.eventsPerDay - Average events per day
 * @returns {Array} Normalized events
 */
export function generateGitHubEvents({ actors, startDate, endDate, eventsPerDay = 4 }) {
  const events = [];
  const dayMs = 86400000;
  const days = Math.ceil((endDate - startDate) / dayMs);

  for (let d = 0; d < days; d++) {
    const dayStart = new Date(startDate.getTime() + d * dayMs);
    const dow = dayStart.getDay();

    // Skip weekends (reduced activity)
    if (dow === 0 || dow === 6) continue;

    const dailyCount = Math.max(1, Math.round(eventsPerDay + (Math.random() - 0.5) * 3));

    for (let i = 0; i < dailyCount; i++) {
      const actor = actors[Math.floor(Math.random() * actors.length)];
      const hour = 9 + Math.floor(Math.random() * 9); // 9am - 5pm
      const minute = Math.floor(Math.random() * 60);
      const timestamp = new Date(dayStart);
      timestamp.setHours(hour, minute, 0, 0);

      const eventType = pickWeighted([
        { value: 'commit', weight: 4 },
        { value: 'pr_opened', weight: 2 },
        { value: 'pr_merged', weight: 1.5 },
        { value: 'pr_reviewed', weight: 2 },
        { value: 'issue_opened', weight: 0.5 },
        { value: 'issue_closed', weight: 0.5 },
      ]);

      const meta = buildGitHubMeta(eventType);

      events.push({
        source: 'github',
        event_type: eventType,
        actor_id: actor.id,
        actor_name: actor.name,
        timestamp: timestamp.toISOString(),
        metadata: meta,
      });
    }
  }

  return events;
}

function buildGitHubMeta(eventType) {
  const title = PR_TITLES[Math.floor(Math.random() * PR_TITLES.length)];
  const branch = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];

  switch (eventType) {
    case 'commit':
      return { message: title, branch, additions: rand(5, 200), deletions: rand(1, 80) };
    case 'pr_opened':
      return { title, branch, files_changed: rand(1, 15), additions: rand(10, 500), deletions: rand(0, 200) };
    case 'pr_merged':
      return { title, branch, review_count: rand(1, 4), time_to_merge_hours: rand(2, 72) };
    case 'pr_reviewed':
      return { title, branch, approval: Math.random() > 0.2 ? 'approved' : 'changes_requested', comments: rand(0, 8) };
    case 'issue_opened':
      return { title, labels: ['bug', 'enhancement', 'documentation'][Math.floor(Math.random() * 3)] };
    case 'issue_closed':
      return { title, resolution: Math.random() > 0.3 ? 'fixed' : 'wont_fix' };
    default:
      return { title };
  }
}

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
