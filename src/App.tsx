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
import { DashboardOverview } from './components/DashboardOverview';
import {
  LayoutDashboard,
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
  LogOut,
  RefreshCw
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
    logoutUser,
    clickupApiKey,
    refreshAllClickupStatuses
  } = useDashboard();
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [isRefreshingClickup, setIsRefreshingClickup] = useState(false);

  const handleRefreshAllClickup = async () => {
    setIsRefreshingClickup(true);
    try {
      const res = await refreshAllClickupStatuses();
      if (res.success) {
        alert(`Successfully synced ClickUp! Scanned ${res.totalScanned} unique task links and updated ${res.updatedCount} items with status changes.`);
      } else {
        alert(`Failed to sync ClickUp: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRefreshingClickup(false);
    }
  };

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

  // Sidebar navigation groups
  const menuGroups = [
    {
      title: "Overview",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
        { id: 'plan', label: 'Sprint Planning', icon: <Calendar size={18} /> },
      ]
    },
    {
      title: "Product Workspace",
      items: [
        { id: 'product', label: 'Priority Requests', icon: <Flame size={18} /> },
        { id: 'product-wise', label: 'Product Breakdown', icon: <PieChart size={18} /> },
        { id: 'adoption', label: 'Adoption Tracker', icon: <LineChart size={18} /> },
      ]
    },
    {
      title: "Operations & Logs",
      items: [
        { id: 'projects', label: 'Student Projects', icon: <FolderGit size={18} /> },
        { id: 'meetings', label: 'AMA & Meetings', icon: <Video size={18} /> },
        { id: 'admin', label: 'Admin Calls', icon: <PhoneCall size={18} /> },
        { id: 'content', label: 'Content Pipeline', icon: <BookOpen size={18} /> },
        { id: 'issues', label: 'Daily Issues Log', icon: <AlertTriangle size={18} /> },
      ]
    },
    {
      title: "System Settings",
      items: [
        { id: 'config', label: 'Configuration', icon: <Settings size={18} /> },
      ]
    }
  ];

  // Render active component
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
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
        return <DashboardOverview />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Logo Section */}
        <div className="logo-section" style={{ display: 'flex', width: '100%', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem 0.25rem' }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <div className="logo-icon" style={{ flexShrink: 0 }}>IP</div>
              <div className="logo-text" style={{ display: 'flex', flexDirection: 'column' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>Internal Portal</p>
                <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>Operations Control</p>
              </div>
            </div>
          )}
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

        {/* Grouped Sidebar Navigation */}
        <nav className="menu-section animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {menuGroups.map((group, groupIdx) => (
            <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {groupIdx > 0 && (
                <div style={{ borderTop: '1px solid var(--border-light)', margin: '0.35rem 0.5rem', marginBottom: '0.5rem' }} />
              )}
              {group.items.map(item => (
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
                    gap: isCollapsed ? '0' : '0.65rem',
                    height: '35px',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.775rem'
                  }}
                  title={item.label}
                >
                  {item.icon}
                  {!isCollapsed && <span className="menu-item-text">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ 
          marginTop: 'auto', 
          padding: '0.75rem 0.25rem 0.25rem 0.25rem', 
          borderTop: '1px solid var(--border-light)', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem' 
        }}>
          {clickupApiKey && (
            <button
              onClick={handleRefreshAllClickup}
              disabled={isRefreshingClickup}
              style={{
                width: '100%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '0.65rem',
                height: '35px',
                padding: '0.4rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.775rem',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                opacity: isRefreshingClickup ? 0.7 : 1
              }}
              onMouseEnter={e => {
                if (!isRefreshingClickup) {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
              }}
              title="Sync all ClickUp statuses"
            >
              <RefreshCw size={16} className={isRefreshingClickup ? 'animate-spin' : ''} />
              {!isCollapsed && (
                <span>{isRefreshingClickup ? 'Syncing...' : 'Sync ClickUp'}</span>
              )}
            </button>
          )}

          {!isCollapsed ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.25rem'
            }}>
              {/* User info left */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: getAssigneeColor(currentUser.name),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  border: '1.5px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0
                }}>
                  {getInitials(currentUser.name)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ 
                    fontSize: '0.775rem', 
                    fontWeight: 700, 
                    color: 'var(--text-primary)', 
                    textTransform: 'capitalize', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {currentUser.name}
                  </span>
                  
                  {/* Database Sync Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', fontSize: '0.625rem', fontWeight: 600 }}>
                    <span 
                      className={syncStatus === 'syncing' ? 'animate-sync-pulse' : ''}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
                        display: 'inline-block',
                        color: syncStatus === 'syncing' ? '#fbbf24' : 'inherit'
                      }} 
                    />
                    <span style={{ color: syncStatus === 'synced' ? 'var(--text-muted)' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444' }}>
                      {syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout icon button */}
              <button
                onClick={logoutUser}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            /* Collapsed view footer */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
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
                }} title={`Logged in as ${currentUser.name} (${syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'})`}>
                  {getInitials(currentUser.name)}
                </div>
                <span 
                  className={syncStatus === 'syncing' ? 'animate-sync-pulse' : ''}
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: syncStatus === 'synced' ? '#10b981' : syncStatus === 'syncing' ? '#fbbf24' : '#ef4444',
                    border: '1.5px solid var(--panel-bg)',
                    boxShadow: 'var(--shadow-sm)',
                    color: syncStatus === 'syncing' ? '#fbbf24' : 'inherit'
                  }}
                />
              </div>
              <button
                onClick={logoutUser}
                style={{ 
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--danger)',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'transparent',
                  transition: 'all 0.2s',
                  width: '30px',
                  height: '30px'
                }}
                title="Log Out"
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="viewport">
        {/* Content Area */}
        <div key={activeTab} className="content-area animate-fade-in">
          {renderActiveView()}
          {previewProductId && (() => {
            const foundItem = productItems.find(i => i.id === previewProductId);
            if (!foundItem) return null;
            return (
              <ProductDetailView 
                item={foundItem} 
                onBack={() => setPreviewProductId(null)} 
                onUpdate={updateProductItem} 
              />
            );
          })()}
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
