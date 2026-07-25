import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { Video, PhoneCall, Crown, ExternalLink, ChevronLeft, ChevronRight, Star } from 'lucide-react';
const isSameStatus = (s1: string | undefined, s2: string | undefined) => {
  if (!s1 || !s2) return false;
  return s1.toLowerCase().trim() === s2.toLowerCase().trim();
};

const DashboardSkeleton = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Skeleton Metrics Strip */}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'hidden', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="animate-pulse" style={{
            flex: '1 0 160px',
            height: '84px',
            backgroundColor: 'var(--background-alt)',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ width: '40%', height: '12px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            <div style={{ width: '80%', height: '24px', backgroundColor: 'var(--border-light)', borderRadius: '6px' }} />
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
        {/* Left Column Skeletons: Tables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse" style={{
              backgroundColor: 'var(--panel-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ width: '25%', height: '20px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ width: '100%', height: '32px', backgroundColor: 'var(--border-light)', borderRadius: '6px' }} />
                {[1, 2, 3].map(j => (
                  <div key={j} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 2, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                    <div style={{ flex: 1, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                    <div style={{ flex: 1, height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column Skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse" style={{
              backgroundColor: 'var(--panel-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ width: '40%', height: '20px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3, 4].map(j => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '50%', height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                    <div style={{ width: '20%', height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardOverview: React.FC = () => {
  const { 
    setActiveTab,
    setPreviewProductId,
    tabScrollPositions,
    setTabScrollPosition,
    statuses: configStatuses,
    
    // Scalable additions
    dashboardCounts,
    isLoadingCounts,
    fetchDashboardCounts,
    fetchDashboardList,
    isLoading
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [popupData, setPopupData] = useState<{ title: string; tasks: any[] } | null>(null);
  const [isPopupLoading, setIsPopupLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripCanScrollLeft, setStripCanScrollLeft] = useState(false);
  const [stripCanScrollRight, setStripCanScrollRight] = useState(false);

  const handleStripScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    setStripCanScrollLeft(el.scrollLeft > 0);
    setStripCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollStrip = (dir: 'left' | 'right') => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  useEffect(() => {
    // Check initial scroll state after layout
    setTimeout(handleStripScroll, 100);
  }, []);

  useEffect(() => {
    const savedScroll = tabScrollPositions['dashboard'] || 0;
    if (savedScroll > 0) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = savedScroll;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setTabScrollPosition('dashboard', e.currentTarget.scrollTop);
  };

  // Date filter state
  const [dateRangeType, setDateRangeType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusType, setStatusType] = useState<'my' | 'clickup'>('my');

  // Trigger counts load when filters change
  useEffect(() => {
    if (isLoading) return;
    fetchDashboardCounts(dateRangeType, customStartDate, customEndDate, statusType);
  }, [dateRangeType, customStartDate, customEndDate, statusType, isLoading]);

  // Dynamic popup loader
  const openPopupList = async (title: string, filters: {
    source?: string;
    poc?: string;
    status?: string;
    statusType?: string;
    productGroup?: string;
    meetingCategory?: string;
  }) => {
    setPopupData({ title, tasks: [] });
    setIsPopupLoading(true);
    try {
      const tasks = await fetchDashboardList(
        filters.source || '',
        filters.poc || '',
        filters.status || '',
        filters.statusType || statusType,
        filters.productGroup || '',
        filters.meetingCategory || '',
        dateRangeType,
        customStartDate,
        customEndDate
      );
      setPopupData({ title, tasks });
    } catch (e) {
      console.error('Failed to load popup list:', e);
    } finally {
      setIsPopupLoading(false);
    }
  };

  const handlePopupTaskClick = (task: any) => {
    if (task.source === 'Student Projects') {
      setActiveTab('projects');
      setPreviewProductId(task.id);
    } else if (task.source === 'Content Pipeline') {
      setActiveTab('content');
      setPreviewProductId(task.id);
    } else if (task.source === 'Daily Issues Log') {
      setActiveTab(task.type === 'Feature Gap' || task.type === 'Enhancement' ? 'feature-requests' : 'issues');
      setPreviewProductId(task.id);
    } else if (task.source === 'AMA & Meetings') {
      setActiveTab('meetings');
      setPreviewProductId(task.id);
    } else {
      setActiveTab('product');
      setPreviewProductId(task.id);
    }
  };

  if (!dashboardCounts || isLoading || isLoadingCounts) {
    return (
      <TabContainer
        title="Dashboard"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search POC..."
      >
        <DashboardSkeleton />
      </TabContainer>
    );
  }

  const getAssigneeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Akash': '#7c3aed',
      'Akash Sharma': '#7c3aed',
      'Anushka': '#db2777',
      'Nikhil': '#0284c7',
      'Nikhil Jain': '#059669',
      'Unassigned': '#6b7280',
      'No POC Assigned': '#6b7280',
    };
    return colors[name] || '#475569';
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unassigned' || name === 'No POC Assigned') return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getSourceClass = (source: string) => {
    const map: Record<string, string> = {
      'Priority Requests': 'priority-requests',
      'Student Projects': 'student-projects',
      'Content Pipeline': 'content-pipeline',
      'AMA & Meetings': 'ama-meetings',
      'Product Breakdown': 'product-breakdown',
      'Admin Calls': 'admin-calls',
      'Daily Issues Log': 'daily-issues',
      'Requested Features': 'priority-requests',
    };
    return map[source] || '';
  };

  const activeStatuses = dashboardCounts?.activeStatuses || [];
  const rows = dashboardCounts?.rows || [];
  const filteredRows = rows.filter((row: any) => {
    if (searchQuery.trim() !== '') {
      return row.poc.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });
  const finalRows = [...filteredRows];
  const productGroupRows = dashboardCounts?.productGroupRows || [];
  const overallTotal = dashboardCounts?.overallTotal || 0;
  const overallClickup = dashboardCounts?.overallClickup || 0;
  const overallStatusTotals = dashboardCounts?.overallStatusTotals || {};
  const overallNoStatus = dashboardCounts?.overallNoStatus || 0;
  const clickupCoverage = overallTotal > 0 ? Math.round((overallClickup / overallTotal) * 100) : 0;

  const consolidatedMeetingRows = (dashboardCounts?.meetingRows || []).map((row: any) => {
    let icon = <Video size={14} style={{ color: 'var(--primary)' }} />;
    if (row.category === 'Admin Meetings') {
      icon = <PhoneCall size={14} style={{ color: 'var(--info)' }} />;
    } else if (row.category === 'Tarun Sir Meetings') {
      icon = <Crown size={14} style={{ color: 'var(--success)' }} />;
    }
    return {
      ...row,
      icon
    };
  });

  return (
    <TabContainer
      title="Dashboard"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search POC..."
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="filter-select"
            value={dateRangeType}
            onChange={(e) => setDateRangeType(e.target.value)}
            style={{ 
              height: '32px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="1month">Last 1 Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="1year">Last 1 Year</option>
            <option value="custom">Custom Range...</option>
          </select>

          {dateRangeType === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', animation: 'fadeIn 0.2s ease' }}>
              <input 
                type="date"
                className="filter-select"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ 
                  height: '32px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>to</span>
              <input 
                type="date"
                className="filter-select"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ 
                  height: '32px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          )}

          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--background-alt)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
            height: '32px',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={() => setStatusType('my')}
              style={{
                height: '100%',
                padding: '0 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: statusType === 'my' ? 'var(--panel-bg)' : 'transparent',
                color: statusType === 'my' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: statusType === 'my' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              My Status
            </button>
            <button
              type="button"
              onClick={() => setStatusType('clickup')}
              style={{
                height: '100%',
                padding: '0 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: statusType === 'clickup' ? 'var(--panel-bg)' : 'transparent',
                color: statusType === 'clickup' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: statusType === 'clickup' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ClickUp Status
            </button>
          </div>
        </div>
      }
    >
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!dashboardCounts && isLoadingCounts ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div 
              ref={scrollRef} 
              onScroll={handleScroll} 
              style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
        
        {/* Status Metrics Strip — flat, arrow-scrollable, no scrollbar */}
        <div style={{
          position: 'relative',
          flexShrink: 0,
          borderTop: '1px solid var(--border-light)',
          borderBottom: '1px solid var(--border-light)',
        }}>
          {/* Left arrow */}
          {stripCanScrollLeft && (
            <button
              onClick={() => scrollStrip('left')}
              style={{
                position: 'absolute',
                left: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                background: 'var(--panel-bg)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--background-alt)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {/* Right arrow */}
          {stripCanScrollRight && (
            <button
              onClick={() => scrollStrip('right')}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px solid var(--border-light)',
                background: 'var(--panel-bg)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--background-alt)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <ChevronRight size={14} />
            </button>
          )}
          <div
            ref={stripRef}
            onScroll={handleStripScroll}
            style={{
              display: 'flex',
              width: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              flexWrap: 'nowrap',
              scrollbarWidth: 'none',    /* hide native scrollbar */
              msOverflowStyle: 'none',
            }}
          >
             {activeStatuses.map((status: any) => {
              const count = overallStatusTotals[status.label] || 0;
              return (
                <div 
                  key={status.id}
                  className="dashboard-clickable-number"
                  onClick={() => openPopupList(`${status.label} Tasks`, { status: status.label, statusType })}
                  style={{
                    flex: '1 1 0px',
                    minWidth: '140px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                    borderRight: '1px solid var(--border-light)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: status.color
                    }} />
                    <span style={{ 
                      fontSize: '0.725rem', 
                      fontWeight: 700, 
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: 800, 
                    color: 'var(--text-primary)',
                    lineHeight: '1.2'
                  }}>
                    {count}
                  </div>
                </div>
              );
            })}
            
            {/* No Status Cell */}
            <div 
              className="dashboard-clickable-number"
              onClick={() => openPopupList(
                statusType === 'my' ? 'No Status Tasks' : 'No ClickUp Status Tasks',
                { status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
              )}
              style={{
                flex: '1 1 0px',
                minWidth: '140px',
                padding: '0.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.15rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: '#6b7280'
                }} />
                <span style={{ 
                  fontSize: '0.725rem', 
                  fontWeight: 700, 
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {statusType === 'my' ? 'No Status' : 'No ClickUp Status'}
                </span>
              </div>
              <div style={{ 
                fontSize: '1.4rem', 
                fontWeight: 800, 
                color: 'var(--text-primary)',
                lineHeight: '1.2'
              }}>
                {overallNoStatus}
              </div>
            </div>

          </div>
        </div>

        {/* POC Breakdown Table */}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem 1rem 0.5rem 1rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
              POC Status & ClickUp Breakdown
            </h3>
          </div>
          
          <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'visible', flex: 'none' }}>
            <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '220px', textAlign: 'left', padding: '10px' }}>POC</th>
                  {activeStatuses.map((status: any) => (
                    <th key={status.id} style={{ textAlign: 'center', padding: '10px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: status.color + '20',
                        color: status.color
                      }}>
                        {status.label}
                      </span>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '10px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(107, 114, 128, 0.15)',
                      color: 'var(--text-muted)'
                    }}>
                      {statusType === 'my' ? 'No Status' : 'No ClickUp Status'}
                    </span>
                  </th>

                  <th style={{ textAlign: 'center', width: '120px', fontWeight: 700, padding: '10px' }}>ClickUp Linked</th>
                  <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Coverage Rate</th>
                </tr>
              </thead>
              <tbody>
                {finalRows.map(row => {
                  const coveragePercent = row.total > 0 ? Math.round((row.clickupCount / row.total) * 100) : 0;
                  
                  return (
                    <tr key={row.poc} style={{ transition: 'background-color 0.2s' }}>
                      <td style={{ fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: getAssigneeColor(row.poc),
                            color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 800
                          }}>
                            {getInitials(row.poc)}
                          </span>
                          <span style={{ color: row.poc === 'No POC Assigned' ? 'var(--text-muted)' : 'var(--text-primary)', fontStyle: row.poc === 'No POC Assigned' ? 'italic' : 'normal' }}>
                            {row.poc}
                          </span>
                        </div>
                      </td>
                      
                      {activeStatuses.map((status: any) => {
                        const count = row.statusCounts[status.label] || 0;
                        return (
                          <td 
                            key={status.id} 
                            className="dashboard-clickable-number"
                            onClick={() => openPopupList(`${status.label} Tasks for ${row.poc}`, { poc: row.poc, status: status.label })}
                            style={{ textAlign: 'center', fontWeight: count > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                          >
                            <span style={{ 
                              color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              opacity: count > 0 ? 1 : 0.45 
                            }}>
                              {count}
                            </span>
                          </td>
                        );
                      })}

                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(
                          statusType === 'my' ? `No Status Tasks for ${row.poc}` : `No ClickUp Status Tasks for ${row.poc}`,
                          { poc: row.poc, status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
                        )}
                        style={{ textAlign: 'center', fontWeight: row.noStatus > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <span style={{ 
                          color: row.noStatus > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          opacity: row.noStatus > 0 ? 1 : 0.45 
                        }}>
                          {row.noStatus}
                        </span>
                      </td>

                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(`ClickUp Tasks for ${row.poc}`, { poc: row.poc, status: 'ClickUp Linked' })}
                        style={{ textAlign: 'center', fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: row.clickupCount > 0 ? 'var(--info)' : 'var(--text-muted)' }}>
                            {row.clickupCount}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {row.total}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: 'var(--background-alt)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-light)'
                          }}>
                            <div style={{
                              width: `${coveragePercent}%`,
                              height: '100%',
                              backgroundColor: coveragePercent > 75 ? 'var(--success)' : coveragePercent > 40 ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-out'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            minWidth: '32px',
                            textAlign: 'right',
                            color: coveragePercent > 75 ? 'var(--success)' : coveragePercent > 40 ? 'var(--warning)' : 'var(--danger)'
                          }}>{coveragePercent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Bottom Overall Totals Row */}
              <tfoot style={{ borderTop: '2px solid var(--border-light)', backgroundColor: 'var(--background-alt)' }}>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ padding: '12px 10px' }}>Overall Totals</td>
                  {activeStatuses.map((status: any) => (
                    <td 
                      key={status.id} 
                      className="dashboard-clickable-number"
                      onClick={() => openPopupList(`All ${status.label} Tasks`, { status: status.label, statusType })}
                      style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px', cursor: 'pointer' }}
                    >
                      {overallStatusTotals[status.label] || 0}
                    </td>
                  ))}
                  <td 
                    className="dashboard-clickable-number"
                    onClick={() => openPopupList(
                      statusType === 'my' ? 'All No Status Tasks' : 'All No ClickUp Status Tasks',
                      { status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
                    )}
                    style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px', cursor: 'pointer' }}
                  >
                    {overallNoStatus}
                  </td>

                  <td 
                    className="dashboard-clickable-number"
                    onClick={() => openPopupList('All ClickUp Linked Tasks', { status: 'ClickUp Linked' })}
                    style={{ textAlign: 'center', color: 'var(--info)', fontSize: '0.95rem', padding: '12px 10px', cursor: 'pointer' }}
                  >
                    {overallClickup} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {overallTotal}</span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: 'var(--background)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-light)'
                      }}>
                        <div style={{
                          width: `${clickupCoverage}%`,
                          height: '100%',
                          backgroundColor: clickupCoverage > 75 ? 'var(--success)' : clickupCoverage > 40 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: '3px'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        minWidth: '32px',
                        textAlign: 'right',
                        color: clickupCoverage > 75 ? 'var(--success)' : clickupCoverage > 40 ? 'var(--warning)' : 'var(--danger)'
                      }}>{clickupCoverage}%</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Product Group Breakdown Table */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem 1rem 0.5rem 1rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
              Product Group Status & ClickUp Breakdown
            </h3>
          </div>
          
          <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'visible', flex: 'none' }}>
            <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '220px', textAlign: 'left', padding: '10px' }}>Product Group</th>
                  {activeStatuses.map((status: any) => (
                    <th key={status.id} style={{ textAlign: 'center', padding: '10px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: status.color + '20',
                        color: status.color
                      }}>
                        {status.label}
                      </span>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '10px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(107, 114, 128, 0.15)',
                      color: 'var(--text-muted)'
                    }}>
                      {statusType === 'my' ? 'No Status' : 'No ClickUp Status'}
                    </span>
                  </th>

                  <th style={{ textAlign: 'center', width: '120px', fontWeight: 700, padding: '10px' }}>ClickUp Linked</th>
                  <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Coverage Rate</th>
                </tr>
              </thead>
              <tbody>
                {productGroupRows.map((row: any) => {
                  const coveragePercent = row.total > 0 ? Math.round((row.clickupCount / row.total) * 100) : 0;
                  
                  return (
                    <tr key={row.productGroup} style={{ transition: 'background-color 0.2s' }}>
                      <td style={{ fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: row.color + '18',
                            color: row.color,
                            border: `1px solid ${row.color}35`,
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                          }}>
                            {row.productGroup}
                          </span>
                        </div>
                      </td>
                      
                      {activeStatuses.map((status: any) => {
                        const count = row.statusCounts[status.label] || 0;
                        return (
                          <td 
                            key={status.id} 
                            className="dashboard-clickable-number"
                            onClick={() => openPopupList(`${status.label} Tasks for ${row.productGroup}`, { productGroup: row.productGroup, status: status.label })}
                            style={{ textAlign: 'center', fontWeight: count > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                          >
                            <span style={{ 
                              color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              opacity: count > 0 ? 1 : 0.45 
                            }}>
                              {count}
                            </span>
                          </td>
                        );
                      })}

                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(
                          statusType === 'my' ? `No Status Tasks for ${row.productGroup}` : `No ClickUp Status Tasks for ${row.productGroup}`,
                          { productGroup: row.productGroup, status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
                        )}
                        style={{ textAlign: 'center', fontWeight: row.noStatus > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <span style={{ 
                          color: row.noStatus > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          opacity: row.noStatus > 0 ? 1 : 0.45 
                        }}>
                          {row.noStatus}
                        </span>
                      </td>

                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(`ClickUp Tasks for ${row.productGroup}`, { productGroup: row.productGroup, status: 'ClickUp Linked' })}
                        style={{ textAlign: 'center', fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: row.clickupCount > 0 ? 'var(--info)' : 'var(--text-muted)' }}>
                            {row.clickupCount}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {row.total}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: 'var(--background-alt)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-light)'
                          }}>
                            <div style={{
                              width: `${coveragePercent}%`,
                              height: '100%',
                              backgroundColor: coveragePercent > 75 ? 'var(--success)' : coveragePercent > 40 ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-out'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            minWidth: '32px',
                            textAlign: 'right',
                            color: coveragePercent > 75 ? 'var(--success)' : coveragePercent > 40 ? 'var(--warning)' : 'var(--danger)'
                          }}>{coveragePercent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Bottom Overall Totals Row */}
              <tfoot style={{ borderTop: '2px solid var(--border-light)', backgroundColor: 'var(--background-alt)' }}>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ padding: '12px 10px' }}>Overall Totals</td>
                  {activeStatuses.map((status: any) => (
                    <td 
                      key={status.id} 
                      className="dashboard-clickable-number"
                      onClick={() => openPopupList(`All ${status.label} Tasks`, { status: status.label, statusType })}
                      style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px', cursor: 'pointer' }}
                    >
                      {overallStatusTotals[status.label] || 0}
                    </td>
                  ))}
                  <td 
                    className="dashboard-clickable-number"
                    onClick={() => openPopupList(
                      statusType === 'my' ? 'All No Status Tasks' : 'All No ClickUp Status Tasks',
                      { status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
                    )}
                    style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px', cursor: 'pointer' }}
                  >
                    {overallNoStatus}
                  </td>

                  <td 
                    className="dashboard-clickable-number"
                    onClick={() => openPopupList('All ClickUp Linked Tasks', { status: 'ClickUp Linked' })}
                    style={{ textAlign: 'center', color: 'var(--info)', fontSize: '0.95rem', padding: '12px 10px', cursor: 'pointer' }}
                  >
                    {overallClickup} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {overallTotal}</span>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: 'var(--background)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-light)'
                      }}>
                        <div style={{
                          width: `${clickupCoverage}%`,
                          height: '100%',
                          backgroundColor: clickupCoverage > 75 ? 'var(--success)' : clickupCoverage > 40 ? 'var(--warning)' : 'var(--danger)',
                          borderRadius: '3px'
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        minWidth: '32px',
                        textAlign: 'right',
                        color: clickupCoverage > 75 ? 'var(--success)' : clickupCoverage > 40 ? 'var(--warning)' : 'var(--danger)'
                      }}>{clickupCoverage}%</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Meetings & AMA Sessions Summary Table */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem 1rem 0.5rem 1rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
              Meetings & AMA Sessions Summary
            </h3>
          </div>
          
          <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'visible', flex: 'none' }}>
            <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '250px', textAlign: 'left', padding: '10px' }}>Category</th>
                  <th style={{ textAlign: 'center', width: '130px', fontWeight: 700, padding: '10px' }}>Average Rating</th>
                  {activeStatuses.map((status: any) => (
                    <th key={status.id} style={{ textAlign: 'center', padding: '10px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: status.color + '20',
                        color: status.color
                      }}>
                        {status.label}
                      </span>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '10px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 'rgba(107, 114, 128, 0.15)',
                      color: 'var(--text-muted)'
                    }}>
                      {statusType === 'my' ? 'No Status' : 'No ClickUp Status'}
                    </span>
                  </th>

                  <th style={{ textAlign: 'center', width: '120px', fontWeight: 700, padding: '10px' }}>ClickUp Linked</th>
                  <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Coverage Rate</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedMeetingRows.map((row: any) => {
                  const coveragePercent = row.featuresCount > 0 ? Math.round((row.clickupCount / row.featuresCount) * 100) : 0;
                  
                  return (
                    <tr key={row.category} style={{ transition: 'background-color 0.2s' }}>
                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(`${row.category} (Calls)`, { source: row.category })}
                        style={{ fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'var(--background-alt)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {row.icon}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {row.category} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85em', marginLeft: '4px' }}>({row.callCount} calls)</span>
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        {(() => {
                          const ratingData = row.rating;
                          if (!ratingData) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>No ratings</span>;
                          return (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              fontWeight: 700,
                              color: '#d97706',
                              backgroundColor: 'rgba(251, 191, 36, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem'
                            }}>
                              {ratingData.avg} <Star size={11} fill="#fbbf24" color="#fbbf24" style={{ position: 'relative', top: '-0.5px' }} />
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.7rem', marginLeft: '2px' }}>
                                ({ratingData.count})
                              </span>
                            </span>
                          );
                        })()}
                      </td>
                      
                      {activeStatuses.map((status: any) => {
                        const count = row.statusCounts[status.label] || 0;
                        return (
                          <td 
                            key={status.id} 
                            className="dashboard-clickable-number"
                            onClick={() => openPopupList(`${status.label} Features for ${row.category}`, { meetingCategory: row.category, status: status.label })}
                            style={{ textAlign: 'center', fontWeight: count > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                          >
                            <span style={{ 
                              color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              opacity: count > 0 ? 1 : 0.45 
                            }}>
                              {count}
                            </span>
                          </td>
                        );
                      })}

                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(
                          statusType === 'my' ? `No Status Features for ${row.category}` : `No ClickUp Status Features for ${row.category}`,
                          { meetingCategory: row.category, status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
                        )}
                        style={{ textAlign: 'center', fontWeight: row.noStatus > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <span style={{ 
                          color: row.noStatus > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          opacity: row.noStatus > 0 ? 1 : 0.45 
                        }}>
                          {row.noStatus}
                        </span>
                      </td>

                      <td 
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(`ClickUp Linked Features for ${row.category}`, { meetingCategory: row.category, status: 'ClickUp Linked' })}
                        style={{ textAlign: 'center', fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: row.clickupCount > 0 ? 'var(--info)' : 'var(--text-muted)' }}>
                            {row.clickupCount}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {row.featuresCount}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: 'var(--background-alt)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-light)'
                          }}>
                            <div style={{
                              width: `${coveragePercent}%`,
                              height: '100%',
                              backgroundColor: coveragePercent > 75 ? 'var(--success)' : coveragePercent > 40 ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-out'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            minWidth: '32px',
                            textAlign: 'right',
                            color: coveragePercent > 75 ? 'var(--success)' : coveragePercent > 40 ? 'var(--warning)' : 'var(--danger)'
                          }}>{coveragePercent}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Bottom Overall Totals Row */}
              <tfoot style={{ borderTop: '2px solid var(--border-light)', backgroundColor: 'var(--background-alt)' }}>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ padding: '12px 10px' }}>Overall Totals</td>
                  <td style={{ padding: '12px 10px' }} />
                  {activeStatuses.map((status: any) => {
                    const count = consolidatedMeetingRows.reduce((sum: number, r: any) => sum + (r.statusCounts[status.label] || 0), 0);
                    return (
                      <td
                        key={status.id}
                        className="dashboard-clickable-number"
                        onClick={() => openPopupList(`All ${status.label} Features (Meetings)`, { meetingCategory: 'all', status: status.label, statusType })}
                        style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px', cursor: 'pointer' }}
                      >
                        {count}
                      </td>
                    );
                  })}
                  <td
                    className="dashboard-clickable-number"
                    onClick={() => openPopupList(
                      statusType === 'my' ? 'All No Status Features (Meetings)' : 'All No ClickUp Status Features (Meetings)',
                      { meetingCategory: 'all', status: statusType === 'my' ? 'No Status' : 'No ClickUp Status', statusType }
                    )}
                    style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px', cursor: 'pointer' }}
                  >
                    {consolidatedMeetingRows.reduce((sum: number, r: any) => sum + (r.noStatus || 0), 0)}
                  </td>
                  {(() => {
                    const totalClickup = consolidatedMeetingRows.reduce((sum: number, r: any) => sum + (r.clickupCount || 0), 0);
                    const totalFeatures = consolidatedMeetingRows.reduce((sum: number, r: any) => sum + (r.featuresCount || 0), 0);
                    const coverage = totalFeatures > 0 ? Math.round((totalClickup / totalFeatures) * 100) : 0;
                    return (
                      <>
                        <td
                          className="dashboard-clickable-number"
                          onClick={() => openPopupList('All ClickUp Linked Features (Meetings)', { meetingCategory: 'all', status: 'ClickUp Linked' })}
                          style={{ textAlign: 'center', color: 'var(--info)', fontSize: '0.95rem', padding: '12px 10px', cursor: 'pointer' }}
                        >
                          {totalClickup} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {totalFeatures}</span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              flex: 1,
                              height: '6px',
                              backgroundColor: 'var(--background)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              border: '1px solid var(--border-light)'
                            }}>
                              <div style={{
                                width: `${coverage}%`,
                                height: '100%',
                                backgroundColor: coverage > 75 ? 'var(--success)' : coverage > 40 ? 'var(--warning)' : 'var(--danger)',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              minWidth: '32px',
                              textAlign: 'right',
                              color: coverage > 75 ? 'var(--success)' : coverage > 40 ? 'var(--warning)' : 'var(--danger)'
                            }}>{coverage}%</span>
                          </div>
                        </td>
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>



            </div>
          </>
        )}

      {popupData && (
        <div 
          className="dashboard-popup-backdrop"
          onClick={() => setPopupData(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="dashboard-popup-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '500px',
              maxWidth: '100%',
              height: '100%',
              backgroundColor: 'var(--panel-bg)',
              boxShadow: 'var(--shadow-lg)',
              borderLeft: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--background-alt)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  {popupData.title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {popupData.tasks.length} task{popupData.tasks.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <button 
                onClick={() => setPopupData(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-alt)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                &times;
              </button>
            </div>

            {/* List of Tasks */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: 'var(--background)',
              justifyContent: 'flex-start',
              alignItems: 'stretch'
            }}>
              {isPopupLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                  {[1, 2, 3, 4].map(idx => (
                    <div key={`popup-skel-${idx}`} className="animate-pulse" style={{
                      padding: '1rem',
                      backgroundColor: 'var(--panel-bg)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ width: '75%', height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                      <div style={{ width: '90%', height: '12px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                          <div style={{ width: '50px', height: '16px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                        </div>
                        <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--border-light)', borderRadius: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : popupData.tasks.length === 0 ? (
                <div style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  No tasks found.
                </div>
              ) : (
                popupData.tasks.map((task, idx) => (
                  <div 
                    key={`${task.id}-${idx}`}
                    onClick={() => {
                      handlePopupTaskClick(task);
                      setPopupData(null); // Close pop-up drawer
                    }}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--panel-bg)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    className="dashboard-popup-task-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {task.feature}
                      </div>
                      {task.taskLink && (
                        <a 
                          href={task.taskLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: 'var(--info)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--background-alt)',
                            border: '1px solid var(--border-light)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border-light)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-alt)'; }}
                          title="Open ClickUp Task"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    {task.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {task.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`dashboard-date-badge-source ${getSourceClass(task.source)}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {task.source}
                        </span>
                        {task.status && (
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: (configStatuses.find(s => isSameStatus(s.label, task.status))?.color || '#8b5cf6') + '20',
                            color: configStatuses.find(s => isSameStatus(s.label, task.status))?.color || '#8b5cf6'
                          }}>
                            {task.status}
                          </span>
                        )}
                        {task.clickupStatus && (
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                          }}>
                            CU: {task.clickupStatus}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {task.date && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {task.date}
                          </span>
                        )}
                        {task.poc && (
                          <div 
                            className="dashboard-date-poc-avatar" 
                            style={{ 
                              backgroundColor: getAssigneeColor(task.poc),
                              width: '20px',
                              height: '20px',
                              fontSize: '0.6rem'
                            }}
                            title={`POC: ${task.poc}`}
                          >
                            {getInitials(task.poc)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </TabContainer>
  );
};
