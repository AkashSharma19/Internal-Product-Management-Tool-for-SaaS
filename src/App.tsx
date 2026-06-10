import React from 'react';
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
  Moon,
  Sun,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { 
    theme, 
    toggleTheme, 
    activeTab, 
    setActiveTab, 
    resetAllData,
    previewProductId,
    setPreviewProductId,
    productItems,
    updateProductItem
  } = useDashboard();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

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

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', gap: '0.5rem', width: '100%' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={resetAllData} 
            style={{ 
              flex: 1,
              width: isCollapsed ? '100%' : 'auto',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '0.5rem',
              color: 'var(--danger)',
              borderColor: 'rgba(239, 68, 68, 0.2)'
            }}
            title="Reset Mock Data"
          >
            <RotateCcw size={16} />
            {!isCollapsed && <span className="btn-text">Reset Data</span>}
          </button>
          
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={toggleTheme} 
            style={{ 
              width: isCollapsed ? '100%' : 'auto',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '8px'
            }}
            title="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
