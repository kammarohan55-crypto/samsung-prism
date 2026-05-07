import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

export default function Login() {
  const [email, setEmail] = useState('manager@acme.com');
  const [password, setPassword] = useState('demo123');
  const [tenant, setTenant] = useState('acme');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password, tenant);
      const isManager = ['admin', 'hr', 'manager', 'team_lead'].includes(user.role);
      navigate(isManager ? '/dashboard' : '/chat');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container animate-fade-in">
        <div className="login-card">
          <div style={{textAlign:'center', marginBottom:'1.5rem'}}>
            <div className="sidebar-logo-icon" style={{width:56,height:56,fontSize:'1.6rem',margin:'0 auto 1rem',borderRadius:'1rem'}}>⚡</div>
            <h1 className="login-title" style={{marginBottom:'0.25rem'}}>ITIS</h1>
            <p className="text-muted" style={{fontSize:'0.875rem'}}>Integrated Team Intelligence System</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tenant</label>
              <input className="form-input" value={tenant} onChange={e => setTenant(e.target.value)} placeholder="e.g. acme" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'0.75rem'}} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{marginTop:'1.5rem',padding:'1rem',background:'var(--bg-glass)',borderRadius:'var(--radius-md)',fontSize:'0.75rem',color:'var(--text-muted)'}}>
            <strong style={{color:'var(--text-secondary)'}}>Demo Accounts:</strong><br/>
            Manager: manager@acme.com<br/>
            New Hire: newhire@acme.com<br/>
            Admin: admin@acme.com<br/>
            Password: demo123
          </div>
        </div>
      </div>
    </div>
  );
}
