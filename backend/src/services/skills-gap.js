/**
 * Skills Gap & Onboarding Intelligence
 * Compares role requirements vs actual activity to generate recommendations.
 */

import { getAll, getOne } from '../db/db.js';

// ── Role-Based Skill Requirements ──
const ROLE_SKILLS = {
  engineer: {
    title: 'Software Engineer',
    skills: [
      { id: 'git', name: 'Version Control (Git)', category: 'technical', weight: 1.0 },
      { id: 'code_review', name: 'Code Review Process', category: 'technical', weight: 0.9 },
      { id: 'testing', name: 'Testing & QA', category: 'technical', weight: 0.8 },
      { id: 'ci_cd', name: 'CI/CD Pipeline', category: 'technical', weight: 0.7 },
      { id: 'security', name: 'Security Awareness', category: 'compliance', weight: 0.8 },
      { id: 'architecture', name: 'System Architecture', category: 'technical', weight: 0.6 },
      { id: 'communication', name: 'Team Communication', category: 'soft', weight: 0.7 },
      { id: 'agile', name: 'Agile Methodology', category: 'process', weight: 0.6 },
    ],
  },
  manager: {
    title: 'Engineering Manager',
    skills: [
      { id: 'team_lead', name: 'Team Leadership', category: 'soft', weight: 1.0 },
      { id: 'project_mgmt', name: 'Project Management', category: 'process', weight: 0.9 },
      { id: 'communication', name: 'Stakeholder Communication', category: 'soft', weight: 0.9 },
      { id: 'metrics', name: 'Performance Metrics', category: 'process', weight: 0.8 },
      { id: 'hiring', name: 'Hiring & Onboarding', category: 'process', weight: 0.7 },
      { id: 'technical', name: 'Technical Depth', category: 'technical', weight: 0.6 },
      { id: 'agile', name: 'Agile/Scrum Mastery', category: 'process', weight: 0.7 },
      { id: 'conflict', name: 'Conflict Resolution', category: 'soft', weight: 0.6 },
    ],
  },
  hr: {
    title: 'HR / People Ops',
    skills: [
      { id: 'onboarding', name: 'Onboarding Process', category: 'process', weight: 1.0 },
      { id: 'compliance', name: 'Compliance & Policy', category: 'compliance', weight: 0.9 },
      { id: 'communication', name: 'Employee Communication', category: 'soft', weight: 0.9 },
      { id: 'benefits', name: 'Benefits Administration', category: 'process', weight: 0.8 },
      { id: 'culture', name: 'Culture Building', category: 'soft', weight: 0.7 },
      { id: 'data', name: 'People Analytics', category: 'technical', weight: 0.6 },
    ],
  },
};

// ── Onboarding Tasks → Skill Mapping ──
const TASK_SKILL_MAP = {
  'Complete IT Setup': ['git', 'ci_cd'],
  'Read Employee Handbook': ['compliance', 'security', 'culture'],
  'Meet Your Manager': ['communication', 'team_lead'],
  'Set Up Dev Environment': ['git', 'ci_cd', 'testing'],
  'Complete Security Training': ['security', 'compliance'],
  'Review Benefits Package': ['benefits', 'compliance'],
  'Join Team Channels': ['communication', 'culture'],
  'First Code Review': ['code_review', 'git', 'testing'],
};

// ── Recommended Resources ──
const RESOURCES = {
  git: [
    { title: 'Git Branching Strategy Guide', type: 'doc', duration: '15 min', priority: 'high' },
    { title: 'Interactive Git Tutorial', type: 'tutorial', duration: '1 hr', priority: 'medium' },
  ],
  code_review: [
    { title: 'Code Review Best Practices', type: 'doc', duration: '20 min', priority: 'high' },
    { title: 'How to Give Constructive Feedback', type: 'video', duration: '10 min', priority: 'medium' },
  ],
  testing: [
    { title: 'Testing Pyramid Guide', type: 'doc', duration: '25 min', priority: 'high' },
    { title: 'Unit Testing Workshop', type: 'workshop', duration: '2 hrs', priority: 'medium' },
  ],
  ci_cd: [
    { title: 'CI/CD Pipeline Overview', type: 'doc', duration: '15 min', priority: 'high' },
    { title: 'Deployment Process Walkthrough', type: 'video', duration: '20 min', priority: 'medium' },
  ],
  security: [
    { title: 'Security Awareness Training', type: 'course', duration: '1 hr', priority: 'high' },
    { title: 'OWASP Top 10 Overview', type: 'doc', duration: '30 min', priority: 'medium' },
  ],
  architecture: [
    { title: 'System Architecture Overview', type: 'doc', duration: '30 min', priority: 'medium' },
  ],
  communication: [
    { title: 'Effective Communication in Remote Teams', type: 'doc', duration: '15 min', priority: 'medium' },
  ],
  agile: [
    { title: 'Agile/Scrum Quick Guide', type: 'doc', duration: '20 min', priority: 'medium' },
  ],
  team_lead: [
    { title: 'Leadership Fundamentals', type: 'course', duration: '2 hrs', priority: 'high' },
  ],
  project_mgmt: [
    { title: 'Project Planning Toolkit', type: 'doc', duration: '25 min', priority: 'high' },
  ],
  metrics: [
    { title: 'Engineering Metrics That Matter', type: 'doc', duration: '20 min', priority: 'medium' },
  ],
  compliance: [
    { title: 'Compliance Handbook', type: 'doc', duration: '30 min', priority: 'high' },
  ],
  onboarding: [
    { title: 'Onboarding Process Guide', type: 'doc', duration: '20 min', priority: 'high' },
  ],
  benefits: [
    { title: 'Benefits Overview Deck', type: 'doc', duration: '15 min', priority: 'medium' },
  ],
  culture: [
    { title: 'Company Culture & Values', type: 'doc', duration: '10 min', priority: 'low' },
  ],
};

/**
 * Analyze skills gap for a specific user.
 */
export function analyzeSkillsGap(userId, tenantId) {
  const user = getOne(
    'SELECT id, display_name, role, department, hire_date, onboarding_status FROM users WHERE id = ? AND tenant_id = ?',
    userId, tenantId
  );
  if (!user) return null;

  // Map role to skill requirements
  const roleKey = mapRoleToSkillSet(user.role);
  const roleSkills = ROLE_SKILLS[roleKey] || ROLE_SKILLS.engineer;

  // Get completed onboarding tasks
  const completedTasks = getAll(
    `SELECT ot.title FROM onboarding_progress op
     JOIN onboarding_tasks ot ON op.task_id = ot.id
     WHERE op.user_id = ? AND op.tenant_id = ? AND op.status = 'completed'`,
    userId, tenantId
  );
  const completedTitles = completedTasks.map(t => t.title);

  // Get activity signals
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const githubActivity = getOne(
    `SELECT COUNT(*) as count FROM events WHERE tenant_id = ? AND actor_id = ? AND source = 'github' AND timestamp >= ?`,
    tenantId, userId, weekAgo
  )?.count || 0;

  const reviewActivity = getOne(
    `SELECT COUNT(*) as count FROM events WHERE tenant_id = ? AND actor_id = ? AND source = 'github' AND event_type = 'pr_reviewed' AND timestamp >= ?`,
    tenantId, userId, weekAgo
  )?.count || 0;

  const slackActivity = getOne(
    `SELECT COUNT(*) as count FROM events WHERE tenant_id = ? AND actor_id = ? AND source = 'slack' AND timestamp >= ?`,
    tenantId, userId, weekAgo
  )?.count || 0;

  // Compute skill scores
  const skills = roleSkills.skills.map(skill => {
    let score = 0;
    let maxScore = 100;
    let sources = [];

    // Score from completed onboarding tasks
    for (const [taskTitle, mappedSkills] of Object.entries(TASK_SKILL_MAP)) {
      if (mappedSkills.includes(skill.id) && completedTitles.includes(taskTitle)) {
        score += 30;
        sources.push(`Completed: ${taskTitle}`);
      }
    }

    // Score from activity signals
    if (skill.id === 'git' && githubActivity > 0) {
      score += Math.min(40, githubActivity * 5);
      sources.push(`${githubActivity} GitHub events this week`);
    }
    if (skill.id === 'code_review' && reviewActivity > 0) {
      score += Math.min(40, reviewActivity * 10);
      sources.push(`${reviewActivity} code reviews this week`);
    }
    if (skill.id === 'communication' && slackActivity > 0) {
      score += Math.min(30, slackActivity * 3);
      sources.push(`${slackActivity} Slack interactions this week`);
    }

    // Cap at 100
    score = Math.min(score, maxScore);

    // Determine confidence
    const confidence = sources.length >= 2 ? 'high' : sources.length === 1 ? 'medium' : 'low';

    return {
      ...skill,
      score,
      confidence,
      sources,
      gap: maxScore - score,
      status: score >= 70 ? 'proficient' : score >= 40 ? 'developing' : 'gap',
    };
  });

  // Overall score
  const totalWeight = skills.reduce((s, sk) => s + sk.weight, 0);
  const weightedScore = skills.reduce((s, sk) => s + (sk.score * sk.weight), 0);
  const overallScore = Math.round(weightedScore / totalWeight);

  // Time-to-productivity proxy
  const daysSinceHire = user.hire_date ? Math.floor((Date.now() - new Date(user.hire_date)) / 86400000) : null;
  const onboardingProgress = getOne(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done
     FROM onboarding_progress WHERE user_id = ? AND tenant_id = ?`,
    userId, tenantId
  );
  const onboardingPct = onboardingProgress?.total > 0 ? Math.round((onboardingProgress.done / onboardingProgress.total) * 100) : 0;
  const estimatedTTP = onboardingPct >= 80 ? Math.max(7, daysSinceHire || 30) : Math.round((daysSinceHire || 30) * (100 / Math.max(onboardingPct, 1)));

  return {
    user: { id: user.id, name: user.display_name, role: user.role, department: user.department },
    role_title: roleSkills.title,
    overall_score: overallScore,
    overall_status: overallScore >= 70 ? 'on_track' : overallScore >= 40 ? 'developing' : 'needs_attention',
    skills,
    onboarding_pct: onboardingPct,
    days_since_hire: daysSinceHire,
    estimated_ttp_days: estimatedTTP,
    gap_count: skills.filter(s => s.status === 'gap').length,
    proficient_count: skills.filter(s => s.status === 'proficient').length,
  };
}

/**
 * Generate personalized recommendations for a user.
 */
export function getRecommendations(userId, tenantId) {
  const gap = analyzeSkillsGap(userId, tenantId);
  if (!gap) return null;

  const recommendations = [];

  // Sort skills by gap (largest first), then by weight
  const gapSkills = gap.skills
    .filter(s => s.status !== 'proficient')
    .sort((a, b) => (b.gap * b.weight) - (a.gap * a.weight));

  for (const skill of gapSkills) {
    const resources = RESOURCES[skill.id] || [];
    if (resources.length > 0) {
      recommendations.push({
        skill_id: skill.id,
        skill_name: skill.name,
        category: skill.category,
        current_score: skill.score,
        gap: skill.gap,
        priority: skill.gap >= 70 ? 'high' : skill.gap >= 40 ? 'medium' : 'low',
        resources,
        reason: skill.sources.length > 0
          ? `Based on: ${skill.sources.join(', ')}`
          : `No activity detected for ${skill.name}`,
      });
    }
  }

  // Pending onboarding tasks
  const pendingTasks = getAll(
    `SELECT ot.title, ot.description, ot.category FROM onboarding_progress op
     JOIN onboarding_tasks ot ON op.task_id = ot.id
     WHERE op.user_id = ? AND op.tenant_id = ? AND op.status != 'completed'
     ORDER BY ot.order_index`,
    userId, tenantId
  );

  return {
    user: gap.user,
    overall_score: gap.overall_score,
    recommendations: recommendations.slice(0, 8),
    pending_tasks: pendingTasks,
    next_action: pendingTasks.length > 0
      ? `Complete "${pendingTasks[0].title}" to improve your ${getSkillsForTask(pendingTasks[0].title).join(', ')} skills`
      : recommendations.length > 0
        ? `Start with "${recommendations[0].resources[0].title}" to build ${recommendations[0].skill_name}`
        : 'Great progress! Keep up the momentum.',
  };
}

/**
 * Compute time-to-productivity metrics for the whole team.
 */
export function getTeamProductivity(tenantId) {
  const users = getAll(
    "SELECT id, display_name, role, hire_date FROM users WHERE tenant_id = ? AND is_active = 1 AND role = 'new_hire'",
    tenantId
  );

  const results = users.map(u => {
    const gap = analyzeSkillsGap(u.id, tenantId);
    return {
      user_id: u.id,
      name: u.display_name,
      role: u.role,
      hire_date: u.hire_date,
      days_since_hire: gap?.days_since_hire,
      overall_score: gap?.overall_score || 0,
      onboarding_pct: gap?.onboarding_pct || 0,
      estimated_ttp_days: gap?.estimated_ttp_days,
      status: gap?.overall_status || 'unknown',
    };
  });

  const avgTTP = results.length > 0
    ? Math.round(results.reduce((s, r) => s + (r.estimated_ttp_days || 0), 0) / results.length)
    : 0;

  return { new_hires: results, avg_time_to_productivity: avgTTP, count: results.length };
}

function mapRoleToSkillSet(role) {
  if (['employee', 'new_hire', 'team_lead'].includes(role)) return 'engineer';
  if (['manager'].includes(role)) return 'manager';
  if (['hr'].includes(role)) return 'hr';
  return 'engineer';
}

function getSkillsForTask(taskTitle) {
  return (TASK_SKILL_MAP[taskTitle] || []).map(id => {
    for (const role of Object.values(ROLE_SKILLS)) {
      const skill = role.skills.find(s => s.id === id);
      if (skill) return skill.name;
    }
    return id;
  });
}
