import React, { useState } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import {
  ProductTable,
  PlanTable,
  StudentProjectsTable,
  StudentMeetingsTable,
  AdminCallsTable,
  ContentTable,
  ProductWiseSheet,
  IssuesTable,
  AdoptionTable,
  ProductDetailView
} from './components/Tables';
import { ConfigSection } from './components/ConfigSection';
import {
  Flame,
  Calendar,
  FolderGit,
  Video,
  PhoneCall,
  BookOpen,
  PieChart,
  AlertTriangle,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Settings,
  Eye,
  EyeOff,
  Lock,
  User,
  LogOut
} from 'lucide-react';

const LoginView: React.FC = () => {
  const { speakers, loginUser } = useDashboard();
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select your name');
      return;
    }
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await loginUser(selectedUser, password);
      if (!res.success) {
        setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--background-alt) 0%, var(--background) 100%)',
      fontFamily: 'Outfit, sans-serif',
      color: 'var(--text-primary)',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: '24px',
        padding: '2.75rem 2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: 'var(--shadow)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {/* Header */}
        <div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Lock size={28} color="#fff" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>OPERATIONS CONTROL</h2>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure Identity Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
          {/* User Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select POC Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <User size={16} />
              </span>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 38px',
                  background: '#fff',
                  border: '1.5px solid var(--border-light)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              >
                <option value="" style={{ background: '#fff', color: 'var(--text-muted)' }}>-- Select Name --</option>
                {speakers.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#fff', color: 'var(--text-primary)' }}>{s.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '0.65rem' }}>▼</span>
            </div>
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portal Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 38px',
                  background: '#fff',
                  border: '1.5px solid var(--border-light)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.75rem',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-glow)',
              transition: 'opacity 0.2s',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={e => { if (!isLoggingIn) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { if (!isLoggingIn) e.currentTarget.style.opacity = '1'; }}
          >
            {isLoggingIn ? 'Verifying Credentials...' : 'Access Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

const DashboardContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    previewProductId,
    setPreviewProductId,
    productItems,
    updateProductItem,
    syncStatus,
    currentUser,
    logoutUser
  } = useDashboard();
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  if (!currentUser) {
    return <LoginView />;
  }

  // Helper styles matching user initials
  const getAssigneeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Akash': '#7c3aed',
      'Anushka': '#db2777',
      'Nikhil': '#0284c7',
      'Nikhil Jain': '#059669',
    };
    return colors[name] || '#6b7280';
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Sidebar navigation mappings
  const navItems = [
    { id: 'product', label: 'Priority Requests', icon: <Flame size={18} /> },
    { id: 'plan', label: 'Sprint Planning', icon: <Calendar size={18} /> },
    { id: 'projects', label: 'Student Projects', icon: <FolderGit size={18} /> },
    { id: 'meetings', label: 'AMA & Meetings', icon: <Video size={18} /> },
    { id: 'admin', label: 'Admin Calls', icon: <PhoneCall size={18} /> },
    { id: 'content', label: 'Content Pipeline', icon: <BookOpen size={18} /> },
    { id: 'product-wise', label: 'Product Breakdown', icon: <PieChart size={18} /> },
    { id: 'issues', label: 'Daily Issues Log', icon: <AlertTriangle size={18} /> },
    { id: 'adoption', label: 'Adoption Tracker', icon: <LineChart size={18} /> },
    { id: 'config', label: 'Configuration', icon: <Settings size={18} /> },
  ];

  // Render active component
  const renderActiveView = () => {
    switch (activeTab) {
      case 'product':
        return <ProductTable />;
      case 'plan':
        return <PlanTable />;
      case 'projects':
        return <StudentProjectsTable />;
      case 'meetings':
        return <StudentMeetingsTable />;
      case 'admin':
        return <AdminCallsTable />;
      case 'content':
        return <ContentTable />;
      case 'product-wise':
        return <ProductWiseSheet />;
      case 'issues':
        return <IssuesTable />;
      case 'adoption':
        return <AdoptionTable />;
      case 'config':
        return <ConfigSection />;
      default:
        return <ProductTable />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="logo-section" style={{ display: 'flex', width: '100%', flexDirection: isCollapsed ? 'column' : 'row', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center', gap: isCollapsed ? '0.75rem' : '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div className="logo-icon">IP</div>
            {!isCollapsed && (
              <div className="logo-text">
                <p style={{ margin: 0, fontSize: '0.925rem', fontWeight: 800, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>Internal Portal</p>
                <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>Operations Control</p>
                
                {/* Database Sync Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
                    display: 'inline-block',
                  }} />
                  <span style={{ color: syncStatus === 'synced' ? 'var(--text-muted)' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444' }}>
                    {syncStatus === 'synced' ? 'DB Connected' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Offline'}
                  </span>
                </div>

                {/* Profile Badge inside Logo block */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '4px 8px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: getAssigneeColor(currentUser.name),
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', fontWeight: 800
                  }}>
                    {getInitials(currentUser.name)}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                    {currentUser.name}
                  </span>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="menu-section animate-slide-in">
          {!isCollapsed && <span className="menu-title">Main Workspaces</span>}
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              style={{ 
                width: '100%', 
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '0.75rem'
              }}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && <span className="menu-item-text">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout button at the footer of sidebar */}
        <div style={{ marginTop: 'auto', padding: '1rem 0 0.5rem 0', borderTop: '1px solid var(--border-light)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {isCollapsed && (
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: getAssigneeColor(currentUser.name),
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800,
              border: '1.5px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)'
            }} title={`Logged in as ${currentUser.name}`}>
              {getInitials(currentUser.name)}
            </div>
          )}
          <button
            onClick={logoutUser}
            className="menu-item"
            style={{ 
              width: '100%', 
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: isCollapsed ? '0' : '0.75rem',
              color: 'var(--danger)',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: 'transparent',
              transition: 'background-color 0.2s'
            }}
            title={isCollapsed ? "Log Out" : undefined}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="menu-item-text" style={{ fontWeight: 600 }}>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="viewport">
        {/* Content Area */}
        <div key={activeTab} className="content-area animate-fade-in">
          {renderActiveView()}
          {previewProductId && (
            <ProductDetailView 
              item={productItems.find(i => i.id === previewProductId)!} 
              onBack={() => setPreviewProductId(null)} 
              onUpdate={updateProductItem} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
};

export default App;
