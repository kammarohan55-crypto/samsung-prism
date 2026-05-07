import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import api from './api/client.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Chat from './pages/Chat.jsx';
import Onboarding from './pages/Onboarding.jsx';
import TeamView from './pages/TeamView.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import './index.css';

// ── Auth Context ──
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('itis_user');
    if (stored && api.token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password, tenant_slug) => {
    const data = await api.login(email, password, tenant_slug);
    api.setToken(data.token);
    localStorage.setItem('itis_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    api.setToken(null);
    localStorage.removeItem('itis_user');
    setUser(null);
  };

  if (loading) return null;
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

// ── Protected Route ──
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/chat" />;
  return children;
}

// ── Sidebar ──
function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isManager = ['admin', 'hr', 'manager', 'team_lead'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <span className="sidebar-logo-text">ITIS</span>
        </div>
        <div style={{fontSize:'0.6rem',color:'var(--text-muted)',marginTop:'0.25rem',paddingLeft:'0.5rem',letterSpacing:'0.05em'}}>TEAM INTELLIGENCE</div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/chat" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">💬</span> Assistant
        </NavLink>
        <NavLink to="/onboarding" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-link-icon">📋</span> Onboarding
        </NavLink>
        {isManager && (
          <>
            <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-link-icon">📊</span> Dashboard
            </NavLink>
            <NavLink to="/team" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-link-icon">👥</span> Team
            </NavLink>
          </>
        )}
        {isAdmin && (
          <NavLink to="/admin" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="nav-link-icon">⚙️</span> Admin
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.display_name?.[0] || '?'}</div>
          <div className="user-details">
            <div className="user-name">{user?.display_name}</div>
            <div className="user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm mt-md" onClick={handleLogout} style={{width:'100%',justifyContent:'center'}}>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ── App Layout ──
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<ProtectedRoute><AppLayout><Chat /></AppLayout></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><AppLayout><Onboarding /></AppLayout></ProtectedRoute>} />
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['admin','hr','manager','team_lead']}>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute roles={['admin','hr','manager','team_lead']}>
              <AppLayout><TeamView /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AppLayout><AdminPanel /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/chat" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
