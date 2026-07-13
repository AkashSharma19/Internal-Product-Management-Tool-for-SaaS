import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import type { ProductItem, DailyIssue } from './types';
import {
  ProductTable,
  PlanTable,
  StudentProjectsTable,
  StudentMeetingsTable,
  AdminCallsTable,
  TarunSirMeetingsTable,
  ContentTable,
  ProductWiseSheet,
  IssuesTable,
  AdoptionTable,
  ProductDetailView,
  ClickupSubtasksModal
} from './components/Tables';
import { ConfigSection } from './components/ConfigSection';
import { DashboardOverview } from './components/DashboardOverview';
import { CalendarView } from './components/CalendarView';
import { PublicFeedbackForm } from './components/PublicFeedbackForm';
import {
  LayoutDashboard,
  Flame,
  Calendar,
  CalendarDays,
  FolderGit,
  Video,
  PhoneCall,
  Crown,
  BookOpen,
  PieChart,
  AlertTriangle,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Settings,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  CornerDownLeft
} from 'lucide-react';

const LoginView: React.FC = () => {
  const { loginUserByEmail, googleClientId, isLoading } = useDashboard();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!googleClientId) return;

    let isMounted = true;

    const initializeGoogleBtn = () => {
      const g = (window as any).google;
      if (g?.accounts?.id) {
        g.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (!isMounted) return;
            setIsLoggingIn(true);
            setError(null);
            try {
              if (response.credential) {
                const res = await loginUserByEmail(response.credential);
                if (!res.success) {
                  setError(res.error || 'Access Denied');
                }
              } else {
                setError('Failed to retrieve credential from Google Account.');
              }
            } catch (err) {
              setError('Google login failed.');
            } finally {
              setIsLoggingIn(false);
            }
          }
        });

        const btnContainer = document.getElementById('google-signin-portal-btn-container');
        if (btnContainer) {
          g.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with',
            shape: 'rectangular'
          });
        }
      } else {
        setTimeout(initializeGoogleBtn, 300);
      }
    };

    initializeGoogleBtn();

    return () => {
      isMounted = false;
    };
  }, [googleClientId, loginUserByEmail]);

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
        gap: '1.75rem'
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
          {(isLoading || isLoggingIn) && (
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              marginTop: '0.85rem', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              backgroundColor: 'var(--primary-glow)', 
              border: '1px solid var(--primary-border)',
              color: 'var(--primary)', 
              fontSize: '0.7rem', 
              fontWeight: 600 
            }}>
              <RefreshCw size={10} className="animate-spin" />
              <span>{isLoggingIn ? 'Verifying Identity...' : 'Fetching database data...'}</span>
            </div>
          )}
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
            gap: '6px',
            textAlign: 'left'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Section */}
        {googleClientId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Authentication Required
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div id="google-signin-portal-btn-container" style={{ minHeight: '40px' }}></div>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '0.75rem',
            color: 'var(--danger)',
            textAlign: 'center',
            fontWeight: 600
          }}>
            ⚠️ Google Client ID is not configured. Please contact the system administrator.
          </div>
        )}
      </div>
    </div>
  );
};

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tab: string;
  onSelect: () => void;
  searchContent: string;
}

const CommandPalette: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    productItems,
    planItems,
    studentProjects,
    amaSessions,
    studentMeetings,
    adminCalls,
    contentItems,
    dailyIssues,
    setActiveTab,
    setPreviewProductId,
    openPreviewForFeature,
    activeTab,
    setPreviousTab
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Close command palette on click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Compile all searchable items across all worksheets
  const searchItems = useMemo<SearchResult[]>(() => {
    const list: SearchResult[] = [];

    // 1. Priority Requests (productItems)
    productItems.forEach(item => {
      if (item.id.startsWith('prod-temp-')) return;
      list.push({
        id: `product-${item.id}`,
        title: item.feature,
        subtitle: `${item.product} • POC: ${item.poc || 'Unassigned'} • Status: ${item.status || 'Draft'}`,
        category: 'Priority Requests',
        tab: 'product',
        onSelect: () => setPreviewProductId(item.id),
        searchContent: `${item.feature} ${item.product} ${item.poc || ''} ${item.status || ''} ${item.description || ''} ${item.notes || ''} ${item.module || ''}`.toLowerCase()
      });
    });

    // 2. Sprint Planning (planItems)
    planItems.forEach(item => {
      list.push({
        id: `plan-${item.id}`,
        title: item.task,
        subtitle: `Month: ${item.month} • Category: ${item.category} • Status: ${item.status || 'Open'}`,
        category: 'Sprint Planning',
        tab: 'plan',
        onSelect: () => openPreviewForFeature(item.task, { 
          status: item.status as any, 
          clickupStatus: item.clickupStatus || item.status, 
          taskLink: item.link 
        }),
        searchContent: `${item.task} ${item.month} ${item.category} ${item.status || ''}`.toLowerCase()
      });
    });

    // 3. Student Projects (studentProjects)
    studentProjects.forEach(item => {
      list.push({
        id: `project-${item.id}`,
        title: item.title,
        subtitle: `${item.product || 'No Product'} • POC: ${item.poc || 'Unassigned'} • Status: ${item.status || 'Active'}`,
        category: 'Student Projects',
        tab: 'projects',
        onSelect: () => openPreviewForFeature(item.title, item as unknown as Partial<ProductItem>),
        searchContent: `${item.title} ${item.description || ''} ${item.thingsWeBuild || ''} ${item.poc || ''} ${item.product || ''} ${item.module || ''} ${item.status || ''}`.toLowerCase()
      });
    });

    // 4. AMA Sessions (amaSessions)
    amaSessions.forEach(item => {
      list.push({
        id: `ama-${item.id}`,
        title: item.topic,
        subtitle: `Date: ${item.date} • Speaker: ${item.speaker} • Cohort: ${item.cohort}`,
        category: 'AMA Sessions',
        tab: 'meetings',
        onSelect: () => openPreviewForFeature(item.topic, { 
          notes: item.cohort, 
          taskLink: item.link, 
          status: item.status as any 
        }),
        searchContent: `${item.topic} ${item.speaker} ${item.cohort} ${item.status || ''} ${item.program || ''}`.toLowerCase()
      });
    });

    // 5. Student Meetings (studentMeetings)
    studentMeetings.forEach(item => {
      list.push({
        id: `meeting-${item.id}`,
        title: `Meeting: ${item.cohort}`,
        subtitle: `Date: ${item.date} • Summary: ${item.summary ? item.summary.substring(0, 60) : ''}`,
        category: 'Student Meetings',
        tab: 'meetings',
        onSelect: () => openPreviewForFeature(item.cohort, item as unknown as Partial<ProductItem>),
        searchContent: `${item.cohort} ${item.summary || ''} ${item.notes || ''} ${item.poc || ''} ${item.product || ''} ${item.module || ''}`.toLowerCase()
      });
    });

    // 6. Admin Calls (adminCalls)
    adminCalls.forEach(item => {
      list.push({
        id: `admin-${item.id}`,
        title: item.cohortTopic,
        subtitle: `Date: ${item.date} • POC: ${item.adminPoc} • Actions: ${item.actions ? item.actions.substring(0, 60) : ''}`,
        category: 'Admin Calls',
        tab: 'admin',
        onSelect: () => openPreviewForFeature(item.cohortTopic, { 
          notes: item.discussion, 
          description: item.actions, 
          status: item.status as any 
        }),
        searchContent: `${item.cohortTopic} ${item.adminPoc} ${item.discussion || ''} ${item.actions || ''} ${item.status || ''}`.toLowerCase()
      });
    });

    // 7. Content Pipeline (contentItems)
    contentItems.forEach(item => {
      list.push({
        id: `content-${item.id}`,
        title: item.module,
        subtitle: `Subject: ${item.subject} • Type: ${item.type} • POC: ${item.poc || 'Unassigned'}`,
        category: 'Content Pipeline',
        tab: 'content',
        onSelect: () => openPreviewForFeature(item.module, { 
          type: item.type, 
          poc: item.poc, 
          status: item.status as any, 
          notes: item.subject 
        }),
        searchContent: `${item.module} ${item.subject} ${item.type} ${item.poc || ''} ${item.status || ''}`.toLowerCase()
      });
    });

    // 8. Daily Issues Log (dailyIssues)
    dailyIssues.forEach(item => {
      list.push({
        id: `issue-${item.id}`,
        title: item.module || `Issue #${item.id}`,
        subtitle: `Product: ${item.product} • Issue: ${item.issues ? item.issues.substring(0, 60) : ''}`,
        category: 'Daily Issues Log',
        tab: 'issues',
        onSelect: () => setPreviewProductId(item.id),
        searchContent: `${item.module || ''} ${item.cohort || ''} ${item.product || ''} ${item.type || ''} ${item.issues || ''} ${item.contact || ''} ${item.poc || ''}`.toLowerCase()
      });
    });

    return list;
  }, [productItems, planItems, studentProjects, amaSessions, studentMeetings, adminCalls, contentItems, dailyIssues, setPreviewProductId, openPreviewForFeature]);

  // Filter search items based on query
  const filteredItems = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      // Suggest up to 2 items from each category as defaults
      const suggestions: SearchResult[] = [];
      const categories = Array.from(new Set(searchItems.map(item => item.category)));
      categories.forEach(cat => {
        const catItems = searchItems.filter(item => item.category === cat).slice(0, 2);
        suggestions.push(...catItems);
      });
      return suggestions.slice(0, 10);
    }
    return searchItems.filter(item => item.searchContent.includes(cleanQuery));
  }, [query, searchItems]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation inside search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.querySelector('.command-palette-result-row.selected');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchResult) => {
    setPreviousTab(activeTab);
    setActiveTab(item.tab);
    setTimeout(() => {
      item.onSelect();
    }, 50);
    onClose();
  };

  // Group filtered results for UI display
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  let flatIndex = 0;

  return (
    <div className="command-palette-overlay" onClick={handleOverlayClick}>
      <div className="command-palette-modal">
        <div className="command-palette-search-wrapper">
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-search-input"
            placeholder="Search tasks, descriptions, or POCs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="command-palette-keyboard-pill">ESC</span>
        </div>

        <div className="command-palette-results" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="command-palette-empty-state">
              <p>No results found for "{query}"</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Try searching for another keyword or name
              </span>
            </div>
          ) : (
            Object.entries(groupedResults).map(([category, items]) => (
              <div key={category}>
                <div className="command-palette-category-title">{category}</div>
                {items.map(item => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      className={`command-palette-result-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <div className="command-palette-result-content">
                        <span className="command-palette-result-title">{item.title}</span>
                        <span className="command-palette-result-subtitle">{item.subtitle}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span className="command-palette-result-category-badge">{category}</span>
                        {isSelected && <CornerDownLeft size={12} color="var(--text-muted)" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-shortcuts">
            <div className="command-palette-shortcut-item">
              <kbd className="command-palette-keyboard-pill">↑↓</kbd> <span>to navigate</span>
            </div>
            <div className="command-palette-shortcut-item">
              <kbd className="command-palette-keyboard-pill">↵</kbd> <span>to select</span>
            </div>
            <div className="command-palette-shortcut-item">
              <kbd className="command-palette-keyboard-pill">ESC</kbd> <span>to close</span>
            </div>
          </div>
          <div>
            <span>Search matches title, description & POC</span>
          </div>
        </div>
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
    refreshAllClickupStatuses,
    refreshAllData,
    dailyIssues,
    updateDailyIssue,
    previousTab,
    canUserEdit,
    alert,
    activeSubtasksTaskLink,
    setActiveSubtasksTaskLink
  } = useDashboard();
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [isRefreshingClickup, setIsRefreshingClickup] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Manage body class for global read-only selectors
  useEffect(() => {
    if (currentUser) {
      if (!canUserEdit) {
        document.body.classList.add('read-only-mode');
      } else {
        document.body.classList.remove('read-only-mode');
      }
    } else {
      document.body.classList.remove('read-only-mode');
    }
  }, [currentUser, canUserEdit]);

  // Global keybind handler (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefreshAllClickup = async () => {
    setIsRefreshingClickup(true);
    try {
      const res = await refreshAllClickupStatuses();
      if (res.success) {
        await alert(
          `ClickUp sync complete!\nScanned ${res.totalScanned} task links, updated ${res.updatedCount} items.`,
          'Sync Success',
          'Dismiss',
          'success'
        );
      } else {
        await alert(
          `ClickUp sync failed: ${res.error || 'Unknown error'}`,
          'Sync Failed',
          'Dismiss',
          'danger'
        );
      }
    } catch (err: any) {
      await alert(
        `Sync failed: ${err.message || 'Unknown error'}`,
        'Sync Error',
        'Dismiss',
        'danger'
      );
    } finally {
      setIsRefreshingClickup(false);
    }
  };

  const handleRefreshAllData = async () => {
    setIsRefreshingData(true);
    try {
      const res = await refreshAllData();
      if (res.success) {
        await alert(
          `Data refreshed!\nPulled latest data from ${res.updatedSheets} sheets. All views are now up to date.`,
          'Refresh Success',
          'Dismiss',
          'success'
        );
      } else {
        await alert(
          `Data refresh failed: ${res.error || 'Unknown error'}`,
          'Refresh Failed',
          'Dismiss',
          'danger'
        );
      }
    } catch (err: any) {
      await alert(
        `Refresh failed: ${err.message || 'Unknown error'}`,
        'Refresh Error',
        'Dismiss',
        'danger'
      );
    } finally {
      setIsRefreshingData(false);
    }
  };

  // Public feedback mode routing bypass
  const searchParams = new URLSearchParams(window.location.search);
  const feedbackId = searchParams.get('feedback');
  const feedbackCategory = searchParams.get('category');

  if (feedbackId) {
    return <PublicFeedbackForm itemId={feedbackId} category={feedbackCategory} />;
  }

  if (!currentUser) {
    return <LoginView />;
  }

  // Helper styles matching user initials
  const getAssigneeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Akash': '#7c3aed',
      'Akash Sharma': '#7c3aed',
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
        { id: 'calendar', label: 'Calendar View', icon: <CalendarDays size={18} /> },
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
        { id: 'tarun-meetings', label: 'Tarun Sir Meetings', icon: <Crown size={18} /> },
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
      case 'calendar':
        return <CalendarView />;
      case 'product':
        return <ProductTable />;
      case 'plan':
        return <PlanTable />;
      case 'projects':
        return <StudentProjectsTable />;
      case 'tarun-meetings':
        return <TarunSirMeetingsTable />;
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
          {/* Sync buttons — two actions: ClickUp status + full data refresh */}
          <div style={{
            display: 'flex',
            flexDirection: isCollapsed ? 'column' : 'column',
            gap: '0.4rem'
          }}>
            {/* 1. Refresh all data from server */}
            <button
              onClick={handleRefreshAllData}
              disabled={isRefreshingData || isRefreshingClickup}
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '0.65rem',
                height: '34px',
                padding: '0.4rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                backgroundColor: isRefreshingData ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.07)',
                color: '#059669',
                cursor: isRefreshingData ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                transition: 'all 0.2s',
                opacity: isRefreshingData ? 0.8 : 1
              }}
              onMouseEnter={e => {
                if (!isRefreshingData) e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = isRefreshingData ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.07)';
              }}
              title="Pull latest data from database for all users"
            >
              <RefreshCw size={15} className={isRefreshingData ? 'animate-spin' : ''} />
              {!isCollapsed && (
                <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
              )}
            </button>

            {/* 2. Sync ClickUp statuses */}
            {clickupApiKey && (
              <button
                onClick={handleRefreshAllClickup}
                disabled={isRefreshingClickup || isRefreshingData}
                style={{
                  width: '100%',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: isCollapsed ? '0' : '0.65rem',
                  height: '34px',
                  padding: '0.4rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  backgroundColor: isRefreshingClickup ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.07)',
                  color: 'var(--primary)',
                  cursor: isRefreshingClickup ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  opacity: isRefreshingClickup ? 0.8 : 1
                }}
                onMouseEnter={e => {
                  if (!isRefreshingClickup) e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = isRefreshingClickup ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.07)';
                }}
                title="Sync ClickUp task statuses"
              >
                <RefreshCw size={15} className={isRefreshingClickup ? 'animate-spin' : ''} />
                {!isCollapsed && (
                  <span>{isRefreshingClickup ? 'Syncing ClickUp...' : 'Sync ClickUp'}</span>
                )}
              </button>
            )}
          </div>

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
            if (activeTab === 'issues') {
              const foundIssue = dailyIssues.find(i => i.id === previewProductId);
              if (!foundIssue) return null;
              
              const mappedItem: ProductItem = {
                id: foundIssue.id,
                feature: foundIssue.module || `Issue #${foundIssue.id}`,
                description: foundIssue.issues || foundIssue.notes || '',
                tarunSirApproval: foundIssue.tarunSirApproval || false,
                raisedByTarunSir: foundIssue.raisedByTarunSir || false,
                priority: foundIssue.priority as any || '',
                poc: foundIssue.poc || foundIssue.contact || '',
                status: foundIssue.status as any || '',
                clickupStatus: foundIssue.clickupStatus || foundIssue.type || '',
                taskLink: foundIssue.taskLink || '',
                blocker: foundIssue.blocker || '',
                deadline: foundIssue.deadline || '',
                notes: foundIssue.notes || foundIssue.issues || '',
                product: foundIssue.product || '',
                module: foundIssue.module || '',
                type: foundIssue.type || '',
                uiux: foundIssue.uiux || '',
                finalRelease: foundIssue.finalRelease || '',
                productDeadline: foundIssue.productDeadline || '',
                productDeadlineCompleted: !!foundIssue.productDeadlineCompleted,
                uiuxCompleted: !!foundIssue.uiuxCompleted,
                deadlineCompleted: !!foundIssue.deadlineCompleted,
                finalReleaseCompleted: !!foundIssue.finalReleaseCompleted,
                createdAt: foundIssue.createdAt || '',
                clickupSubtasksCount: foundIssue.clickupSubtasksCount,
                clickupAssignee: foundIssue.clickupAssignee || '',
              };

              const handleUpdateIssue = (id: string, updated: Partial<ProductItem>) => {
                const updatedIssue: Partial<DailyIssue> = {};
                if (updated.feature !== undefined) updatedIssue.module = updated.feature;
                if (updated.description !== undefined) updatedIssue.issues = updated.description;
                if (updated.raisedByTarunSir !== undefined) updatedIssue.raisedByTarunSir = updated.raisedByTarunSir;
                if (updated.tarunSirApproval !== undefined) updatedIssue.tarunSirApproval = updated.tarunSirApproval;
                if (updated.priority !== undefined) updatedIssue.priority = updated.priority;
                if (updated.poc !== undefined) updatedIssue.poc = updated.poc;
                if (updated.status !== undefined) updatedIssue.status = updated.status;
                if (updated.clickupStatus !== undefined) updatedIssue.clickupStatus = updated.clickupStatus;
                if (updated.taskLink !== undefined) updatedIssue.taskLink = updated.taskLink;
                if (updated.blocker !== undefined) updatedIssue.blocker = updated.blocker;
                if (updated.deadline !== undefined) updatedIssue.deadline = updated.deadline;
                if (updated.notes !== undefined) updatedIssue.notes = updated.notes;
                if (updated.product !== undefined) updatedIssue.product = updated.product;
                if (updated.module !== undefined) updatedIssue.module = updated.module;
                if (updated.type !== undefined) updatedIssue.type = updated.type as DailyIssue['type'];
                if (updated.uiux !== undefined) updatedIssue.uiux = updated.uiux;
                if (updated.finalRelease !== undefined) updatedIssue.finalRelease = updated.finalRelease;
                if (updated.productDeadline !== undefined) updatedIssue.productDeadline = updated.productDeadline;
                if (updated.productDeadlineCompleted !== undefined) updatedIssue.productDeadlineCompleted = updated.productDeadlineCompleted;
                if (updated.uiuxCompleted !== undefined) updatedIssue.uiuxCompleted = updated.uiuxCompleted;
                if (updated.deadlineCompleted !== undefined) updatedIssue.deadlineCompleted = updated.deadlineCompleted;
                if (updated.finalReleaseCompleted !== undefined) updatedIssue.finalReleaseCompleted = updated.finalReleaseCompleted;
                if (updated.createdAt !== undefined) updatedIssue.createdAt = updated.createdAt;
                if (updated.clickupSubtasksCount !== undefined) updatedIssue.clickupSubtasksCount = updated.clickupSubtasksCount;
                if (updated.clickupAssignee !== undefined) updatedIssue.clickupAssignee = updated.clickupAssignee;
                
                updateDailyIssue(id, updatedIssue);
              };

              const handleBack = () => {
                setPreviewProductId(null);
                if (previousTab) {
                  setActiveTab(previousTab);
                }
              };

              return (
                <ProductDetailView 
                  item={mappedItem} 
                  onBack={handleBack} 
                  onUpdate={handleUpdateIssue} 
                />
              );
            }

            const foundItem = productItems.find(i => i.id === previewProductId);
            if (!foundItem) return null;
            
            const handleBack = () => {
              setPreviewProductId(null);
              if (previousTab) {
                setActiveTab(previousTab);
              }
            };

            return (
              <ProductDetailView 
                item={foundItem} 
                onBack={handleBack} 
                onUpdate={updateProductItem} 
              />
            );
          })()}
        </div>
      </main>
      {isCommandPaletteOpen && (
        <CommandPalette onClose={() => setIsCommandPaletteOpen(false)} />
      )}
      {activeSubtasksTaskLink && (
        <ClickupSubtasksModal 
          taskLink={activeSubtasksTaskLink} 
          onClose={() => setActiveSubtasksTaskLink(null)} 
        />
      )}
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
