import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import type { ProductItem, DailyIssue, ContentItem } from './types';
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
  FeatureRequestsTable,
  AdoptionTable,
  ProductDetailView,
  ClickupSubtasksModal,
  ContactsDirectoryTable,
  RepositoryView
} from './components/Tables';
import { ConfigSection } from './components/ConfigSection';
import { DashboardOverview } from './components/DashboardOverview';
import { CalendarView } from './components/CalendarView';
import { PublicFeedbackForm } from './components/PublicFeedbackForm';
import {
  LayoutDashboard,
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
  X,
  CornerDownLeft,
  Users,
  FolderOpen,
  Lightbulb,
  PlusCircle,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react';

import { isAudioMuted, toggleAudioMute, playPopSound } from './utils/audio';
import PixelBlast from './components/common/PixelBlast';

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
      fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif",
      color: 'var(--text-primary)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* PixelBlast animated background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#7c5cbf"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>
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
        gap: '1.75rem',
        position: 'relative',
        zIndex: 1
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
    setPreviousTab,
    searchGlobalTasks,
    setHighlightedCallId,
    setMeetingSearchQuery
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  // Compile suggestions for empty/short queries from local state
  const localSuggestions = useMemo<SearchResult[]>(() => {
    const list: SearchResult[] = [];
    
    // Suggest first 2 items from each category that is already in state
    productItems.slice(0, 2).forEach(item => {
      if (item.id.startsWith('prod-temp-')) return;
      list.push({
        id: `product-${item.id}`,
        title: item.feature,
        subtitle: `${item.product} • POC: ${item.poc || 'Unassigned'} • Status: ${item.status || 'Draft'}`,
        category: 'Priority Requests',
        tab: 'product',
        onSelect: () => setPreviewProductId(item.id),
        searchContent: ''
      });
    });

    planItems.slice(0, 2).forEach(item => {
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
        searchContent: ''
      });
    });

    studentProjects.slice(0, 2).forEach(item => {
      list.push({
        id: `project-${item.id}`,
        title: item.title,
        subtitle: `${item.product || 'No Product'} • POC: ${item.poc || 'Unassigned'} • Status: ${item.status || 'Active'}`,
        category: 'Student Projects',
        tab: 'projects',
        onSelect: () => openPreviewForFeature(item.title, item as unknown as Partial<ProductItem>),
        searchContent: ''
      });
    });

    amaSessions.slice(0, 2).forEach(item => {
      list.push({
        id: `ama-${item.id}`,
        title: item.topic,
        subtitle: `Date: ${item.date} • Speaker: ${item.speaker} • Cohort: ${item.cohort}`,
        category: 'AMA Sessions',
        tab: 'meetings',
        onSelect: () => {
          setHighlightedCallId(item.id);
          setMeetingSearchQuery(item.topic);
        },
        searchContent: ''
      });
    });

    studentMeetings.slice(0, 2).forEach(item => {
      list.push({
        id: `meeting-${item.id}`,
        title: `Meeting: ${item.cohort}`,
        subtitle: `Date: ${item.date} • Summary: ${item.summary ? item.summary.substring(0, 60) : ''}`,
        category: 'Student Meetings',
        tab: 'meetings',
        onSelect: () => {
          setHighlightedCallId(item.id);
          setMeetingSearchQuery(item.cohort);
        },
        searchContent: ''
      });
    });

    adminCalls.slice(0, 2).forEach(item => {
      list.push({
        id: `admin-${item.id}`,
        title: item.cohortTopic,
        subtitle: `Date: ${item.date} • POC: ${item.adminPoc} • Actions: ${item.actions ? item.actions.substring(0, 60) : ''}`,
        category: 'Admin Calls',
        tab: 'admin',
        onSelect: () => {
          setHighlightedCallId(item.id);
          setMeetingSearchQuery(item.cohortTopic);
        },
        searchContent: ''
      });
    });

    contentItems.slice(0, 2).forEach(item => {
      list.push({
        id: `content-${item.id}`,
        title: item.module,
        subtitle: `Subject: ${item.subject} • Type: ${item.type} • POC: ${item.poc || 'Unassigned'}`,
        category: 'Content Pipeline',
        tab: 'content',
        onSelect: () => setPreviewProductId(item.id),
        searchContent: ''
      });
    });

    dailyIssues.slice(0, 2).forEach(item => {
      list.push({
        id: `issue-${item.id}`,
        title: item.module || `Issue #${item.id}`,
        subtitle: `Product: ${item.product} • Issue: ${item.issues ? item.issues.substring(0, 60) : ''}`,
        category: 'Daily Issues Log',
        tab: 'issues',
        onSelect: () => setPreviewProductId(item.id),
        searchContent: ''
      });
    });

    return list.slice(0, 10);
  }, [productItems, planItems, studentProjects, amaSessions, studentMeetings, adminCalls, contentItems, dailyIssues, setPreviewProductId, openPreviewForFeature]);

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(localSuggestions);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      const res = await searchGlobalTasks(trimmed);
      if (res.success && res.data) {
        // Map backend SearchResult entries to local onSelect handlers
        const mapped = res.data.map((item: any) => {
          let onSelect = () => {};
          const raw = item.rawItem;
          
          if (item.category === 'Priority Requests') {
            onSelect = () => setPreviewProductId(raw.id);
          } else if (item.category === 'Sprint Planning') {
            onSelect = () => openPreviewForFeature(raw.task, { 
              status: raw.status as any, 
              clickupStatus: raw.clickupStatus || raw.status, 
              taskLink: raw.link 
            });
          } else if (item.category === 'Student Projects') {
            onSelect = () => openPreviewForFeature(raw.title, raw as unknown as Partial<ProductItem>);
          } else if (item.category === 'AMA Sessions') {
            onSelect = () => {
              setHighlightedCallId(raw.id);
              setMeetingSearchQuery(raw.topic);
            };
          } else if (item.category === 'Student Meetings') {
            onSelect = () => {
              setHighlightedCallId(raw.id);
              setMeetingSearchQuery(raw.cohort);
            };
          } else if (item.category === 'Admin Calls') {
            onSelect = () => {
              setHighlightedCallId(raw.id);
              setMeetingSearchQuery(raw.cohortTopic);
            };
          } else if (item.category === 'Tarun Sir Meetings') {
            onSelect = () => {
              setHighlightedCallId(raw.id);
              setMeetingSearchQuery(raw.cohortTopic);
            };
          } else if (item.category === 'Content Pipeline') {
            onSelect = () => setPreviewProductId(raw.id);
          } else if (item.category === 'Daily Issues Log') {
            onSelect = () => setPreviewProductId(raw.id);
          }

          return {
            ...item,
            onSelect,
            searchContent: ''
          } as SearchResult;
        });

        setResults(mapped);
      }
      setIsSearching(false);
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [query, localSuggestions, searchGlobalTasks, setPreviewProductId, openPreviewForFeature]);

  const filteredItems = results;

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
          {query ? (
            <button 
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px',
                outline: 'none',
                marginRight: '8px'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="command-palette-keyboard-pill">ESC</span>
          )}
        </div>

        <div className="command-palette-results" ref={listRef}>
          {isSearching ? (
            <div className="command-palette-empty-state">
              <span className="animate-spin" style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', marginBottom: '8px' }} />
              <p>Searching database...</p>
            </div>
          ) : filteredItems.length === 0 ? (
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

const TableSkeleton = () => {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      {/* Search/Controls skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '40px' }}>
        <div style={{ width: '250px', height: '36px', backgroundColor: 'var(--border-light)', borderRadius: '8px' }} />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ width: '100px', height: '36px', backgroundColor: 'var(--border-light)', borderRadius: '8px' }} />
          <div style={{ width: '120px', height: '36px', backgroundColor: 'var(--border-light)', borderRadius: '8px' }} />
        </div>
      </div>

      {/* Table grid skeleton */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        overflow: 'hidden'
      }}>
        {/* Table header row */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ flex: 1, height: '18px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
          ))}
        </div>

        {/* Table body rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(row => (
          <div key={row} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ flex: 1.5, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            <div style={{ flex: 1, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            <div style={{ flex: 1, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            <div style={{ flex: 1, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            <div style={{ flex: 0.8, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
          </div>
        ))}
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
    contentItems,
    updateProductItem,
    syncStatus,
    currentUser,
    logoutUser,
    clickupApiKey,
    refreshAllClickupStatuses,
    refreshAllData,
    dailyIssues,
    updateDailyIssue,
    updateContentItem,
    addDailyIssue,
    productGroups,
    programs,
    googleClientId,
    loginUserByEmail,
    previousTab,
    canUserEdit,
    alert,
    activeSubtasksTaskLink,
    setActiveSubtasksTaskLink,
    isLoading,
    comments,
    lastOpenedMap,
    loadedTabs
  } = useDashboard();
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [isRefreshingClickup, setIsRefreshingClickup] = useState(false);

  // Toast state for auto-save notifications
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const prevSyncStatusRef = useRef(syncStatus);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevSyncStatusRef.current === 'syncing' && syncStatus === 'synced') {
      setToastMessage('Changes saved to cloud');
      setToastType('success');
      setShowToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3000);
    } else if (syncStatus === 'error') {
      setToastMessage('Sync failed. Offline mode active.');
      setToastType('error');
      setShowToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 4000);
    }
    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(isAudioMuted());

  const handleToggleAudio = () => {
    const nextMuted = toggleAudioMute();
    setIsMuted(nextMuted);
  };

  const unreadCommentsCount = useMemo(() => {
    const featureRequestIds = dailyIssues
      .filter(item => item.type === 'Feature Gap' || item.type === 'Enhancement')
      .map(item => item.id);

    return comments.filter((c: any) => {
      if (!featureRequestIds.includes(c.itemId)) return false;
      const lastOpened = lastOpenedMap[c.itemId];
      if (!lastOpened) return true;
      return new Date(c.createdAt).getTime() > lastOpened;
    }).length;
  }, [comments, dailyIssues, lastOpenedMap]);

  // Public Login & Feature Request Modal state
  const [isPublicLoginModalOpen, setIsPublicLoginModalOpen] = useState(false);
  const [isRaiseRequestModalOpen, setIsRaiseRequestModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState('');
  const [requestProgram, setRequestProgram] = useState('');
  const [requestTaskName, setRequestTaskName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [loginSuccessUser, setLoginSuccessUser] = useState<{ name: string; email: string } | null>(null);
  // Ref keeps the latest loginUserByEmail without being a reactive dependency
  const loginUserByEmailRef = useRef(loginUserByEmail);
  useEffect(() => { loginUserByEmailRef.current = loginUserByEmail; }, [loginUserByEmail]);
  // Ref for the success→form transition timer so effect cleanup can't cancel it
  const loginTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NOTE: transition from login modal → raise-request modal is handled inside the Google callback
  // with a 2-second success-screen delay, so no competing useEffect needed here.

  // Public Calendar Google Login Effect
  useEffect(() => {
    if (!isPublicLoginModalOpen || !googleClientId) return;

    let isMounted = true;
    const initializeGoogleBtn = () => {
      const g = (window as any).google;
      if (g?.accounts?.id) {
        g.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (!isMounted) return;
            setIsGoogleSigningIn(true);
            setLoginError(null);
            try {
              if (response.credential) {
                const res = await loginUserByEmailRef.current(response.credential);
                if (res.success) {
                  // Decode the JWT to grab name/email for the success screen
                  try {
                    const payload = JSON.parse(atob(response.credential.split('.')[1]));
                    setLoginSuccessUser({ name: payload.name || payload.email || 'User', email: payload.email || '' });
                  } catch {
                    setLoginSuccessUser({ name: 'User', email: '' });
                  }
                  setIsGoogleSigningIn(false);
                  // Use a ref-tracked timer so effect re-runs can't cancel it
                  if (loginTransitionTimerRef.current) clearTimeout(loginTransitionTimerRef.current);
                  loginTransitionTimerRef.current = setTimeout(() => {
                    loginTransitionTimerRef.current = null;
                    setLoginSuccessUser(null);
                    setIsPublicLoginModalOpen(false);
                  }, 1200);
                  return;
                } else {
                  setLoginError(res.error || 'Access Denied');
                }
              } else {
                setLoginError('Failed to retrieve credential.');
              }
            } catch (err) {
              setLoginError('Google login failed.');
            } finally {
              if (isMounted) setIsGoogleSigningIn(false);
            }
          }
        });

        const btnContainer = document.getElementById('google-signin-public-btn-container');
        if (btnContainer) {
          g.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: 280,
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
  }, [isPublicLoginModalOpen, googleClientId]);

  const handleOpenRaiseRequestModal = () => {
    if (!currentUser) {
      setLoginError(null);
      setIsPublicLoginModalOpen(true);
    } else {
      setRequestError(null);
      setRequestSuccess(false);
      setRequestTaskName('');
      setRequestDescription('');
      setRequestProduct('');
      setRequestProgram('');
      setIsRaiseRequestModalOpen(true);
    }
  };

  const handleSubmitFeatureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestProduct || !requestTaskName.trim() || !requestDescription.trim()) {
      setRequestError('Please fill in all required fields.');
      return;
    }

    const selectedProduct = requestProduct;

    setIsSubmittingRequest(true);
    setRequestError(null);

    try {
      const newId = String(Math.max(...dailyIssues.map(i => parseInt(i.id) || 0), 0) + 1);
      const newRequest: DailyIssue = {
        id: newId,
        cohort: requestProgram,
        product: selectedProduct,
        module: requestTaskName.trim(),
        type: 'Feature Gap',
        issues: requestDescription.trim(),
        contact: currentUser ? `${currentUser.name} (${currentUser.email})` : '',
        priority: '',
        poc: 'Akash Sharma',
        status: '',
        clickupStatus: '',
        taskLink: '',
        blocker: '',
        deadline: '',
        notes: `Raised by guest request from public calendar.`,
        uiux: '',
        finalRelease: '',
        productDeadline: '',
        raisedByTarunSir: false,
        tarunSirApproval: false,
        createdAt: new Date().toISOString()
      };

      await addDailyIssue(newRequest);
      setRequestSuccess(true);
    } catch (err: any) {
      console.error('Submit feature request error:', err);
      setRequestError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

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
        playPopSound();
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
  const isPublicCalendar = searchParams.get('public-calendar') === 'true';

  if (feedbackId) {
    return <PublicFeedbackForm itemId={feedbackId} category={feedbackCategory} />;
  }

  if (isPublicCalendar) {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading Calendar...</span>
          </div>
        </div>
      );
    }
    return (
      <div className="app-container" style={{ display: 'block', height: '100vh', overflow: 'hidden', padding: '0', background: 'var(--background)' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <header className="public-calendar-header" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1.5rem', background: 'var(--panel-bg)', borderBottom: '1px solid var(--border)',
            fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", height: '56px', boxSizing: 'border-box'
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <span style={{ display: 'inline-flex', padding: '4px', borderRadius: '6px', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <CalendarDays size={18} />
              </span>
              Masters Union Product Roadmap
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={handleOpenRaiseRequestModal}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer'
                }}
              >
                <PlusCircle size={15} />
                Raise Feature Request
              </button>

              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div 
                    title={currentUser.email}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: ({'Akash': '#7c3aed', 'Akash Sharma': '#7c3aed', 'Anushka': '#db2777', 'Nikhil': '#0284c7', 'Nikhil Jain': '#059669'} as Record<string,string>)[currentUser.name] || '#6b7280',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', fontWeight: 700, border: '2px solid var(--border)'
                    }}
                  >
                    {(() => { const p = currentUser.name?.trim().split(/\s+/) || []; return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : (currentUser.name || 'U').slice(0,2).toUpperCase(); })()}
                  </div>
                  <button
                    onClick={logoutUser}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-secondary)',
                      fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', padding: '4px 8px'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsPublicLoginModalOpen(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </header>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <CalendarView isPublic={true} />
          </div>
        </div>

        {isPublicLoginModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
            fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif",
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '2.25rem', width: '380px', maxWidth: '92vw',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              position: 'relative',
              animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)'
            }}>
              {/* Close button — hidden during loading/success states */}
              {!isGoogleSigningIn && !loginSuccessUser && (
                <button
                  onClick={() => { setIsPublicLoginModalOpen(false); setLoginError(null); }}
                  style={{
                    position: 'absolute', top: '14px', right: '14px', background: 'none',
                    border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '1.2rem', lineHeight: 1, padding: '4px', borderRadius: '6px'
                  }}
                >&times;</button>
              )}

              {/* ── SUCCESS STATE ── */}
              {loginSuccessUser ? (
                <div style={{ textAlign: 'center', padding: '0.5rem 0 0.25rem' }}>
                  {/* Animated success ring */}
                  <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 1.25rem' }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: '0 0 0 0 rgba(16,185,129,0.4)',
                      animation: 'successPulse 1.4s ease-out infinite'
                    }} />
                    <div style={{
                      position: 'absolute', inset: '6px',
                      borderRadius: '50%',
                      background: 'var(--panel-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'drawCheck 0.4s ease forwards' }} />
                      </svg>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981' }}>Signed In Successfully</p>
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Welcome, {loginSuccessUser.name.split(' ')[0]}! 👋</h3>
                  <p style={{ margin: '0 0 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loginSuccessUser.email}</p>

                  {/* Progress bar */}
                  <div style={{
                    height: '4px', borderRadius: '4px',
                    background: 'var(--border)',
                    overflow: 'hidden',
                    margin: '0 0 0.75rem'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      borderRadius: '4px',
                      animation: 'progressFill 1.1s linear forwards'
                    }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>You're all set! ✓</p>
                </div>
              ) : isGoogleSigningIn ? (
              /* ── LOADING STATE ── */
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  {/* Google-branded spinner */}
                  <div style={{ position: 'relative', width: '56px', height: '56px', margin: '0 auto 1.25rem' }}>
                    <div style={{
                      width: '56px', height: '56px',
                      border: '3px solid var(--border)',
                      borderTopColor: '#4285F4',
                      borderRightColor: '#EA4335',
                      borderBottomColor: '#FBBC05',
                      borderLeftColor: '#34A853',
                      borderRadius: '50%',
                      animation: 'spin 0.9s linear infinite'
                    }} />
                  </div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Signing you in…</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Verifying your Google account</p>
                </div>
              ) : (
              /* ── DEFAULT STATE ── */
                <>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    {/* Google G logo */}
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '50%',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 1rem'
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Sign In Required</h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Sign in with your Google account to raise a feature request or post comments.</p>
                  </div>

                  {loginError && (
                    <div style={{
                      padding: '10px 12px', backgroundColor: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
                      borderRadius: '8px', fontSize: '0.8rem', fontWeight: 550, marginBottom: '1.25rem',
                      lineHeight: 1.35, display: 'flex', gap: '6px', alignItems: 'flex-start'
                    }}>
                      <span>⚠️</span><span>{loginError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div id="google-signin-public-btn-container"></div>
                  </div>
                  <p style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>By signing in you agree to let us use your name and email for identification only.</p>
                </>
              )}
            </div>
          </div>
        )}

        {isRaiseRequestModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
            fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif"
          }}>
            <div style={{
              background: 'var(--panel-bg)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setIsRaiseRequestModalOpen(false)}
                style={{
                  position: 'absolute', top: '12px', right: '12px', background: 'none',
                  border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1
                }}
              >
                &times;
              </button>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Raise Feature Request
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Suggest a new task or enhancement for the roadmap.
                </p>
              </div>

              {requestSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ color: '#10b981', marginBottom: '1rem' }}>
                    <CheckCircle size={48} style={{ margin: '0 auto' }} />
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Request Submitted Successfully!</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Your request has been logged under "Requested Features".
                  </p>
                  <button
                    onClick={() => setIsRaiseRequestModalOpen(false)}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', borderRadius: '8px' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeatureRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {requestError && (
                    <div style={{
                      padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444',
                      borderRadius: '8px', fontSize: '0.8rem', fontWeight: 550, lineHeight: 1.35
                    }}>
                      {requestError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Program *
                    </label>
                    <select
                      className="config-select"
                      value={requestProgram}
                      onChange={(e) => setRequestProgram(e.target.value)}
                      required
                      style={{ width: '100%', height: '36px' }}
                    >
                      <option value="">Select a Program...</option>
                      {programs.map(pg => (
                        <option key={pg.id} value={pg.name}>{pg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Product Group *
                    </label>
                    <select
                      className="config-select"
                      value={requestProduct}
                      onChange={(e) => setRequestProduct(e.target.value)}
                      required
                      style={{ width: '100%', height: '36px' }}
                    >
                      <option value="">Select a Product Group...</option>
                      {productGroups.map(pg => (
                        <option key={pg.id} value={pg.name}>{pg.name}</option>
                      ))}
                    </select>
                  </div>


                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Task Name *
                    </label>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="e.g. Implement Google Calendar Sync"
                      value={requestTaskName}
                      onChange={(e) => setRequestTaskName(e.target.value)}
                      required
                      style={{ height: '36px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Description *
                    </label>
                    <textarea
                      className="config-input"
                      placeholder="Please provide details about this request..."
                      value={requestDescription}
                      onChange={(e) => setRequestDescription(e.target.value)}
                      required
                      style={{ minHeight: '100px', resize: 'vertical', padding: '8px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsRaiseRequestModalOpen(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', borderRadius: '8px', height: '36px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingRequest}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', borderRadius: '8px', height: '36px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      {isSubmittingRequest ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Submitting...
                        </>
                      ) : 'Submit Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
        { id: 'product-wise', label: 'Product Breakdown', icon: <PieChart size={18} /> },
        { id: 'repository', label: 'Repository', icon: <FolderOpen size={18} /> },
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
        { id: 'contacts', label: 'Contacts Directory', icon: <Users size={18} /> },
        { id: 'content', label: 'Content Pipeline', icon: <BookOpen size={18} /> },
        { id: 'issues', label: 'Daily Issues Log', icon: <AlertTriangle size={18} /> },
        { id: 'feature-requests', label: 'Requested Features', icon: <Lightbulb size={18} /> },
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
      case 'contacts':
        return <ContactsDirectoryTable />;
      case 'content':
        return <ContentTable />;
      case 'product-wise':
        return <ProductWiseSheet />;
      case 'repository':
        return <RepositoryView />;
      case 'issues':
        return <IssuesTable />;
      case 'feature-requests':
        return <FeatureRequestsTable />;
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <defs>
                  <linearGradient id="logo-grad-expanded" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#logo-grad-expanded)" />
                <path d="M12 7V17M12 7L8 11M12 7L16 11" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 17H16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ 
                fontSize: '0.9rem', 
                fontWeight: 800, 
                color: 'var(--text-primary)', 
                fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif",
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                Product Ship
              </span>
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
                    position: 'relative',
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
                  {item.id === 'feature-requests' && unreadCommentsCount > 0 && (
                    <span style={isCollapsed ? {
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'var(--danger, #ef4444)',
                      color: 'white',
                      fontSize: '0.55rem',
                      fontWeight: 900,
                      borderRadius: '50%',
                      width: '12px',
                      height: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    } : {
                      marginLeft: 'auto',
                      backgroundColor: 'var(--danger, #ef4444)',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      padding: '1px 6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '14px',
                      height: '14px'
                    }}>
                      {unreadCommentsCount}
                    </span>
                  )}
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
          {/* Sync buttons — two actions: ClickUp status + full data refresh (hidden from UI) */}
          <div style={{
            display: 'none',
            flexDirection: isCollapsed ? 'column' : 'column',
            gap: '0.4rem'
          }}>
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

              {/* Sound FX & Logout buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={handleToggleAudio}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isMuted ? 'var(--text-muted)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                  }}
                  title={isMuted ? "Unmute Sound FX" : "Mute Sound FX"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
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
          {(() => {
            const isTabDatasetLoading = () => {
              if (isLoading || isRefreshingData) return true;
              if (syncStatus === 'syncing') {
                switch (activeTab) {
                  case 'product': return !loadedTabs.includes('products');
                  case 'plan': return !loadedTabs.includes('plans');
                  case 'projects': return !loadedTabs.includes('projects');
                  case 'meetings': return !loadedTabs.includes('studentMeetings');
                  case 'admin': return !loadedTabs.includes('adminCalls');
                  case 'tarun-meetings': return !loadedTabs.includes('tarunSirMeetings');
                  case 'content': return !loadedTabs.includes('contentItems');
                  case 'product-wise': return false;
                  case 'issues': return !loadedTabs.includes('dailyIssues');
                  case 'feature-requests': return !loadedTabs.includes('dailyIssues');
                  case 'adoption': return !loadedTabs.includes('featureAdoptions');
                  case 'repository': return !loadedTabs.includes('repoDocs');
                  default: return false;
                }
              }
              return false;
            };
            const isDatasetLoading = isTabDatasetLoading();
            return (
              <>
                {isDatasetLoading && !previewProductId ? (
                  <TableSkeleton />
                ) : (
                  <div style={{ display: previewProductId ? 'none' : 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, maxWidth: '100%', flex: 1 }}>
                    {renderActiveView()}
                  </div>
                )}
              </>
            );
          })()}
          {previewProductId && (() => {
            const foundContent = contentItems.find(i => i.id === previewProductId);
            if (foundContent) {
              const mappedItem: ProductItem = {
                id: foundContent.id,
                feature: foundContent.module || '',
                description: foundContent.subject || '',
                tarunSirApproval: false,
                raisedByTarunSir: !!foundContent.raisedByTarunSir,
                priority: (foundContent.priority as any) || '',
                poc: foundContent.poc || '',
                status: (foundContent.status as any) || '',
                clickupStatus: foundContent.clickupStatus || '',
                taskLink: foundContent.draftLink || '',
                blocker: '',
                deadline: foundContent.deadline || '',
                notes: `Type: ${foundContent.type || ''}`,
                product: foundContent.product || '',
                module: foundContent.module || '',
                type: foundContent.type || '',
                uiux: foundContent.uiux || '',
                finalRelease: foundContent.finalRelease || '',
                productDeadline: foundContent.productDeadline || '',
                productDeadlineCompleted: !!foundContent.productDeadlineCompleted,
                uiuxCompleted: !!foundContent.uiuxCompleted,
                deadlineCompleted: !!foundContent.deadlineCompleted,
                finalReleaseCompleted: !!foundContent.finalReleaseCompleted,
                createdAt: foundContent.createdAt || '',
                clickupSubtasksCount: foundContent.clickupSubtasksCount,
                clickupAssignee: foundContent.clickupAssignee || '',
              };

              const handleUpdateContent = (id: string, updated: Partial<ProductItem>) => {
                const updatedContent: Partial<ContentItem> = {};
                if (updated.feature !== undefined) updatedContent.module = updated.feature;
                if (updated.description !== undefined) updatedContent.subject = updated.description;
                if (updated.raisedByTarunSir !== undefined) updatedContent.raisedByTarunSir = updated.raisedByTarunSir;
                if (updated.priority !== undefined) updatedContent.priority = updated.priority as ContentItem['priority'];
                if (updated.poc !== undefined) updatedContent.poc = updated.poc;
                if (updated.status !== undefined) updatedContent.status = updated.status;
                if (updated.clickupStatus !== undefined) updatedContent.clickupStatus = updated.clickupStatus;
                if (updated.taskLink !== undefined) updatedContent.draftLink = updated.taskLink;
                if (updated.deadline !== undefined) updatedContent.deadline = updated.deadline;
                if (updated.product !== undefined) updatedContent.product = updated.product;
                if (updated.module !== undefined) updatedContent.module = updated.module;
                if (updated.type !== undefined) updatedContent.type = updated.type as ContentItem['type'];
                if (updated.uiux !== undefined) updatedContent.uiux = updated.uiux;
                if (updated.finalRelease !== undefined) updatedContent.finalRelease = updated.finalRelease;
                if (updated.productDeadline !== undefined) updatedContent.productDeadline = updated.productDeadline;
                if (updated.productDeadlineCompleted !== undefined) updatedContent.productDeadlineCompleted = updated.productDeadlineCompleted;
                if (updated.uiuxCompleted !== undefined) updatedContent.uiuxCompleted = updated.uiuxCompleted;
                if (updated.deadlineCompleted !== undefined) updatedContent.deadlineCompleted = updated.deadlineCompleted;
                if (updated.finalReleaseCompleted !== undefined) updatedContent.finalReleaseCompleted = updated.finalReleaseCompleted;
                if (updated.createdAt !== undefined) updatedContent.createdAt = updated.createdAt;
                if (updated.clickupSubtasksCount !== undefined) updatedContent.clickupSubtasksCount = updated.clickupSubtasksCount;
                if (updated.clickupAssignee !== undefined) updatedContent.clickupAssignee = updated.clickupAssignee;

                updateContentItem(id, updatedContent);
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
                  onUpdate={handleUpdateContent} 
                />
              );
            }

            const foundIssue = dailyIssues.find(i => i.id === previewProductId);
            if (foundIssue) {
              
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

            const foundItem = productItems.find(i => 
              i.id === previewProductId || 
              (previewProductId.startsWith('prod-temp-') && previewProductId.replace('prod-temp-', '') === i.id) ||
              (i.id.startsWith('prod-temp-') && i.id.replace('prod-temp-', '') === previewProductId)
            );
            
            const handleBack = () => {
              setPreviewProductId(null);
              if (previousTab) {
                setActiveTab(previousTab);
              }
            };

            if (!foundItem) {
              return (
                <div className="premium-workspace animate-fade-in" style={{ padding: '1.5rem', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Top Navigation Bar Skeleton */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button className="btn-back" style={{ width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleBack}>
                        <ChevronLeft size={12} />
                      </button>
                      <div className="skeleton-line" style={{ height: '16px', width: '200px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                    </div>
                    <div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                  </div>

                  {/* Main Split Layout Skeleton */}
                  <div style={{ display: 'flex', gap: '2rem', flex: 1, minHeight: 0 }}>
                    {/* Left Column Skeleton */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '1rem' }}>
                      {/* Feature Title Line */}
                      <div className="skeleton-line" style={{ height: '28px', width: '60%', borderRadius: '6px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      
                      {/* Description Panel */}
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', background: 'var(--panel-bg-alt)' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '30%', marginBottom: '1rem', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '14px', width: '90%', marginBottom: '0.5rem', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '14px', width: '85%', marginBottom: '0.5rem', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '14px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </div>

                      {/* Notes Panel */}
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '20%', marginBottom: '1rem', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '14px', width: '95%', marginBottom: '0.5rem', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '14px', width: '70%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </div>

                      {/* Comments Area Skeleton */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="skeleton-line" style={{ height: '16px', width: '150px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div style={{ height: '40px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--panel-bg-alt)' }}></div>
                      </div>
                    </div>

                    {/* Right Column (Sidebar) Skeleton */}
                    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid var(--border-light)', paddingLeft: '2rem', flexShrink: 0 }}>
                      {/* Sidebar Items */}
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div className="skeleton-line" style={{ height: '12px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                          <div className="skeleton-line" style={{ height: '28px', width: '80%', borderRadius: '6px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

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
      <div className={`micro-toast ${showToast ? 'show' : ''}`}>
        <div className={`micro-toast-icon ${toastType}`}>
          {toastType === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
        </div>
        <span>{toastMessage}</span>
      </div>
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
