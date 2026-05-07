import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.getUsers().then(d => setUsers(d.users || [])).catch(() => {}),
      api.getTelemetrySources().then(d => setSources(d.sources || [])).catch(() => {}),
      api.getTelemetryStats().then(d => setStats(d)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await api.generateTelemetry(30);
      setGenResult(result);
      // Refresh sources
      const s = await api.getTelemetrySources();
      setSources(s.sources || []);
      const st = await api.getTelemetryStats();
      setStats(st);
    } catch (err) {
      setGenResult({ error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="animate-pulse text-muted text-center mt-lg">Loading admin panel…</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">System management, telemetry controls, and user administration</p>
      </div>

      {/* Tab navigation */}
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
        {['overview','users','telemetry'].map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)} style={{textTransform:'capitalize'}}>
            {t === 'overview' ? '📊 ' : t === 'users' ? '👥 ' : '📡 '}{t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="metrics-grid" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
            <div className="metric-card">
              <div className="metric-label">Total Users</div>
              <div className="metric-value">{users.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Events</div>
              <div className="metric-value">{stats?.total_events || 0}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Data Sources</div>
              <div className="metric-value">{sources.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">API Status</div>
              <div className="metric-value" style={{color:'#10b981',fontSize:'1.2rem'}}>● Online</div>
            </div>
          </div>

          {/* Data Sources */}
          <div className="card mt-lg">
            <div className="card-header"><div className="card-title">📡 Connected Sources</div></div>
            {sources.length > 0 ? (
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                {sources.map((s, i) => (
                  <div key={i} className="checklist-item">
                    <span className="badge badge-success" style={{fontSize:'0.7rem',minWidth:'70px',justifyContent:'center'}}>{s.name}</span>
                    <span style={{flex:1,fontSize:'0.85rem'}}>{s.event_count.toLocaleString()} events</span>
                    <span className="text-muted" style={{fontSize:'0.75rem'}}>Last: {new Date(s.last_event).toLocaleDateString()}</span>
                    <span className="badge badge-success" style={{fontSize:'0.65rem'}}>● {s.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-center" style={{padding:'2rem'}}>No data sources — generate telemetry data below</div>
            )}
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="card-header"><div className="card-title">👥 User Management</div></div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--border)',color:'var(--text-muted)',fontSize:'0.75rem',textTransform:'uppercase'}}>
                  <th style={{padding:'0.75rem',textAlign:'left'}}>Name</th>
                  <th style={{padding:'0.75rem',textAlign:'left'}}>Email</th>
                  <th style={{padding:'0.75rem',textAlign:'left'}}>Role</th>
                  <th style={{padding:'0.75rem',textAlign:'left'}}>Department</th>
                  <th style={{padding:'0.75rem',textAlign:'left'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'0.75rem',fontWeight:600}}>{u.display_name}</td>
                    <td style={{padding:'0.75rem',color:'var(--text-secondary)'}}>{u.email}</td>
                    <td style={{padding:'0.75rem'}}><span className="badge badge-info" style={{fontSize:'0.65rem'}}>{u.role.replace('_',' ')}</span></td>
                    <td style={{padding:'0.75rem',color:'var(--text-muted)'}}>{u.department || '—'}</td>
                    <td style={{padding:'0.75rem'}}>
                      <span className={`badge ${u.onboarding_status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{fontSize:'0.65rem'}}>
                        {u.onboarding_status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'telemetry' && (
        <>
          {/* Generate Mock Data */}
          <div className="card" style={{borderLeft:'3px solid #6366f1'}}>
            <div className="card-header"><div className="card-title">🔄 Generate Mock Telemetry</div></div>
            <p style={{fontSize:'0.875rem',color:'var(--text-secondary)',marginBottom:'1rem'}}>
              Generate 30 days of realistic telemetry data from GitHub, Jira, Calendar, and Slack.
              This will populate the dashboard with rich analytics data.
            </p>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? '⏳ Generating…' : '🚀 Generate 30 Days of Data'}
            </button>
            {genResult && (
              <div className={`mt-md`} style={{padding:'0.75rem',borderRadius:'var(--radius-md)',background: genResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',fontSize:'0.85rem'}}>
                {genResult.error
                  ? `❌ ${genResult.error}`
                  : `✅ Generated ${genResult.total?.toLocaleString()} events: ${Object.entries(genResult.bySource || {}).map(([k,v]) => `${k}: ${v}`).join(', ')}`}
              </div>
            )}
          </div>

          {/* Daily event distribution */}
          {stats?.daily_counts?.length > 0 && (
            <div className="card mt-lg">
              <div className="card-header"><div className="card-title">📊 Daily Event Distribution (30 Days)</div></div>
              <div style={{display:'flex',gap:'2px',alignItems:'end',height:100,padding:'0.5rem'}}>
                {stats.daily_counts.map((d, i) => {
                  const maxCount = Math.max(...stats.daily_counts.map(x => x.count));
                  const pct = (d.count / maxCount) * 100;
                  return (
                    <div key={i} style={{flex:1,background:'linear-gradient(to top, #6366f1, #8b5cf6)',borderRadius:'2px 2px 0 0',height:`${pct}%`,minHeight:2,transition:'height 0.3s'}}
                      title={`${d.day}: ${d.count} events`}/>
                  );
                })}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.65rem',color:'var(--text-muted)',padding:'0.25rem 0.5rem'}}>
                <span>{stats.daily_counts[0]?.day}</span>
                <span>{stats.daily_counts[stats.daily_counts.length - 1]?.day}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
