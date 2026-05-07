import { useState, useEffect } from 'react';
import api from '../api/client.js';

export default function Onboarding() {
  const [progress, setProgress] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, score: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    try {
      const data = await api.getOnboardingProgress();
      setProgress(data.progress);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgress(); }, []);

  const handleToggle = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateProgress(taskId, newStatus);
      fetchProgress();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  if (loading) return <div className="animate-pulse text-muted text-center mt-lg">Loading onboarding…</div>;

  const statusIcon = (status) => {
    if (status === 'completed') return '✅';
    if (status === 'in_progress') return '🔄';
    return '⬜';
  };

  const categories = [...new Set(progress.map(p => p.category))];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Onboarding</h1>
        <p className="page-subtitle">Track your onboarding journey — complete tasks to get started</p>
      </div>

      {/* Progress Overview */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-label">Completion Score</div>
          <div className="metric-value">{summary.score}<span className="metric-unit">%</span></div>
          <div style={{ marginTop: '0.75rem' }}>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${summary.score}%` }} />
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Tasks Completed</div>
          <div className="metric-value">{summary.completed}<span className="metric-unit">/ {summary.total}</span></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Remaining</div>
          <div className="metric-value">{summary.total - summary.completed}</div>
          <div className="metric-trend">tasks to go</div>
        </div>
      </div>

      {/* Task List by Category */}
      {categories.map(cat => (
        <div className="card mt-lg" key={cat}>
          <div className="card-header">
            <div className="card-title" style={{ textTransform: 'capitalize' }}>{cat}</div>
            <span className="badge badge-info">
              {progress.filter(p => p.category === cat && p.status === 'completed').length}/{progress.filter(p => p.category === cat).length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {progress.filter(p => p.category === cat).map(task => (
              <div key={task.task_id} className="checklist-item" onClick={() => handleToggle(task.task_id, task.status)} style={{ cursor: 'pointer' }}>
                <div className={`checklist-check ${task.status === 'completed' ? 'done' : task.status === 'in_progress' ? 'in-progress' : ''}`}>
                  {task.status === 'completed' && '✓'}
                  {task.status === 'in_progress' && '•'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)'
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {task.description}
                    </div>
                  )}
                </div>
                <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {progress.length === 0 && (
        <div className="card mt-lg text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2>No onboarding tasks found</h2>
          <p className="text-muted mt-md">Tasks may not be assigned for your role yet, or onboarding is complete!</p>
        </div>
      )}
    </div>
  );
}
