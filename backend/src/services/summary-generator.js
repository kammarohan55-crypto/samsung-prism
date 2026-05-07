/**
 * Summary Generator — Weekly team summaries with trend detection.
 */

import { computeMetrics } from './analytics-engine.js';

export function generateWeeklySummary(tenantId) {
  const current = computeMetrics(tenantId, 'weekly', 7);
  const previous = computeMetrics(tenantId, 'weekly', 14);
  const highlights = [];
  const concerns = [];
  const recommendations = [];

  // Velocity
  if (current.velocity > 0) {
    const change = previous.velocity > 0 ? Math.round(((current.velocity - previous.velocity) / previous.velocity) * 100) : 0;
    if (change > 10) highlights.push(`📈 Velocity up ${change}% to ${current.velocity} pts`);
    else if (change < -10) { concerns.push(`📉 Velocity down ${Math.abs(change)}% to ${current.velocity} pts`); recommendations.push('Review sprint scope'); }
    else highlights.push(`📊 Steady velocity: ${current.velocity} pts`);
  }

  if (current.pr_throughput > 0) highlights.push(`🔀 ${current.pr_throughput} PRs merged`);
  if (current.pr_review_time > 24) { concerns.push(`⏰ PR review time: ${current.pr_review_time}h`); recommendations.push('Set up review rotation'); }

  if (current.meeting_load_hours > 20) { concerns.push(`🗓️ High meetings: ${current.meeting_load_hours}h/person`); recommendations.push('Cancel low-value recurring meetings'); }
  else highlights.push(`🗓️ Healthy meetings: ${current.meeting_load_hours}h/person`);

  if (current.cycle_time > 7) { concerns.push(`⏳ Cycle time: ${current.cycle_time}d`); recommendations.push('Break tickets into smaller deliverables'); }
  else if (current.cycle_time < 4) highlights.push(`⚡ Fast cycle: ${current.cycle_time}d`);

  if (current.blocker_count > 0) { concerns.push(`🚧 ${current.blocker_count} blocked items`); recommendations.push('Schedule blocker triage'); }
  if (current.onboarding_completion_rate > 0 && current.onboarding_completion_rate < 100) highlights.push(`📋 Onboarding: ${current.onboarding_completion_rate}%`);
  if (current.collaboration_score > 3) highlights.push(`🤝 Collaboration: ${current.collaboration_score} reviews/person`);

  const parts = ['## 📊 Weekly Team Summary\n'];
  if (highlights.length) { parts.push('### ✅ Highlights'); highlights.forEach(h => parts.push(`- ${h}`)); parts.push(''); }
  if (concerns.length) { parts.push('### ⚠️ Watch'); concerns.forEach(c => parts.push(`- ${c}`)); parts.push(''); }
  if (recommendations.length) { parts.push('### 💡 Actions'); recommendations.forEach(r => parts.push(`- ${r}`)); parts.push(''); }
  parts.push(`---\n_${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}_`);

  return { summary: parts.join('\n'), highlights, concerns, recommendations, metrics: current };
}
