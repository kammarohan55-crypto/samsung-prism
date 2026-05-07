const API_BASE = 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('itis_token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('itis_token', token);
    else localStorage.removeItem('itis_token');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) { this.setToken(null); window.location.href = '/login'; }
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  // Auth
  login(email, password, tenant_slug) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, tenant_slug }) }); }
  register(data) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }

  // Users
  getUsers() { return this.request('/users'); }
  getUser(id) { return this.request(`/users/${id}`); }

  // Onboarding
  getOnboardingTasks() { return this.request('/onboarding/tasks'); }
  getOnboardingProgress() { return this.request('/onboarding/progress'); }
  updateProgress(taskId, status, notes) { return this.request(`/onboarding/progress/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }); }

  // Analytics
  getOverview() { return this.request('/analytics/overview'); }
  getMetrics(days) { return this.request(`/analytics/metrics?days=${days || 7}`); }
  getTrends(weeks) { return this.request(`/analytics/trends?weeks=${weeks || 4}`); }
  getSummary() { return this.request('/analytics/summary'); }
  getTeamMetrics() { return this.request('/analytics/team'); }
  getTeamHealth() { return this.request('/analytics/team-health'); }
  getEvents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/analytics/events${qs ? '?' + qs : ''}`);
  }
  getOnboardingAnalytics() { return this.request('/analytics/onboarding'); }

  // Chat
  sendMessage(message, thread_id) { return this.request('/chat/message', { method: 'POST', body: JSON.stringify({ message, thread_id }) }); }
  getChatHistory(threadId) { return this.request(`/chat/history/${threadId}`); }

  // Telemetry
  generateTelemetry(days) { return this.request('/telemetry/generate', { method: 'POST', body: JSON.stringify({ days: days || 30 }) }); }
  getTelemetrySources() { return this.request('/telemetry/sources'); }
  getTelemetryStats() { return this.request('/telemetry/stats'); }

  // Signals
  getAlerts() { return this.request('/signals/alerts'); }
  getHealthScores() { return this.request('/signals/health'); }

  // Intelligence
  getSkillsGap(userId) { return this.request(`/intelligence/skills-gap/${userId}`); }
  getRecommendations(userId) { return this.request(`/intelligence/recommendations/${userId}`); }
  getTimeToProductivity() { return this.request('/intelligence/time-to-productivity'); }
}

export const api = new ApiClient();
export default api;
