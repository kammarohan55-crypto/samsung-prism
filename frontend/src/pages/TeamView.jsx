import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function TeamView() {
  const [team, setTeam] = useState([]);
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('name');

  useEffect(() => {
    Promise.all([
      api.getTeamMetrics().then(d => setTeam(d.team || [])).catch(() => {}),
      api.getHealthScores().then(d => setHealth(d.health || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-muted text-center mt-lg">Loading team view…</div>;

  const healthMap = {};
  health.forEach(h => { healthMap[h.user_id] = h; });

  const sorted = [...team].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'activity') return (b.weekly.commits + b.weekly.prs) - (a.weekly.commits + a.weekly.prs);
    if (sort === 'meetings') return b.weekly.meeting_hours - a.weekly.meeting_hours;
    if (sort === 'onboarding') return (b.onboarding_pct || 0) - (a.onboarding_pct || 0);
    return 0;
  });

  const activityColor = (level) => level === 'high' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#6b7280';
  const healthDot = (userId) => {
    const h = healthMap[userId];
    if (!h) return null;
    const c = h.status === 'green' ? '#10b981' : h.status === 'yellow' ? '#f59e0b' : '#ef4444';
    return <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:c,marginRight:6}} title={`Health: ${h.health_score}`}/>;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Team Members</h1>
        <p className="page-subtitle">Activity overview, workload, and health indicators for all team members</p>
      </div>

      {/* Summary cards */}
      <div className="metrics-grid" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
        <div className="metric-card">
          <div className="metric-label">Team Size</div>
          <div className="metric-value">{team.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active (High)</div>
          <div className="metric-value" style={{color:'#10b981'}}>{team.filter(t => t.activity_level === 'high').length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">New Hires</div>
          <div className="metric-value">{team.filter(t => t.role === 'new_hire').length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">At Risk</div>
          <div className="metric-value" style={{color:'#ef4444'}}>{health.filter(h => h.status === 'red').length}</div>
        </div>
      </div>

      {/* Sort controls */}
      <div className="card mt-lg">
        <div className="card-header">
          <div className="card-title">Team Directory</div>
          <div style={{display:'flex',gap:'0.4rem'}}>
            {['name','activity','meetings','onboarding'].map(s => (
              <button key={s} className={`btn btn-sm ${sort === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSort(s)} style={{fontSize:'0.7rem',padding:'0.3rem 0.6rem'}}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)',color:'var(--text-muted)',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                <th style={{padding:'0.75rem',textAlign:'left'}}>Member</th>
                <th style={{padding:'0.75rem',textAlign:'left'}}>Role</th>
                <th style={{padding:'0.75rem',textAlign:'center'}}>Commits</th>
                <th style={{padding:'0.75rem',textAlign:'center'}}>PRs</th>
                <th style={{padding:'0.75rem',textAlign:'center'}}>Meetings</th>
                <th style={{padding:'0.75rem',textAlign:'center'}}>Slack</th>
                <th style={{padding:'0.75rem',textAlign:'center'}}>Activity</th>
                <th style={{padding:'0.75rem',textAlign:'center'}}>Onboarding</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => (
                <tr key={m.id} style={{borderBottom:'1px solid var(--border)',transition:'background 0.15s'}}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-glass)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'0.75rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                      {healthDot(m.id)}
                      <div className="user-avatar" style={{width:32,height:32,fontSize:'0.8rem'}}>{m.name[0]}</div>
                      <div>
                        <div style={{fontWeight:600}}>{m.name}</div>
                        <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{m.department}{m.days_since_hire != null ? ` · ${m.days_since_hire}d` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'0.75rem'}}><span className="badge badge-info" style={{fontSize:'0.65rem'}}>{m.role.replace('_',' ')}</span></td>
                  <td style={{padding:'0.75rem',textAlign:'center',fontWeight:600}}>{m.weekly.commits}</td>
                  <td style={{padding:'0.75rem',textAlign:'center',fontWeight:600}}>{m.weekly.prs}</td>
                  <td style={{padding:'0.75rem',textAlign:'center'}}>{m.weekly.meeting_hours}h</td>
                  <td style={{padding:'0.75rem',textAlign:'center'}}>{m.weekly.slack_messages}</td>
                  <td style={{padding:'0.75rem',textAlign:'center'}}>
                    <span style={{color:activityColor(m.activity_level),fontWeight:600,fontSize:'0.8rem'}}>● {m.activity_level}</span>
                  </td>
                  <td style={{padding:'0.75rem',textAlign:'center'}}>
                    {m.onboarding_pct != null ? (
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem',justifyContent:'center'}}>
                        <div className="progress-bar-track" style={{width:60,height:6}}>
                          <div className="progress-bar-fill" style={{width:`${m.onboarding_pct}%`}}/>
                        </div>
                        <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{m.onboarding_pct}%</span>
                      </div>
                    ) : <span className="text-muted" style={{fontSize:'0.75rem'}}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
