import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#3b82f6', '#10b981', '#f59e0b'];

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/## (.+)/g, '<h3 style="margin:0.75rem 0 0.4rem;font-size:1.05rem;font-weight:700">$1</h3>')
    .replace(/### (.+)/g, '<h4 style="margin:0.5rem 0 0.25rem;font-size:0.95rem;font-weight:600;color:var(--text-secondary)">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (📈|📉|📊|🔀|🗓️|⚡|⏳|🚧|📋|🤝|⏰)(.*)/g, '<div style="padding:0.3rem 0;display:flex;gap:0.4rem"><span>$1</span><span>$2</span></div>')
    .replace(/---/g, '<hr style="border:none;border-top:1px solid var(--border);margin:0.75rem 0"/>')
    .replace(/_(.+?)_/g, '<em style="color:var(--text-muted);font-size:0.8rem">$1</em>')
    .replace(/\n/g, '');
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [onboarding, setOnboarding] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOverview().then(d => setOverview(d.overview)).catch(() => {}),
      api.getTrends(4).then(d => setTrends(d.trends)).catch(() => {}),
      api.getAlerts().then(d => setAlerts(d.alerts || [])).catch(() => {}),
      api.getSummary().then(d => setSummary(d)).catch(() => {}),
      api.getEvents({ limit: 15 }).then(d => setEvents(d.events)).catch(() => {}),
      api.getOnboardingAnalytics().then(d => setOnboarding(d.onboarding)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-fade-in" style={{display:'flex',flexDirection:'column',gap:'1rem',padding:'2rem'}}>
      {[1,2,3].map(i => <div key={i} className="card skeleton-card" style={{height:'120px'}}/>)}
    </div>
  );

  const healthScore = overview?.health_score || 50;
  const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444';

  const metricCards = overview?.latest_metrics?.filter(m => !['onboarding_completion_rate'].includes(m.metric_type)).slice(0, 6).map(m => ({
    label: m.metric_type.replace(/_/g, ' '),
    value: m.value,
    unit: m.metric_type.includes('time') ? 'days' : m.metric_type.includes('rate') ? '%' : m.metric_type.includes('hours') ? 'hrs' : m.metric_type.includes('count') ? '' : '',
  })) || [];

  const eventChartData = overview?.event_counts?.map(e => ({ name: e.source, count: e.count })) || [];

  const onboardingChartData = onboarding.filter(u => u.total_tasks > 0).map(u => ({
    name: u.display_name?.split(' ')[0] || 'User',
    pct: u.total_tasks > 0 ? Math.round((u.completed_tasks / u.total_tasks) * 100) : 0,
  }));

  const activeAlerts = alerts.slice(0, 5);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Team Dashboard</h1>
        <p className="page-subtitle">Real-time team health, productivity metrics, and intelligence signals</p>
      </div>

      {/* ── Top Row: Health + Key Metrics ── */}
      <div className="metrics-grid">
        <div className="metric-card" style={{background: `linear-gradient(135deg, ${healthColor}22, ${healthColor}08)`, borderColor: `${healthColor}44`}}>
          <div className="metric-label">Team Health</div>
          <div className="metric-value" style={{color: healthColor}}>{healthScore}<span className="metric-unit">/100</span></div>
          <div className="metric-trend" style={{color: healthColor}}>{healthScore >= 70 ? '● Healthy' : healthScore >= 40 ? '● Watch' : '● At Risk'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Team</div>
          <div className="metric-value">{overview?.total_users || 0}</div>
          <div className="metric-trend trend-up">active members</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">New Hires</div>
          <div className="metric-value">{overview?.new_hires || 0}</div>
          <div className="metric-trend">onboarding</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Onboarding</div>
          <div className="metric-value">{overview?.onboarding_rate || 0}<span className="metric-unit">%</span></div>
          <div className="metric-trend trend-up">completion</div>
        </div>
        {metricCards.slice(0, 2).map((m, i) => (
          <div className="metric-card" key={i}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}<span className="metric-unit">{m.unit}</span></div>
          </div>
        ))}
      </div>

      {/* ── Alerts ── */}
      {activeAlerts.length > 0 && (
        <div className="card mt-lg" style={{borderLeft: '3px solid #f59e0b'}}>
          <div className="card-header">
            <div className="card-title">⚠️ Active Signals ({alerts.length})</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {activeAlerts.map((a, i) => (
              <div key={i} className="checklist-item" style={{background: a.severity === 'high' ? 'rgba(239,68,68,0.06)' : 'transparent'}}>
                <span className={`badge ${a.severity === 'high' ? 'badge-warning' : 'badge-info'}`} style={{fontSize:'0.7rem',minWidth:'50px',justifyContent:'center'}}>{a.severity}</span>
                <span style={{flex:1,fontSize:'0.85rem'}}>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trend Charts ── */}
      <div className="grid-2 mt-lg">
        <div className="card">
          <div className="card-header"><div className="card-title">Velocity & PR Throughput (4 Weeks)</div></div>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="gVel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gPR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12}/>
                <YAxis stroke="var(--text-muted)" fontSize={12}/>
                <Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)'}}/>
                <Area type="monotone" dataKey="velocity" stroke="#6366f1" fill="url(#gVel)" strokeWidth={2} name="Velocity (pts)"/>
                <Area type="monotone" dataKey="pr_throughput" stroke="#10b981" fill="url(#gPR)" strokeWidth={2} name="PRs Merged"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="text-muted text-center" style={{padding:'3rem'}}>No trend data — generate telemetry first</div>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Events by Source (7 Days)</div></div>
          {eventChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eventChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12}/>
                <YAxis stroke="var(--text-muted)" fontSize={12}/>
                <Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)'}}/>
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {eventChartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-muted text-center" style={{padding:'3rem'}}>No events yet</div>}
        </div>
      </div>

      {/* ── Weekly Summary + Onboarding ── */}
      <div className="grid-2 mt-lg">
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Weekly Summary</div></div>
          {summary ? (
            <div style={{fontSize:'0.875rem',lineHeight:1.7}} dangerouslySetInnerHTML={{__html: renderMarkdown(summary.summary)}}/>
          ) : <div className="text-muted text-center" style={{padding:'2rem'}}>Generate telemetry data to see summary</div>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Onboarding Progress</div></div>
          {onboardingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={onboardingChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                <XAxis type="number" domain={[0,100]} stroke="var(--text-muted)" fontSize={12} unit="%"/>
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={70}/>
                <Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text-primary)'}}/>
                <Bar dataKey="pct" radius={[0,6,6,0]}>
                  {onboardingChartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-muted text-center" style={{padding:'2rem'}}>No onboarding data</div>}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="card mt-lg">
        <div className="card-header"><div className="card-title">Recent Activity</div></div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {events.slice(0,10).map((e,i) => (
            <div key={i} className="checklist-item">
              <span className={`badge badge-${e.source === 'github' ? 'info' : e.source === 'jira' ? 'warning' : e.source === 'calendar' ? 'success' : 'info'}`} style={{fontSize:'0.7rem',minWidth:'60px',justifyContent:'center'}}>{e.source}</span>
              <span style={{flex:1,fontSize:'0.85rem'}}>{e.event_type.replace(/_/g,' ')} — <strong>{e.actor_name}</strong></span>
              <span className="text-muted" style={{fontSize:'0.75rem'}}>{new Date(e.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
          {events.length === 0 && <div className="text-muted text-center" style={{padding:'2rem'}}>No events — generate telemetry data from Admin panel</div>}
        </div>
      </div>
    </div>
  );
}
