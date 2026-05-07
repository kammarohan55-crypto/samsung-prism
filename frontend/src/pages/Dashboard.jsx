import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#3b82f6', '#10b981', '#f59e0b'];

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOverview().then(d => setOverview(d.overview)),
      api.getEvents({ limit: 20 }).then(d => setEvents(d.events)),
      api.getOnboardingAnalytics().then(d => setOnboarding(d.onboarding)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-muted text-center mt-lg">Loading dashboard…</div>;

  const metricCards = overview?.latest_metrics?.map(m => ({
    label: m.metric_type.replace(/_/g, ' '),
    value: m.value,
    unit: m.metric_type.includes('time') ? 'days' : m.metric_type.includes('rate') ? '%' : m.metric_type.includes('hours') ? 'hrs' : '',
  })) || [];

  const eventChartData = overview?.event_counts?.map(e => ({ name: e.source, count: e.count })) || [];

  const onboardingChartData = onboarding.map(u => ({
    name: u.display_name?.split(' ')[0] || 'User',
    completed: u.completed_tasks || 0,
    total: u.total_tasks || 0,
    pct: u.total_tasks > 0 ? Math.round((u.completed_tasks / u.total_tasks) * 100) : 0,
  }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Team Dashboard</h1>
        <p className="page-subtitle">Real-time team health, productivity metrics, and onboarding progress</p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Team</div>
          <div className="metric-value">{overview?.total_users || 0}</div>
          <div className="metric-trend trend-up">active members</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">New Hires</div>
          <div className="metric-value">{overview?.new_hires || 0}</div>
          <div className="metric-trend">currently onboarding</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Onboarding Rate</div>
          <div className="metric-value">{overview?.onboarding_rate || 0}<span className="metric-unit">%</span></div>
          <div className="metric-trend trend-up">completion rate</div>
        </div>
        {metricCards.slice(0, 3).map((m, i) => (
          <div className="metric-card" key={i}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}<span className="metric-unit">{m.unit}</span></div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Events by Source (7 Days)</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={eventChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} textTransform="capitalize" />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)'}} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {eventChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Onboarding Progress</div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={onboardingChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={12} unit="%" />
              <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={80} />
              <Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)'}} />
              <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                {onboardingChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Key Metrics Detail ── */}
      <div className="card mt-lg">
        <div className="card-header">
          <div className="card-title">Weekly Metrics</div>
        </div>
        <div className="metrics-grid">
          {metricCards.map((m, i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem',background:'var(--bg-glass)',borderRadius:'var(--radius-md)'}}>
              <span style={{color:'var(--text-secondary)',fontSize:'0.875rem',textTransform:'capitalize'}}>{m.label}</span>
              <span style={{fontWeight:700,fontSize:'1.125rem'}}>{m.value} <span className="text-muted" style={{fontSize:'0.75rem'}}>{m.unit}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Events ── */}
      <div className="card mt-lg">
        <div className="card-header">
          <div className="card-title">Recent Activity</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {events.slice(0, 10).map((e, i) => (
            <div key={i} className="checklist-item">
              <span className={`badge badge-${e.source === 'github' ? 'info' : e.source === 'jira' ? 'warning' : e.source === 'calendar' ? 'success' : 'info'}`}>
                {e.source}
              </span>
              <span style={{flex:1,fontSize:'0.875rem'}}>{e.event_type.replace(/_/g, ' ')} — <strong>{e.actor_name}</strong></span>
              <span className="text-muted" style={{fontSize:'0.75rem'}}>{new Date(e.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
