import React, { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar,
  Search
} from 'lucide-react';
import type { ProductItem } from '../types';

// Safe local-timezone date string: avoids UTC shift from .toISOString()
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Helper to normalize any date string to YYYY-MM-DD
const parseDateToYYYYMMDD = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    const [d, m, y] = cleaned.split('-');
    return `${y}-${m}-${d}`;
  }

  const parts = cleaned.split(/\s+/);
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
      sep: '09', september: '09', sept: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };
    
    const month = months[monthStr.slice(0, 3)] || '01';
    if (/^\d{2}$/.test(day) && /^\d{4}$/.test(year)) {
      return `${year}-${month}-${day}`;
    }
  }

  try {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      // Use local date parts to avoid UTC timezone shift
      return toLocalDateStr(d);
    }
  } catch (e) {}

  return '';
};

// Helper to check status equivalence
const isCompletedStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return ['completed', 'delivered', 'done', 'closed', 'tested', 'used', 'published'].includes(s);
};

interface CalendarEvent {
  id: string;
  source: 'Priority Requests' | 'Student Projects' | 'Content Pipeline' | 'AMA Sessions' | 'Student Meetings' | 'Admin Calls' | 'Daily Issues Log';
  title: string;
  stage: 'Specs' | 'UI/UX' | 'Dev' | 'Final Release' | 'AMA Date' | 'Call Date' | 'Publish Date' | 'Deadline';
  dateStr: string; // normalized YYYY-MM-DD
  poc: string;
  priority?: string;
  status?: string;
  taskLink?: string;
  rawItem: any;
  tab: string;
  isCompleted: boolean;
}

export const CalendarView: React.FC = () => {
  const {
    productItems,
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

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return toLocalDateStr(new Date());
  });

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Collect and parse events from all worksheets
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = [];

    const addEvent = (
      id: string,
      source: CalendarEvent['source'],
      title: string,
      stage: CalendarEvent['stage'],
      dateStrRaw: string | undefined,
      isCompleted: boolean,
      poc: string,
      priority: string | undefined,
      taskLink: string | undefined,
      rawItem: any,
      tab: string
    ) => {
      const normalized = parseDateToYYYYMMDD(dateStrRaw);
      if (!normalized) return;

      list.push({
        id: `${id}-${stage}`,
        source,
        title,
        stage,
        dateStr: normalized,
        poc,
        priority,
        status: rawItem.status || '',
        taskLink,
        rawItem,
        tab,
        isCompleted
      });
    };

    // 1. Priority Requests (productItems)
    productItems.forEach(item => {
      if (item.id.startsWith('prod-temp-')) return;
      const isOverallCompleted = isCompletedStatus(item.status);
      addEvent(item.id, 'Priority Requests', item.feature, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
      addEvent(item.id, 'Priority Requests', item.feature, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
      addEvent(item.id, 'Priority Requests', item.feature, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
      addEvent(item.id, 'Priority Requests', item.feature, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
    });

    // 2. Student Projects
    studentProjects.forEach(item => {
      const isOverallCompleted = isCompletedStatus(item.status);
      addEvent(item.id, 'Student Projects', item.title, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
      addEvent(item.id, 'Student Projects', item.title, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
      addEvent(item.id, 'Student Projects', item.title, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
      addEvent(item.id, 'Student Projects', item.title, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
    });

    // 3. AMA Sessions
    amaSessions.forEach(item => {
      addEvent(item.id, 'AMA Sessions', item.topic, 'AMA Date', item.date, isCompletedStatus(item.status), item.speaker, undefined, item.link, item, 'meetings');
    });

    // 4. Student Meetings
    studentMeetings.forEach(item => {
      const isOverallCompleted = isCompletedStatus(item.status);
      addEvent(item.id, 'Student Meetings', item.cohort, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
      addEvent(item.id, 'Student Meetings', item.cohort, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
    });

    // 5. Admin Calls
    adminCalls.forEach(item => {
      addEvent(item.id, 'Admin Calls', item.cohortTopic, 'Call Date', item.date, isCompletedStatus(item.status), item.adminPoc, undefined, undefined, item, 'admin');
    });

    // 6. Content Pipeline
    contentItems.forEach(item => {
      const isOverallCompleted = isCompletedStatus(item.status);
      addEvent(item.id, 'Content Pipeline', item.module, 'Publish Date', item.publishDate, isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
      addEvent(item.id, 'Content Pipeline', item.module, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
    });

    // 7. Daily Issues Log
    dailyIssues.forEach(item => {
      const isOverallCompleted = isCompletedStatus(item.status);
      addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'Deadline', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
    });

    return list;
  }, [productItems, studentProjects, amaSessions, studentMeetings, adminCalls, contentItems, dailyIssues]);

  // 2. Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    const query = searchQuery.toLowerCase().trim();
    return allEvents.filter(evt => 
      evt.title.toLowerCase().includes(query) ||
      evt.poc.toLowerCase().includes(query) ||
      evt.source.toLowerCase().includes(query) ||
      (evt.priority && evt.priority.toLowerCase().includes(query)) ||
      (evt.status && evt.status.toLowerCase().includes(query))
    );
  }, [allEvents, searchQuery]);

  // 3. Group filtered events by date
  const eventsByDate = useMemo<Record<string, CalendarEvent[]>>(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach(evt => {
      if (!groups[evt.dateStr]) {
        groups[evt.dateStr] = [];
      }
      groups[evt.dateStr].push(evt);
    });
    return groups;
  }, [filteredEvents]);

  // 4. Month grid calculations
  const monthData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const startMonth = new Date(year, month, 1);
    const endMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = startMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const totalDays = endMonth.getDate();

    const prevMonthEnd = new Date(year, month, 0);
    const prevMonthDays = prevMonthEnd.getDate();

    const gridCells: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const todayStr = toLocalDateStr(new Date());

    // Previous month offset days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const str = toLocalDateStr(d);
      gridCells.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr
      });
    }

    // Active month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const str = toLocalDateStr(d);
      gridCells.push({
        date: d,
        dateStr: str,
        isCurrentMonth: true,
        isToday: str === todayStr
      });
    }

    // Next month offset days
    const remainingCells = 42 - gridCells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const str = toLocalDateStr(d);
      gridCells.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr
      });
    }

    return gridCells;
  }, [currentMonth]);

  // Chunk monthData into weeks (6 rows of 7 days)
  const weeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < monthData.length; i += 7) {
      rows.push(monthData.slice(i, i + 7));
    }
    return rows;
  }, [monthData]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDateStr(toLocalDateStr(new Date()));
  };

  // Event item selector (opens task drawer)
  const handleEventClick = (evt: CalendarEvent) => {
    setPreviousTab(activeTab);
    setActiveTab(evt.tab);
    setTimeout(() => {
      if (evt.source === 'Priority Requests') {
        setPreviewProductId(evt.rawItem.id);
      } else if (evt.source === 'Student Projects') {
        openPreviewForFeature(evt.title, evt.rawItem as unknown as Partial<ProductItem>);
      } else if (evt.source === 'AMA Sessions') {
        openPreviewForFeature(evt.title, { 
          notes: evt.rawItem.cohort, 
          taskLink: evt.rawItem.link, 
          status: evt.rawItem.status as any 
        });
      } else if (evt.source === 'Student Meetings') {
        openPreviewForFeature(evt.title, evt.rawItem as unknown as Partial<ProductItem>);
      } else if (evt.source === 'Admin Calls') {
        openPreviewForFeature(evt.title, { 
          notes: evt.rawItem.discussion, 
          description: evt.rawItem.actions, 
          status: evt.rawItem.status as any 
        });
      } else if (evt.source === 'Content Pipeline') {
        openPreviewForFeature(evt.title, { 
          type: evt.rawItem.type, 
          poc: evt.rawItem.poc, 
          status: evt.rawItem.status as any, 
          notes: evt.rawItem.subject 
        });
      } else if (evt.source === 'Daily Issues Log') {
        setPreviewProductId(evt.rawItem.id);
      }
    }, 50);
  };

  // Stage-based color palette — makes each milestone type visually distinct
  const STAGE_COLORS: Record<string, { bg: string; label: string; css: string }> = {
    'Specs':         { bg: '#6366f1', label: 'Specs',    css: 'bg-stage-specs' },
    'UI/UX':        { bg: '#ec4899', label: 'UI/UX',    css: 'bg-stage-uiux' },
    'Dev':          { bg: '#3b82f6', label: 'Dev',      css: 'bg-stage-dev' },
    'Final Release':{ bg: '#8b5cf6', label: 'Release',  css: 'bg-stage-release' },
    'Publish Date': { bg: '#8b5cf6', label: 'Publish',  css: 'bg-stage-release' },
    'AMA Date':     { bg: '#f97316', label: 'AMA',      css: 'bg-stage-meeting' },
    'Call Date':    { bg: '#f97316', label: 'Call',     css: 'bg-stage-meeting' },
    'Deadline':     { bg: '#f59e0b', label: 'Deadline', css: 'bg-stage-deadline' },
  };

  const getStageColor = (stage: string): string => {
    return STAGE_COLORS[stage]?.bg || '#6b7280';
  };

  const getStageClass = (stage: string): string => {
    return STAGE_COLORS[stage]?.css || 'bg-stage-specs';
  };

  const getStageLabel = (stage: string): string => {
    return STAGE_COLORS[stage]?.label || stage;
  };

  const getEventClass = (evt: CalendarEvent) => {
    if (evt.isCompleted) return 'bg-completed';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evtDate = new Date(evt.dateStr);
    evtDate.setHours(0, 0, 0, 0);
    if (evtDate < today) return 'bg-overdue';
    return getStageClass(evt.stage);
  };

  const getEventColor = (evt: CalendarEvent) => {
    if (evt.isCompleted) return '#10b981';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evtDate = new Date(evt.dateStr);
    evtDate.setHours(0, 0, 0, 0);
    if (evtDate < today) return '#ef4444';
    return getStageColor(evt.stage);
  };


  const selectedDateEvents = useMemo(() => {
    return eventsByDate[selectedDateStr] || [];
  }, [selectedDateStr, eventsByDate]);

  const selectedDateLabel = useMemo(() => {
    const d = new Date(selectedDateStr);
    if (isNaN(d.getTime())) return selectedDateStr;
    return d.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDateStr]);

  // Count overdue events: not completed, date is before today
  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEvents.filter(evt => {
      if (evt.isCompleted) return false;
      const evtDate = new Date(evt.dateStr);
      evtDate.setHours(0, 0, 0, 0);
      return evtDate < today;
    }).length;
  }, [allEvents]);

  return (
    <div className="full-canvas-workspace">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div className="calendar-dashboard-layout animate-slide-in">
        {/* Left Grid Panel */}
        <div className="calendar-grid-panel">
          <div className="calendar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 className="calendar-title" style={{ margin: 0 }}>
                <Calendar size={18} color="var(--primary)" />
                {currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                {overdueCount > 0 && (
                  <span
                    title={`${overdueCount} overdue deadline${overdueCount !== 1 ? 's' : ''} across all sheets`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: '8px',
                      backgroundColor: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.35)',
                      borderRadius: '999px',
                      padding: '2px 9px 2px 6px',
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      color: '#ef4444',
                      letterSpacing: '0.01em',
                      cursor: 'default',
                      verticalAlign: 'middle',
                      animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
                    }}
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      flexShrink: 0,
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    {overdueCount} overdue
                  </span>
                )}
              </h3>
              <div className="search-input-wrapper" style={{ width: '220px', height: '32px' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search events, POC..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: '100%', fontSize: '0.75rem' }}
                />
              </div>
            </div>
            <div className="calendar-nav-buttons">
              <button className="calendar-nav-btn" onClick={handlePrevMonth}>
                <ChevronLeft size={16} />
              </button>
              <button className="calendar-nav-btn" onClick={handleToday}>
                Today
              </button>
              <button className="calendar-nav-btn" onClick={handleNextMonth}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="calendar-grid-wrapper">
            <table className="grid-table calendar-grid-table" style={{ width: '100%', height: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <th key={day} style={{ textAlign: 'center', width: '14.28%', padding: '6px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, weekIdx) => (
                  <tr key={weekIdx} style={{ height: '16.66%' }}>
                    {week.map(cell => {
                      const dayEvents = eventsByDate[cell.dateStr] || [];
                      const isSelected = cell.dateStr === selectedDateStr;
                      return (
                        <td
                          key={cell.dateStr}
                          className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${cell.isToday ? 'is-today' : ''} ${isSelected ? 'selected-day' : ''}`}
                          onClick={() => setSelectedDateStr(cell.dateStr)}
                          style={{
                            width: '14.28%',
                            verticalAlign: 'top',
                            padding: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}>
                            <div className="calendar-day-header">
                              <span className="calendar-day-number-badge">
                                {cell.date.getDate()}
                              </span>
                            </div>

                            <div className="calendar-day-events-container">
                              {dayEvents.slice(0, 3).map(evt => (
                                <div
                                  key={evt.id}
                                  className={`calendar-mini-event-badge ${getEventClass(evt)}`}
                                  style={{ opacity: evt.isCompleted ? 0.6 : 1 }}
                                  title={`[${getStageLabel(evt.stage)}] ${evt.title}${evt.isCompleted ? ' ✓' : ''}`}
                                >
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '0.5rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.02em',
                                    opacity: 0.85,
                                    marginRight: '3px',
                                    textTransform: 'uppercase'
                                  }}>
                                    {getStageLabel(evt.stage)}
                                  </span>
                                  {evt.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="calendar-more-indicator">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar Panel */}
        <div className="calendar-sidebar-panel">
          <div className="calendar-sidebar-header">
            <h4 className="calendar-sidebar-title">Selected Date</h4>
            <p className="calendar-sidebar-subtitle">{selectedDateLabel}</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', margin: '0 -1.25rem', borderTop: '1px solid var(--border-light)' }}>
            {selectedDateEvents.length === 0 ? (
              <div className="calendar-sidebar-empty-state">
                <div className="calendar-sidebar-empty-icon">
                  <Clock size={20} />
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>No Deadlines</p>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  There are no milestones or calls scheduled for this date.
                </span>
              </div>
            ) : (
              <table className="grid-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--background-alt)' }}>
                    <th style={{ fontSize: '0.65rem', padding: '8px 12px', fontWeight: 700 }}>Task</th>
                    <th style={{ fontSize: '0.65rem', padding: '8px 12px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>POC</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDateEvents.map(evt => (
                    <tr 
                      key={evt.id} 
                      onClick={() => handleEventClick(evt)}
                      style={{ cursor: 'pointer', opacity: evt.isCompleted ? 0.65 : 1 }}
                    >
                      <td style={{ 
                        borderLeft: `3px solid ${getEventColor(evt)}`, 
                        whiteSpace: 'normal', 
                        padding: '8px 12px',
                        verticalAlign: 'top'
                      }}>
                        {/* Stage pill — coloured by milestone type */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                          <span style={{
                            fontSize: '0.525rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: getEventColor(evt),
                            color: '#fff',
                            flexShrink: 0
                          }}>
                            {getStageLabel(evt.stage)}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.775rem', color: 'var(--text-primary)', lineHeight: 1.25 }}>
                            {evt.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', paddingLeft: '2px' }}>
                          <span className={`badge badge-${evt.status ? evt.status.toLowerCase().replace(/\s+/g, '-') : 'default'}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>
                            {evt.status || 'Active'}
                          </span>
                          {evt.priority && (
                            <span className={`badge badge-${evt.priority.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>
                              {evt.priority}
                            </span>
                          )}
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                            {evt.source}
                          </span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        verticalAlign: 'top', 
                        textAlign: 'right', 
                        fontSize: '0.675rem', 
                        fontWeight: 700, 
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap'
                      }}>
                        {evt.poc ? evt.poc.split(' ')[0] : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
