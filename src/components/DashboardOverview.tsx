import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { Video, PhoneCall, Crown, ChevronLeft, ChevronRight, Star, Table2, LayoutGrid } from 'lucide-react';
const isSameStatus = (s1: string | undefined, s2: string | undefined) => {
  if (!s1 || !s2) return false;
  return s1.toLowerCase().trim() === s2.toLowerCase().trim();
};

const parseDateToYYYYMMDD = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }

  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1].toLowerCase();
    const year = parts[2];
    
    const months: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };
    
    const month = months[monthStr] || '01';
    return `${year}-${month}-${day}`;
  }
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch(e) {}
  
  return dateStr;
};

const getDateSpanStyle = (dateStr: string | undefined, isCompleted: boolean | undefined) => {
  if (!dateStr) return {};
  if (isCompleted) {
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: '4px',
      display: 'inline-block'
    };
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsed = parseDateToYYYYMMDD(dateStr);
    if (parsed) {
      const target = new Date(parsed);
      target.setHours(0, 0, 0, 0);
      if (target < today) {
        return {
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: '4px',
          display: 'inline-block'
        };
      }
    }
  } catch (e) {}
  return {};
};

const getDateDiffDays = (dateStr1: string | undefined, dateStr2: string | undefined): string => {
  if (!dateStr1 || !dateStr2) return '';
  try {
    const d1 = new Date(parseDateToYYYYMMDD(dateStr1));
    const d2 = new Date(parseDateToYYYYMMDD(dateStr2));
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';
    
    d1.setHours(12, 0, 0, 0);
    d2.setHours(12, 0, 0, 0);
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? `+${diffDays}d` : `${diffDays}d`;
  } catch (e) {
    return '';
  }
};

const formatDateToUserPattern = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  try {
    const d = new Date(parseDateToYYYYMMDD(dateStr));
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIndex = d.getMonth();
      const day = d.getDate().toString();
      const formattedDate = `${day} ${monthsFull[monthIndex]} ${year}`;
      
      if (dateStr.includes('T') || dateStr.includes(':')) {
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${formattedDate} @ ${hours}:${minutes} ${ampm}`;
      }
      return formattedDate;
    }
  } catch (e) {}
  
  return dateStr;
};

const DateDiffBadge: React.FC<{ prevDate?: string; currentDate?: string }> = ({ prevDate, currentDate }) => {
  if (!prevDate || !currentDate) return null;
  const diffText = getDateDiffDays(prevDate, currentDate);
  if (!diffText) return null;
  
  const isPositive = diffText.startsWith('+');
  return (
    <span 
      style={{
        position: 'absolute',
        left: '0',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '0.62rem',
        padding: '1px 5px',
        borderRadius: '8px',
        fontWeight: 700,
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-light)',
        color: isPositive ? '#3b82f6' : '#ef4444',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        zIndex: 10,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
      }}
    >
      {diffText}
    </span>
  );
};
const getClickupColor = (status: string) => {
  const s = status.toLowerCase().trim();
  if (['closed', 'done', 'completed', 'delivered', 'complete', 'resolved'].includes(s)) return '#10b981';
  if (['open', 'todo', 'to do', 'backlog', 'unstarted'].includes(s)) return '#6b7280';
  if (['in progress', 'active', 'development', 'dev', 'in design', 'design', 'building'].includes(s)) return '#3b82f6';
  if (['under review', 'review', 'discuss', 'discussing', 'discuss/review', 'in review', 'to review'].includes(s)) return '#f97316';
  if (['testing', 'tested', 'qa', 'quality assurance', 'bug verification'].includes(s)) return '#a855f7';
  if (['on hold', 'hold', 'paused', 'blocked', 'stuck', 'cancelled'].includes(s)) return '#ef4444';
  
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hexColors = ['#7c3aed', '#db2777', '#0284c7', '#059669', '#ea580c', '#e11d48', '#4f46e5', '#0891b2', '#ca8a04'];
  return hexColors[Math.abs(hash) % hexColors.length];
};

const getClickupBadgeStyleLocal = (status: string) => {
  if (!status) return {};
  const color = getClickupColor(status);
  return {
    backgroundColor: color + '20',
    color: color,
    borderColor: color + '30',
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1
  };
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

  const isCompletedStatus = (statusStr: string) => {
    if (!statusStr) return false;
    const s = statusStr.toLowerCase().trim();
    return ['completed', 'delivered', 'done', 'closed', 'tested', 'released'].includes(s);
  };

  const getCompletedCount = (statusCounts: Record<string, number>) => {
    let completed = 0;
    if (statusCounts) {
      Object.entries(statusCounts).forEach(([statusLabel, count]) => {
        if (isCompletedStatus(statusLabel)) {
          completed += count;
        }
      });
    }
    return completed;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [popupFilters, setPopupFilters] = useState<{
    title: string;
    filters: {
      source?: string;
      poc?: string;
      status?: string;
      statusType?: string;
      productGroup?: string;
      meetingCategory?: string;
      doneLast30?: string;
      releaseLast30?: string;
    };
  } | null>(null);

  const [popupTasks, setPopupTasks] = useState<any[]>([]);
  const [popupTotalItems, setPopupTotalItems] = useState(0);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [popupViewMode, setPopupViewMode] = useState<'card' | 'table'>('table');
  const [popupPage, setPopupPage] = useState(1);
  const [popupPageSize, setPopupPageSize] = useState(10);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const popupTasksListRef = useRef<HTMLDivElement>(null);
  const [stripCanScrollLeft, setStripCanScrollLeft] = useState(false);
  const [stripCanScrollRight, setStripCanScrollRight] = useState(false);

  const totalItems = popupTotalItems;
  const totalPages = Math.ceil(totalItems / popupPageSize);
  const startIndex = (popupPage - 1) * popupPageSize;
  const endIndex = Math.min(popupPage * popupPageSize, totalItems);

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
  const [statusType, setStatusType] = useState<'my' | 'clickup'>('clickup');
  const [hideReleased, setHideReleased] = useState(true);

  // Trigger counts load when filters change
  useEffect(() => {
    if (isLoading) return;
    fetchDashboardCounts(dateRangeType, customStartDate, customEndDate, statusType, hideReleased);
  }, [dateRangeType, customStartDate, customEndDate, statusType, hideReleased, isLoading, fetchDashboardCounts]);

  // Dynamic popup loader
  const openPopupList = async (title: string, filters: {
    source?: string;
    poc?: string;
    status?: string;
    statusType?: string;
    productGroup?: string;
    meetingCategory?: string;
    doneLast30?: string;
    releaseLast30?: string;
  }) => {
    setPopupTasks([]);
    setPopupTotalItems(0);
    setPopupPage(1);
    setPopupPageSize(10);
    setPopupFilters({ title, filters });
  };

  useEffect(() => {
    if (!popupFilters) return;

    let active = true;
    const loadPopupData = async () => {
      setIsPopupLoading(true);
      try {
        const extraParams: Record<string, string> = {};
        if (popupFilters.filters.doneLast30) extraParams.doneLast30 = popupFilters.filters.doneLast30;
        if (popupFilters.filters.releaseLast30) extraParams.releaseLast30 = popupFilters.filters.releaseLast30;
        if (hideReleased) extraParams.hideReleased = 'true';

        const res = await fetchDashboardList(
          popupFilters.filters.source || '',
          popupFilters.filters.poc || '',
          popupFilters.filters.status || '',
          popupFilters.filters.statusType || statusType,
          popupFilters.filters.productGroup || '',
          popupFilters.filters.meetingCategory || '',
          dateRangeType,
          customStartDate,
          customEndDate,
          extraParams,
          popupPage,
          popupPageSize
        );

        if (active) {
          setPopupTasks(res.tasks);
          setPopupTotalItems(res.total);
        }
      } catch (e) {
        console.error('Failed to load popup list:', e);
      } finally {
        if (active) {
          setIsPopupLoading(false);
        }
      }
    };

    loadPopupData();
    return () => {
      active = false;
    };
  }, [popupFilters, popupPage, popupPageSize, dateRangeType, customStartDate, customEndDate, statusType, hideReleased, fetchDashboardList]);

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

  const getPOCBadgeStyle = (name: string) => {
    if (!name) return {};
    
    const ASSIGNEE_COLORS: Record<string, { h: number; s: number; l: number }> = {
      'akash': { h: 262, s: 80, l: 60 },      // Purple
      'anushka': { h: 330, s: 75, l: 55 },    // Pink
      'nikhil': { h: 199, s: 98, l: 45 },     // Blue
      'nikhil jain': { h: 162, s: 94, l: 35 },// Green
      'tarun': { h: 0, s: 72, l: 50 },        // Red
      'tarun sir': { h: 0, s: 72, l: 50 },
    };

    const cleanName = name.trim().toLowerCase();
    let colorParts = { h: 215, s: 15, l: 60 }; // Default gray

    if (ASSIGNEE_COLORS[cleanName]) {
      colorParts = ASSIGNEE_COLORS[cleanName];
    } else {
      let found = false;
      for (const key of Object.keys(ASSIGNEE_COLORS)) {
        if (cleanName.includes(key) || key.includes(cleanName)) {
          colorParts = ASSIGNEE_COLORS[key];
          found = true;
          break;
        }
      }
      
      if (!found) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        colorParts = {
          h: Math.abs(hash) % 360,
          s: 65,
          l: 50
        };
      }
    }

    const { h, s } = colorParts;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textLightness = isLight ? 35 : colorParts.l;
    const bgOpacity = isLight ? '0.08' : '0.15';
    const borderOpacity = isLight ? '0.18' : '0.3';

    return {
      backgroundColor: `hsla(${h}, ${s}%, ${textLightness}%, ${bgOpacity})`,
      color: `hsl(${h}, ${s}%, ${textLightness}%)`,
      borderColor: `hsla(${h}, ${s}%, ${textLightness}%, ${borderOpacity})`,
      borderWidth: '1px',
      borderStyle: 'solid',
      padding: '0.2rem 0.5rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      lineHeight: 1
    };
  };

  const formatClickupAssignee = (assigneesStr: string) => {
    if (!assigneesStr) return '';
    const parts = assigneesStr.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) return parts[0] || '';
    return `${parts[0]} +${parts.length - 1}`;
  };

  const getSourceClass = (source: string) => {
    const map: Record<string, string> = {
      'Priority Requests': 'priority-requests',
      'Student Projects': 'student-projects',
      'Content Pipeline': 'content-pipeline',
      'AMA & Meetings': 'ama-meetings',
      'Product Breakdown': 'product-breakdown',
      'Admin Calls': 'admin-calls',
      'Tarun Sir Meetings': 'tarun-meetings',
      'Daily Issues Log': 'daily-issues',
      'Requested Features': 'priority-requests',
    };
    return map[source] || '';
  };

  const activeStatuses = dashboardCounts?.activeStatuses || [];
  const rows = dashboardCounts?.rows || [];
  const filteredRows = rows.filter((row: any) => {
    if (row.total === 0) return false; // hide POCs with no tasks
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
  const overallReleased = dashboardCounts?.overallReleased || 0;
  const releaseRate = overallTotal > 0 ? Math.round((overallReleased / overallTotal) * 100) : 0;

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

        {/* Hide Released Tasks Toggle */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          height: '32px',
          backgroundColor: 'var(--background-alt)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0 10px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: hideReleased ? 'var(--text-primary)' : 'var(--text-secondary)'
        }}
        onClick={() => setHideReleased(!hideReleased)}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.backgroundColor = 'var(--panel-bg)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.backgroundColor = 'var(--background-alt)';
        }}
        >
          <div style={{
            width: '28px',
            height: '16px',
            backgroundColor: hideReleased ? 'var(--primary)' : 'var(--text-muted)',
            borderRadius: '9px',
            position: 'relative',
            transition: 'background-color 0.2s'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#fff',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: hideReleased ? '14px' : '2px',
              transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
          <span>Hide Released Tasks</span>
        </div>

          {/* Release in Last 30 Days note */}
          <div 
            onClick={() => {
              if ((dashboardCounts as any)?.releasedInLast30DaysCount > 0) {
                openPopupList("Tasks Released in Last 30 Days", { releaseLast30: 'true' });
              }
            }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              cursor: ((dashboardCounts as any)?.releasedInLast30DaysCount > 0) ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--background-alt)',
              border: '1px solid var(--border-light)',
              fontWeight: 600,
              userSelect: 'none',
              height: '32px',
              marginLeft: '0.25rem'
            }}
            className="dashboard-header-release-note"
            onMouseEnter={e => {
              if ((dashboardCounts as any)?.releasedInLast30DaysCount > 0) {
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = 'var(--panel-bg)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.backgroundColor = 'var(--background-alt)';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>🚀 <span>Release (Last 30 Days):</span></span>
            <strong style={{ color: 'var(--text-primary)' }}>{(dashboardCounts as any)?.releasedInLast30DaysCount || 0}</strong>
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
                      overflow: 'hidden',
                      textTransform: 'uppercase'
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
                  overflow: 'hidden',
                  textTransform: 'uppercase'
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
                  {!hideReleased && <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Release Rate</th>}
                </tr>
              </thead>
              <tbody>
                {finalRows.map(row => {
                  const releasePercent = row.total > 0 ? Math.round(((row.releasedCount || 0) / row.total) * 100) : 0;
                  
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

                      {!hideReleased && (
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
                                width: `${releasePercent}%`,
                                height: '100%',
                                backgroundColor: releasePercent > 75 ? 'var(--success)' : releasePercent > 40 ? 'var(--warning)' : 'var(--danger)',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease-out'
                              }} />
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              minWidth: '32px',
                              textAlign: 'right',
                              color: releasePercent > 75 ? 'var(--success)' : releasePercent > 40 ? 'var(--warning)' : 'var(--danger)'
                            }}>{releasePercent}%</span>
                          </div>
                        </td>
                      )}
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
                  {!hideReleased && (
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
                            width: `${releaseRate}%`,
                            height: '100%',
                            backgroundColor: releaseRate > 75 ? 'var(--success)' : releaseRate > 40 ? 'var(--warning)' : 'var(--danger)',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          minWidth: '32px',
                          textAlign: 'right',
                          color: releaseRate > 75 ? 'var(--success)' : releaseRate > 40 ? 'var(--warning)' : 'var(--danger)'
                        }}>{releaseRate}%</span>
                      </div>
                    </td>
                  )}
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
                  {!hideReleased && <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Release Rate</th>}
                </tr>
              </thead>
              <tbody>
                {productGroupRows.map((row: any) => {
                  const releasePercent = row.total > 0 ? Math.round(((row.releasedCount || 0) / row.total) * 100) : 0;
                  
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

                      {!hideReleased && (
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
                                width: `${releasePercent}%`,
                                height: '100%',
                                backgroundColor: releasePercent > 75 ? 'var(--success)' : releasePercent > 40 ? 'var(--warning)' : 'var(--danger)',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease-out'
                              }} />
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              minWidth: '32px',
                              textAlign: 'right',
                              color: releasePercent > 75 ? 'var(--success)' : releasePercent > 40 ? 'var(--warning)' : 'var(--danger)'
                            }}>{releasePercent}%</span>
                          </div>
                        </td>
                      )}
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
                  {!hideReleased && (
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
                            width: `${releaseRate}%`,
                            height: '100%',
                            backgroundColor: releaseRate > 75 ? 'var(--success)' : releaseRate > 40 ? 'var(--warning)' : 'var(--danger)',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          minWidth: '32px',
                          textAlign: 'right',
                          color: releaseRate > 75 ? 'var(--success)' : releaseRate > 40 ? 'var(--warning)' : 'var(--danger)'
                        }}>{releaseRate}%</span>
                      </div>
                    </td>
                  )}
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
                  <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Release Rate</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedMeetingRows.map((row: any) => {
                  const releasePercent = row.featuresCount > 0 ? Math.round(((row.releasedCount || 0) / row.featuresCount) * 100) : 0;
                  
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
                              width: `${releasePercent}%`,
                              height: '100%',
                              backgroundColor: releasePercent > 75 ? 'var(--success)' : releasePercent > 40 ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: '3px',
                              transition: 'width 0.5s ease-out'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            minWidth: '32px',
                            textAlign: 'right',
                            color: releasePercent > 75 ? 'var(--success)' : releasePercent > 40 ? 'var(--warning)' : 'var(--danger)'
                          }}>{releasePercent}%</span>
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
                    const totalFeatures = consolidatedMeetingRows.reduce((sum: number, r: any) => sum + (r.featuresCount || 0), 0);
                    const totalCompleted = consolidatedMeetingRows.reduce((sum: number, r: any) => sum + getCompletedCount(r.statusCounts), 0);
                    const totalClickup = consolidatedMeetingRows.reduce((sum: number, r: any) => sum + (r.clickupCount || 0), 0);
                    const overallMeetingsReleaseRate = totalFeatures > 0 ? Math.round((totalCompleted / totalFeatures) * 100) : 0;
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
                                width: `${overallMeetingsReleaseRate}%`,
                                height: '100%',
                                backgroundColor: overallMeetingsReleaseRate > 75 ? 'var(--success)' : overallMeetingsReleaseRate > 40 ? 'var(--warning)' : 'var(--danger)',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              minWidth: '32px',
                              textAlign: 'right',
                              color: overallMeetingsReleaseRate > 75 ? 'var(--success)' : overallMeetingsReleaseRate > 40 ? 'var(--warning)' : 'var(--danger)'
                            }}>{overallMeetingsReleaseRate}%</span>
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

      {popupFilters && (
        <div 
          className="dashboard-popup-backdrop"
          onClick={() => setPopupFilters(null)}
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
              width: popupViewMode === 'table' ? 'min(1150px, 95vw)' : '500px',
              maxWidth: '100%',
              height: '100%',
              backgroundColor: 'var(--panel-bg)',
              boxShadow: 'var(--shadow-lg)',
              borderLeft: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
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
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif" }}>
                  {popupFilters.title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {popupTotalItems} task{popupTotalItems !== 1 ? 's' : ''} found
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* View Mode Toggle */}
                <div style={{
                  display: 'inline-flex',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  padding: '2px'
                }}>
                  <button
                    onClick={() => setPopupViewMode('table')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: popupViewMode === 'table' ? 'var(--panel-bg-alt)' : 'transparent',
                      color: popupViewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: popupViewMode === 'table' ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    <Table2 size={12} />
                    Table
                  </button>
                  <button
                    onClick={() => setPopupViewMode('card')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: popupViewMode === 'card' ? 'var(--panel-bg-alt)' : 'transparent',
                      color: popupViewMode === 'card' ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: popupViewMode === 'card' ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    <LayoutGrid size={12} />
                    Cards
                  </button>
                </div>

                <button 
                  onClick={() => setPopupFilters(null)}
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
            </div>

            {/* List of Tasks */}
            <div 
              ref={popupTasksListRef}
              style={{
                flex: 1,
                overflowY: popupViewMode === 'table' ? 'hidden' : 'auto',
                padding: popupViewMode === 'table' ? '0' : '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: popupViewMode === 'table' ? '0' : '1rem',
                backgroundColor: 'var(--background)',
                justifyContent: 'flex-start',
                alignItems: 'stretch'
              }}
            >
              {isPopupLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', padding: '1.5rem' }}>
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
              ) : popupTotalItems === 0 ? (
                <div style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  No tasks found.
                </div>
              ) : popupViewMode === 'table' ? (
                <div className="table-responsive" style={{ overflow: 'auto', width: '100%', borderRadius: 0, border: 'none' }}>
                  <table className="grid-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', backgroundColor: 'var(--panel-bg)' }}>
                    <thead>
                      <tr>
                        <th className="sticky-header-col" style={{ textAlign: 'left', padding: '12px 10px', width: '320px', minWidth: '320px', maxWidth: '320px' }}>Task Name | Product Name</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '120px', minWidth: '120px', maxWidth: '120px', backgroundColor: 'var(--background-alt)' }}>POC Owner</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '110px', minWidth: '110px', maxWidth: '110px', backgroundColor: 'var(--background-alt)' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '120px', minWidth: '120px', maxWidth: '120px', backgroundColor: 'var(--background-alt)' }}>Clickup Status</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '130px', minWidth: '130px', maxWidth: '130px', backgroundColor: 'var(--background-alt)' }}>Spec Date</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '130px', minWidth: '130px', maxWidth: '130px', backgroundColor: 'var(--background-alt)' }}>UIUX</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '130px', minWidth: '130px', maxWidth: '130px', backgroundColor: 'var(--background-alt)' }}>Dev</th>
                        <th style={{ textAlign: 'left', padding: '12px 10px', width: '130px', minWidth: '130px', maxWidth: '130px', backgroundColor: 'var(--background-alt)' }}>Release</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popupTasks.map((task, idx) => (
                        <tr 
                          key={`${task.id}-${idx}`}
                          onClick={() => {
                            handlePopupTaskClick(task);
                            setPopupFilters(null);
                          }}
                          style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                          className="table-row-hover"
                        >
                          {/* Task Name | Product Name */}
                          <td className="sticky-col" style={{ padding: '12px 10px', textAlign: 'left', width: '320px', minWidth: '320px', maxWidth: '320px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '2px', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                {task.feature}
                              </div>
                              {task.product && (
                                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                  {task.product}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* POC Owner */}
                          <td style={{ padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              {task.poc ? (
                                  <span style={getPOCBadgeStyle(task.poc)}>
                                      {task.poc}
                                  </span>
                              ) : '—'}
                              {task.clickupAssignee && (
                                <div className="cu-tooltip-container">
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                    CU: {formatClickupAssignee(task.clickupAssignee)}
                                  </span>
                                  <span className="cu-tooltip-text" style={{ whiteSpace: 'pre' }}>
                                    {task.clickupAssignee.split(',').map((s: string) => s.trim()).join('\n')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle' }}>
                            {task.status ? (
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
                            ) : '—'}
                          </td>

                          {/* Clickup Status */}
                          <td style={{ padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle' }}>
                            {task.clickupStatus ? (
                              <span style={getClickupBadgeStyleLocal(task.clickupStatus)}>
                                {task.clickupStatus}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Spec Date */}
                          <td style={{ padding: '12px 10px', fontSize: '0.75rem', color: 'var(--text-secondary)', verticalAlign: 'middle', position: 'relative' }}>
                            <DateDiffBadge prevDate={task.createdAt} currentDate={task.productDeadline} />
                            {task.productDeadline ? (
                              <span style={getDateSpanStyle(task.productDeadline, task.productDeadlineCompleted)}>
                                {formatDateToUserPattern(task.productDeadline)}
                              </span>
                            ) : '—'}
                          </td>

                          {/* UIUX */}
                          <td style={{ padding: '12px 10px', fontSize: '0.75rem', color: 'var(--text-secondary)', verticalAlign: 'middle', position: 'relative' }}>
                            <DateDiffBadge prevDate={task.productDeadline || task.createdAt} currentDate={task.uiux} />
                            {task.uiux ? (
                              <span style={getDateSpanStyle(task.uiux, task.uiuxCompleted)}>
                                {formatDateToUserPattern(task.uiux)}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Dev */}
                          <td style={{ padding: '12px 10px', fontSize: '0.75rem', color: 'var(--text-secondary)', verticalAlign: 'middle', position: 'relative' }}>
                            <DateDiffBadge prevDate={task.uiux || task.productDeadline || task.createdAt} currentDate={task.deadline} />
                            {task.deadline ? (
                              <span style={getDateSpanStyle(task.deadline, task.deadlineCompleted)}>
                                {formatDateToUserPattern(task.deadline)}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Release */}
                          <td style={{ padding: '12px 10px', fontSize: '0.75rem', color: 'var(--text-secondary)', verticalAlign: 'middle', position: 'relative' }}>
                            <DateDiffBadge prevDate={task.deadline || task.uiux || task.productDeadline || task.createdAt} currentDate={task.finalRelease} />
                            {task.finalRelease ? (
                              <span style={getDateSpanStyle(task.finalRelease, task.finalReleaseCompleted)}>
                                {formatDateToUserPattern(task.finalRelease)}
                              </span>
                            ) : task.finalReleaseCompleted ? (
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                              }}>
                                Delivered
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                popupTasks.map((task, idx) => (
                  <div 
                    key={`${task.id}-${idx}`}
                    onClick={() => {
                      handlePopupTaskClick(task);
                      setPopupFilters(null); // Close pop-up drawer
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
                    </div>

                    {task.description && (
                      <div title={task.description} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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

            {/* Pagination Controls */}
            {popupFilters && popupTotalItems > 0 && (
              <div style={{
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--panel-bg)',
                borderTop: '1px solid var(--border-light)',
                flexShrink: 0
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Page Size Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Per page:</span>
                    <select
                      value={popupPageSize}
                      onChange={(e) => {
                        setPopupPageSize(Number(e.target.value));
                        setPopupPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Prev / Page / Next Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPopupPage(prev => Math.max(prev - 1, 1));
                        if (popupTasksListRef.current) {
                          popupTasksListRef.current.scrollTop = 0;
                        }
                      }}
                      disabled={popupPage === 1 || totalItems === 0}
                      style={{ 
                        padding: '2px 8px', 
                        fontSize: '0.75rem', 
                        opacity: (popupPage === 1 || totalItems === 0) ? 0.5 : 1, 
                        cursor: (popupPage === 1 || totalItems === 0) ? 'not-allowed' : 'pointer' 
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Page {popupPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPopupPage(prev => Math.min(prev + 1, totalPages));
                        if (popupTasksListRef.current) {
                          popupTasksListRef.current.scrollTop = 0;
                        }
                      }}
                      disabled={popupPage === totalPages || totalItems === 0}
                      style={{ 
                        padding: '2px 8px', 
                        fontSize: '0.75rem', 
                        opacity: (popupPage === totalPages || totalItems === 0) ? 0.5 : 1, 
                        cursor: (popupPage === totalPages || totalItems === 0) ? 'not-allowed' : 'pointer' 
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </TabContainer>
  );
};
