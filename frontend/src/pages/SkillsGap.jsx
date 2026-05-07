import { useState, useEffect } from 'react';
import api from '../api/client.js';

const CATEGORY_COLORS = {
  technical: '#6366f1',
  process: '#8b5cf6',
  soft: '#10b981',
  compliance: '#f59e0b',
};

const STATUS_CONFIG = {
  proficient: { color: '#10b981', label: 'Proficient', icon: '✅' },
  developing: { color: '#f59e0b', label: 'Developing', icon: '🔄' },
  gap: { color: '#ef4444', label: 'Gap', icon: '⚠️' },
};

export default function SkillsGap() {
  const [gap, setGap] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('radar');

  useEffect(() => {
    Promise.all([
      api.getSkillsGap('me').then(setGap).catch(() => {}),
      api.getRecommendations('me').then(setRecs).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="animate-fade-in" style={{display:'flex',flexDirection:'column',gap:'1rem',padding:'2rem'}}>
      {[1,2,3].map(i => <div key={i} className="card skeleton-card" style={{height:'120px'}}/>)}
    </div>
  );

  if (!gap) return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Skills & Growth</h1>
        <p className="page-subtitle">Complete onboarding tasks and generate telemetry data to see your skills analysis</p>
      </div>
      <div className="card text-center" style={{padding:'3rem'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>📊</div>
        <h3>No data yet</h3>
        <p className="text-muted">Complete your onboarding tasks and interact with the system to build your skills profile.</p>
      </div>
    </div>
  );

  const maxScore = 100;
  const skills = gap.skills || [];

  // Radar chart SVG
  const renderRadar = () => {
    const cx = 150, cy = 150, r = 120;
    const n = skills.length;
    if (n === 0) return null;

    const angleStep = (2 * Math.PI) / n;
    const gridLevels = [25, 50, 75, 100];

    const pointsData = skills.map((s, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const dist = (s.score / maxScore) * r;
      return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle), skill: s };
    });

    const pathStr = pointsData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
      <svg viewBox="0 0 300 300" style={{width:'100%',maxWidth:400,margin:'0 auto',display:'block'}}>
        {/* Grid */}
        {gridLevels.map(level => {
          const gr = (level / maxScore) * r;
          const pts = Array.from({length: n}, (_, i) => {
            const a = i * angleStep - Math.PI / 2;
            return `${cx + gr * Math.cos(a)},${cy + gr * Math.sin(a)}`;
          }).join(' ');
          return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}/>;
        })}
        {/* Axes */}
        {skills.map((s, i) => {
          const a = i * angleStep - Math.PI / 2;
          const lx = cx + (r + 15) * Math.cos(a);
          const ly = cy + (r + 15) * Math.sin(a);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}/>
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize={7} fontFamily="Inter">{s.name.split(' ')[0]}</text>
            </g>
          );
        })}
        {/* Data polygon */}
        <polygon points={pointsData.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth={2}/>
        {/* Data points */}
        {pointsData.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={STATUS_CONFIG[p.skill.status]?.color || '#6366f1'} stroke="#fff" strokeWidth={1}/>
        ))}
      </svg>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Skills & Growth</h1>
        <p className="page-subtitle">Your skills profile based on onboarding progress and activity data — {gap.role_title}</p>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
        <div className="metric-card" style={{
          background: `linear-gradient(135deg, ${gap.overall_status === 'on_track' ? '#10b98122' : gap.overall_status === 'developing' ? '#f59e0b22' : '#ef444422'}, transparent)`,
          borderColor: gap.overall_status === 'on_track' ? '#10b98144' : gap.overall_status === 'developing' ? '#f59e0b44' : '#ef444444'
        }}>
          <div className="metric-label">Overall Score</div>
          <div className="metric-value" style={{color: gap.overall_status === 'on_track' ? '#10b981' : gap.overall_status === 'developing' ? '#f59e0b' : '#ef4444'}}>
            {gap.overall_score}<span className="metric-unit">/100</span>
          </div>
          <div className="metric-trend" style={{color: gap.overall_status === 'on_track' ? '#10b981' : '#f59e0b', textTransform:'capitalize'}}>{gap.overall_status?.replace('_', ' ')}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Proficient</div>
          <div className="metric-value" style={{color:'#10b981'}}>{gap.proficient_count}</div>
          <div className="metric-trend">of {skills.length} skills</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Gaps Identified</div>
          <div className="metric-value" style={{color: gap.gap_count > 0 ? '#ef4444' : '#10b981'}}>{gap.gap_count}</div>
          <div className="metric-trend">skills to develop</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Onboarding</div>
          <div className="metric-value">{gap.onboarding_pct}<span className="metric-unit">%</span></div>
          <div className="metric-trend">{gap.days_since_hire != null ? `Day ${gap.days_since_hire}` : ''}</div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
        {[{key:'radar',label:'📊 Radar Chart'},{key:'breakdown',label:'📋 Breakdown'},{key:'recs',label:'💡 Recommendations'}].map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Radar Chart */}
      {tab === 'radar' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Skills Radar</div></div>
          {renderRadar()}
          <div style={{display:'flex',justifyContent:'center',gap:'1.5rem',marginTop:'1rem',flexWrap:'wrap'}}>
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
              <div key={cat} style={{display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.75rem'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
                <span className="text-muted" style={{textTransform:'capitalize'}}>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Breakdown */}
      {tab === 'breakdown' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Skill Breakdown</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {skills.map((s, i) => {
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.gap;
              return (
                <div key={i} style={{padding:'0.75rem',borderRadius:'var(--radius-md)',background:'var(--bg-glass)',border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                      <span>{cfg.icon}</span>
                      <span style={{fontWeight:600,fontSize:'0.9rem'}}>{s.name}</span>
                      <span className="badge" style={{background:`${CATEGORY_COLORS[s.category]}20`,color:CATEGORY_COLORS[s.category],fontSize:'0.6rem'}}>{s.category}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                      <span style={{fontSize:'0.8rem',fontWeight:700,color:cfg.color}}>{s.score}%</span>
                      <span className="badge" style={{background:`${cfg.color}15`,color:cfg.color,fontSize:'0.6rem'}}>{cfg.label}</span>
                    </div>
                  </div>
                  <div className="progress-bar-track" style={{height:6}}>
                    <div className="progress-bar-fill" style={{width:`${s.score}%`,background:cfg.color,transition:'width 0.6s ease'}}/>
                  </div>
                  {s.sources.length > 0 && (
                    <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:'0.4rem'}}>
                      Evidence: {s.sources.join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {tab === 'recs' && recs && (
        <>
          {/* Next action */}
          <div className="card" style={{borderLeft:'3px solid #6366f1',marginBottom:'1rem'}}>
            <div style={{fontSize:'0.9rem',fontWeight:600}}>💡 Next Step</div>
            <div style={{fontSize:'0.85rem',color:'var(--text-secondary)',marginTop:'0.3rem'}}>{recs.next_action}</div>
          </div>

          {/* Recommendations list */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {recs.recommendations.map((rec, i) => (
              <div key={i} className="card" style={{padding:'1rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                  <span style={{fontWeight:600,fontSize:'0.9rem'}}>{rec.skill_name}</span>
                  <span className={`badge ${rec.priority === 'high' ? 'badge-danger' : rec.priority === 'medium' ? 'badge-warning' : 'badge-info'}`}
                    style={{fontSize:'0.6rem'}}>{rec.priority} priority</span>
                </div>
                <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:'0.5rem'}}>{rec.reason}</div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                  {rec.resources.map((r, j) => (
                    <div key={j} style={{display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.8rem',padding:'0.3rem 0.5rem',background:'var(--bg-glass)',borderRadius:'var(--radius-sm)'}}>
                      <span>{r.type === 'doc' ? '📄' : r.type === 'video' ? '🎥' : r.type === 'course' ? '🎓' : r.type === 'tutorial' ? '💻' : r.type === 'workshop' ? '🛠️' : '📝'}</span>
                      <span style={{flex:1}}>{r.title}</span>
                      <span className="text-muted" style={{fontSize:'0.7rem'}}>{r.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pending tasks */}
          {recs.pending_tasks?.length > 0 && (
            <div className="card mt-lg">
              <div className="card-header"><div className="card-title">📋 Pending Onboarding Tasks</div></div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                {recs.pending_tasks.map((t, i) => (
                  <div key={i} className="checklist-item">
                    <div className="checklist-check"/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:'0.85rem'}}>{t.title}</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{t.description}</div>
                    </div>
                    <span className="badge badge-info" style={{fontSize:'0.6rem'}}>{t.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
