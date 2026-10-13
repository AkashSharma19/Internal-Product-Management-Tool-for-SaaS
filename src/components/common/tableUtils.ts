import React from 'react';
import { getSubmissionFieldUnion } from '../../utils/feedback';
import type { 
  ProductItem, 
  SupportDocItem,
  FeedbackSubmission,
  FeedbackFormConfig,
  AdminCall,
  StudentProject
} from '../../types';

export const getAutoCategoryProgramStyle = (valName: string | undefined | null): React.CSSProperties => {
  if (
    !valName ||
    valName === '__uncategorized__' ||
    valName === 'Uncategorized' ||
    valName === 'Uncategorized / Existing' ||
    valName === 'No program' ||
    valName === 'No Cohort' ||
    valName === 'Select category' ||
    valName.trim() === ''
  ) {
    return {
      width: '100%',
      padding: '5px 6px',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      background: 'var(--background)',
      color: 'var(--text-primary)',
      fontSize: '0.8rem',
      fontWeight: 500,
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.15s ease'
    };
  }

  const PRESET_PALETTES = [
    { bg: 'rgba(99, 102, 241, 0.12)',  color: '#4f46e5', border: 'rgba(99, 102, 241, 0.3)' },  // Indigo
    { bg: 'rgba(236, 72, 153, 0.12)',  color: '#db2777', border: 'rgba(236, 72, 153, 0.3)' },  // Pink
    { bg: 'rgba(16, 185, 129, 0.12)',  color: '#059669', border: 'rgba(16, 185, 129, 0.3)' },  // Emerald
    { bg: 'rgba(245, 158, 11, 0.12)',  color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' },  // Amber
    { bg: 'rgba(14, 165, 233, 0.12)',  color: '#0284c7', border: 'rgba(14, 165, 233, 0.3)' },  // Sky
    { bg: 'rgba(139, 92, 246, 0.12)',  color: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)' },  // Violet
    { bg: 'rgba(20, 184, 166, 0.12)',  color: '#0d9488', border: 'rgba(20, 184, 166, 0.3)' },  // Teal
    { bg: 'rgba(249, 115, 22, 0.12)',  color: '#ea580c', border: 'rgba(249, 115, 22, 0.3)' },  // Orange
    { bg: 'rgba(168, 85, 247, 0.12)',  color: '#9333ea', border: 'rgba(168, 85, 247, 0.3)' },  // Purple
    { bg: 'rgba(6, 182, 212, 0.12)',   color: '#0891b2', border: 'rgba(6, 182, 212, 0.3)' },  // Cyan
  ];

  let hash = 0;
  const str = valName.trim();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const paletteIndex = Math.abs(hash) % PRESET_PALETTES.length;
  const palette = PRESET_PALETTES[paletteIndex];

  return {
    width: '100%',
    padding: '5px 6px',
    border: `1px solid ${palette.border}`,
    borderRadius: '6px',
    backgroundColor: palette.bg,
    color: palette.color,
    fontSize: '0.8rem',
    fontWeight: 650,
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.15s ease'
  };
};

export const getSupportDocs = (item?: Partial<ProductItem> | null): SupportDocItem[] => {
  if (!item) return [];
  if (Array.isArray(item.supportDocs) && item.supportDocs.length > 0) {
    return item.supportDocs
      .filter((d: any) => d && ((d.link && String(d.link).trim() !== '') || (d.name && String(d.name).trim() !== '')))
      .map((d: any, idx: number) => ({
        id: d.id || `doc-${idx}-${Date.now()}`,
        name: d.name && String(d.name).trim() !== '' ? String(d.name).trim() : 'Document',
        link: d.link && String(d.link).trim() !== '' ? String(d.link).trim() : ''
      }));
  }
  if (item.supportDocLink && item.supportDocLink.trim() !== '') {
    return [{
      id: `doc-legacy-${item.id || '1'}`,
      name: 'Support Document',
      link: item.supportDocLink.trim()
    }];
  }
  return [];
};

export const getAutoCategoryProgramPalette = (valName: string | undefined | null) => {
  const PRESET_PALETTES = [
    { bg: 'rgba(99, 102, 241, 0.12)',  color: '#4f46e5', border: 'rgba(99, 102, 241, 0.3)' },  // Indigo
    { bg: 'rgba(236, 72, 153, 0.12)',  color: '#db2777', border: 'rgba(236, 72, 153, 0.3)' },  // Pink
    { bg: 'rgba(16, 185, 129, 0.12)',  color: '#059669', border: 'rgba(16, 185, 129, 0.3)' },  // Emerald
    { bg: 'rgba(245, 158, 11, 0.12)',  color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' },  // Amber
    { bg: 'rgba(14, 165, 233, 0.12)',  color: '#0284c7', border: 'rgba(14, 165, 233, 0.3)' },  // Sky
    { bg: 'rgba(139, 92, 246, 0.12)',  color: '#7c3aed', border: 'rgba(139, 92, 246, 0.3)' },  // Violet
    { bg: 'rgba(20, 184, 166, 0.12)',  color: '#0d9488', border: 'rgba(20, 184, 166, 0.3)' },  // Teal
    { bg: 'rgba(249, 115, 22, 0.12)',  color: '#ea580c', border: 'rgba(249, 115, 22, 0.3)' },  // Orange
    { bg: 'rgba(168, 85, 247, 0.12)',  color: '#9333ea', border: 'rgba(168, 85, 247, 0.3)' },  // Purple
    { bg: 'rgba(6, 182, 212, 0.12)',   color: '#0891b2', border: 'rgba(6, 182, 212, 0.3)' },  // Cyan
  ];

  if (!valName || valName.trim() === '') {
    return { bg: 'var(--background-alt, rgba(255,255,255,0.04))', color: 'var(--text-secondary, #94a3b8)', border: 'var(--border)' };
  }

  let hash = 0;
  const str = valName.trim();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const paletteIndex = Math.abs(hash) % PRESET_PALETTES.length;
  return PRESET_PALETTES[paletteIndex];
};

export const getAutoCategoryProgramCompactStyle = (valName: string | undefined | null): React.CSSProperties => {
  if (
    !valName ||
    valName === '__uncategorized__' ||
    valName === 'Uncategorized' ||
    valName === 'Uncategorized / Existing' ||
    valName === 'No program' ||
    valName === 'No Cohort' ||
    valName === 'Select category' ||
    valName === 'Select program' ||
    valName.trim() === ''
  ) {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '4px',
      padding: '2px 8px',
      height: '24px',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      backgroundColor: 'var(--background-alt, rgba(255,255,255,0.04))',
      color: 'var(--text-secondary, #94a3b8)',
      fontSize: '0.72rem',
      fontWeight: 500,
      cursor: 'pointer',
      maxWidth: '135px',
      transition: 'all 0.15s ease',
      boxSizing: 'border-box',
      userSelect: 'none'
    };
  }

  const palette = getAutoCategoryProgramPalette(valName);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '4px',
    padding: '2px 8px',
    height: '24px',
    border: `1px solid ${palette.border}`,
    borderRadius: '6px',
    backgroundColor: palette.bg,
    color: palette.color,
    fontSize: '0.72rem',
    fontWeight: 650,
    cursor: 'pointer',
    maxWidth: '135px',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
    userSelect: 'none'
  };
};

export const isTaskLinked = (notes: string | undefined, taskId?: string): boolean => {
  if (!notes) return false;
  if (notes.includes("Linked Task: true")) return true;
  
  const amaCount = (notes.match(/AMA Session ID:/g) || []).length;
  const callCount = (notes.match(/Admin Call ID:/g) || []).length;
  const meetingCount = (notes.match(/Tarun Sir Meeting ID:/g) || []).length;
  const totalCount = amaCount + callCount + meetingCount;
  
  if (totalCount > 1) return true;
  
  if (totalCount === 1 && taskId) {
    if (notes.includes("Admin Call ID:") && !taskId.startsWith("prod-call-") && !taskId.startsWith("prod-temp-")) return true;
    if (notes.includes("AMA Session ID:") && !taskId.startsWith("prod-ama-") && !taskId.startsWith("prod-temp-")) return true;
    if (notes.includes("Tarun Sir Meeting ID:") && !taskId.startsWith("prod-tarun-") && !taskId.startsWith("prod-temp-")) return true;
  }
  
  return false;
};

// Global POC/Assignee color mapping and badge styling
export const getPOCBadgeStyle = (name: string): React.CSSProperties => {
  if (!name) return {};
  
  const ASSIGNEE_COLORS: Record<string, { h: number; s: number; l: number }> = {
    'akash': { h: 262, s: 80, l: 60 },
    'anushka': { h: 330, s: 75, l: 55 },
    'nikhil': { h: 199, s: 98, l: 45 },
    'nikhil jain': { h: 162, s: 94, l: 35 },
    'tarun': { h: 0, s: 72, l: 50 },
    'tarun sir': { h: 0, s: 72, l: 50 },
  };

  const cleanName = name.trim().toLowerCase();
  let colorParts = { h: 215, s: 15, l: 60 };

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
  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
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

export const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const getAssigneeColor = (name: string) => {
  const colors: Record<string, string> = {
    'Akash': '#7c3aed',
    'Akash Sharma': '#7c3aed',
    'Anushka': '#db2777',
    'Nikhil': '#0284c7',
    'Nikhil Jain': '#059669',
  };
  return colors[name] || '#6b7280';
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return '""';
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    )
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportItemFeedbackToExcel = (
  itemId: string,
  category: 'admin-calls' | 'ama-meetings' | 'student-projects',
  feedbackSubmissions: FeedbackSubmission[],
  formConfigs: FeedbackFormConfig[],
  formId?: string
) => {
  const config = (formId ? formConfigs.find(c => c.id === formId) : null)
    || formConfigs.find(c => c.category === category && c.isDefault)
    || formConfigs.find(c => c.category === category && c.enabled !== false)
    || formConfigs.find(c => c.category === category);
  const submissions = feedbackSubmissions.filter(sub => sub.itemId === itemId);

  if (submissions.length === 0) {
    alert('No feedback submissions to export for this item.');
    return;
  }

  const sortedFields = getSubmissionFieldUnion(submissions, formConfigs, config?.fields || []);
  if (sortedFields.length === 0) {
    alert('No feedback answers found for this item.');
    return;
  }

  const headers = [
    'Submission ID',
    'Respondent Name',
    'Respondent Email',
    'Submitted At',
    ...sortedFields.map(f => f.label)
  ];

  const rows = submissions.map(sub => {
    const fieldAnswers = sortedFields.map(f => {
      const val = sub.answers[f.id];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    });

    return [
      sub.id,
      sub.submittedBy || 'Anonymous',
      sub.submittedByEmail || '',
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '',
      ...fieldAnswers
    ];
  });

  const fileName = `Feedback_${itemId}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(fileName, headers, rows);
};

export const exportAttendeeFeedbackToExcel = (
  category: 'admin-calls' | 'ama-meetings' | 'student-projects',
  feedbackSubmissions: FeedbackSubmission[],
  formConfigs: FeedbackFormConfig[],
  _adminCalls: AdminCall[] = [],
  _studentMeetings: any[] = [],
  _studentProjects: StudentProject[] = []
) => {
  const config = formConfigs.find(c => c.category === category && c.isDefault)
    || formConfigs.find(c => c.category === category && c.enabled !== false)
    || formConfigs.find(c => c.category === category);
  const submissions = feedbackSubmissions.filter(sub => sub.category === category);

  if (submissions.length === 0) {
    alert('No feedback submissions to export.');
    return;
  }

  const sortedFields = getSubmissionFieldUnion(submissions, formConfigs, config?.fields || []);
  if (sortedFields.length === 0) {
    alert('No feedback answers found for this category.');
    return;
  }

  const headers = [
    'Submission ID',
    'Item ID',
    'Respondent Name',
    'Respondent Email',
    'Submitted At',
    ...sortedFields.map(f => f.label)
  ];

  const rows = submissions.map(sub => {
    const fieldAnswers = sortedFields.map(f => {
      const val = sub.answers[f.id];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    });

    return [
      sub.id,
      sub.itemId,
      sub.submittedBy || 'Anonymous',
      sub.submittedByEmail || '',
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '',
      ...fieldAnswers
    ];
  });

  const fileName = `All_Feedback_${category}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(fileName, headers, rows);
};

export const getClickupBadgeStyle = (status: string): React.CSSProperties => {
  if (!status) return {};
  
  const cleanStatus = status.trim().toLowerCase();
  
  const CLICKUP_COLORS: Record<string, { h: number; s: number; l: number }> = {
    'open': { h: 215, s: 15, l: 60 },
    'todo': { h: 215, s: 15, l: 60 },
    'to do': { h: 215, s: 15, l: 60 },
    'backlog': { h: 215, s: 15, l: 60 },
    'unstarted': { h: 215, s: 15, l: 60 },
    
    'in progress': { h: 205, s: 85, l: 55 },
    'in-progress': { h: 205, s: 85, l: 55 },
    'active': { h: 205, s: 85, l: 55 },
    'development': { h: 205, s: 85, l: 55 },
    'dev': { h: 205, s: 85, l: 55 },
    'in design': { h: 205, s: 85, l: 55 },
    'design': { h: 205, s: 85, l: 55 },
    'building': { h: 205, s: 85, l: 55 },
    
    'under review': { h: 28, s: 90, l: 55 },
    'review': { h: 28, s: 90, l: 55 },
    'discuss': { h: 28, s: 90, l: 55 },
    'discussing': { h: 28, s: 90, l: 55 },
    'discuss/review': { h: 28, s: 90, l: 55 },
    'in review': { h: 28, s: 90, l: 55 },
    'to review': { h: 28, s: 90, l: 55 },
    
    'testing': { h: 270, s: 75, l: 60 },
    'tested': { h: 270, s: 75, l: 60 },
    'qa': { h: 270, s: 75, l: 60 },
    'quality assurance': { h: 270, s: 75, l: 60 },
    'bug verification': { h: 270, s: 75, l: 60 },
    
    'on hold': { h: 0, s: 80, l: 60 },
    'hold': { h: 0, s: 80, l: 60 },
    'paused': { h: 0, s: 80, l: 60 },
    'blocked': { h: 0, s: 80, l: 60 },
    'stuck': { h: 0, s: 80, l: 60 },
    'cancelled': { h: 0, s: 80, l: 60 },
    
    'closed': { h: 142, s: 70, l: 45 },
    'done': { h: 142, s: 70, l: 45 },
    'completed': { h: 142, s: 70, l: 45 },
    'delivered': { h: 142, s: 70, l: 45 },
    'complete': { h: 142, s: 70, l: 45 },
    'resolved': { h: 142, s: 70, l: 45 },
  };

  let colorParts = { h: 260, s: 75, l: 60 };
  
  if (CLICKUP_COLORS[cleanStatus]) {
    colorParts = CLICKUP_COLORS[cleanStatus];
  } else {
    let found = false;
    for (const key of Object.keys(CLICKUP_COLORS)) {
      if (cleanStatus.includes(key) || key.includes(cleanStatus)) {
        colorParts = CLICKUP_COLORS[key];
        found = true;
        break;
      }
    }
    
    if (!found) {
      let hash = 0;
      for (let i = 0; i < cleanStatus.length; i++) {
        hash = cleanStatus.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorParts = {
        h: Math.abs(hash) % 360,
        s: 70,
        l: 50
      };
    }
  }

  const { h, s } = colorParts;
  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
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

export const formatClickupAssignee = (assigneesStr: string) => {
  if (!assigneesStr) return '';
  const parts = assigneesStr.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} +${parts.length - 1}`;
};

export const extractClickupTaskId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9\-_]{7,12}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('clickup.com')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const tIndex = pathParts.indexOf('t');
      if (tIndex !== -1 && tIndex < pathParts.length - 1) {
        return pathParts[tIndex + 1];
      }
    }
  } catch (e) {}
  return null;
};

export const parseDateToYYYYMMDD = (dateStr: string) => {
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
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return '';
};

export const formatDateToShortPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIndex = d.getMonth();
      const day = d.getDate().toString();
      return `${day} ${monthsShort[monthIndex]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
};

export const formatDateToUserPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10).toString();
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[0], 10).toString();
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIndex = d.getMonth();
      const day = d.getDate().toString();
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  } catch (e) {}

  return dateStr;
};

export const isCompletedStatus = (status: string | undefined) => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return ['delivered', 'completed', 'done', 'closed', 'tested', 'released'].includes(s);
};

export const getDateSpanStyle = (dateStr: string | undefined, isCompleted: boolean | undefined): React.CSSProperties => {
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

export const formatToDatetimeLocalValue = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  } catch (e) {}
  return dateStr;
};

export const getDateDiffDays = (dateStr1: string | undefined, dateStr2: string | undefined): string => {
  if (!dateStr1 || !dateStr2) return '';
  try {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
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

export const isDateOverdue = (dateStr: string | undefined, isCompleted: boolean | undefined): boolean => {
  if (!dateStr || isCompleted) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    d.setHours(23, 59, 59, 999);
    const today = new Date();
    return d.getTime() < today.getTime();
  } catch (e) {
    return false;
  }
};
