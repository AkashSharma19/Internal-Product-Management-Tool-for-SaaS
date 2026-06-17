import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { Video, PhoneCall, AlertTriangle, Calendar, ExternalLink, CheckCircle } from 'lucide-react';
import type { AMASession, AdminCall } from '../types';

const isSameStatus = (statusA?: string, statusB?: string): boolean => {
  if (!statusA || !statusB) return (statusA || '').trim() === (statusB || '').trim();
  const cleanA = statusA.toLowerCase().trim();
  const cleanB = statusB.toLowerCase().trim();
  if (cleanA === cleanB) return true;

  const completedGroup = ['completed', 'delivered', 'done', 'closed', 'tested', 'used'];
  const onHoldGroup = ['cancelled', 'canceled', 'on hold', 'not used'];
  const inProgressGroup = ['in-progress', 'in progress', 'development', 'testing'];
  const ongoingGroup = ['ongoing'];

  if (completedGroup.includes(cleanA) && completedGroup.includes(cleanB)) return true;
  if (onHoldGroup.includes(cleanA) && onHoldGroup.includes(cleanB)) return true;
  if (inProgressGroup.includes(cleanA) && inProgressGroup.includes(cleanB)) return true;
  if (ongoingGroup.includes(cleanA) && ongoingGroup.includes(cleanB)) return true;

  return false;
};

export const DashboardOverview: React.FC = () => {
  const { 
    productItems, 
    speakers, 
    statuses: configStatuses, 
    amaSessions, 
    adminCalls, 
    productGroups,
    studentProjects,
    contentItems,
    dailyIssues,
    studentMeetings
  } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');

  // Date filter state
  const [dateRangeType, setDateRangeType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusType, setStatusType] = useState<'my' | 'clickup'>('my');

  // 1. Date range filter parsing helper
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleaned = dateStr.trim();
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      const d = new Date(cleaned.slice(0, 10));
      return isNaN(d.getTime()) ? null : d;
    }
    // Check DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}/.test(cleaned)) {
      const [dVal, mVal, yVal] = cleaned.slice(0, 10).split('-');
      const d = new Date(`${yVal}-${mVal}-${dVal}`);
      return isNaN(d.getTime()) ? null : d;
    }
    // Check text pattern (e.g. "12 May 2026")
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 3) {
      const day = parts[0];
      const monthStr = parts[1].toLowerCase().slice(0, 3);
      const year = parts[2];
      const months: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = months[monthStr];
      if (month && /^\d+$/.test(day) && /^\d{4}/.test(year)) {
        const d = new Date(`${year.slice(0, 4)}-${month}-${day.padStart(2, '0')}`);
        return isNaN(d.getTime()) ? null : d;
      }
    }
    // Fallback to standard JS parsing
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  };

  // Determine active start/end dates
  const getFilterDates = (): { start: Date | null; end: Date | null } => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let start: Date | null = null;
    let end: Date | null = null;

    if (dateRangeType === 'all') {
      return { start, end };
    }

    if (dateRangeType === '7days') {
      start = new Date();
      start.setDate(today.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = today;
    } else if (dateRangeType === '1month') {
      start = new Date();
      start.setMonth(today.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end = today;
    } else if (dateRangeType === '3months') {
      start = new Date();
      start.setMonth(today.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      end = today;
    } else if (dateRangeType === '1year') {
      start = new Date();
      start.setFullYear(today.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end = today;
    } else if (dateRangeType === 'custom') {
      if (customStartDate) {
        start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
      }
      if (customEndDate) {
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    return { start, end };
  };

  const { start: filterStart, end: filterEnd } = getFilterDates();

  const isWithinDateRange = (dateStr: string): boolean => {
    if (!filterStart && !filterEnd) return true;
    const parsed = parseDate(dateStr);
    if (!parsed) return false;
    
    if (filterStart && parsed < filterStart) return false;
    if (filterEnd && parsed > filterEnd) return false;
    return true;
  };

  interface DashboardDateItem {
    id: string;
    source: 'Priority Requests' | 'Student Projects' | 'Content Pipeline' | 'AMA & Meetings' | 'Admin Calls' | 'Daily Issues Log' | 'Product Breakdown';
    title: string;
    stage: 'Specs' | 'UI/UX' | 'Dev' | 'Final Release' | 'AMA Date' | 'Call Date' | 'Target Date';
    dateStr: string;
    dateObj: Date;
    poc: string;
    priority?: string;
    taskLink?: string;
    status: string;
  }

  const getRelativeDateString = (date: Date): { text: string; type: 'overdue' | 'today' | 'upcoming' } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const days = Math.abs(diffDays);
      return { text: `${days} day${days > 1 ? 's' : ''} overdue`, type: 'overdue' };
    } else if (diffDays === 0) {
      return { text: 'Today', type: 'today' };
    } else {
      return { text: `In ${diffDays} day${diffDays > 1 ? 's' : ''}`, type: 'upcoming' };
    }
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
    };
    return map[source] || '';
  };

  const collectAllDates = (): DashboardDateItem[] => {
    const list: DashboardDateItem[] = [];

    const addDate = (
      id: string,
      source: DashboardDateItem['source'],
      title: string,
      stage: DashboardDateItem['stage'],
      dateStr: string | undefined,
      isCompleted: boolean,
      poc: string,
      priority?: string,
      taskLink?: string,
      status: string = ''
    ) => {
      if (!dateStr || dateStr.trim() === '') return;
      const parsed = parseDate(dateStr);
      if (!parsed || isCompleted) return;
      
      // Apply date range filter
      if (!isWithinDateRange(dateStr)) return;

      // Apply search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          title.toLowerCase().includes(query) || 
          poc.toLowerCase().includes(query) || 
          stage.toLowerCase().includes(query) || 
          source.toLowerCase().includes(query) ||
          (priority && priority.toLowerCase().includes(query));
        if (!matchesSearch) return;
      }
      
      list.push({
        id: `${id}-${stage}`,
        source,
        title,
        stage,
        dateStr,
        dateObj: parsed,
        poc,
        priority,
        taskLink,
        status
      });
    };

    // 1. ProductItems (Priority Requests / Breakdown / AMA)
    productItems.forEach(item => {
      if (item.id.startsWith('prod-temp-')) return;
      const isRelatedFeature = item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-');
      const isBreakdown = item.id.startsWith('prod-breakdown-');
      const itemSource = isRelatedFeature 
        ? 'AMA & Meetings' 
        : isBreakdown 
          ? 'Product Breakdown' 
          : 'Priority Requests';
          
      const isOverallCompleted = isSameStatus(item.status, 'Completed');
      
      addDate(item.id, itemSource as any, item.feature, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item.status);
      addDate(item.id, itemSource as any, item.feature, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item.status);
      addDate(item.id, itemSource as any, item.feature, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item.status);
      addDate(item.id, itemSource as any, item.feature, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item.status);
    });

    // 2. StudentProjects
    studentProjects.forEach(p => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedProduct = productItems.find(item => {
        const cleanFeature = clean(item.feature);
        const cleanTitle = clean(p.title);
        return cleanFeature === cleanTitle || item.id === `prod-temp-${p.id}`;
      });
      const isOverallCompleted = isSameStatus(p.status, 'Completed');

      addDate(p.id, 'Student Projects', p.title, 'Specs', p.productDeadline, !!p.productDeadlineCompleted || !!matchedProduct?.productDeadlineCompleted || isOverallCompleted, p.poc || '', p.priority, p.taskLink, p.status);
      addDate(p.id, 'Student Projects', p.title, 'UI/UX', p.uiux, !!p.uiuxCompleted || !!matchedProduct?.uiuxCompleted || isOverallCompleted, p.poc || '', p.priority, p.taskLink, p.status);
      addDate(p.id, 'Student Projects', p.title, 'Dev', p.deadline, !!p.deadlineCompleted || !!matchedProduct?.deadlineCompleted || isOverallCompleted, p.poc || '', p.priority, p.taskLink, p.status);
      addDate(p.id, 'Student Projects', p.title, 'Final Release', p.finalRelease, !!p.finalReleaseCompleted || !!matchedProduct?.finalReleaseCompleted || isOverallCompleted, p.poc || '', p.priority, p.taskLink, p.status);
    });

    // 3. StudentMeetings (AMA & Meetings)
    studentMeetings.forEach(m => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedProduct = productItems.find(item => {
        const cleanFeature = clean(item.feature);
        const cleanCohort = clean(m.cohort);
        return cleanFeature === cleanCohort || item.id === `prod-temp-${m.id}`;
      });
      const isOverallCompleted = isSameStatus(m.status, 'Completed');

      addDate(m.id, 'AMA & Meetings', m.cohort, 'Specs', m.productDeadline, !!m.productDeadlineCompleted || !!matchedProduct?.productDeadlineCompleted || isOverallCompleted, m.poc || '', m.priority, m.taskLink, m.status);
      addDate(m.id, 'AMA & Meetings', m.cohort, 'UI/UX', m.uiux, !!m.uiuxCompleted || !!matchedProduct?.uiuxCompleted || isOverallCompleted, m.poc || '', m.priority, m.taskLink, m.status);
      addDate(m.id, 'AMA & Meetings', m.cohort, 'Dev', m.deadline, !!m.deadlineCompleted || !!matchedProduct?.deadlineCompleted || isOverallCompleted, m.poc || '', m.priority, m.taskLink, m.status);
      addDate(m.id, 'AMA & Meetings', m.cohort, 'Final Release', m.finalRelease, !!m.finalReleaseCompleted || !!matchedProduct?.finalReleaseCompleted || isOverallCompleted, m.poc || '', m.priority, m.taskLink, m.status);
    });

    // 4. ContentItems (Content Pipeline)
    contentItems.forEach(c => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedProduct = productItems.find(item => {
        const cleanFeature = clean(item.feature);
        const cleanModule = clean(c.module);
        return cleanFeature === cleanModule || item.id === `prod-temp-${c.id}`;
      });
      const isOverallCompleted = isSameStatus(c.status, 'Completed') || isSameStatus(c.status, 'Published');

      addDate(c.id, 'Content Pipeline', c.module, 'Specs', c.productDeadline, !!c.productDeadlineCompleted || !!matchedProduct?.productDeadlineCompleted || isOverallCompleted, c.poc || '', c.priority, undefined, c.status);
      addDate(c.id, 'Content Pipeline', c.module, 'UI/UX', c.uiux, !!c.uiuxCompleted || !!matchedProduct?.uiuxCompleted || isOverallCompleted, c.poc || '', c.priority, undefined, c.status);
      addDate(c.id, 'Content Pipeline', c.module, 'Dev', c.deadline, !!c.deadlineCompleted || !!matchedProduct?.deadlineCompleted || isOverallCompleted, c.poc || '', c.priority, undefined, c.status);
      addDate(c.id, 'Content Pipeline', c.module, 'Final Release', c.finalRelease, !!c.finalReleaseCompleted || !!matchedProduct?.finalReleaseCompleted || isOverallCompleted, c.poc || '', c.priority, undefined, c.status);
    });

    // 5. DailyIssues (Daily Issues Log)
    dailyIssues.forEach(i => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedProduct = productItems.find(item => {
        const cleanFeature = clean(item.feature);
        const cleanCohort = clean(i.cohort);
        return cleanFeature === cleanCohort || item.id === `prod-temp-${i.id}`;
      });
      const isOverallCompleted = isSameStatus(i.status, 'Completed');

      addDate(i.id, 'Daily Issues Log', i.cohort, 'Specs', i.productDeadline, !!i.productDeadlineCompleted || !!matchedProduct?.productDeadlineCompleted || isOverallCompleted, i.poc || '', i.priority, i.taskLink, i.status);
      addDate(i.id, 'Daily Issues Log', i.cohort, 'UI/UX', i.uiux, !!i.uiuxCompleted || !!matchedProduct?.uiuxCompleted || isOverallCompleted, i.poc || '', i.priority, i.taskLink, i.status);
      addDate(i.id, 'Daily Issues Log', i.cohort, 'Dev', i.deadline, !!i.deadlineCompleted || !!matchedProduct?.deadlineCompleted || isOverallCompleted, i.poc || '', i.priority, i.taskLink, i.status);
      addDate(i.id, 'Daily Issues Log', i.cohort, 'Final Release', i.finalRelease, !!i.finalReleaseCompleted || !!matchedProduct?.finalReleaseCompleted || isOverallCompleted, i.poc || '', i.priority, i.taskLink, i.status);
    });

    // 6. AMASessions (AMA & Meetings)
    amaSessions.forEach(ama => {
      if (ama.status === 'Scheduled') {
        addDate(ama.id, 'AMA & Meetings', `${ama.cohort} - ${ama.topic}`, 'AMA Date', ama.date, false, ama.speaker, undefined, ama.link, ama.status);
      }
    });

    // 7. AdminCalls (Admin Calls)
    adminCalls.forEach(call => {
      if (call.status === 'Scheduled' || call.status === 'Pending Actions') {
        addDate(call.id, 'Admin Calls', call.cohortTopic, 'Call Date', call.date, false, call.adminPoc, undefined, undefined, call.status);
      }
    });

    return list;
  };

  // 2. Map and consolidate all tasks across different lists to avoid double-counting
  const toProductStatus = (status?: string): string => {
    if (!status) return '';
    const cleanStatus = status.toLowerCase();
    if (['completed', 'delivered', 'done', 'closed', 'tested', 'used'].includes(cleanStatus)) return 'Completed';
    if (['cancelled', 'canceled', 'on hold', 'not used'].includes(cleanStatus)) return 'On Hold';
    if (['in-progress', 'in progress', 'development', 'testing'].includes(cleanStatus)) return 'In Progress';
    if (cleanStatus === 'ongoing') return 'Ongoing';
    return status;
  };

  const mainProductTasks = productItems
    .filter(item => {
      if (item.id.startsWith('prod-temp-')) return false;
      
      // Filter out orphaned AMA features
      if (item.id.startsWith('prod-ama-')) {
        if (item.notes && item.notes.includes('AMA Session ID:')) {
          const match = item.notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
          if (match && match[1]) {
            const parentExists = amaSessions.some(ama => ama.id === match[1]);
            if (!parentExists) return false;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      
      // Filter out orphaned Admin Call features
      if (item.id.startsWith('prod-call-')) {
        if (item.notes && item.notes.includes('Admin Call ID:')) {
          const match = item.notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
          if (match && match[1]) {
            const parentExists = adminCalls.some(call => call.id === match[1]);
            if (!parentExists) return false;
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      
      return true;
    })
    .map(item => ({
      id: item.id,
      poc: item.poc || '',
      product: item.product || '',
      status: toProductStatus(item.status),
      clickupStatus: item.clickupStatus || '',
      taskLink: item.taskLink || '',
      date: item.deadline || item.productDeadline || '',
      feature: item.feature || '',
      description: item.description || '',
      notes: item.notes || '',
      module: item.module || ''
    }));

  const projectTasks = studentProjects.map(item => ({
    id: item.id,
    poc: item.poc || '',
    product: item.product || '',
    status: toProductStatus(item.status),
    clickupStatus: item.clickupStatus || '',
    taskLink: item.taskLink || '',
    date: item.deadline || item.productDeadline || item.completeInfoDate || '',
    feature: item.title || '',
    description: item.description || '',
    notes: item.thingsWeBuild || '',
    module: item.module || ''
  }));

  const contentTasks = contentItems.map(item => ({
    id: item.id,
    poc: item.poc || '',
    product: item.product || '',
    status: toProductStatus(item.status),
    clickupStatus: item.clickupStatus || '',
    taskLink: item.draftLink || '',
    date: item.deadline || item.productDeadline || item.publishDate || '',
    feature: item.module || '',
    description: `Content topic: ${item.module}. Subject: ${item.subject || ''}. Type: ${item.type}.`,
    notes: item.subject || '',
    module: item.module || ''
  }));

  const issueTasks = dailyIssues.map(item => ({
    id: item.id,
    poc: item.poc || item.contact || '',
    product: item.product || '',
    status: toProductStatus(item.status),
    clickupStatus: item.clickupStatus || '',
    taskLink: item.taskLink || '',
    date: item.deadline || item.productDeadline || '',
    feature: item.module || `Issue #${item.id}`,
    description: item.issues || '',
    notes: item.notes || item.issues || '',
    module: item.module || ''
  }));

  const meetingTasks = studentMeetings.map(item => ({
    id: item.id,
    poc: item.poc || '',
    product: item.product || '',
    status: toProductStatus(item.status),
    clickupStatus: item.clickupStatus || '',
    taskLink: item.taskLink || '',
    date: item.deadline || item.productDeadline || item.date || '',
    feature: item.cohort || '',
    description: item.summary || '',
    notes: item.notes || item.summary || '',
    module: item.module || ''
  }));

  const allUnifiedTasks = [
    ...mainProductTasks,
    ...projectTasks,
    ...contentTasks,
    ...issueTasks,
    ...meetingTasks
  ];

  const validItems = allUnifiedTasks.filter(item => isWithinDateRange(item.date));

  // Get active statuses for product scope
  const productStatuses = configStatuses.filter(s => s.scope === 'product' || s.scope === 'all');

  // Determine active columns depending on selected statusType
  const activeStatuses = statusType === 'my'
    ? productStatuses.map(s => ({ id: s.id, label: s.label, color: s.color }))
    : (() => {
        // Dynamically collect unique clickup statuses from validItems
        const unique = Array.from(new Set(validItems.map(item => item.clickupStatus).filter(s => s && s.trim() !== '')));
        
        // Let's sort them nicely so closed/done/completed are at the end, and todo/open are at the start
        const orderWeight = (status: string) => {
          const s = status.toLowerCase();
          if (s === 'open' || s === 'todo' || s === 'to do' || s === 'backlog') return 1;
          if (s === 'closed' || s === 'done' || s === 'completed' || s === 'delivered') return 9;
          if (s === 'testing' || s === 'review') return 5;
          return 3; // default for In Progress, development, etc.
        };
        unique.sort((a, b) => orderWeight(a) - orderWeight(b) || a.localeCompare(b));

        const getClickupColor = (status: string) => {
          const s = status.toLowerCase();
          if (s === 'closed' || s === 'done' || s === 'completed' || s === 'delivered') return '#10b981';
          if (s === 'open' || s === 'todo' || s === 'to do' || s === 'backlog') return '#6b7280';
          if (s === 'in progress' || s === 'active' || s === 'development') return '#3b82f6';
          return '#8b5cf6';
        };

        return unique.map((status, idx) => ({
          id: `clickup-${idx}`,
          label: status,
          color: getClickupColor(status)
        }));
      })();

  // 3. Identify all unique POC names (from config speakers & actual data items)
  const configuredSpeakers = speakers.map(s => s.name);
  const dataPocs = Array.from(new Set(validItems.map(item => item.poc).filter(p => p && p.trim() !== '')));
  const allPocs = [...Array.from(new Set([...configuredSpeakers, ...dataPocs])), 'No POC Assigned'];

  // 4. Compute counts for each POC
  const computedRows = allPocs.map(poc => {
    const pocItems = poc === 'No POC Assigned'
      ? validItems.filter(item => !item.poc || item.poc.trim() === '')
      : validItems.filter(item => item.poc === poc);
    
    const statusCounts: Record<string, number> = {};
    activeStatuses.forEach(status => {
      if (statusType === 'my') {
        statusCounts[status.label] = pocItems.filter(item => isSameStatus(item.status, status.label)).length;
      } else {
        statusCounts[status.label] = pocItems.filter(item => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
      }
    });

    const noStatus = statusType === 'my'
      ? pocItems.filter(item => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
      : pocItems.filter(item => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;
    const total = pocItems.length;
    const clickupCount = pocItems.filter(item => item.taskLink && item.taskLink.trim() !== '').length;

    return {
      poc,
      statusCounts,
      noStatus,
      total,
      clickupCount,
    };
  });

  // Filter rows based on search query matching POC name
  const filteredRows = computedRows.filter(row => {
    if (searchQuery.trim() !== '') {
      return row.poc.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const finalRows = [...filteredRows];

  // 5. Calculate overall totals for the bottom summary row
  const overallTotal = validItems.length;
  const overallClickup = validItems.filter(item => item.taskLink && item.taskLink.trim() !== '').length;
  
  const overallStatusTotals: Record<string, number> = {};
  activeStatuses.forEach(status => {
    if (statusType === 'my') {
      overallStatusTotals[status.label] = validItems.filter(item => isSameStatus(item.status, status.label)).length;
    } else {
      overallStatusTotals[status.label] = validItems.filter(item => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
    }
  });

  const overallNoStatus = statusType === 'my'
    ? validItems.filter(item => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
    : validItems.filter(item => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;
  const clickupCoverage = overallTotal > 0 ? Math.round((overallClickup / overallTotal) * 100) : 0;

  // Helper styles matching user initials
  const getAssigneeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Akash': '#7c3aed',
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

  // 5.5 Product Groups Calculations
  const configuredProductGroups = productGroups.map(g => g.name);
  const dataProductGroups = Array.from(new Set(validItems.map(item => item.product).filter(p => p && p.trim() !== '')));
  const allProductGroups = [...Array.from(new Set([...configuredProductGroups, ...dataProductGroups])), 'No Product Group Assigned'];

  const productGroupRows = allProductGroups.map(prodGroup => {
    const prodItems = prodGroup === 'No Product Group Assigned'
      ? validItems.filter(item => !item.product || item.product.trim() === '')
      : validItems.filter(item => item.product === prodGroup);

    const statusCounts: Record<string, number> = {};
    activeStatuses.forEach(status => {
      if (statusType === 'my') {
        statusCounts[status.label] = prodItems.filter(item => isSameStatus(item.status, status.label)).length;
      } else {
        statusCounts[status.label] = prodItems.filter(item => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
      }
    });

    const noStatus = statusType === 'my'
      ? prodItems.filter(item => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
      : prodItems.filter(item => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;
    const total = prodItems.length;
    const clickupCount = prodItems.filter(item => item.taskLink && item.taskLink.trim() !== '').length;

    // Get color for the product group
    const matchedGroup = productGroups.find(g => g.name === prodGroup);
    const color = matchedGroup ? matchedGroup.color : '#6b7280';

    return {
      productGroup: prodGroup,
      color,
      statusCounts,
      noStatus,
      total,
      clickupCount,
    };
  });

  // 6. Meetings & AMA Sessions Calculations
  const filteredAmaSessions = amaSessions.filter(ama => isWithinDateRange(ama.date));
  const filteredAdminCalls = adminCalls.filter(call => isWithinDateRange(call.date));

  const getAmaRelatedFeatures = (ama: AMASession) => {
    return validItems.filter(item => 
      item.notes && 
      item.notes.includes(`AMA Session ID: ${ama.id}`)
    );
  };

  const getAdminCallRelatedFeatures = (call: AdminCall) => {
    return validItems.filter(item => 
      item.notes && 
      item.notes.includes(`Admin Call ID: ${call.id}`)
    );
  };

  // Get all unique related features for filtered AMAs
  const allAmaFeatures: any[] = [];
  filteredAmaSessions.forEach(ama => {
    const feats = getAmaRelatedFeatures(ama);
    feats.forEach(f => {
      if (!allAmaFeatures.some(x => x.id === f.id)) {
        allAmaFeatures.push(f);
      }
    });
  });

  // Get all unique related features for filtered Admin Calls
  const allAdminFeatures: any[] = [];
  filteredAdminCalls.forEach(call => {
    const feats = getAdminCallRelatedFeatures(call);
    feats.forEach(f => {
      if (!allAdminFeatures.some(x => x.id === f.id)) {
        allAdminFeatures.push(f);
      }
    });
  });

  const meetingRows = [
    {
      category: 'AMA Sessions',
      icon: <Video size={14} style={{ color: 'var(--primary)' }} />,
      features: allAmaFeatures,
      clickupCount: allAmaFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
      callCount: filteredAmaSessions.length,
    },
    {
      category: 'Admin Meetings',
      icon: <PhoneCall size={14} style={{ color: 'var(--info)' }} />,
      features: allAdminFeatures,
      clickupCount: allAdminFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
      callCount: filteredAdminCalls.length,
    }
  ];
  const allDateItems = collectAllDates();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const overdueItems = allDateItems
    .filter(item => item.dateObj < todayStart)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const upcomingItems = allDateItems
    .filter(item => item.dateObj >= todayStart)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  return (
    <TabContainer
      title="Dashboard"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search POC..."
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Presets dropdown */}
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

          {/* Custom Date Inputs */}
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

          {/* Status switcher segment control */}
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
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
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
                  {activeStatuses.map(status => (
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
                  <th style={{ textAlign: 'center', width: '100px', fontWeight: 700, padding: '10px' }}>Total Tasks</th>
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
                      
                      {activeStatuses.map(status => {
                        const count = row.statusCounts[status.label] || 0;
                        return (
                          <td key={status.id} style={{ textAlign: 'center', fontWeight: count > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                            <span style={{ 
                              color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              opacity: count > 0 ? 1 : 0.45 
                            }}>
                              {count}
                            </span>
                          </td>
                        );
                      })}

                      <td style={{ textAlign: 'center', fontWeight: row.noStatus > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ 
                          color: row.noStatus > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          opacity: row.noStatus > 0 ? 1 : 0.45 
                        }}>
                          {row.noStatus}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        {row.total}
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
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
                  {activeStatuses.map(status => (
                    <td key={status.id} style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px' }}>
                      {overallStatusTotals[status.label] || 0}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px' }}>
                    {overallNoStatus}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '0.95rem', padding: '12px 10px' }}>{overallTotal}</td>
                  <td style={{ textAlign: 'center', color: 'var(--info)', fontSize: '0.95rem', padding: '12px 10px' }}>
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
                  {activeStatuses.map(status => (
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
                  <th style={{ textAlign: 'center', width: '100px', fontWeight: 700, padding: '10px' }}>Total Tasks</th>
                  <th style={{ textAlign: 'center', width: '120px', fontWeight: 700, padding: '10px' }}>ClickUp Linked</th>
                  <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Coverage Rate</th>
                </tr>
              </thead>
              <tbody>
                {productGroupRows.map(row => {
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
                      
                      {activeStatuses.map(status => {
                        const count = row.statusCounts[status.label] || 0;
                        return (
                          <td key={status.id} style={{ textAlign: 'center', fontWeight: count > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                            <span style={{ 
                              color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              opacity: count > 0 ? 1 : 0.45 
                            }}>
                              {count}
                            </span>
                          </td>
                        );
                      })}

                      <td style={{ textAlign: 'center', fontWeight: row.noStatus > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ 
                          color: row.noStatus > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          opacity: row.noStatus > 0 ? 1 : 0.45 
                        }}>
                          {row.noStatus}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        {row.total}
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
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
                  {activeStatuses.map(status => (
                    <td key={status.id} style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px' }}>
                      {overallStatusTotals[status.label] || 0}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '12px 10px' }}>
                    {overallNoStatus}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '0.95rem', padding: '12px 10px' }}>{overallTotal}</td>
                  <td style={{ textAlign: 'center', color: 'var(--info)', fontSize: '0.95rem', padding: '12px 10px' }}>
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
                  {activeStatuses.map(status => (
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
                  <th style={{ textAlign: 'center', width: '120px', fontWeight: 700, padding: '10px' }}>Total Features</th>
                  <th style={{ textAlign: 'center', width: '120px', fontWeight: 700, padding: '10px' }}>ClickUp Linked</th>
                  <th style={{ width: '150px', fontWeight: 700, padding: '10px', textAlign: 'left' }}>Coverage Rate</th>
                </tr>
              </thead>
              <tbody>
                {meetingRows.map(row => {
                  const coveragePercent = row.features.length > 0 ? Math.round((row.clickupCount / row.features.length) * 100) : 0;
                  return (
                    <tr key={row.category} style={{ transition: 'background-color 0.2s' }}>
                      <td style={{ fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
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
                      
                      {activeStatuses.map(status => {
                        const count = statusType === 'my'
                          ? row.features.filter(item => isSameStatus(item.status, status.label)).length
                          : row.features.filter(item => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
                        return (
                          <td key={status.id} style={{ textAlign: 'center', fontWeight: count > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                            <span style={{ 
                              color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                              opacity: count > 0 ? 1 : 0.45 
                            }}>
                              {count}
                            </span>
                          </td>
                        );
                      })}

                      <td style={{ textAlign: 'center', fontWeight: row.features.filter(item => {
                        const val = statusType === 'my' ? item.status : item.clickupStatus;
                        if (statusType === 'my') {
                          return !val || val.trim() === '' || !activeStatuses.some(status => isSameStatus(val, status.label));
                        } else {
                          return !val || val.trim() === '' || !activeStatuses.some(status => val.toLowerCase().trim() === status.label.toLowerCase().trim());
                        }
                      }).length > 0 ? 600 : 400, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ 
                          color: row.features.filter(item => {
                            const val = statusType === 'my' ? item.status : item.clickupStatus;
                            if (statusType === 'my') {
                              return !val || val.trim() === '' || !activeStatuses.some(status => isSameStatus(val, status.label));
                            } else {
                              return !val || val.trim() === '' || !activeStatuses.some(status => val.toLowerCase().trim() === status.label.toLowerCase().trim());
                            }
                          }).length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                          opacity: row.features.filter(item => {
                            const val = statusType === 'my' ? item.status : item.clickupStatus;
                            if (statusType === 'my') {
                              return !val || val.trim() === '' || !activeStatuses.some(status => isSameStatus(val, status.label));
                            } else {
                              return !val || val.trim() === '' || !activeStatuses.some(status => val.toLowerCase().trim() === status.label.toLowerCase().trim());
                            }
                          }).length > 0 ? 1 : 0.45 
                        }}>
                          {row.features.filter(item => {
                            const val = statusType === 'my' ? item.status : item.clickupStatus;
                            if (statusType === 'my') {
                              return !val || val.trim() === '' || !activeStatuses.some(status => isSameStatus(val, status.label));
                            } else {
                              return !val || val.trim() === '' || !activeStatuses.some(status => val.toLowerCase().trim() === status.label.toLowerCase().trim());
                            }
                          }).length}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        {row.features.length}
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 600, padding: '12px 10px', borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: row.clickupCount > 0 ? 'var(--info)' : 'var(--text-muted)' }}>
                            {row.clickupCount}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {row.features.length}</span>
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
            </table>
          </div>
        </div>

        {/* Overdue & Upcoming Dates Sections */}
        <div className="dashboard-date-grid">
          
          {/* Overdue Dates Card */}
          <div className="dashboard-date-card">
            <div className="dashboard-date-card-header">
              <h4 className="dashboard-date-card-title">
                <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                <span>Overdue Milestones</span>
              </h4>
              <span className="dashboard-date-count-badge overdue">
                {overdueItems.length} overdue
              </span>
            </div>

            <div className="dashboard-date-list">
              {overdueItems.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={28} style={{ color: 'var(--success)' }} />
                  <span>All caught up! No overdue milestones.</span>
                </div>
              ) : (
                overdueItems.map(item => {
                  const relative = getRelativeDateString(item.dateObj);
                  return (
                    <div key={item.id} className="dashboard-date-item">
                      <div className="dashboard-date-item-left">
                        <div className="dashboard-date-item-title" title={item.title}>
                          {item.title}
                        </div>
                        <div className="dashboard-date-item-meta">
                          <span className={`dashboard-date-badge-source ${getSourceClass(item.source)}`}>
                            {item.source}
                          </span>
                          <span className="dashboard-date-badge-stage">
                            {item.stage}
                          </span>
                          {item.priority && (
                            <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="dashboard-date-item-right">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span className="dashboard-date-relative overdue">
                            {relative.text}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Due: {item.dateStr}
                          </span>
                        </div>
                        
                        {item.poc && (
                          <div 
                            className="dashboard-date-poc-avatar" 
                            style={{ backgroundColor: getAssigneeColor(item.poc) }}
                            title={`POC: ${item.poc}`}
                          >
                            {getInitials(item.poc)}
                          </div>
                        )}

                        {item.taskLink && (
                          <a 
                            href={item.taskLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }}
                            title="Open ClickUp Task"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Dates Card */}
          <div className="dashboard-date-card">
            <div className="dashboard-date-card-header">
              <h4 className="dashboard-date-card-title">
                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                <span>Upcoming Milestones</span>
              </h4>
              <span className="dashboard-date-count-badge upcoming">
                {upcomingItems.length} upcoming
              </span>
            </div>

            <div className="dashboard-date-list">
              {upcomingItems.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Calendar size={28} style={{ color: 'var(--text-muted)' }} />
                  <span>No upcoming milestones scheduled.</span>
                </div>
              ) : (
                upcomingItems.map(item => {
                  const relative = getRelativeDateString(item.dateObj);
                  return (
                    <div key={item.id} className="dashboard-date-item">
                      <div className="dashboard-date-item-left">
                        <div className="dashboard-date-item-title" title={item.title}>
                          {item.title}
                        </div>
                        <div className="dashboard-date-item-meta">
                          <span className={`dashboard-date-badge-source ${getSourceClass(item.source)}`}>
                            {item.source}
                          </span>
                          <span className="dashboard-date-badge-stage">
                            {item.stage}
                          </span>
                          {item.priority && (
                            <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="dashboard-date-item-right">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span className={`dashboard-date-relative ${relative.type}`}>
                            {relative.text}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Due: {item.dateStr}
                          </span>
                        </div>

                        {item.poc && (
                          <div 
                            className="dashboard-date-poc-avatar" 
                            style={{ backgroundColor: getAssigneeColor(item.poc) }}
                            title={`POC: ${item.poc}`}
                          >
                            {getInitials(item.poc)}
                          </div>
                        )}

                        {item.taskLink && (
                          <a 
                            href={item.taskLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }}
                            title="Open ClickUp Task"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </TabContainer>
  );
};
