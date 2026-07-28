import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar,
  Search,
  X,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { getClickupBadgeStyle } from './Tables';
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
  source: 'Priority Requests' | 'Student Projects' | 'Content Pipeline' | 'AMA Sessions' | 'Student Meetings' | 'Admin Calls' | 'Tarun Sir Meetings' | 'Daily Issues Log';
  title: string;
  stage: 'Specs' | 'UI/UX' | 'Dev' | 'Final Release' | 'AMA Date' | 'Call Date' | 'Meeting Date' | 'Publish Date' | 'Deadline';
  dateStr: string; // normalized YYYY-MM-DD
  poc: string;
  priority?: string;
  status?: string;
  taskLink?: string;
  rawItem: any;
  tab: string;
  isCompleted: boolean;
}

const isLinkedToMeetingOrCall = (notes: string | undefined) => {
  if (!notes) return false;
  return notes.includes('AMA Session ID:') || notes.includes('Admin Call ID:') || notes.includes('Tarun Sir Meeting ID:');
};

const formatReleaseDate = (rawDate: string | undefined) => {
  if (!rawDate) return 'No date set';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return rawDate;
  return d.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatCommentDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('default', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const cleanDescriptionText = (desc: string): string => {
  if (!desc) return '';
  
  let cleaned = desc;
  
  // Replace Admin Call ID pattern
  cleaned = cleaned.replace(/Admin Call ID:\s*[^\r\n|]+\s*\|\s*Admin Call:\s*([^\r\n]+)/gi, 'Linked to Admin Call: $1');
  
  // Replace AMA Session ID pattern
  cleaned = cleaned.replace(/AMA Session ID:\s*[^\r\n|]+\s*\|\s*(AMA Topic|AMA Session):\s*([^\r\n]+)/gi, 'Linked to AMA Session: $2');
  
  // Replace Tarun Sir Meeting ID pattern
  cleaned = cleaned.replace(/Tarun Sir Meeting ID:\s*[^\r\n|]+\s*\|\s*Tarun Sir Meeting:\s*([^\r\n]+)/gi, 'Linked to Tarun Sir Meeting: $1');
  
  // Strip any raw leftover ID lines if they didn't match the full pattern above
  cleaned = cleaned.replace(/(Admin Call ID|AMA Session ID|Tarun Sir Meeting ID):\s*[^\r\n]+/gi, '');
  
  return cleaned.trim();
};

const getEventDetails = (evt: CalendarEvent) => {
  const item = evt.rawItem || {};
  const name = evt.title || item.feature || item.module || item.title || item.cohortTopic || 'Unnamed Task';
  
  const rawDescription = item.description || item.issues || item.notes || item.topic || item.cohortTopic || item.discussion || '';
  const description = cleanDescriptionText(rawDescription);
  
  // Format release/target date
  const rawDate = item.finalRelease || item.date || item.publishDate || item.deadline || evt.dateStr;
  const releaseDate = formatReleaseDate(rawDate);
  
  const manualStatus = evt.status || item.status || 'Active';
  const clickupStatus = item.clickupStatus || '';
  const pocOwner = evt.poc || item.poc || item.contact || item.speaker || item.adminPoc || 'Unassigned';
  const link = evt.taskLink || item.taskLink || item.link || '';

  return { name, description, releaseDate, manualStatus, clickupStatus, pocOwner, link };
};

const CalendarSkeleton = () => {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      {/* Grid Header (Days of week) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', height: '24px' }}>
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} style={{ height: '14px', backgroundColor: 'var(--border-light)', borderRadius: '4px', margin: 'auto', width: '50%' }} />
        ))}
      </div>
      {/* Grid Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '6px', flex: 1, minHeight: 0 }}>
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} style={{
            backgroundColor: 'var(--background-alt)',
            border: '1px solid var(--border-light)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minHeight: '80px'
          }}>
            <div style={{ width: '20px', height: '14px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
            {i % 3 === 0 && <div style={{ width: '80%', height: '10px', backgroundColor: 'var(--border-light)', borderRadius: '3px' }} />}
            {i % 4 === 0 && <div style={{ width: '60%', height: '10px', backgroundColor: 'var(--border-light)', borderRadius: '3px' }} />}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CalendarView: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const {
    productItems,
    studentProjects,
    amaSessions,
    studentMeetings,
    adminCalls,
    tarunSirMeetings,
    contentItems,
    dailyIssues,
    setActiveTab,
    setPreviewProductId,
    openPreviewForFeature,
    activeTab,
    setPreviousTab,
    sharableCalendarSources,
    currentUser,
    comments,
    addComment,
    updateProductItem,
    updateStudentProject,
    updateContentItem,
    updateDailyIssue,
    updateStudentMeeting,
    updateAdminCall,
    updateAMASession,
    updateTarunSirMeeting,
    
    // Scalable additions
    calendarEvents,
    isLoadingCalendar,
    loadCalendarMonth
  } = useDashboard();

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return toLocalDateStr(new Date());
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublicEvent, setSelectedPublicEvent] = useState<CalendarEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (e: React.MouseEvent, id: string, link: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Drag & drop state
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [rescheduleToast, setRescheduleToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleDragStart = (e: React.DragEvent, evt: CalendarEvent) => {
    if (isPublic) return;
    setDraggedEvent(evt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', evt.id);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDateStr(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    if (isPublic || !draggedEvent) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDateStr !== dateStr) {
      setDragOverDateStr(dateStr);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, dateStr: string) => {
    if (dragOverDateStr === dateStr) {
      setDragOverDateStr(null);
    }
  };

  const handleDropOnDate = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDateStr(null);
    if (!draggedEvent || isPublic) return;
    if (draggedEvent.dateStr === targetDateStr) return;

    const evt = draggedEvent;
    setDraggedEvent(null);

    // Determine target date property based on stage
    let fieldToUpdate = '';
    if (evt.stage === 'Specs') fieldToUpdate = 'productDeadline';
    else if (evt.stage === 'UI/UX') fieldToUpdate = 'uiux';
    else if (evt.stage === 'Dev') fieldToUpdate = 'deadline';
    else if (evt.stage === 'Final Release') fieldToUpdate = 'finalRelease';
    else if (evt.stage === 'Publish Date') fieldToUpdate = 'publishDate';
    else if (evt.stage === 'AMA Date' || evt.stage === 'Call Date' || evt.stage === 'Meeting Date') fieldToUpdate = 'date';
    else fieldToUpdate = 'deadline';

    try {
      if (evt.source === 'Priority Requests') {
        updateProductItem(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'Student Projects') {
        updateStudentProject(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'Content Pipeline') {
        updateContentItem(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'Daily Issues Log') {
        updateDailyIssue(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'Student Meetings') {
        updateStudentMeeting(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'Admin Calls') {
        updateAdminCall(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'AMA Sessions') {
        updateAMASession(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      } else if (evt.source === 'Tarun Sir Meetings') {
        updateTarunSirMeeting(evt.rawItem.id, { [fieldToUpdate]: targetDateStr });
      }

      setRescheduleToast({
        message: `Rescheduled "${evt.title}" (${evt.stage}) to ${targetDateStr}`,
        type: 'success'
      });
      setTimeout(() => setRescheduleToast(null), 3500);

      // Refresh monthly events
      setTimeout(() => {
        loadCalendarMonth(currentMonth.getFullYear(), currentMonth.getMonth());
      }, 300);
    } catch (err: any) {
      console.error('Failed to reschedule milestone:', err);
      setRescheduleToast({ message: 'Failed to reschedule milestone', type: 'error' });
      setTimeout(() => setRescheduleToast(null), 3500);
    }
  };

  // Load monthly calendar events on mount & month navigation
  useEffect(() => {
    loadCalendarMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth, loadCalendarMonth]);

  // 1. Get monthly events from DashboardContext (calendarEvents)
  // Deduplicate by event id as a safety net (a task linked to multiple sessions
  // could otherwise appear more than once).
  const allEvents = useMemo<CalendarEvent[]>(() => {
    const seen = new Set<string>();
    return (calendarEvents || [])
      .filter((evt: CalendarEvent) => {
        if (seen.has(evt.id)) return false;
        seen.add(evt.id);
        return true;
      })
      .sort((a: CalendarEvent, b: CalendarEvent) => {
        if (a.isCompleted && !b.isCompleted) return 1;
        if (!a.isCompleted && b.isCompleted) return -1;
        return 0;
      });
  }, [calendarEvents]);

  // 1b. Collect tasks with no date (Only calculated for public view)
  const undatedTasks = useMemo(() => {
    if (!isPublic) return [];
    const list: { id: string; title: string; source: string; poc: string; priority?: string; status?: string; taskLink?: string; isCompleted: boolean; rawItem?: any }[] = [];
    const allowed = sharableCalendarSources ? sharableCalendarSources.split(',') : [];

    if (allowed.includes('product')) {
      productItems.forEach(item => {
        if (item.id.startsWith('prod-temp-')) return;
        if (isLinkedToMeetingOrCall(item.notes)) return;
        const hasDate = !!parseDateToYYYYMMDD(item.finalRelease);
        if (!hasDate) {
          const isCompleted = !!item.finalReleaseCompleted || isCompletedStatus(item.status);
          list.push({
            id: item.id,
            title: item.feature,
            source: 'Priority Requests',
            poc: item.poc,
            priority: item.priority,
            status: item.status,
            taskLink: item.taskLink,
            isCompleted,
            rawItem: item
          });
        }
      });
    }

    if (allowed.includes('projects')) {
      studentProjects.forEach(item => {
        const hasDate = !!parseDateToYYYYMMDD(item.finalRelease);
        if (!hasDate) {
          const isCompleted = !!item.finalReleaseCompleted || isCompletedStatus(item.status);
          list.push({
            id: item.id,
            title: item.title,
            source: 'Student Projects',
            poc: item.poc || '',
            priority: item.priority,
            status: item.status,
            taskLink: item.taskLink,
            isCompleted,
            rawItem: item
          });
        }
      });
    }

    if (allowed.includes('meetings')) {
      amaSessions.forEach(item => {
        const linked = productItems.filter(p => 
          !p.id.startsWith('prod-temp-') && 
          p.notes && 
          p.notes.includes(`AMA Session ID: ${item.id}`)
        );
        linked.forEach(task => {
          const hasDate = !!parseDateToYYYYMMDD(task.finalRelease);
          if (!hasDate) {
            const isCompleted = !!task.finalReleaseCompleted || isCompletedStatus(task.status);
            list.push({
              id: task.id,
              title: task.feature,
              source: 'AMA Sessions',
              poc: task.poc,
              priority: task.priority,
              status: task.status,
              taskLink: task.taskLink,
              isCompleted,
              rawItem: task
            });
          }
        });
      });
      studentMeetings.forEach(item => {
        const hasDate = !!parseDateToYYYYMMDD(item.finalRelease);
        if (!hasDate) {
          const isCompleted = !!item.finalReleaseCompleted || isCompletedStatus(item.status);
          list.push({
            id: item.id,
            title: item.cohort,
            source: 'Student Meetings',
            poc: item.poc || '',
            priority: item.priority,
            status: item.status,
            taskLink: item.taskLink,
            isCompleted,
            rawItem: item
          });
        }
      });
    }

    if (allowed.includes('admin')) {
      adminCalls.forEach(item => {
        const linked = productItems.filter(p => 
          !p.id.startsWith('prod-temp-') && 
          p.notes && 
          p.notes.includes(`Admin Call ID: ${item.id}`)
        );
        linked.forEach(task => {
          const hasDate = !!parseDateToYYYYMMDD(task.finalRelease);
          if (!hasDate) {
            const isCompleted = !!task.finalReleaseCompleted || isCompletedStatus(task.status);
            list.push({
              id: task.id,
              title: task.feature,
              source: 'Admin Calls',
              poc: task.poc,
              priority: task.priority,
              status: task.status,
              taskLink: task.taskLink,
              isCompleted,
              rawItem: task
            });
          }
        });
      });
    }

    if (allowed.includes('tarun-meetings')) {
      tarunSirMeetings.forEach(item => {
        const linked = productItems.filter(p => 
          !p.id.startsWith('prod-temp-') && 
          p.notes && 
          p.notes.includes(`Tarun Sir Meeting ID: ${item.id}`)
        );
        linked.forEach(task => {
          const hasDate = !!parseDateToYYYYMMDD(task.finalRelease);
          if (!hasDate) {
            const isCompleted = !!task.finalReleaseCompleted || isCompletedStatus(task.status);
            list.push({
              id: task.id,
              title: task.feature,
              source: 'Tarun Sir Meetings',
              poc: task.poc,
              priority: task.priority,
              status: task.status,
              taskLink: task.taskLink,
              isCompleted,
              rawItem: task
            });
          }
        });
      });
    }

    if (allowed.includes('content')) {
      contentItems.forEach(item => {
        const hasDate = !!parseDateToYYYYMMDD(item.publishDate);
        if (!hasDate) {
          const isCompleted = isCompletedStatus(item.status);
          list.push({
            id: item.id,
            title: item.module,
            source: 'Content Pipeline',
            poc: item.poc,
            priority: item.priority,
            status: item.status,
            taskLink: item.draftLink,
            isCompleted,
            rawItem: item
          });
        }
      });
    }

    if (allowed.includes('issues')) {
      dailyIssues.forEach(item => {
        if (item.type === 'Feature Gap' || item.type === 'Enhancement') {
          const hasDate = !!parseDateToYYYYMMDD(item.finalRelease);
          if (!hasDate) {
            const isCompleted = !!item.finalReleaseCompleted || isCompletedStatus(item.status);
            list.push({
              id: item.id,
              title: item.module || `Request #${item.id}`,
              source: 'Priority Requests',
              poc: item.poc || item.contact || '',
              priority: item.priority,
              status: item.status,
              taskLink: item.taskLink,
              isCompleted,
              rawItem: item
            });
          }
        } else {
          const hasDate = !!parseDateToYYYYMMDD(item.deadline);
          if (!hasDate) {
            const isCompleted = !!item.deadlineCompleted || isCompletedStatus(item.status);
            list.push({
              id: item.id,
              title: item.module || `Issue #${item.id}`,
              source: 'Daily Issues Log',
              poc: item.poc || '',
              priority: item.priority,
              status: item.status,
              taskLink: item.taskLink,
              isCompleted,
              rawItem: item
            });
          }
        }
      });
    }

    return list.sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return 0;
    });
  }, [productItems, studentProjects, amaSessions, studentMeetings, adminCalls, tarunSirMeetings, contentItems, dailyIssues, sharableCalendarSources, isPublic]);

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

  const handlePostComment = async (itemId: string) => {
    if (!newCommentText.trim()) return;
    setIsPostingComment(true);
    setCommentError('');
    try {
      const res = await addComment(itemId, newCommentText);
      if (res.success) {
        setNewCommentText('');
      } else {
        setCommentError(res.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Event item selector (opens task drawer)
  const handleEventClick = (evt: CalendarEvent) => {
    if (isPublic) {
      setSelectedPublicEvent(evt);
      return;
    }
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
    const evts = eventsByDate[selectedDateStr] || [];
    return [...evts].sort((a, b) => {
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return 0;
    });
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
        <div className="calendar-dashboard-layout animate-slide-in" style={{
          display: 'grid',
          gridTemplateColumns: isPublic ? '280px 1fr 340px' : '1fr 340px',
          gap: isPublic ? '0' : '1.5rem',
          height: '100%'
        }}>
          
          {/* Left Undated Tasks Panel (Only for Public View) */}
          {isPublic && (
            <div className="calendar-sidebar-panel" style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              background: 'var(--panel-bg)',
              borderRight: '1px solid var(--border-light)',
              borderLeft: 'none',
              borderTop: 'none',
              borderBottom: 'none',
              borderRadius: '0',
              overflow: 'hidden',
              padding: '0'
            }}>
              <div className="calendar-sidebar-header" style={{
                padding: '0.75rem 1.25rem',
                background: 'var(--background-alt)',
                borderBottom: '1px solid var(--border-light)',
                height: '56px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flexShrink: 0,
                boxSizing: 'border-box'
              }}>
                <h4 className="calendar-sidebar-title" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Tasks with No Date</h4>
                <p className="calendar-sidebar-subtitle" style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Visible release-date backlog</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {undatedTasks.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    No undated backlog items.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {undatedTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          const dummyEvent: CalendarEvent = {
                            id: task.id,
                            source: task.source as any,
                            title: task.title,
                            stage: 'Final Release',
                            dateStr: '',
                            poc: task.poc,
                            priority: task.priority,
                            status: task.status,
                            taskLink: task.taskLink,
                            rawItem: task.rawItem || task,
                            tab: '',
                            isCompleted: task.isCompleted
                          };
                          handleEventClick(dummyEvent);
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: task.isCompleted ? 'rgba(16, 185, 129, 0.04)' : 'var(--background-alt)',
                          border: task.isCompleted ? '1px solid var(--success, #10b981)' : '1px solid var(--border-light)',
                          cursor: 'pointer',
                          transition: 'transform 0.15s, background-color 0.15s',
                          opacity: task.isCompleted ? 0.75 : 1
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.backgroundColor = task.isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-elevated)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.backgroundColor = task.isCompleted ? 'rgba(16, 185, 129, 0.04)' : 'var(--background-alt)';
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.775rem', color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '4px' }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className={`badge badge-${task.status ? task.status.toLowerCase().replace(/\s+/g, '-') : 'default'}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>
                            {task.status || 'Active'}
                          </span>
                          {task.priority && (
                            <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>
                              {task.priority}
                            </span>
                          )}
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                            {task.source}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          {task.poc && (
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              POC: {task.poc.split(' ')[0]}
                            </div>
                          )}
                          {task.taskLink && (
                            <button
                              onClick={(e) => handleCopyLink(e, task.id, task.taskLink!)}
                              title={copiedId === task.id ? 'Copied!' : 'Copy ClickUp link'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: copiedId === task.id ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                border: `1px solid ${copiedId === task.id ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-light)'}`,
                                borderRadius: '4px',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: copiedId === task.id ? '#10b981' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                marginLeft: 'auto'
                              }}
                            >
                              {copiedId === task.id
                                ? <><Check size={9} /> Copied</>
                                : <><Copy size={9} /> ClickUp</>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Left Grid Panel */}
          <div className="calendar-grid-panel" style={isPublic ? {
            borderRadius: '0',
            borderRight: '1px solid var(--border-light)',
            borderLeft: 'none',
            borderTop: 'none',
            borderBottom: 'none',
            padding: '0'
          } : undefined}>
          <div className="calendar-header" style={isPublic ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '56px',
            boxSizing: 'border-box'
          } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 className="calendar-title" style={{ margin: 0 }}>
                <Calendar size={18} color="var(--primary)" />
                {currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                {isLoadingCalendar && (
                  <RefreshCw className="animate-spin" size={14} style={{ marginLeft: '8px', color: 'var(--primary)', display: 'inline-block', verticalAlign: 'middle' }} />
                )}
                {overdueCount > 0 && (
                  <span
                    title={`${overdueCount} overdue deadline${overdueCount !== 1 ? 's' : ''} across all sheets`}
                    className="animate-shake-once"
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
                      animation: 'shake 0.55s ease 0.4s 1 both, pulse 2s cubic-bezier(0.4,0,0.6,1) 1s infinite'
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
              <div className="search-input-wrapper" style={{ width: '220px', height: '32px', position: 'relative' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search events, POC..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ height: '100%', fontSize: '0.75rem' }}
                />
                {searchQuery && (
                  <button 
                    className="search-clear-btn" 
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
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

          {isLoadingCalendar ? (
            <div className="calendar-grid-wrapper" style={{ flex: 1, minHeight: 0 }}>
              <CalendarSkeleton />
            </div>
          ) : (
            <div className="calendar-grid-wrapper" style={{ position: 'relative' }}>
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
                          onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                          onDragLeave={(e) => handleDragLeave(e, cell.dateStr)}
                          onDrop={(e) => handleDropOnDate(e, cell.dateStr)}
                          style={{
                            width: '14.28%',
                            verticalAlign: 'top',
                            padding: '6px',
                            cursor: 'pointer',
                            backgroundColor: dragOverDateStr === cell.dateStr ? 'rgba(99, 102, 241, 0.15)' : undefined,
                            outline: dragOverDateStr === cell.dateStr ? '2px dashed var(--primary)' : undefined,
                            transition: 'background-color 0.15s ease, outline 0.15s ease'
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
                                  draggable={!isPublic}
                                  onDragStart={(e) => handleDragStart(e, evt)}
                                  onDragEnd={handleDragEnd}
                                  className={`calendar-mini-event-badge ${getEventClass(evt)}`}
                                  style={{
                                    opacity: draggedEvent?.id === evt.id ? 0.4 : evt.isCompleted ? 0.6 : 1,
                                    cursor: isPublic ? 'pointer' : 'grab'
                                  }}
                                  title={`[${getStageLabel(evt.stage)}] ${evt.title}${evt.isCompleted ? ' ✓' : ''} (Drag to reschedule)`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(evt);
                                  }}
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
          )}
        </div>

        {/* Right Sidebar Panel */}
        <div className="calendar-sidebar-panel" style={isPublic ? {
          borderRadius: '0',
          border: 'none',
          height: '100%',
          width: '100%',
          padding: '0'
        } : undefined}>
          <div className="calendar-sidebar-header" style={isPublic ? {
            padding: '0.75rem 1.25rem',
            background: 'var(--background-alt)',
            borderBottom: '1px solid var(--border-light)',
            height: '56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flexShrink: 0,
            marginBottom: '0',
            boxSizing: 'border-box'
          } : undefined}>
            <h4 className="calendar-sidebar-title">Selected Date</h4>
            <p className="calendar-sidebar-subtitle">{selectedDateLabel}</p>
          </div>

          <div
            key={selectedDateStr}
            className="calendar-sidebar-content-enter"
            style={isPublic ? {
              flex: 1,
              overflowY: 'auto',
              borderTop: 'none',
              padding: '1rem'
            } : {
              flex: 1,
              overflowY: 'auto',
              margin: '0 -1.25rem',
              borderTop: '1px solid var(--border-light)'
            }}
          >
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
                      draggable={!isPublic}
                      onDragStart={(e) => handleDragStart(e, evt)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleEventClick(evt)}
                      style={{ 
                        cursor: isPublic ? 'pointer' : 'grab', 
                        opacity: draggedEvent?.id === evt.id ? 0.4 : evt.isCompleted ? 0.75 : 1,
                        background: evt.isCompleted ? 'rgba(16, 185, 129, 0.04)' : 'transparent'
                      }}
                    >
                      <td style={{ 
                        borderLeft: `3px solid ${evt.isCompleted ? 'var(--success, #10b981)' : getEventColor(evt)}`, 
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
                            background: evt.isCompleted ? 'var(--success, #10b981)' : getEventColor(evt),
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
                          {(evt.taskLink || evt.rawItem?.taskLink) && (
                            <button
                              onClick={(e) => handleCopyLink(e, evt.id, evt.taskLink || evt.rawItem?.taskLink)}
                              title={copiedId === evt.id ? 'Copied!' : 'Copy ClickUp link'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: copiedId === evt.id ? 'rgba(16, 185, 129, 0.12)' : 'var(--background-alt)',
                                border: `1px solid ${copiedId === evt.id ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-light)'}`,
                                borderRadius: '4px',
                                padding: '1px 5px',
                                cursor: 'pointer',
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: copiedId === evt.id ? '#10b981' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                                flexShrink: 0
                              }}
                            >
                              {copiedId === evt.id
                                ? <><Check size={9} /> Copied</>  
                                : <><Copy size={9} /> ClickUp</>}
                            </button>
                          )}
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
        
        {selectedPublicEvent && (() => {
          const details = getEventDetails(selectedPublicEvent);
          const baseId = selectedPublicEvent.rawItem?.id || selectedPublicEvent.id.split('-')[0];
          const taskComments = comments.filter((c: any) => c.itemId === baseId);

          return (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
              fontFamily: 'Outfit, sans-serif'
            }}>
              <div style={{
                background: 'var(--panel-bg)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '2rem', width: '780px', maxWidth: '95%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem'
              }}>
                <button 
                  onClick={() => {
                    setSelectedPublicEvent(null);
                    setCommentError('');
                    setNewCommentText('');
                  }}
                  style={{
                    position: 'absolute', top: '16px', right: '16px', background: 'none',
                    border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%'
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>

                <div>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 850, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--primary)', background: 'var(--primary-glow)',
                    padding: '3px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '0.5rem'
                  }}>
                    {selectedPublicEvent.source}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {details.name}
                  </h3>
                </div>

                {/* Two-Column Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '1.75rem',
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '1.25rem'
                }}>
                  {/* Left Column: Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Description / Notes
                      </h4>
                      <p style={{
                        margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)',
                        lineHeight: 1.5, background: 'var(--background-alt)', padding: '0.75rem 1rem',
                        borderRadius: '8px', border: '1px solid var(--border-light)', whiteSpace: 'pre-wrap',
                        maxHeight: '130px', overflowY: 'auto'
                      }}>
                        {details.description || 'No description provided.'}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Release Date
                        </h4>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {details.releaseDate}
                        </span>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          POC Owner
                        </h4>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {details.pocOwner}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Status (POC)
                        </h4>
                        <span className={`badge badge-${details.manualStatus ? details.manualStatus.toLowerCase().replace(/\s+/g, '-') : 'default'}`} style={{
                          padding: '4px 10px', fontSize: '0.725rem', fontWeight: 700
                        }}>
                          {details.manualStatus || 'Active'}
                        </span>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          ClickUp Status
                        </h4>
                        {details.clickupStatus ? (
                          <span style={{
                            ...getClickupBadgeStyle(details.clickupStatus),
                            padding: '4px 10px', fontSize: '0.725rem', fontWeight: 750, textTransform: 'uppercase', borderRadius: '4px'
                          }}>
                            {details.clickupStatus}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No ClickUp task linked
                          </span>
                        )}
                      </div>
                    </div>

                    {details.link && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                        <a
                          href={details.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{
                            padding: '8px 16px', fontSize: '0.825rem', fontWeight: 600, borderRadius: '8px',
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none'
                          }}
                        >
                          Open ClickUp Task
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Comments/Discussion */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '360px',
                    borderLeft: '1px solid var(--border-light)',
                    paddingLeft: '1.75rem',
                    boxSizing: 'border-box'
                  }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
                      Discussion ({taskComments.length})
                    </h4>

                    {/* Comments list */}
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                      paddingRight: '6px'
                    }}>
                      {taskComments.length === 0 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          textAlign: 'center',
                          padding: '1.5rem',
                          background: 'var(--background-alt)',
                          borderRadius: '8px',
                          border: '1px dashed var(--border-light)',
                          boxSizing: 'border-box'
                        }}>
                          No comments yet.<br/>Be the first to share your thoughts!
                        </div>
                      ) : (
                        taskComments.map((comment: any) => (
                          <div 
                            key={comment.id}
                            style={{
                              background: 'var(--background-alt)',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-light)',
                              fontSize: '0.8rem',
                              lineHeight: 1.4
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.725rem' }}>
                              <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                {comment.authorName}
                              </span>
                              <span style={{ color: 'var(--text-muted)' }}>
                                {formatCommentDate(comment.createdAt || new Date().toISOString())}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                              {comment.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment input */}
                    {currentUser ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          placeholder="Write a comment..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            borderRadius: '8px',
                            background: 'var(--background-alt)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            resize: 'none',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                        {commentError && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--danger, #ef4444)' }}>
                            {commentError}
                          </span>
                        )}
                        <button
                          onClick={() => handlePostComment(baseId)}
                          disabled={isPostingComment || !newCommentText.trim()}
                          className="btn btn-primary"
                          style={{
                            alignSelf: 'flex-end',
                            padding: '6px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isPostingComment ? 'Posting...' : 'Post Comment'}
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '10px 12px',
                        background: 'var(--primary-glow)',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        lineHeight: 1.4
                      }}>
                        Sign in to leave a comment.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {rescheduleToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: rescheduleToast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontWeight: 600,
          fontSize: '0.825rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideInUp 0.2s ease-out'
        }}>
          <span>{rescheduleToast.message}</span>
        </div>
      )}
    </div>
  );
};
