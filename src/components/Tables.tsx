import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { 
  Trash2, 
  Edit2,
  ExternalLink, 
  X,
  ArrowLeft,
  AlertCircle,
  Palette,
  Code,
  Sparkles,
  Calendar,
  User,
  Flag,
  Smile,
  AtSign,
  Paperclip,
  Send,
  CornerDownRight,
  CheckSquare,
  Star,
  Link,
  Inbox,
  CheckCircle,
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import type { 
  ProductItem, 
  PlanItem, 
  StudentProject, 
  AMASession,
  StudentMeeting, 
  AdminCall, 
  ContentItem, 
  DailyIssue, 
  FeatureAdoption 
} from '../types';

/* =========================================================================
   CSV IMPORT MODAL
   ========================================================================= */
interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsedData: any[]) => void;
  headers: string[];
  title: string;
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onImport, headers, title }) => {
  const [csvText, setCsvText] = useState('');
  
  if (!isOpen) return null;

  const handleParse = () => {
    if (!csvText.trim()) return;
    
    const lines = csvText.split('\n');
    const result: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => 
        cell.replace(/^"|"$/g, '').trim()
      );
      
      if (row.length > 0) {
        result.push(row);
      }
    }

    if (result.length > 0) {
      onImport(result);
      setCsvText('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Import CSV for {title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="form-group form-group-full">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Paste comma-separated rows. Expected fields: 
            <code style={{ background: 'var(--background)', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px', display: 'block', marginTop: '5px' }}>
              {headers.join(', ')}
            </code>
          </p>
          <textarea 
            className="csv-textarea" 
            placeholder={`Example:\nFeature Name, Tarun Sir Review, P0, POC Name, In Progress, ...`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleParse}>Parse & Append</button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   1. PRODUCT TABLE (PRIORITY REQUESTS) MODAL & COMPONENT
   ========================================================================= */
interface ProductDetailViewProps {
  item: ProductItem;
  onBack: () => void;
  onUpdate: (id: string, updated: Partial<ProductItem>) => void;
}

const parseDateToYYYYMMDD = (dateStr: string) => {
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

const formatDateToUserPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10).toString();
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  }

  // 2. Check DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[0], 10).toString();
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  }

  // 3. Try standard parse (handles strings like "30 March 2026" or "9 Dec 2026")
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

const formatDateWithTimeToUserPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  try {
    const d = new Date(dateStr);
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

const formatToDatetimeLocalValue = (dateStr: string): string => {
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

const getDateDiffDays = (dateStr1: string | undefined, dateStr2: string | undefined): string => {
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

const DateDiffBadge: React.FC<{ prevDate?: string; currentDate?: string }> = ({ prevDate, currentDate }) => {
  const diffText = getDateDiffDays(prevDate, currentDate);
  if (!diffText) return null;
  return (
    <span 
      style={{ 
        position: 'absolute',
        left: '0',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        fontSize: '0.6rem', 
        padding: '1px 5px', 
        borderRadius: '10px', 
        backgroundColor: 'var(--panel-bg)', 
        border: '1px solid var(--border)',
        color: 'var(--primary)', 
        fontWeight: 700,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}
    >
      {diffText}
    </span>
  );
};



export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ item, onBack, onUpdate }) => {
  const { speakers: configSpeakers, productGroups, statuses: configStatuses } = useDashboard();
  const pocList = configSpeakers.map(s => s.name);
  const productList = productGroups.map(g => g.name);
  const productStatuses = configStatuses.filter(s => s.scope === 'product' || s.scope === 'all');
  const [commentText, setCommentText] = useState('');
  const [itemComments, setItemComments] = useState<Record<string, Array<{
    id: string;
    author: string;
    initials: string;
    color: string;
    text: string;
    time: string;
    attachment?: { name: string; url: string };
    isLog?: boolean;
  }>>>({});

  // Timeline progress calculations
  const getProgressPercentage = () => {
    if (item.status === 'Completed') return 87.5;
    if (item.status === 'On Hold') return 12.5;
    
    let percentage = 12.5;
    if (item.productDeadline || item.tarunSirApproval) {
      percentage = 12.5;
      if (item.uiux) {
        percentage = 37.5;
        if (item.deadline) {
          percentage = 62.5;
          if (item.finalRelease) {
            percentage = 87.5;
          }
        }
      }
    }
    return percentage;
  };

  const isProductCompleted = !!item.productDeadline || item.tarunSirApproval || item.status === 'Completed';
  const isUiuxCompleted = !!item.uiux || item.status === 'Completed';
  const isUiuxActive = isProductCompleted && !item.uiux && item.status !== 'Completed';
  const isDevCompleted = !!item.deadline || item.status === 'Completed' || item.clickupStatus?.toLowerCase() === 'closed';
  const isDevActive = isUiuxCompleted && !item.deadline && item.status !== 'Completed' && item.clickupStatus?.toLowerCase() !== 'closed';
  const isFinalCompleted = !!item.finalRelease || item.status === 'Completed';
  const isFinalActive = isDevCompleted && !item.finalRelease && item.status !== 'Completed';

  // Helper styles matching ClickUp status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'On Hold': return '#f59e0b';
      case 'Ongoing': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getClickupStatusColor = (status: string) => {
    if (!status) return 'var(--text-secondary)';
    const s = status.toLowerCase();
    if (s === 'closed' || s === 'done' || s === 'completed') return '#10b981';
    if (s === 'open' || s === 'todo') return '#6b7280';
    if (s === 'in progress' || s === 'active') return '#3b82f6';
    return '#8b5cf6';
  };

  const getPriorityFlagColor = (prio: string) => {
    switch (prio) {
      case 'P0': return '#ef4444'; // Red
      case 'P1': return '#f97316'; // Orange
      case 'P2': return '#3b82f6'; // Blue
      case 'P3': return '#eab308'; // Yellow
      case 'P4': return '#9ca3af'; // Grey
      default: return '#9ca3af';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAssigneeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Akash': '#7c3aed',
      'Anushka': '#db2777',
      'Nikhil': '#0284c7',
      'Nikhil Jain': '#059669',
    };
    return colors[name] || '#6b7280';
  };

  const getComments = () => {
    if (itemComments[item.id]) {
      return itemComments[item.id];
    }
    return [
      {
        id: 'seed-1',
        author: 'Nikhil Jain',
        initials: 'NJ',
        color: '#059669',
        text: `Need to Re-calc TGPA and Regen Term 3 Term Reports for BMT 1`,
        time: 'Yesterday at 11:46 am',
        attachment: {
          name: 'BMT 1 term 3 report',
          url: item.taskLink || 'https://clickup.com'
        }
      }
    ];
  };

  const handleFieldUpdate = (field: keyof ProductItem, newValue: any) => {
    const oldValue = item[field];
    if (oldValue === newValue) return;

    // Call parent update
    if (field === 'taskLink' && !newValue) {
      onUpdate(item.id, { taskLink: '', clickupStatus: '' });
    } else {
      onUpdate(item.id, { [field]: newValue });
    }

    // Fields display labels for logs
    const fieldLabels: Record<string, string> = {
      product: 'Product Group',
      module: 'Module',
      type: 'Type',
      feature: 'Title',
      status: 'Status',
      productDeadline: 'Product Specs date',
      uiux: 'UI/UX design date',
      deadline: 'Dev deadline',
      finalRelease: 'Final Release date',
      taskLink: 'Task link',
      poc: 'Assignee',
      priority: 'Priority',
      clickupStatus: 'ClickUp status',
      blocker: 'Blocker',
      tarunSirApproval: 'Tarun Sir verified status',
      raisedByTarunSir: 'Raised by Tarun Sir status',
      description: 'Description',
      notes: 'Notes'
    };

    const label = fieldLabels[field] || String(field);
    const formatValue = (val: any) => {
      if (val === true) return 'Yes';
      if (val === false) return 'No';
      if (!val) return 'Empty';
      return String(val);
    };

    const changeText = `changed ${label} from "${formatValue(oldValue)}" to "${formatValue(newValue)}"`;

    const logItem = {
      id: `log-${Date.now()}-${Math.random()}`,
      author: 'Akash (You)',
      initials: 'AK',
      color: '#7c3aed',
      text: changeText,
      time: 'Just now',
      isLog: true
    };

    setItemComments(prev => ({
      ...prev,
      [item.id]: [...(prev[item.id] || [
        {
          id: 'seed-1',
          author: 'Nikhil Jain',
          initials: 'NJ',
          color: '#059669',
          text: `Need to Re-calc TGPA and Regen Term 3 Term Reports for BMT 1`,
          time: 'Yesterday at 11:46 am',
          attachment: {
            name: 'BMT 1 term 3 report',
            url: item.taskLink || 'https://clickup.com'
          }
        }
      ]), logItem]
    }));
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      author: 'Akash (You)',
      initials: 'AK',
      color: '#7c3aed',
      text: commentText,
      time: 'Just now'
    };
    setItemComments(prev => ({
      ...prev,
      [item.id]: [...(prev[item.id] || [
        {
          id: 'seed-1',
          author: 'Nikhil Jain',
          initials: 'NJ',
          color: '#059669',
          text: `Need to Re-calc TGPA and Regen Term 3 Term Reports for BMT 1`,
          time: 'Yesterday at 11:46 am',
          attachment: {
            name: 'BMT 1 term 3 report',
            url: item.taskLink || 'https://clickup.com'
          }
        }
      ]), newComment]
    }));
    setCommentText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const activeComments = getComments();

  return (
    <div className="premium-workspace animate-fade-in" key={item.id}>
      {/* Left Main Task Details Pane */}
      <div className="premium-main-pane">
        
        {/* Top Navigation & Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
          <div className="premium-breadcrumb">
            <button className="btn-back" style={{ width: '24px', height: '24px', borderRadius: '6px', marginRight: '0.25rem' }} onClick={onBack} title="Back to Table">
              <ArrowLeft size={12} />
            </button>
            <span>Priority Requests</span>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.product || 'General Product'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              backgroundColor: 'var(--background-alt)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.675rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              Task <span style={{ color: 'var(--text-primary)' }}>#{item.id}</span>
            </span>
          </div>
        </div>

        {/* Product Group, Module, and Type Selectors Row */}
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          
          {/* Product Group Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Group:</span>
            <select
              className="filter-select"
              style={{ 
                padding: '0.2rem 0.5rem', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                height: '28px',
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
              value={item.product || ''}
              onChange={(e) => handleFieldUpdate('product', e.target.value)}
            >
              <option value="">— Select Product —</option>
              {productList.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              {item.product && !productList.includes(item.product) && (
                <option value={item.product}>{item.product}</option>
              )}
            </select>
          </div>

          {/* Module Selector */}
          {(() => {
            const modulePresets = ['General', 'Academic Grades', 'Attendance Widget', 'MU.Ai Bot', 'Zoom Cohorts', 'Onboarding UI', 'Parent Portal', 'To-do widget'];
            const isCustomModule = !!item.module && !modulePresets.includes(item.module);
            const selectModuleVal = isCustomModule ? 'Other' : (item.module || 'General');
            
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module:</span>
                <select
                  className="filter-select"
                  style={{ 
                    padding: '0.2rem 0.5rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    height: '28px',
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                  value={selectModuleVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      handleFieldUpdate('module', 'Custom Module');
                    } else {
                      handleFieldUpdate('module', val);
                    }
                  }}
                >
                  <option value="General">General</option>
                  <option value="Academic Grades">Academic Grades</option>
                  <option value="Attendance Widget">Attendance Widget</option>
                  <option value="MU.Ai Bot">MU.Ai Bot</option>
                  <option value="Zoom Cohorts">Zoom Cohorts</option>
                  <option value="Onboarding UI">Onboarding UI</option>
                  <option value="Parent Portal">Parent Portal</option>
                  <option value="To-do widget">To-do widget</option>
                  <option value="Other">Other (Custom)...</option>
                </select>

                {isCustomModule && (
                  <input
                    type="text"
                    className="filter-select"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      height: '28px',
                      width: '150px',
                      borderRadius: '6px'
                    }}
                    value={item.module}
                    onChange={(e) => handleFieldUpdate('module', e.target.value)}
                    placeholder="Enter module name"
                  />
                )}
              </div>
            );
          })()}

          {/* Type Selector */}
          {(() => {
            const typePresets = ['Feature', 'Enhancement', 'Bug/Defect', 'UI/UX', 'Research'];
            const isCustomType = !!item.type && !typePresets.includes(item.type);
            const selectTypeVal = isCustomType ? 'Other' : (item.type || 'Feature');
            
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type:</span>
                <select
                  className="filter-select"
                  style={{ 
                    padding: '0.2rem 0.5rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    height: '28px',
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                  value={selectTypeVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      handleFieldUpdate('type', 'Custom Type');
                    } else {
                      handleFieldUpdate('type', val);
                    }
                  }}
                >
                  <option value="Feature">Feature</option>
                  <option value="Enhancement">Enhancement</option>
                  <option value="Bug/Defect">Bug/Defect</option>
                  <option value="UI/UX">UI/UX</option>
                  <option value="Research">Research</option>
                  <option value="Other">Other (Custom)...</option>
                </select>

                {isCustomType && (
                  <input
                    type="text"
                    className="filter-select"
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      height: '28px',
                      width: '150px',
                      borderRadius: '6px'
                    }}
                    value={item.type}
                    onChange={(e) => handleFieldUpdate('type', e.target.value)}
                    placeholder="Enter type name"
                  />
                )}
              </div>
            );
          })()}

        </div>

        {/* Task Title (Editable) */}
        <div style={{ marginTop: '0.5rem' }}>
          <input
            type="text"
            className="premium-title-input"
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== item.feature) {
                handleFieldUpdate('feature', e.target.value.trim());
              }
            }}
            defaultValue={item.feature}
            placeholder="Task name"
          />
        </div>

        {/* Properties Grid (Notion/ClickUp Metadata fields) */}
        <div className="premium-properties-grid">
          
          {/* LEFT COLUMN FIELDS */}
          <div>
            {/* Status Field */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <CheckSquare size={13} /> status
              </span>
              <div className="premium-property-value">
                <select
                  className="premium-status-select"
                  style={{ backgroundColor: getStatusColor(item.status) }}
                  value={item.status}
                  onChange={(e) => handleFieldUpdate('status', e.target.value as any)}
                >
                  <option value="">— Select Status —</option>
                  {productStatuses.map(s => (
                    <option key={s.id} value={s.label}>{s.label}</option>
                  ))}
                  {item.status && !productStatuses.find(s => s.label === item.status) && (
                    <option value={item.status}>{item.status}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Dates: Product Specs */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Calendar size={13} /> product specs
              </span>
              <div className="premium-property-value">
                <input
                  type="date"
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', border: 'none', background: 'transparent', outline: 'none', width: '120px', textAlign: 'right', cursor: 'pointer' }}
                  value={item.productDeadline || ''}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onChange={(e) => handleFieldUpdate('productDeadline', e.target.value)}
                />
              </div>
            </div>

            {/* Dates: UIUX Deadline */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Palette size={13} /> UI/UX design
              </span>
              <div className="premium-property-value">
                <input
                  type="date"
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', border: 'none', background: 'transparent', outline: 'none', width: '120px', textAlign: 'right', cursor: 'pointer' }}
                  value={item.uiux || ''}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onChange={(e) => handleFieldUpdate('uiux', e.target.value)}
                />
              </div>
            </div>

            {/* Dates: Dev Deadline */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Code size={13} /> dev deadline
              </span>
              <div className="premium-property-value">
                <input
                  type="date"
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', border: 'none', background: 'transparent', outline: 'none', width: '120px', textAlign: 'right', cursor: 'pointer' }}
                  value={item.deadline || ''}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onChange={(e) => handleFieldUpdate('deadline', e.target.value)}
                />
              </div>
            </div>

            {/* Dates: Final Release */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Sparkles size={13} /> final release
              </span>
              <div className="premium-property-value">
                <input
                  type="date"
                  style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', border: 'none', background: 'transparent', outline: 'none', width: '120px', textAlign: 'right', cursor: 'pointer' }}
                  value={item.finalRelease || ''}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  onChange={(e) => handleFieldUpdate('finalRelease', e.target.value)}
                />
              </div>
            </div>

            {/* ClickUp Task Link and Status */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Link size={13} /> ClickUp Task
              </span>
              <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  style={{ fontSize: '0.8rem', color: 'var(--accent)', border: 'none', background: 'transparent', outline: 'none', width: '120px', textAlign: 'right', fontWeight: 500 }}
                  placeholder="Empty Link"
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== item.taskLink) {
                      handleFieldUpdate('taskLink', val);
                      if (val && !item.clickupStatus) {
                        handleFieldUpdate('clickupStatus', 'open');
                      }
                    }
                  }}
                  defaultValue={item.taskLink}
                />
                {item.taskLink && (
                  <>
                    <a href={item.taskLink} target="_blank" rel="noreferrer" title="Open Link" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                    </a>
                    <input
                      type="text"
                      className="premium-clickup-badge"
                      style={{ 
                        borderColor: getClickupStatusColor(item.clickupStatus), 
                        color: getClickupStatusColor(item.clickupStatus) 
                      }}
                      placeholder="Status"
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== item.clickupStatus) {
                          handleFieldUpdate('clickupStatus', val);
                        }
                      }}
                      defaultValue={item.clickupStatus || ''}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN FIELDS */}
          <div>
            {/* POC Assignee Field */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <User size={13} /> assignees
              </span>
              <div className="premium-property-value">
                <div className="clickup-avatar-pill">
                  <div className="clickup-avatar-circle" style={{ backgroundColor: getAssigneeColor(item.poc) }}>
                    {getInitials(item.poc)}
                  </div>
                  <select
                    style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', padding: 0 }}
                    value={item.poc || ''}
                    onChange={(e) => handleFieldUpdate('poc', e.target.value)}
                  >
                    <option value="">— Select POC —</option>
                    {pocList.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    {item.poc && !pocList.includes(item.poc) && (
                      <option value={item.poc}>{item.poc}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Priority Field */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Flag size={13} /> priority
              </span>
              <div className="premium-property-value">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Flag size={11} fill={getPriorityFlagColor(item.priority)} color={getPriorityFlagColor(item.priority)} />
                  <select
                    style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', padding: 0 }}
                    value={item.priority || ''}
                    onChange={(e) => handleFieldUpdate('priority', e.target.value as any)}
                  >
                    <option value="">— Select Priority —</option>
                    <option value="P0">P0 (Critical)</option>
                    <option value="P1">P1 (High)</option>
                    <option value="P2">P2 (Medium)</option>
                    <option value="P3">P3 (Normal)</option>
                    <option value="P4">P4 (Low)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ClickUp status row removed (merged with Task Link) */}

            {/* Blockers */}
            <div className="premium-property-row">
              <span className="premium-property-label" style={{ color: item.blocker ? 'var(--danger)' : 'var(--text-muted)' }}>
                <AlertCircle size={13} /> blockers
              </span>
              <div className="premium-property-value">
                <input
                  type="text"
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: item.blocker ? 'var(--danger)' : 'var(--text-primary)', border: 'none', background: 'transparent', outline: 'none', width: '120px', textAlign: 'right' }}
                  placeholder="None"
                  onBlur={(e) => {
                    if (e.target.value !== item.blocker) {
                      handleFieldUpdate('blocker', e.target.value);
                    }
                  }}
                  defaultValue={item.blocker}
                />
              </div>
            </div>

            {/* Tarun Sir Verification */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <CheckSquare size={13} /> Tarun Sir verified
              </span>
              <div className="premium-property-value">
                <label className="premium-toggle-wrapper">
                  <input 
                    type="checkbox" 
                    className="premium-toggle-checkbox" 
                    checked={item.tarunSirApproval} 
                    onChange={(e) => handleFieldUpdate('tarunSirApproval', e.target.checked)} 
                  />
                  <span className="premium-toggle-slider" />
                </label>
              </div>
            </div>

            {/* Raised by Tarun Sir */}
            <div className="premium-property-row">
              <span className="premium-property-label">
                <Star size={13} /> raised by Tarun Sir
              </span>
              <div className="premium-property-value">
                <label className="premium-toggle-wrapper">
                  <input 
                    type="checkbox" 
                    className="premium-toggle-checkbox" 
                    checked={item.raisedByTarunSir} 
                    onChange={(e) => handleFieldUpdate('raisedByTarunSir', e.target.checked)} 
                  />
                  <span className="premium-toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Milestones Horizontal Progress Bar */}
        <div className="compact-timeline-container" style={{ margin: '0.5rem 0 1.25rem 0' }}>
          <div className="compact-timeline-track">
            <div 
              className="compact-timeline-track-progress" 
              style={{ width: `${getProgressPercentage()}%` }} 
            />
          </div>
          <div className="compact-timeline-steps">
            
            {/* Step 1: Product Specs */}
            <div className={`compact-timeline-step ${isProductCompleted ? 'completed' : 'active'}`}>
              <div className="compact-timeline-node">
                {isProductCompleted ? (
                  <CheckSquare size={12} />
                ) : (
                  <span>1</span>
                )}
              </div>
              <span className="compact-timeline-step-label">Specs</span>
              
              <span 
                className="compact-timeline-step-date" 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => {
                  const inputEl = document.getElementById(`date-picker-specs-${item.id}`);
                  if (inputEl) (inputEl as any).showPicker?.();
                }}
              >
                {item.productDeadline ? formatDateToUserPattern(item.productDeadline) : 'Set Date'}
              </span>
              <input
                id={`date-picker-specs-${item.id}`}
                type="date"
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                value={parseDateToYYYYMMDD(item.productDeadline)}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFieldUpdate('productDeadline', e.target.value);
                  }
                }}
              />
            </div>

            {/* Step 2: UI/UX */}
            <div className={`compact-timeline-step ${isUiuxCompleted ? 'completed' : isUiuxActive ? 'active' : 'pending'}`}>
              <div className="compact-timeline-node">
                {isUiuxCompleted ? (
                  <CheckSquare size={12} />
                ) : (
                  <span>2</span>
                )}
              </div>
              <span className="compact-timeline-step-label">UI/UX</span>
              
              <span 
                className="compact-timeline-step-date" 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => {
                  const inputEl = document.getElementById(`date-picker-uiux-${item.id}`);
                  if (inputEl) (inputEl as any).showPicker?.();
                }}
              >
                {item.uiux ? formatDateToUserPattern(item.uiux) : 'Set Date'}
              </span>
              <input
                id={`date-picker-uiux-${item.id}`}
                type="date"
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                value={parseDateToYYYYMMDD(item.uiux)}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFieldUpdate('uiux', e.target.value);
                  }
                }}
              />
            </div>

            {/* Step 3: Development */}
            <div className={`compact-timeline-step ${isDevCompleted ? 'completed' : isDevActive ? 'active' : 'pending'}`}>
              <div className="compact-timeline-node">
                {isDevCompleted ? (
                  <CheckSquare size={12} />
                ) : (
                  <span>3</span>
                )}
              </div>
              <span className="compact-timeline-step-label">Dev</span>
              
              <span 
                className="compact-timeline-step-date" 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => {
                  const inputEl = document.getElementById(`date-picker-dev-${item.id}`);
                  if (inputEl) (inputEl as any).showPicker?.();
                }}
              >
                {item.deadline ? formatDateToUserPattern(item.deadline) : 'Set Date'}
              </span>
              <input
                id={`date-picker-dev-${item.id}`}
                type="date"
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                value={parseDateToYYYYMMDD(item.deadline)}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFieldUpdate('deadline', e.target.value);
                  }
                }}
              />
            </div>

            {/* Step 4: Final Release */}
            <div className={`compact-timeline-step ${isFinalCompleted ? 'completed' : isFinalActive ? 'active' : 'pending'}`}>
              <div className="compact-timeline-node">
                {isFinalCompleted ? (
                  <CheckSquare size={12} />
                ) : (
                  <span>4</span>
                )}
              </div>
              <span className="compact-timeline-step-label">Release</span>
              
              <span 
                className="compact-timeline-step-date" 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => {
                  const inputEl = document.getElementById(`date-picker-release-${item.id}`);
                  if (inputEl) (inputEl as any).showPicker?.();
                }}
              >
                {item.finalRelease ? formatDateToUserPattern(item.finalRelease) : 'Set Date'}
              </span>
              <input
                id={`date-picker-release-${item.id}`}
                type="date"
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                value={parseDateToYYYYMMDD(item.finalRelease)}
                onChange={(e) => {
                  if (e.target.value) {
                    handleFieldUpdate('finalRelease', e.target.value);
                  }
                }}
              />
            </div>

          </div>
        </div>

        {/* Blocker Alert Banner */}
        {item.blocker && (
          <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', borderLeft: '4px solid var(--danger)', borderRadius: '6px', padding: '0.4rem 0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem' }}>🛑</span>
            <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>
              <strong style={{ color: 'var(--danger)' }}>Blocker active:</strong> {item.blocker}
            </p>
          </div>
        )}

        {/* Task Main Content / Description */}
        <div style={{ marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>
            Description
          </p>
          <textarea
            className="premium-textarea"
            style={{ minHeight: '80px' }}
            placeholder="Need to Re-calc TGPA and Regen Term 3 Term Reports for BMT 1..."
            onBlur={(e) => {
              if (e.target.value !== item.description) {
                handleFieldUpdate('description', e.target.value);
              }
            }}
            defaultValue={item.description}
          />
        </div>

        {/* Custom Fields Collapse (Notes section styled as ClickUp collapsible block) */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>
            Notes & Reference Links
          </p>
          <textarea
            className="premium-textarea"
            style={{ minHeight: '60px', marginTop: '0.5rem' }}
            placeholder="Paste reference notes, Figma links, or release checklist here..."
            onBlur={(e) => {
              if (e.target.value !== item.notes) {
                handleFieldUpdate('notes', e.target.value);
              }
            }}
            defaultValue={item.notes}
          />
        </div>

      </div>

      {/* Right Activity Pane (Comments & Logs) */}
      <div className="premium-sidebar">
        
        {/* Activity Title */}
        <div className="clickup-activity-header">
          <h3>Activity</h3>
        </div>

        {/* Activity feed stream list */}
        <div className="premium-timeline-stream">
          <div className="premium-timeline-line" />
          
          {/* Render comments & logs (Static seed + dynamically added) */}
          {activeComments.map(comment => {
            if (comment.isLog) {
              return (
                <div className="premium-comment-wrapper animate-fade-in" key={comment.id}>
                  <div className="premium-comment-avatar" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    ⚙️
                  </div>
                  <div style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--background-alt)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{comment.author}</strong> {comment.text}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{comment.time}</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="premium-comment-wrapper animate-fade-in" key={comment.id}>
                <div className="premium-comment-avatar" style={{ backgroundColor: comment.color }}>
                  {comment.initials}
                </div>
                <div className="premium-comment-card">
                  <div className="premium-comment-header">
                    <span className="premium-comment-author">{comment.author}</span>
                    <span className="premium-comment-time">{comment.time}</span>
                  </div>
                  <div className="premium-comment-text">
                    {comment.text}
                  </div>
                  {comment.attachment && (
                    <a className="premium-comment-attachment" href={comment.attachment.url} target="_blank" rel="noreferrer">
                      <CornerDownRight size={11} /> {comment.attachment.name}
                    </a>
                  )}
                </div>
              </div>
            );
          })}

        </div>

        {/* Comment Editor Box */}
        <div className="premium-comment-editor">
          <textarea
            className="premium-editor-textarea"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <div className="premium-editor-actions">
            <div className="premium-editor-tools">
              <button className="premium-editor-tool-btn" title="Add Emoji"><Smile size={14} /></button>
              <button className="premium-editor-tool-btn" title="Mention someone"><AtSign size={14} /></button>
              <button className="premium-editor-tool-btn" title="Attach files"><Paperclip size={14} /></button>
            </div>
            <button
              className="btn btn-primary"
              style={{
                padding: '4px 12px',
                fontSize: '0.75rem',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: '24px'
              }}
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              Send <Send size={10} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const displayText = selectedValues.length === 0 
    ? `All ${placeholder}es`
    : selectedValues.length === options.length 
      ? `All ${placeholder}es`
      : selectedValues.join(', ');

  return (
    <div className="multi-select-container" ref={containerRef}>
      <button 
        type="button" 
        className="multi-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="multi-select-trigger-text">{displayText}</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && (
        <div className="multi-select-dropdown">
          {options.map(option => {
            const isChecked = selectedValues.includes(option);
            return (
              <label key={option} className="multi-select-option">
                <input 
                  type="checkbox" 
                  className="multi-select-checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleOption(option)}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProductTable: React.FC = () => {
  const { productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<keyof ProductItem | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Inline editing state
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFeatureId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFeatureId]);

  const handleSort = (field: keyof ProductItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Search
  const filtered = productItems.filter(item => {
    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesPriority = filterPriority === 'All' || item.priority === filterPriority;
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(item.status);
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Sort
  if (sortField) {
    filtered.sort((a, b) => {
      const valA = String(a[sortField]).toLowerCase();
      const valB = String(b[sortField]).toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  const handleAddNew = () => {
    // Reset search query and sort to ensure the new row is visible at the top
    setSearchQuery('');
    setSortField(null);

    const newItem: ProductItem = {
      id: `prod-${Date.now()}`,
      feature: '',
      description: '',
      tarunSirApproval: false,
      raisedByTarunSir: false,
      priority: '',
      poc: '',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      product: '',
      uiux: '',
      finalRelease: '',
      productDeadline: ''
    };
    addProductItem(newItem);
    setInlineEditValue('');
    setEditingFeatureId(newItem.id);
  };

  const handleImportCSV = (data: string[][]) => {
    data.forEach(row => {
      if (row.length < 2) return;
      const newItem: ProductItem = {
        id: `prod-${Math.random()}`,
        feature: row[0] || 'Imported Feature',
        tarunSirApproval: row[1]?.toLowerCase() === 'yes' || row[1]?.toLowerCase() === 'true',
        raisedByTarunSir: row[2]?.toLowerCase() === 'yes' || row[2]?.toLowerCase() === 'true',
        priority: (row[3] as any) || 'P2',
        poc: row[4] || 'Akash',
        status: (row[5] as any) || 'In Progress',
        clickupStatus: row[6] || 'open',
        taskLink: row[7] || '',
        blocker: row[8] || '',
        deadline: row[9] || '',
        notes: row[10] || '',
        product: row[11] || 'Coach LMS Web',
        uiux: row[12] || '',
        finalRelease: row[13] || '',
        productDeadline: row[14] || '',
        description: row[15] || ''
      };
      addProductItem(newItem);
    });
  };

  // CSV and table render wrapper follows

  return (
    <>
      <TabContainer
        title="Product Priority Requests"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Feature"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
            <MultiSelectDropdown
              options={['On Hold', 'In Progress', 'Ongoing', 'Completed']}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
          </div>
        }
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }}>Feature {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('product')}>Product Group</th>
                <th onClick={() => handleSort('priority')}>Priority</th>
                <th onClick={() => handleSort('poc')}>POC Owner</th>
                <th onClick={() => handleSort('status')}>Status</th>
                <th onClick={() => handleSort('clickupStatus')}>Clickup</th>
                <th onClick={() => handleSort('productDeadline')}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')}>Final {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => {
                    if (editingFeatureId !== item.id) {
                      setPreviewProductId(item.id);
                    }
                  }} 
                  style={{ cursor: 'pointer' }}
                >
                  <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                      {editingFeatureId === item.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const finalVal = inlineEditValue.trim() || 'New Feature Request';
                              updateProductItem(item.id, { feature: finalVal });
                              setEditingFeatureId(null);
                              if (e.ctrlKey) {
                                setPreviewProductId(item.id);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingFeatureId(null);
                            }
                          }}
                          onBlur={() => {
                            const finalVal = inlineEditValue.trim() || 'New Feature Request';
                            updateProductItem(item.id, { feature: finalVal });
                            setEditingFeatureId(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--background)',
                            border: '1.5px solid var(--primary)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            outline: 'none',
                            boxShadow: '0 0 0 2px var(--primary-glow)'
                          }}
                        />
                      ) : (
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>
                          {item.feature}
                        </span>
                      )}
                      {item.raisedByTarunSir && (
                        <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Sparkles size={10} /> Super Priority
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{item.product || '—'}</td>
                  <td>
                    {item.priority ? (
                      <span className={`badge badge-${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.poc || '—'}</td>
                  <td>
                    {item.status ? (
                      <span className={`badge ${
                        item.status === 'On Hold' ? 'status-hold' :
                        item.status === 'In Progress' ? 'status-progress' :
                        item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                      }`}>
                        {item.status}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {item.clickupStatus ? (
                      <span className={`badge clickup-${item.clickupStatus.toLowerCase()}`}>
                        {item.clickupStatus}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.productDeadline ? formatDateToUserPattern(item.productDeadline) : '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.productDeadline} currentDate={item.uiux} />
                    {item.uiux ? formatDateToUserPattern(item.uiux) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.uiux} currentDate={item.deadline} />
                    {item.deadline ? formatDateToUserPattern(item.deadline) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.deadline} currentDate={item.finalRelease} />
                    {item.finalRelease ? formatDateToUserPattern(item.finalRelease) : '—'}
                  </td>

                  <td>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this feature?")) {
                          deleteProductItem(item.id);
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      <CSVImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCSV}
        title="Product Priorities"
        headers={['Feature', 'Tarun Sir Approval (Yes/No)', 'Raised by Tarun Sir (Yes/No)', 'Priority (P0/P1/P2)', 'POC Name', 'Status (In Progress/On Hold)', 'Clickup Status', 'Task URL', 'Blockers', 'Deadline Date', 'Notes text', 'Product mapping', 'UIUX Date', 'Final Release Date', 'Product Deadline Date', 'Description']}
      />
    </>
  );
};

/* =========================================================================
   2. SPRINT PLANNING (PLAN TABLE) MODAL & COMPONENT
   ========================================================================= */
interface PlanDetailModalProps {
  item: PlanItem;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<PlanItem>) => void;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PlanItem>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Planned Task' : 'Planned Task Details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label">Task Description</label>
              <textarea 
                className="form-input" 
                style={{ height: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.task} 
                onChange={(e) => setDraft({ ...draft, task: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sprint Month</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.month} 
                onChange={(e) => setDraft({ ...draft, month: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}
              >
                <option value="Development">Development</option>
                <option value="UI/UX">UI/UX</option>
                <option value="Product">Product</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              >
                <option value="open">Open</option>
                <option value="development">Development</option>
                <option value="testing">Testing</option>
                <option value="tested">Tested</option>
                <option value="in design">In Design</option>
                <option value="closed">Closed</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Sprint Link / References</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.link} 
                onChange={(e) => setDraft({ ...draft, link: e.target.value })} 
                placeholder="e.g. ClickUp URL or documentation"
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group detail-group-full">
              <span className="detail-label">Task / Deliverable</span>
              <span className="detail-value" style={{ fontSize: '1rem', fontWeight: 600 }}>{item.task}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Sprint Month</span>
              <span className="detail-value">{item.month}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Category</span>
              <span className="detail-value">{item.category}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Sprint Status</span>
              <div>
                <span className={`badge ${
                  item.status === 'Done' ? 'status-done' :
                  item.status === 'testing' ? 'clickup-testing' :
                  item.status === 'development' ? 'clickup-development' :
                  item.status === 'closed' ? 'clickup-closed' : 'clickup-open'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Sprint Reference Link</span>
              <div>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" className="detail-link">
                    Open Task Reference <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="detail-value" style={{ color: 'var(--text-muted)' }}>No reference link attached</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const PlanTable: React.FC = () => {
  const { planItems, updatePlanItem, addPlanItem, deletePlanItem, openPreviewForFeature } = useDashboard();
  const [selectedMonth, setSelectedMonth] = useState('May 2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const months = Array.from(new Set(planItems.map(item => item.month)));
  if (!months.includes(selectedMonth) && months.length > 0) {
    months.push(selectedMonth);
  }

  // Filter lists
  const filtered = planItems.filter(item => {
    const matchesMonth = item.month === selectedMonth;
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMonth && matchesCategory && matchesSearch;
  });

  const handleAddNew = () => {
    const newTask: PlanItem = {
      id: `plan-${Date.now()}`,
      month: selectedMonth,
      category: filterCategory !== 'All' ? (filterCategory as any) : 'Development',
      task: 'New Sprint Task Description',
      link: '',
      status: 'open'
    };
    addPlanItem(newTask);
    setEditingItem(newTask);
  };

  // HTML5 Drag-and-drop operations
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDraggedOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;

    const columnConfigs = [
      { id: 'backlog', fallbackStatus: 'open' },
      { id: 'design', fallbackStatus: 'in design' },
      { id: 'dev', fallbackStatus: 'development' },
      { id: 'testing', fallbackStatus: 'testing' },
      { id: 'completed', fallbackStatus: 'Done' }
    ];

    const column = columnConfigs.find(c => c.id === targetColId);
    if (!column) return;

    updatePlanItem(itemId, { status: column.fallbackStatus as any });
  };

  const COLUMNS = [
    { id: 'backlog', title: 'Backlog', statuses: ['open'], headerClass: 'backlog', icon: <Inbox size={14} style={{ color: 'var(--text-muted)' }} /> },
    { id: 'design', title: 'In Design', statuses: ['in design'], headerClass: 'design', icon: <Palette size={14} style={{ color: 'var(--primary)' }} /> },
    { id: 'dev', title: 'Development', statuses: ['development'], headerClass: 'dev', icon: <Code size={14} style={{ color: 'var(--info)' }} /> },
    { id: 'testing', title: 'Testing', statuses: ['testing', 'tested'], headerClass: 'testing', icon: <CheckSquare size={14} style={{ color: 'var(--warning)' }} /> },
    { id: 'completed', title: 'Completed', statuses: ['Done', 'closed'], headerClass: 'completed', icon: <CheckCircle size={14} style={{ color: 'var(--success)' }} /> }
  ];

  return (
    <>
      <TabContainer
        title="Next Months Roadmap Planning"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Task"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="June 2026">June 2026</option>
              <option value="July 2026">July 2026</option>
            </select>
            <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Development">Development</option>
              <option value="UI/UX">UI/UX</option>
              <option value="Product">Product</option>
            </select>
          </div>
        }
      >
        <div className="kanban-board-container">
          {COLUMNS.map(col => {
            const colItems = filtered.filter(item => col.statuses.includes(item.status));
            
            return (
              <div 
                key={col.id} 
                className={`kanban-column ${draggedOverColumn === col.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className={`kanban-column-header ${col.headerClass}`}>
                  <div className="kanban-column-title">
                    {col.icon}
                    <span>{col.title}</span>
                  </div>
                  <span className="kanban-card-count">{colItems.length}</span>
                </div>
                
                <div className="kanban-column-body">
                  {colItems.map(item => (
                    <div 
                      key={item.id} 
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onClick={() => openPreviewForFeature(item.task, { status: item.status as any, clickupStatus: item.status, taskLink: item.link })}
                    >
                      <div className="kanban-card-title">{item.task}</div>
                      
                      <div className="kanban-card-footer">
                        <div className="kanban-card-tags">
                          <span className={`kanban-badge-category ${item.category.toLowerCase().replace('/', '')}`}>
                            {item.category}
                          </span>
                          <span className="kanban-badge-month">
                            <Clock size={10} />
                            {item.month}
                          </span>
                        </div>
                        
                        <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                          {item.link && (
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="clickup-action-link"
                              style={{ padding: '2px', borderRadius: '4px' }}
                              title="Open Reference Link"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this sprint task?")) {
                                deletePlanItem(item.id);
                              }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title="Delete Task"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {colItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      Drag items here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </TabContainer>

      {editingItem && (
        <PlanDetailModal 
          item={planItems.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updatePlanItem}
        />
      )}
    </>
  );
};

/* =========================================================================
   3. STUDENT PROJECTS TABLE MODAL & COMPONENT
   ========================================================================= */
interface ProjectDetailModalProps {
  item: StudentProject;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<StudentProject>) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StudentProject>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Project Details' : 'Student Project Portfolio'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div className="form-group form-group-full">
              <label className="form-label">Project Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.title} 
                onChange={(e) => setDraft({ ...draft, title: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Completion Date</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.completeInfoDate} 
                onChange={(e) => setDraft({ ...draft, completeInfoDate: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Status / Student POC</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.assigned} 
                onChange={(e) => setDraft({ ...draft, assigned: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              >
                <option value="In-Progress">In-Progress</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Blocker Details</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.blocker} 
                onChange={(e) => setDraft({ ...draft, blocker: e.target.value })} 
                placeholder="No Blockers"
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Project Description</label>
              <textarea 
                className="form-input" 
                style={{ height: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.description} 
                onChange={(e) => setDraft({ ...draft, description: e.target.value })} 
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Things We Build</label>
              <textarea 
                className="form-input" 
                style={{ height: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.thingsWeBuild} 
                onChange={(e) => setDraft({ ...draft, thingsWeBuild: e.target.value })} 
                placeholder="e.g. backend api, dashboard pages, databases"
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group detail-group-full">
              <span className="detail-label">Project Title</span>
              <span className="detail-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.title}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Status</span>
              <div>
                <span className={`badge ${
                  item.status === 'Delivered' ? 'status-done' :
                  item.status === 'Cancelled' ? 'badge-cancelled' : 'status-progress'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>

            <div className="detail-group">
              <span className="detail-label">Target Completion Date</span>
              <span className="detail-value">{item.completeInfoDate}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Assigned Status / Students</span>
              <span className="detail-value">{item.assigned}</span>
            </div>

            {item.blocker && (
              <div className="detail-group detail-group-full">
                <span className="detail-label" style={{ color: 'var(--danger)' }}>Blockers & Obstacles</span>
                <div className="detail-value-block" style={{ borderLeft: '4px solid var(--danger)' }}>
                  {item.blocker}
                </div>
              </div>
            )}

            <div className="detail-group detail-group-full">
              <span className="detail-label">Overview Description</span>
              <div className="detail-value-block">{item.description}</div>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Components & Things We Build</span>
              <div className="detail-value-block" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border)' }}>
                {item.thingsWeBuild}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const StudentProjectsTable: React.FC = () => {
  const { studentProjects, updateStudentProject, addStudentProject, deleteStudentProject, openPreviewForFeature } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<StudentProject | null>(null);

  const filtered = studentProjects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.thingsWeBuild.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    const newItem: StudentProject = {
      id: `proj-${Date.now()}`,
      title: 'New Student Project App',
      description: 'Describe what the student project accomplishes.',
      thingsWeBuild: 'Core features, dashboard tools, backend databases',
      status: 'In-Progress',
      assigned: 'Akash (Unassigned)',
      blocker: '',
      completeInfoDate: '30 Jun 2026'
    };
    addStudentProject(newItem);
    setEditingItem(newItem);
  };

  return (
    <>
      <TabContainer
        title="Student Projects Portfolio"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Project"
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }}>Project Title</th>
                <th style={{ width: '150px' }}>Product Group</th>
                <th style={{ width: '80px' }}>Priority</th>
                <th style={{ width: '120px' }}>POC Owner</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '100px' }}>Clickup</th>
                <th style={{ width: '120px' }}>Specs Date</th>
                <th style={{ width: '120px' }}>UI/UX Date</th>
                <th style={{ width: '120px' }}>Dev Date</th>
                <th style={{ width: '120px' }}>Release Date</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr 
                  key={p.id} 
                  onClick={() => openPreviewForFeature(p.title, { 
                    id: p.id,
                    description: p.description, 
                    status: p.status === 'Delivered' ? 'Completed' : p.status === 'Cancelled' ? 'On Hold' : 'In Progress', 
                    priority: p.priority || 'P2',
                    poc: p.poc || 'Akash',
                    clickupStatus: p.clickupStatus || 'open',
                    taskLink: p.taskLink || '',
                    blocker: p.blocker || '',
                    deadline: p.deadline || p.completeInfoDate || '',
                    uiux: p.uiux || '',
                    finalRelease: p.finalRelease || '',
                    productDeadline: p.productDeadline || '',
                    raisedByTarunSir: p.raisedByTarunSir || false,
                    tarunSirApproval: p.tarunSirApproval || false,
                    product: p.product || 'Student Portal',
                    module: p.module || '',
                    type: p.type || ''
                  })} 
                  style={{ cursor: 'pointer' }}
                >
                  <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>
                        {p.title}
                      </span>
                      {p.raisedByTarunSir && (
                        <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Sparkles size={10} /> Super Priority
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{p.product || 'Student Portal'}</td>
                  <td>
                    <span className={`badge badge-${(p.priority || 'P2').toLowerCase()}`}>
                      {p.priority || 'P2'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.poc || 'Akash'}</td>
                  <td>
                    <span className={`badge ${
                      p.status === 'Delivered' ? 'status-completed' :
                      p.status === 'Cancelled' ? 'status-hold' : 'status-progress'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge clickup-${(p.clickupStatus || 'open').toLowerCase()}`}>
                      {p.clickupStatus || 'open'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.productDeadline ? formatDateToUserPattern(p.productDeadline) : '—'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.productDeadline} currentDate={p.uiux} />
                    {p.uiux ? formatDateToUserPattern(p.uiux) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.uiux} currentDate={p.completeInfoDate} />
                    {p.completeInfoDate ? formatDateToUserPattern(p.completeInfoDate) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.completeInfoDate} currentDate={p.finalRelease} />
                    {p.finalRelease ? formatDateToUserPattern(p.finalRelease) : '—'}
                  </td>

                  <td>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this project?")) {
                          deleteStudentProject(p.id);
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      {editingItem && (
        <ProjectDetailModal
          item={studentProjects.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updateStudentProject}
        />
      )}
    </>
  );
};

/* =========================================================================
   4. STUDENT MEETINGS SCHEDULE MODAL & COMPONENT
   ========================================================================= */

export interface StudentMeetingDetailModalProps {
  item: StudentMeeting;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<StudentMeeting>) => void;
}

export const StudentMeetingDetailModal: React.FC<StudentMeetingDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StudentMeeting>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Meeting feedback' : 'Cohort Feedback details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Meeting Date</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.date} 
                onChange={(e) => setDraft({ ...draft, date: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cohort / Programme</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.cohort} 
                onChange={(e) => setDraft({ ...draft, cohort: e.target.value })} 
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Feedback Summary Points (Use hyphens for bullets)</label>
              <textarea 
                className="form-input" 
                style={{ height: '180px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.summary} 
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })} 
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group">
              <span className="detail-label">Cohort / Section</span>
              <span className="detail-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.cohort}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Meeting Date</span>
              <span className="detail-value">{item.date}</span>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Feedback Minutes & Action Topics</span>
              <div className="detail-value-block">
                {item.summary}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};



const programsList = ['UG', 'PGP', 'YLC', 'All'];
const allStandardCohorts = ['UG-27,28,29', 'UGTBM 1', 'UGTBM 2', 'UG-DSAI-2029', 'PGP TBM', 'PGP-26', 'PGP-27', 'YLC 27', 'YLC 28', 'All Cohorts'];

const programCohortsMap: Record<string, string[]> = {
  'UG': ['UG-27,28,29', 'UGTBM 1', 'UGTBM 2', 'UG-DSAI-2029'],
  'PGP': ['PGP TBM', 'PGP-26', 'PGP-27'],
  'YLC': ['YLC 27', 'YLC 28'],
  'All': ['All Cohorts']
};



const getProgramForCohort = (cohort: string): string => {
  for (const [prog, cohorts] of Object.entries(programCohortsMap)) {
    if (cohorts.includes(cohort)) {
      return prog;
    }
  }
  if (cohort.startsWith('UG')) return 'UG';
  if (cohort.startsWith('PGP')) return 'PGP';
  if (cohort.startsWith('YLC')) return 'YLC';
  return 'UG';
};

export const StudentMeetingsTable: React.FC = () => {
  const { 
    amaSessions, addAMASession, updateAMASession, deleteAMASession,
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers
  } = useDashboard();

  // Derive speakers list from configuration context (live — updates when Config tab changes)
  const speakersList = configSpeakers.map(s => s.name);

  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown other state
  const [showCustomProgramInput, setShowCustomProgramInput] = useState(false);
  const [showCustomCohortInput, setShowCustomCohortInput] = useState(false);

  // Inline editing states for AMA sessions
  const [editingAMATopicId, setEditingAMATopicId] = useState<string | null>(null);
  const [inlineAMATopicValue, setInlineAMATopicValue] = useState('');
  const editAMATopicInputRef = useRef<HTMLInputElement>(null);

  const [editingAMADateId, setEditingAMADateId] = useState<string | null>(null);
  const [inlineAMADateValue, setInlineAMADateValue] = useState('');
  const editAMADateInputRef = useRef<HTMLInputElement>(null);

  const [editingAMASpeakerId, setEditingAMASpeakerId] = useState<string | null>(null);
  const [inlineAMASpeakerValue, setInlineAMASpeakerValue] = useState('');

  const [editingAMACohortId, setEditingAMACohortId] = useState<string | null>(null);
  const [inlineAMACohortValue, setInlineAMACohortValue] = useState('');
  const [inlineAMAProgramValue, setInlineAMAProgramValue] = useState('');
  const editAMACohortInputRef = useRef<HTMLInputElement>(null);
  const editAMAProgramInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAMATopicId && editAMATopicInputRef.current) {
      editAMATopicInputRef.current.focus();
      editAMATopicInputRef.current.select();
    }
  }, [editingAMATopicId]);

  useEffect(() => {
    if (editingAMADateId && editAMADateInputRef.current) {
      editAMADateInputRef.current.focus();
    }
  }, [editingAMADateId]);

  useEffect(() => {
    if (editingAMACohortId && editAMAProgramInputRef.current) {
      editAMAProgramInputRef.current.focus();
      editAMAProgramInputRef.current.select();
    }
  }, [editingAMACohortId]);

  // Accordion state for AMA sessions
  const [expandedAMAId, setExpandedAMAId] = useState<string | null>(null);

  // Inline editing state for related features in expanded AMA session
  const [editingRelatedFeatureId, setEditingRelatedFeatureId] = useState<string | null>(null);
  const [inlineRelatedFeatureValue, setInlineRelatedFeatureValue] = useState('');
  const editRelatedFeatureInputRef = useRef<HTMLInputElement>(null);

  const getRelatedFeatures = (ama: AMASession) => {
    if (!ama.topic.trim() && !ama.cohort.trim()) {
      return [];
    }
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const topicWords = clean(ama.topic).split(/\s+/).filter(w => w.length > 3);
    const cohortWords = clean(ama.cohort).split(/\s+/).filter(w => w.length > 2);
    const searchTerms = [...topicWords, ...cohortWords];
    return productItems.filter(item => {
      const productLower = (item.product || '').toLowerCase().trim();
      const moduleLower = (item.module || '').toLowerCase().trim();
      const notesLower = (item.notes || '').toLowerCase().trim();
      const cohortLower = (ama.cohort || '').toLowerCase().trim();
      
      const directCohortMatch = cohortLower && (
        (productLower && (productLower.includes(cohortLower) || cohortLower.includes(productLower))) ||
        (moduleLower && (moduleLower.includes(cohortLower) || cohortLower.includes(moduleLower))) ||
        (notesLower && notesLower.includes(cohortLower))
      );
      
      const text = clean(
        (item.feature || '') + ' ' + 
        (item.description || '') + ' ' + 
        (item.notes || '') + ' ' + 
        (item.product || '') + ' ' +
        (item.module || '')
      );
      const matchesKeyword = searchTerms.some(word => text.includes(word));
      return directCohortMatch || matchesKeyword;
    });
  };



  // Helper to find the parent AMA session for a feedback item
  const getParentAma = (item: ProductItem): AMASession | undefined => {
    return amaSessions.find(ama => {
      if (!ama.topic.trim() && !ama.cohort.trim()) return false;
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const topicWords = clean(ama.topic).split(/\s+/).filter(w => w.length > 3);
      const cohortWords = clean(ama.cohort).split(/\s+/).filter(w => w.length > 2);
      const searchTerms = [...topicWords, ...cohortWords];

      const productLower = (item.product || '').toLowerCase().trim();
      const moduleLower = (item.module || '').toLowerCase().trim();
      const notesLower = (item.notes || '').toLowerCase().trim();
      const cohortLower = (ama.cohort || '').toLowerCase().trim();
      
      const directCohortMatch = cohortLower && (
        (productLower && (productLower.includes(cohortLower) || cohortLower.includes(productLower))) ||
        (moduleLower && (moduleLower.includes(cohortLower) || cohortLower.includes(moduleLower))) ||
        (notesLower && notesLower.includes(cohortLower))
      );
      
      const text = clean(
        (item.feature || '') + ' ' + 
        (item.description || '') + ' ' + 
        (item.notes || '') + ' ' + 
        (item.product || '') + ' ' +
        (item.module || '')
      );
      const matchesKeyword = searchTerms.some(word => text.includes(word));
      return directCohortMatch || matchesKeyword;
    });
  };

  // Inline editing for Feedback Features
  const [editingFeedbackFeatureId, setEditingFeedbackFeatureId] = useState<string | null>(null);
  const [inlineFeedbackFeatureValue, setInlineFeedbackFeatureValue] = useState('');
  const editFeedbackFeatureInputRef = useRef<HTMLInputElement>(null);


  // Inline editing for Feedback Dates
  const [editingFeedbackDateId, setEditingFeedbackDateId] = useState<string | null>(null);
  const [inlineFeedbackDateValue, setInlineFeedbackDateValue] = useState('');
  const editFeedbackDateInputRef = useRef<HTMLInputElement>(null);

  // Inline editing for Feedback Programs
  const [editingFeedbackProgramId, setEditingFeedbackProgramId] = useState<string | null>(null);
  const [inlineFeedbackProgramValue, setInlineFeedbackProgramValue] = useState('');
  const editFeedbackProgramInputRef = useRef<HTMLInputElement>(null);

  // Inline editing for Feedback Cohorts
  const [editingFeedbackCohortId, setEditingFeedbackCohortId] = useState<string | null>(null);
  const [inlineFeedbackCohortValue, setInlineFeedbackCohortValue] = useState('');
  const editFeedbackCohortInputRef = useRef<HTMLInputElement>(null);

  // Inline editing for Feedback Speakers
  const [editingFeedbackSpeakerId, setEditingFeedbackSpeakerId] = useState<string | null>(null);
  const [inlineFeedbackSpeakerValue, setInlineFeedbackSpeakerValue] = useState('');

  useEffect(() => {
    if (editingFeedbackFeatureId && editFeedbackFeatureInputRef.current) {
      editFeedbackFeatureInputRef.current.focus();
      editFeedbackFeatureInputRef.current.select();
    }
  }, [editingFeedbackFeatureId]);


  useEffect(() => {
    if (editingFeedbackDateId && editFeedbackDateInputRef.current) {
      editFeedbackDateInputRef.current.focus();
    }
  }, [editingFeedbackDateId]);

  useEffect(() => {
    if (editingFeedbackProgramId && editFeedbackProgramInputRef.current) {
      editFeedbackProgramInputRef.current.focus();
      editFeedbackProgramInputRef.current.select();
    }
  }, [editingFeedbackProgramId]);

  useEffect(() => {
    if (editingFeedbackCohortId && editFeedbackCohortInputRef.current) {
      editFeedbackCohortInputRef.current.focus();
      editFeedbackCohortInputRef.current.select();
    }
  }, [editingFeedbackCohortId]);




  useEffect(() => {
    if (editingRelatedFeatureId && editRelatedFeatureInputRef.current) {
      editRelatedFeatureInputRef.current.focus();
      editRelatedFeatureInputRef.current.select();
    }
  }, [editingRelatedFeatureId]);

  const filteredAMASessions = amaSessions.filter(ama => 
    ama.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ama.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ama.cohort.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFeedbackFeatures = productItems.filter(item => {
    // Check if the item matches any AMA session
    const matchesAma = amaSessions.some(ama => {
      if (!ama.topic.trim() && !ama.cohort.trim()) return false;
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const topicWords = clean(ama.topic).split(/\s+/).filter(w => w.length > 3);
      const cohortWords = clean(ama.cohort).split(/\s+/).filter(w => w.length > 2);
      const searchTerms = [...topicWords, ...cohortWords];

      const productLower = (item.product || '').toLowerCase().trim();
      const moduleLower = (item.module || '').toLowerCase().trim();
      const notesLower = (item.notes || '').toLowerCase().trim();
      const cohortLower = (ama.cohort || '').toLowerCase().trim();
      
      const directCohortMatch = cohortLower && (
        (productLower && (productLower.includes(cohortLower) || cohortLower.includes(productLower))) ||
        (moduleLower && (moduleLower.includes(cohortLower) || cohortLower.includes(moduleLower))) ||
        (notesLower && notesLower.includes(cohortLower))
      );
      
      const text = clean(
        (item.feature || '') + ' ' + 
        (item.description || '') + ' ' + 
        (item.notes || '') + ' ' + 
        (item.product || '') + ' ' +
        (item.module || '')
      );
      const matchesKeyword = searchTerms.some(word => text.includes(word));
      return directCohortMatch || matchesKeyword;
    });

    if (!matchesAma) return false;

    // Filter by search query if any
    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.module || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleAddNew = () => {
    setSearchQuery('');
    if (subTab === 'schedule') {
      const newAMA: AMASession = {
        id: `ama-${Date.now()}`,
        date: new Date().toISOString().slice(0, 16),
        topic: '',
        speaker: '',
        cohort: '',
        program: '',
        link: '',
        status: 'Scheduled'
      };
      addAMASession(newAMA);
      setInlineAMATopicValue('');
      setEditingAMATopicId(newAMA.id);
    }
  };

  return (
    <>
      <TabContainer
        title="Student Meetings & AMA"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add AMA Session' : undefined}
        searchPlaceholder={subTab === 'schedule' ? 'Search AMA sessions...' : 'Search feedback features...'}
      >
        {/* Sub-tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            onClick={() => {
              setSubTab('schedule');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackCohortId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackProgramId(null);
              setEditingFeedbackSpeakerId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'schedule' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Schedule
          </button>
          <button
            onClick={() => {
              setSubTab('feedback');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackCohortId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackProgramId(null);
              setEditingFeedbackSpeakerId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'feedback' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'feedback' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Feedback
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Date</th>
                  <th>Topic / Theme</th>
                  <th style={{ width: '220px' }}>Speaker(s)</th>
                  <th style={{ width: '150px' }}>Cohort</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredAMASessions.map(ama => {
                  const related = getRelatedFeatures(ama);
                  const isExpanded = expandedAMAId === ama.id;
                  return (
                    <React.Fragment key={ama.id}>
                      <tr 
                        onClick={() => setExpandedAMAId(isExpanded ? null : ama.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAMADateId(ama.id);
                            setInlineAMADateValue(ama.date);
                          }}
                          title="Double click to edit Date/Time"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {editingAMADateId === ama.id ? (
                              <input
                                ref={editAMADateInputRef}
                                type="datetime-local"
                                value={formatToDatetimeLocalValue(inlineAMADateValue)}
                                onChange={(e) => setInlineAMADateValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineAMADateValue;
                                    updateAMASession(ama.id, { date: finalVal });
                                    setEditingAMADateId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingAMADateId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineAMADateValue;
                                  updateAMASession(ama.id, { date: finalVal });
                                  setEditingAMADateId(null);
                                }}
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <span>{formatDateWithTimeToUserPattern(ama.date)}</span>
                            )}
                          </div>
                        </td>
                        <td 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAMATopicId(ama.id);
                            setInlineAMATopicValue(ama.topic || '');
                          }}
                          style={{ fontWeight: 600 }}
                          title="Double click to edit Topic"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                            {editingAMATopicId === ama.id ? (
                              <input
                                ref={editAMATopicInputRef}
                                type="text"
                                value={inlineAMATopicValue}
                                onChange={(e) => setInlineAMATopicValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineAMATopicValue.trim() || 'New AMA Topic';
                                    updateAMASession(ama.id, { topic: finalVal });
                                    setEditingAMATopicId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingAMATopicId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineAMATopicValue.trim() || 'New AMA Topic';
                                  updateAMASession(ama.id, { topic: finalVal });
                                  setEditingAMATopicId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <>
                                <span>{ama.topic || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>
                                {related.length > 0 && (
                                  <span className="badge" style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 6px', 
                                    background: 'var(--primary-glow)', 
                                    color: 'var(--primary)', 
                                    border: '1px solid var(--primary-border)',
                                    fontWeight: 500
                                  }}>
                                    {related.length} {related.length === 1 ? 'feature' : 'features'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAMASpeakerId(ama.id);
                            setInlineAMASpeakerValue(ama.speaker || '');
                          }}
                          title="Click to edit Speaker(s)"
                        >
                          {editingAMASpeakerId === ama.id ? (
                            <select
                              autoFocus
                              value={inlineAMASpeakerValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineAMASpeakerValue(val);
                                if (val !== '__other__') {
                                  updateAMASession(ama.id, { speaker: val });
                                  setEditingAMASpeakerId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingAMASpeakerId(null);
                                }
                              }}
                              onBlur={() => setEditingAMASpeakerId(null)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">— Select Speaker —</option>
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineAMASpeakerValue && !speakersList.includes(inlineAMASpeakerValue) && (
                                <option value={inlineAMASpeakerValue}>{inlineAMASpeakerValue}</option>
                              )}
                            </select>
                          ) : (
                            ama.speaker || '—'
                          )}
                        </td>
                        <td
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAMACohortId(ama.id);
                            setInlineAMACohortValue(ama.cohort || '');
                            setInlineAMAProgramValue(ama.program || '');
                            setShowCustomProgramInput(ama.program ? !programsList.includes(ama.program) : false);
                            setShowCustomCohortInput(ama.cohort ? !allStandardCohorts.includes(ama.cohort) : false);
                          }}
                          title="Double click to edit Program/Cohort"
                        >
                          {editingAMACohortId === ama.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {!showCustomProgramInput ? (
                                <select
                                  value={inlineAMAProgramValue || 'UG'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomProgramInput(true);
                                      setInlineAMAProgramValue('');
                                    } else {
                                      setInlineAMAProgramValue(val);
                                      const cohorts = programCohortsMap[val] || [];
                                      if (cohorts.length > 0) {
                                        setInlineAMACohortValue(cohorts[0]);
                                        setShowCustomCohortInput(false);
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {programsList.map(prog => (
                                    <option key={prog} value={prog}>{prog}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editAMAProgramInputRef}
                                  type="text"
                                  placeholder="Prog"
                                  value={inlineAMAProgramValue}
                                  onChange={(e) => setInlineAMAProgramValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalCohort = inlineAMACohortValue.trim() || 'Cohort Name';
                                      const finalProgram = inlineAMAProgramValue.trim();
                                      updateAMASession(ama.id, { cohort: finalCohort, program: finalProgram });
                                      setEditingAMACohortId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingAMACohortId(null);
                                    }
                                  }}
                                  style={{
                                    width: '60px',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                              <span>-</span>
                              {!showCustomCohortInput ? (
                                <select
                                  value={inlineAMACohortValue || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomCohortInput(true);
                                      setInlineAMACohortValue('');
                                    } else {
                                      setInlineAMACohortValue(val);
                                      const mappedProg = getProgramForCohort(val);
                                      if (mappedProg && !showCustomProgramInput) {
                                        setInlineAMAProgramValue(mappedProg);
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {(programCohortsMap[inlineAMAProgramValue] || allStandardCohorts).map(coh => (
                                    <option key={coh} value={coh}>{coh}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editAMACohortInputRef}
                                  type="text"
                                  placeholder="Cohort"
                                  value={inlineAMACohortValue}
                                  onChange={(e) => setInlineAMACohortValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalCohort = inlineAMACohortValue.trim() || 'Cohort Name';
                                      const finalProgram = inlineAMAProgramValue.trim();
                                      updateAMASession(ama.id, { cohort: finalCohort, program: finalProgram });
                                      setEditingAMACohortId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingAMACohortId(null);
                                    }
                                  }}
                                  style={{
                                    width: '100px',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                              <button 
                                onClick={() => {
                                  const finalCohort = inlineAMACohortValue.trim() || 'Cohort Name';
                                  const finalProgram = inlineAMAProgramValue.trim();
                                  updateAMASession(ama.id, { cohort: finalCohort, program: finalProgram });
                                  setEditingAMACohortId(null);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingAMACohortId(null);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            ama.program ? `${ama.program} - ${ama.cohort}` : ama.cohort || '—'
                          )}
                        </td>
                        <td>
                          <select
                            value={ama.status || 'Scheduled'}
                            onChange={(e) => updateAMASession(ama.id, { status: e.target.value as any })}
                            onClick={(e) => e.stopPropagation()}
                            className={`badge ${
                              ama.status === 'Completed' ? 'status-completed' :
                              ama.status === 'Postponed' ? 'status-hold' : 'status-progress'
                            }`}
                            style={{ 
                              border: 'none', 
                              outline: 'none', 
                              cursor: 'pointer',
                              padding: '2px 6px',
                              fontFamily: 'inherit',
                              fontWeight: 'inherit',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            <option value="Scheduled" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Scheduled</option>
                            <option value="Completed" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Completed</option>
                            <option value="Postponed" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Postponed</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setEditingAMATopicId(ama.id);
                                setInlineAMATopicValue(ama.topic || '');
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Edit Topic Inline"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this AMA session?")) {
                                  deleteAMASession(ama.id);
                                }
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--danger)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Delete AMA Session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr style={{ background: 'var(--background)' }}>
                          <td colSpan={6} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '1.25rem',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                              {/* Header of expanded section */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newItem: ProductItem = {
                                      id: `prod-${Date.now()}`,
                                      feature: '',
                                      description: '',
                                      tarunSirApproval: false,
                                      raisedByTarunSir: false,
                                      priority: '',
                                      poc: '',
                                      status: '',
                                      clickupStatus: '',
                                      taskLink: '',
                                      blocker: '',
                                      deadline: '',
                                      notes: `AMA Cohort: ${ama.cohort}`,
                                      product: '',
                                      module: ama.cohort,
                                      uiux: '',
                                      finalRelease: '',
                                      productDeadline: ''
                                    };
                                    addProductItem(newItem);
                                    setInlineRelatedFeatureValue('');
                                    setEditingRelatedFeatureId(newItem.id);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  + Add Related Feature
                                </button>
                              </div>

                              {related.length > 0 ? (
                                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                                  <table className="grid-table" style={{ background: 'var(--background)' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--background-alt)' }}>
                                        <th>Feature</th>
                                        <th style={{ width: '150px' }}>Product</th>
                                        <th style={{ width: '80px' }}>Priority</th>
                                        <th style={{ width: '120px' }}>Status</th>
                                        <th style={{ width: '120px' }}>POC</th>
                                        <th style={{ width: '100px' }}>ClickUp</th>
                                        <th style={{ width: '40px' }}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {related.map(feat => (
                                        <tr 
                                          key={feat.id} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editingRelatedFeatureId !== feat.id) {
                                              setPreviewProductId(feat.id);
                                            }
                                          }} 
                                          style={{ cursor: 'pointer' }}
                                        >
                                          <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>
                                            {editingRelatedFeatureId === feat.id ? (
                                              <input
                                                ref={editRelatedFeatureInputRef}
                                                type="text"
                                                value={inlineRelatedFeatureValue}
                                                onChange={(e) => setInlineRelatedFeatureValue(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const finalVal = inlineRelatedFeatureValue.trim() || 'New Feature';
                                                    updateProductItem(feat.id, { feature: finalVal });
                                                    setEditingRelatedFeatureId(null);
                                                    if (e.ctrlKey) {
                                                      setPreviewProductId(feat.id);
                                                    }
                                                  } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setEditingRelatedFeatureId(null);
                                                  }
                                                }}
                                                onBlur={() => {
                                                  const finalVal = inlineRelatedFeatureValue.trim() || 'New Feature';
                                                  updateProductItem(feat.id, { feature: finalVal });
                                                  setEditingRelatedFeatureId(null);
                                                }}
                                                style={{
                                                  width: '100%',
                                                  padding: '6px 8px',
                                                  backgroundColor: 'var(--background)',
                                                  border: '1.5px solid var(--primary)',
                                                  borderRadius: '6px',
                                                  color: 'var(--text-primary)',
                                                  fontSize: '0.8rem',
                                                  fontWeight: 600,
                                                  outline: 'none',
                                                  boxShadow: '0 0 0 2px var(--primary-glow)'
                                                }}
                                              />
                                            ) : (
                                              <>
                                                {feat.feature || '—'}
                                                {feat.raisedByTarunSir && (
                                                  <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                    <Sparkles size={8} /> Super Priority
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </td>
                                          <td>{feat.product || '—'}</td>
                                          <td>
                                            {feat.priority ? (
                                              <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                                                {feat.priority}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>
                                            {feat.status ? (
                                              <span className={`badge ${
                                                feat.status === 'On Hold' ? 'status-hold' :
                                                feat.status === 'In Progress' ? 'status-progress' :
                                                feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                                              }`}>
                                                {feat.status}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>{feat.poc || '—'}</td>
                                          <td>
                                            {feat.clickupStatus ? (
                                              <span className={`badge clickup-${feat.clickupStatus.toLowerCase()}`}>
                                                {feat.clickupStatus}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm("Are you sure you want to delete this feature?")) {
                                                  deleteProductItem(feat.id);
                                                }
                                              }} 
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px' }}
                                              title="Delete Feature"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '1.5rem',
                                  border: '1px dashed var(--border)',
                                  borderRadius: '6px',
                                  color: 'var(--text-secondary)',
                                  gap: '0.5rem',
                                  background: 'var(--background)'
                                }}>
                                  <span style={{ fontSize: '0.8rem' }}>No associated feature requests found for this session.</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newItem: ProductItem = {
                                        id: `prod-${Date.now()}`,
                                        feature: '',
                                        description: '',
                                        tarunSirApproval: false,
                                        raisedByTarunSir: false,
                                        priority: '',
                                        poc: '',
                                        status: '',
                                        clickupStatus: '',
                                        taskLink: '',
                                        blocker: '',
                                        deadline: '',
                                        notes: `AMA Cohort: ${ama.cohort}`,
                                        product: '',
                                        module: ama.cohort,
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: ''
                                      };
                                      addProductItem(newItem);
                                      setInlineRelatedFeatureValue('');
                                      setEditingRelatedFeatureId(newItem.id);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    Create one now
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>Feature</th>
                  <th style={{ width: '180px' }}>Date-time</th>
                  <th style={{ width: '100px' }}>Program</th>
                  <th style={{ width: '120px' }}>Cohort</th>
                  <th style={{ width: '160px' }}>Speaker</th>
                  <th style={{ width: '150px' }}>Product Group</th>
                  <th style={{ width: '80px' }}>Priority</th>
                  <th style={{ width: '120px' }}>POC Owner</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '100px' }}>Clickup</th>
                  <th style={{ width: '120px' }}>Specs Date</th>
                  <th style={{ width: '120px' }}>UI/UX Date</th>
                  <th style={{ width: '120px' }}>Dev Date</th>
                  <th style={{ width: '120px' }}>Release Date</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbackFeatures.map(feat => {
                  const parentAma = getParentAma(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      onClick={() => {
                        if (
                          editingFeedbackFeatureId !== feat.id &&
                          editingFeedbackCohortId !== feat.id &&
                          editingFeedbackDateId !== feat.id &&
                          editingFeedbackProgramId !== feat.id &&
                          editingFeedbackSpeakerId !== feat.id
                        ) {
                          setPreviewProductId(feat.id);
                        }
                      }} 
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td className="sticky-col" style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                          {editingFeedbackFeatureId === feat.id ? (
                            <input
                              ref={editFeedbackFeatureInputRef}
                              type="text"
                              value={inlineFeedbackFeatureValue}
                              onChange={(e) => setInlineFeedbackFeatureValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                  updateProductItem(feat.id, { feature: finalVal });
                                  setEditingFeedbackFeatureId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackFeatureId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                updateProductItem(feat.id, { feature: finalVal });
                                setEditingFeedbackFeatureId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                outline: 'none',
                                boxShadow: '0 0 0 2px var(--primary-glow)'
                              }}
                            />
                          ) : (
                            <div 
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingFeedbackFeatureId(feat.id);
                                setInlineFeedbackFeatureValue(feat.feature || '');
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                              title="Double click to edit"
                            >
                              {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                              {feat.raisedByTarunSir && (
                                <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Sparkles size={10} /> Super Priority
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackDateId(feat.id);
                          setInlineFeedbackDateValue(parentAma.date);
                        }}
                        title={parentAma ? "Double click to edit Date/Time" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackDateId === feat.id ? (
                            <input
                              ref={editFeedbackDateInputRef}
                              type="datetime-local"
                              value={formatToDatetimeLocalValue(inlineFeedbackDateValue)}
                              onChange={(e) => setInlineFeedbackDateValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackDateValue;
                                  updateAMASession(parentAma.id, { date: finalVal });
                                  setEditingFeedbackDateId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackDateId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackDateValue;
                                updateAMASession(parentAma.id, { date: finalVal });
                                setEditingFeedbackDateId(null);
                              }}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            formatDateWithTimeToUserPattern(parentAma.date)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackProgramId(feat.id);
                          setInlineFeedbackProgramValue(parentAma.program || '');
                          setShowCustomProgramInput(parentAma.program ? !programsList.includes(parentAma.program) : false);
                        }}
                        title={parentAma ? "Double click to edit Program" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackProgramId === feat.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {!showCustomProgramInput ? (
                                <select
                                  value={inlineFeedbackProgramValue || 'UG'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomProgramInput(true);
                                      setInlineFeedbackProgramValue('');
                                    } else {
                                      setInlineFeedbackProgramValue(val);
                                      const cohorts = programCohortsMap[val] || [];
                                      const defaultCohort = cohorts.length > 0 ? cohorts[0] : '';
                                      updateAMASession(parentAma.id, { program: val, cohort: defaultCohort });
                                      setEditingFeedbackProgramId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!showCustomProgramInput) {
                                      setEditingFeedbackProgramId(null);
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {programsList.map(prog => (
                                    <option key={prog} value={prog}>{prog}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editFeedbackProgramInputRef}
                                  type="text"
                                  value={inlineFeedbackProgramValue}
                                  onChange={(e) => setInlineFeedbackProgramValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalVal = inlineFeedbackProgramValue.trim();
                                      updateAMASession(parentAma.id, { program: finalVal });
                                      setEditingFeedbackProgramId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingFeedbackProgramId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    const finalVal = inlineFeedbackProgramValue.trim();
                                    updateAMASession(parentAma.id, { program: finalVal });
                                    setEditingFeedbackProgramId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            parentAma.program || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackCohortId(feat.id);
                          setInlineFeedbackCohortValue(parentAma.cohort || '');
                          setInlineFeedbackProgramValue(parentAma.program || '');
                          setShowCustomCohortInput(parentAma.cohort ? !allStandardCohorts.includes(parentAma.cohort) : false);
                        }}
                        title={parentAma ? "Double click to edit Cohort" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackCohortId === feat.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {!showCustomCohortInput ? (
                                <select
                                  value={inlineFeedbackCohortValue || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomCohortInput(true);
                                      setInlineFeedbackCohortValue('');
                                    } else {
                                      setInlineFeedbackCohortValue(val);
                                      const mappedProg = getProgramForCohort(val);
                                      updateAMASession(parentAma.id, { cohort: val, program: mappedProg });
                                      setEditingFeedbackCohortId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!showCustomCohortInput) {
                                      setEditingFeedbackCohortId(null);
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {(programCohortsMap[inlineFeedbackProgramValue] || allStandardCohorts).map(coh => (
                                    <option key={coh} value={coh}>{coh}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editFeedbackCohortInputRef}
                                  type="text"
                                  value={inlineFeedbackCohortValue}
                                  onChange={(e) => setInlineFeedbackCohortValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalVal = inlineFeedbackCohortValue.trim() || 'Cohort Name';
                                      const mappedProg = getProgramForCohort(finalVal);
                                      updateAMASession(parentAma.id, { cohort: finalVal, program: mappedProg });
                                      setEditingFeedbackCohortId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingFeedbackCohortId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    const finalVal = inlineFeedbackCohortValue.trim() || 'Cohort Name';
                                    const mappedProg = getProgramForCohort(finalVal);
                                    updateAMASession(parentAma.id, { cohort: finalVal, program: mappedProg });
                                    setEditingFeedbackCohortId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            parentAma.cohort || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackSpeakerId(feat.id);
                          setInlineFeedbackSpeakerValue(parentAma.speaker || '');
                        }}
                        title={parentAma ? "Click to edit Speaker" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackSpeakerId === feat.id ? (
                            <select
                              autoFocus
                              value={inlineFeedbackSpeakerValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineFeedbackSpeakerValue(val);
                                if (val !== '') {
                                  updateAMASession(parentAma.id, { speaker: val });
                                  setEditingFeedbackSpeakerId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackSpeakerId(null);
                                }
                              }}
                              onBlur={() => setEditingFeedbackSpeakerId(null)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">— Select Speaker —</option>
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineFeedbackSpeakerValue && !speakersList.includes(inlineFeedbackSpeakerValue) && (
                                <option value={inlineFeedbackSpeakerValue}>{inlineFeedbackSpeakerValue}</option>
                              )}
                            </select>
                          ) : (
                            parentAma.speaker || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{feat.product || '—'}</td>
                      <td>
                        {feat.priority ? (
                          <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                            {feat.priority}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontWeight: 500 }}>{feat.poc || '—'}</td>
                      <td>
                        {feat.status ? (
                          <span className={`badge ${
                            feat.status === 'On Hold' ? 'status-hold' :
                            feat.status === 'In Progress' ? 'status-progress' :
                            feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                          }`}>
                            {feat.status}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.clickupStatus ? (
                          <span className={`badge clickup-${feat.clickupStatus.toLowerCase()}`}>
                            {feat.clickupStatus}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feat.productDeadline ? formatDateToUserPattern(feat.productDeadline) : '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                        {feat.uiux ? formatDateToUserPattern(feat.uiux) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux} currentDate={feat.deadline} />
                        {feat.deadline ? formatDateToUserPattern(feat.deadline) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? formatDateToUserPattern(feat.finalRelease) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this feedback feature?")) {
                                deleteProductItem(feat.id);
                              }
                            }} 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              color: 'var(--danger)', 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title="Delete Feedback Feature"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TabContainer>



    </>
  );
};

/* =========================================================================
   5. ADMIN CALLS MODAL & COMPONENT
   ========================================================================= */
interface AdminCallDetailModalProps {
  item: AdminCall;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<AdminCall>) => void;
}

const AdminCallDetailModal: React.FC<AdminCallDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AdminCall>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Admin Call Log' : 'Admin Call Details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Call Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={draft.date} 
                onChange={(e) => setDraft({ ...draft, date: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Admin / POC Owner</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.adminPoc} 
                onChange={(e) => setDraft({ ...draft, adminPoc: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Call Topic / Subject</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.cohortTopic} 
                onChange={(e) => setDraft({ ...draft, cohortTopic: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Call Status</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Pending Actions">Pending Actions</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Discussion Details</label>
              <textarea 
                className="form-input" 
                style={{ height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.discussion} 
                onChange={(e) => setDraft({ ...draft, discussion: e.target.value })} 
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Action Items / Assignments</label>
              <textarea 
                className="form-input" 
                style={{ height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.actions} 
                onChange={(e) => setDraft({ ...draft, actions: e.target.value })} 
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group detail-group-full">
              <span className="detail-label">Call Topic</span>
              <span className="detail-value" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.cohortTopic}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Admin POC</span>
              <span className="detail-value" style={{ fontWeight: 600 }}>{item.adminPoc}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Date of Call</span>
              <span className="detail-value">{item.date}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Call Status</span>
              <div>
                <span className={`badge ${
                  item.status === 'Completed' ? 'status-done' :
                  item.status === 'Pending Actions' ? 'status-hold' : 'status-progress'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Key Discussion Minutes</span>
              <div className="detail-value-block">{item.discussion || '—'}</div>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Assigned Action Items</span>
              <div className="detail-value-block" style={{ borderLeft: '4px solid var(--primary)' }}>
                {item.actions || '—'}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminCallsTable: React.FC = () => {
  const { adminCalls, updateAdminCall, addAdminCall, deleteAdminCall, openPreviewForFeature } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<AdminCall | null>(null);

  const filtered = adminCalls.filter(c => 
    c.adminPoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.cohortTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.discussion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    const newCall: AdminCall = {
      id: `adm-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      adminPoc: 'POC Owner',
      cohortTopic: 'Discussion Topic Name',
      discussion: 'Discussed key tools and coordination schedules.',
      actions: 'Team to investigate integration blockers.',
      status: 'Scheduled'
    };
    addAdminCall(newCall);
    setEditingItem(newCall);
  };

  return (
    <>
      <TabContainer
        title="Admin Calls Schedule"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Admin Call"
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Call Date</th>
                <th style={{ width: '180px' }}>Admin / POC</th>
                <th>Topic / Call Agenda</th>
                <th style={{ width: '150px' }}>Status</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(call => (
                <tr key={call.id} onClick={() => openPreviewForFeature(call.cohortTopic, { description: `Admin discussion: ${call.discussion}. Actions: ${call.actions}. POC: ${call.adminPoc}`, status: call.status === 'Completed' ? 'Completed' : 'In Progress', clickupStatus: call.status })} style={{ cursor: 'pointer' }}>
                  <td>{formatDateToUserPattern(call.date)}</td>
                  <td style={{ fontWeight: 600 }}>{call.adminPoc}</td>
                  <td style={{ fontWeight: 500 }}>{call.cohortTopic}</td>
                  <td>
                    <span className={`badge ${
                      call.status === 'Completed' ? 'status-done' :
                      call.status === 'Pending Actions' ? 'status-hold' : 'status-progress'
                    }`}>
                      {call.status}
                    </span>
                  </td>

                  <td>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this call log?")) {
                          deleteAdminCall(call.id);
                        }
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      {editingItem && (
        <AdminCallDetailModal 
          item={adminCalls.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updateAdminCall}
        />
      )}
    </>
  );
};

/* =========================================================================
   6. CONTENT MANAGEMENT MODAL & COMPONENT
   ========================================================================= */
interface ContentDetailModalProps {
  item: ContentItem;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<ContentItem>) => void;
}

const ContentDetailModal: React.FC<ContentDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ContentItem>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Content Pipeline Item' : 'Content Pipeline details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label">Module / Topic Title</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.module} 
                onChange={(e) => setDraft({ ...draft, module: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subject Category</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.subject} 
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content Type</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
              >
                <option value="Video">Video Lecture</option>
                <option value="Quiz">Interactive Quiz</option>
                <option value="Worksheet">Practice Worksheet</option>
                <option value="Notes">Revision Notes</option>
                <option value="Syllabus">Syllabus Overview</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">POC Owner</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.poc} 
                onChange={(e) => setDraft({ ...draft, poc: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Publish Target Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={draft.publishDate} 
                onChange={(e) => setDraft({ ...draft, publishDate: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pipeline Status</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              >
                <option value="Drafting">Drafting</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
              </select>
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Draft Document URL</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.draftLink} 
                onChange={(e) => setDraft({ ...draft, draftLink: e.target.value })} 
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group detail-group-full">
              <span className="detail-label">Module / Course Topic</span>
              <span className="detail-value" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.module}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Subject Category</span>
              <span className="detail-value">{item.subject}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Content Material Type</span>
              <span className="detail-value">{item.type}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">POC Curator</span>
              <span className="detail-value" style={{ fontWeight: 600 }}>{item.poc}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Target Publish Date</span>
              <span className="detail-value">{item.publishDate || 'Not Scheduled'}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Publish Status</span>
              <div>
                <span className={`badge ${
                  item.status === 'Published' ? 'status-done' :
                  item.status === 'Approved' ? 'status-ongoing' :
                  item.status === 'Under Review' ? 'status-progress' : 'status-hold'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Draft Document URL Link</span>
              <div>
                {item.draftLink ? (
                  <a href={item.draftLink} target="_blank" rel="noreferrer" className="detail-link">
                    Open Draft Document URL <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="detail-value" style={{ color: 'var(--text-muted)' }}>No document link provided</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ContentTable: React.FC = () => {
  const { contentItems, updateContentItem, addContentItem, deleteContentItem, openPreviewForFeature } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  const filtered = contentItems.filter(item => 
    item.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.poc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    const newItem: ContentItem = {
      id: `cont-${Date.now()}`,
      module: 'New Module Content Topic',
      subject: 'Subject Category',
      type: 'Video',
      poc: 'Nikhil',
      draftLink: '',
      status: 'Drafting',
      publishDate: ''
    };
    addContentItem(newItem);
    setEditingItem(newItem);
  };

  return (
    <>
      <TabContainer
        title="Content Management Pipeline"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Content Item"
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Module / Topic Name</th>
                <th style={{ width: '160px' }}>Subject</th>
                <th style={{ width: '140px' }}>Type</th>
                <th style={{ width: '150px' }}>Pipeline Status</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} onClick={() => openPreviewForFeature(item.module, { description: `Content topic: ${item.module}. Subject: ${item.subject}. Type: ${item.type}.`, status: item.status === 'Published' ? 'Completed' : 'In Progress', clickupStatus: item.status })} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{item.module}</td>
                  <td>{item.subject}</td>
                  <td>
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{item.type}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      item.status === 'Published' ? 'status-done' :
                      item.status === 'Approved' ? 'status-ongoing' :
                      item.status === 'Under Review' ? 'status-progress' : 'status-hold'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  <td>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this content item?")) {
                          deleteContentItem(item.id);
                        }
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      {editingItem && (
        <ContentDetailModal 
          item={contentItems.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updateContentItem}
        />
      )}
    </>
  );
};

/* =========================================================================
   7. PRODUCT-WISE PIVOT BREAKDOWN SHEET
   ========================================================================= */
export const ProductWiseSheet: React.FC = () => {
  const { productItems, planItems, deleteProductItem, setPreviewProductId, productGroups } = useDashboard();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  
  const products = Array.from(new Set([
    ...productGroups.map(g => g.name),
    ...productItems.map(p => p.product).filter(Boolean)
  ]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem 0', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {products.map((prod) => {
          const features = productItems.filter(item => item.product === prod);
          const totalFeatures = features.length;
          const completedFeatures = features.filter(item => item.status === 'Completed').length;
          
          const relatedPlans = planItems.filter(item => 
            item.task.toLowerCase().includes(prod.toLowerCase()) || 
            (prod === 'Coach LMS Web' && item.task.toLowerCase().includes('lms')) ||
            (prod === 'Coach LMS App' && item.task.toLowerCase().includes('app'))
          );
          const progressPercent = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;
          const isExpanded = expandedProduct === prod;

          return (
            <div 
              key={prod} 
              style={{ 
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.75rem',
                marginBottom: '0.25rem',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Accordion Header */}
              <div 
                onClick={() => setExpandedProduct(isExpanded ? null : prod)}
                style={{ 
                  padding: '1rem 1.25rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  backgroundColor: isExpanded ? 'var(--background-alt)' : 'transparent',
                  transition: 'background-color 0.2s',
                  userSelect: 'none',
                  borderRadius: '8px'
                }}
                className="accordion-header-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                    {prod}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-p0" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      {totalFeatures} Priorities
                    </span>
                    <span className="badge badge-p2" style={{ fontSize: '0.65rem', padding: '2px 8px', backgroundColor: 'var(--accent-hover)', color: 'white' }}>
                      {relatedPlans.length} Sprints
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  {/* Completion Rate Compact Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '160px' }}>
                    <div className="progress-bar-container" style={{ flex: 1, height: '6px', backgroundColor: 'var(--border)' }}>
                      <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, backgroundColor: 'var(--success)' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '32px', textAlign: 'right' }}>
                      {progressPercent}%
                    </span>
                  </div>

                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
              </div>

              {/* Accordion Content */}
              {isExpanded && (
                <div 
                  style={{ 
                    padding: '1.5rem 1.25rem 0.5rem 1.25rem', 
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  {features.length > 0 ? (
                    <div className="table-responsive" style={{ margin: 0 }}>
                      <table className="grid-table">
                        <thead>
                          <tr>
                            <th className="sticky-header-col" style={{ width: '280px', minWidth: '280px', maxWidth: '280px' }}>Feature</th>
                            <th style={{ width: '80px' }}>Priority</th>
                            <th style={{ width: '120px' }}>POC Owner</th>
                            <th style={{ width: '120px' }}>Status</th>
                            <th style={{ width: '100px' }}>Clickup</th>
                            <th style={{ width: '120px' }}>Specs Date</th>
                            <th style={{ width: '120px' }}>UI/UX Date</th>
                            <th style={{ width: '120px' }}>Dev Date</th>
                            <th style={{ width: '120px' }}>Release Date</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {features.map(item => (
                            <tr key={item.id} onClick={() => setPreviewProductId(item.id)} style={{ cursor: 'pointer' }}>
                              <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>
                                    {item.feature}
                                  </span>
                                  {item.raisedByTarunSir && (
                                    <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                      <Sparkles size={10} /> Super Priority
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`badge badge-${item.priority.toLowerCase()}`}>
                                  {item.priority}
                                </span>
                              </td>
                              <td style={{ fontWeight: 500 }}>{item.poc}</td>
                              <td>
                                <span className={`badge ${
                                  item.status === 'On Hold' ? 'status-hold' :
                                  item.status === 'In Progress' ? 'status-progress' :
                                  item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                <span className={`badge clickup-${(item.clickupStatus || 'open').toLowerCase()}`}>
                                  {item.clickupStatus || 'open'}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.productDeadline ? formatDateToUserPattern(item.productDeadline) : '—'}</td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                <DateDiffBadge prevDate={item.productDeadline} currentDate={item.uiux} />
                                {item.uiux ? formatDateToUserPattern(item.uiux) : '—'}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                <DateDiffBadge prevDate={item.uiux} currentDate={item.deadline} />
                                {item.deadline ? formatDateToUserPattern(item.deadline) : '—'}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                <DateDiffBadge prevDate={item.deadline} currentDate={item.finalRelease} />
                                {item.finalRelease ? formatDateToUserPattern(item.finalRelease) : '—'}
                              </td>

                              <td>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Are you sure you want to delete this feature?")) {
                                      deleteProductItem(item.id);
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      No priority features mapped to this product.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================================
   8. DAILY ISSUES / IMPROVEMENTS LOG MODAL & COMPONENT
   ========================================================================= */
interface DailyIssueDetailModalProps {
  item: DailyIssue;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<DailyIssue>) => void;
}

const DailyIssueDetailModal: React.FC<DailyIssueDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DailyIssue>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Reported Issue' : 'Daily Classroom Issue Details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Ticket ID Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.id} 
                onChange={(e) => setDraft({ ...draft, id: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cohort / Section</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.cohort} 
                onChange={(e) => setDraft({ ...draft, cohort: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product / Platform</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.product} 
                onChange={(e) => setDraft({ ...draft, product: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sub-Module / Topic</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.module} 
                onChange={(e) => setDraft({ ...draft, module: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Issue Category Type</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
              >
                <option value="Bug/Defect">Bug / Defect</option>
                <option value="Performance">Performance Issue</option>
                <option value="Information Lack">Information Lack</option>
                <option value="Enhancement">Enhancement request</option>
                <option value="Feature Gap">Feature Gap</option>
                <option value="UX">UX / Design issue</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Contact / Reporter</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.contact} 
                onChange={(e) => setDraft({ ...draft, contact: e.target.value })} 
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Ticket Descriptions / Details</label>
              <textarea 
                className="form-input" 
                style={{ height: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.issues} 
                onChange={(e) => setDraft({ ...draft, issues: e.target.value })} 
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group">
              <span className="detail-label">Ticket Reference ID</span>
              <span className="detail-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>#{item.id}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Issue Category Type</span>
              <div>
                <span className={`badge ${
                  item.type === 'Bug/Defect' ? 'badge-bug' : 
                  item.type === 'Performance' ? 'badge-performance' : 
                  item.type === 'UX' ? 'badge-ux' : 'badge-enhancement'
                }`}>
                  {item.type}
                </span>
              </div>
            </div>

            <div className="detail-group">
              <span className="detail-label">Cohort / Class Section</span>
              <span className="detail-value" style={{ fontWeight: 600 }}>{item.cohort}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Product / Sub-Module</span>
              <span className="detail-value">{item.product} {item.module ? `(${item.module})` : ''}</span>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Reporter Contact details</span>
              <span className="detail-value">{item.contact || 'No contact specified'}</span>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Detailed Ticket Issue Descriptions</span>
              <div className="detail-value-block" style={{ borderLeft: '4px solid var(--warning)' }}>
                {item.issues}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const IssuesTable: React.FC = () => {
  const { dailyIssues, updateDailyIssue, addDailyIssue, deleteDailyIssue, openPreviewForFeature } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [editingItem, setEditingItem] = useState<DailyIssue | null>(null);

  const filtered = dailyIssues.filter(item => {
    const matchesSearch = 
      item.cohort.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.issues.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contact.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = filterType === 'All' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddNew = () => {
    const newId = String(Math.max(...dailyIssues.map(i => parseInt(i.id) || 0), 0) + 1);
    const newItem: DailyIssue = {
      id: newId,
      cohort: 'UG-DSAI-2029',
      product: 'Coach LMS Web',
      module: 'Module Name',
      type: 'Bug/Defect',
      issues: 'Describe the bug details here',
      contact: 'Internal Support'
    };
    addDailyIssue(newItem);
    setEditingItem(newItem);
  };

  return (
    <>
      <TabContainer
        title="Daily Classroom Issues & Improvements Log"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Report Issue"
        filterComponent={
          <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Bug/Defect">Bug/Defect</option>
            <option value="Performance">Performance</option>
            <option value="UX">UX</option>
            <option value="Enhancement">Enhancement</option>
            <option value="Feature Gap">Feature Gap</option>
            <option value="Information Lack">Information Lack</option>
          </select>
        }
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textTransform: 'uppercase' }}>Ticket ID</th>
                <th>Cohort / Section</th>
                <th style={{ width: '160px' }}>Issue Type</th>
                <th>Product Module</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(issue => (
                <tr key={issue.id} onClick={() => openPreviewForFeature(issue.module || issue.cohort + ' - ' + issue.id, { description: issue.issues, product: issue.product })} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700, textAlign: 'center' }}>#{issue.id}</td>
                  <td style={{ fontWeight: 600 }}>{issue.cohort}</td>
                  <td>
                    <span className={`badge ${
                      issue.type === 'Bug/Defect' ? 'badge-bug' : 
                      issue.type === 'Performance' ? 'badge-performance' : 
                      issue.type === 'UX' ? 'badge-ux' : 'badge-enhancement'
                    }`}>
                      {issue.type}
                    </span>
                  </td>
                  <td>{issue.product}</td>

                  <td>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this issue log?")) {
                          deleteDailyIssue(issue.id);
                        }
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      {editingItem && (
        <DailyIssueDetailModal 
          item={dailyIssues.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updateDailyIssue}
        />
      )}
    </>
  );
};

/* =========================================================================
   9. ADOPTION TRACKER METRICS MODAL & COMPONENT
   ========================================================================= */
interface AdoptionDetailModalProps {
  item: FeatureAdoption;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<FeatureAdoption>) => void;
}

const AdoptionDetailModal: React.FC<AdoptionDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<FeatureAdoption>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Adoption Metrics' : 'Feature Adoption details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid" style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div className="form-group form-group-full">
              <label className="form-label">Feature Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.feature} 
                onChange={(e) => setDraft({ ...draft, feature: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product Module</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.product} 
                onChange={(e) => setDraft({ ...draft, product: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Launch Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={draft.launchDate} 
                onChange={(e) => setDraft({ ...draft, launchDate: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Audience Scope / Target Cohorts</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.targetAudience} 
                onChange={(e) => setDraft({ ...draft, targetAudience: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Active Weekly Users</label>
              <input 
                type="number" 
                className="form-input" 
                value={draft.activeUsers} 
                onChange={(e) => setDraft({ ...draft, activeUsers: parseInt(e.target.value) || 0 })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adoption Rate ({draft.adoptionRate}%)</label>
              <input 
                type="range" 
                min="0" 
                max="100"
                style={{ cursor: 'pointer', accentColor: 'var(--primary)', height: '38px' }}
                value={draft.adoptionRate} 
                onChange={(e) => setDraft({ ...draft, adoptionRate: parseInt(e.target.value) || 0 })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sentiment Score (1.0 to 5.0★)</label>
              <input 
                type="number" 
                min="1.0"
                max="5.0"
                step="0.1"
                className="form-input" 
                value={draft.sentiment} 
                onChange={(e) => setDraft({ ...draft, sentiment: parseFloat(e.target.value) || 1.0 })} 
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group detail-group-full">
              <span className="detail-label">Feature Scope</span>
              <span className="detail-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.feature}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Product Group</span>
              <span className="detail-value">{item.product}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Launch Date</span>
              <span className="detail-value">{item.launchDate}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Audience Target Scope</span>
              <span className="detail-value">{item.targetAudience}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Active Users Tracked</span>
              <span className="detail-value" style={{ fontSize: '1.05rem', fontWeight: 600 }}>{item.activeUsers} Users</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Adoption Rate Percentage</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div className="progress-bar-container" style={{ height: '10px', width: '100px' }}>
                  <div className="progress-bar-fill" style={{ width: `${item.adoptionRate}%` }}></div>
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.adoptionRate}%</span>
              </div>
            </div>

            <div className="detail-group">
              <span className="detail-label">User Satisfaction Sentiment</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.sentiment} / 5.0</span>
                <span style={{ color: 'var(--warning)', fontSize: '1.1rem' }}>
                  {'★'.repeat(Math.round(item.sentiment))}
                  <span style={{ opacity: 0.2 }}>{'★'.repeat(5 - Math.round(item.sentiment))}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdoptionTable: React.FC = () => {
  const { featureAdoptions, updateFeatureAdoption, addFeatureAdoption, deleteFeatureAdoption, openPreviewForFeature } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<FeatureAdoption | null>(null);

  const filtered = featureAdoptions.filter(adopt => 
    adopt.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
    adopt.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    const newItem: FeatureAdoption = {
      id: `adopt-${Date.now()}`,
      feature: 'New Feature Track Name',
      product: 'Coach LMS Web',
      launchDate: new Date().toISOString().slice(0, 10),
      targetAudience: 'All Cohorts',
      adoptionRate: 0,
      activeUsers: 0,
      sentiment: 3.0
    };
    addFeatureAdoption(newItem);
    setEditingItem(newItem);
  };

  return (
    <>
      <TabContainer
        title="Feature Launch & Adoption Metrics Tracker"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Track Feature"
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Feature Name</th>
                <th>Product Module</th>
                <th style={{ width: '220px' }}>Adoption Rate (%)</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(adopt => (
                <tr key={adopt.id} onClick={() => openPreviewForFeature(adopt.feature, { product: adopt.product, description: `Launch Date: ${adopt.launchDate}. Target Audience: ${adopt.targetAudience}. Adoption Rate: ${adopt.adoptionRate}%. Sentiment Rating: ${adopt.sentiment}/5.0.` })} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{adopt.feature}</td>
                  <td>{adopt.product}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="progress-bar-container" style={{ width: '100px', height: '8px' }}>
                        <div className="progress-bar-fill" style={{ width: `${adopt.adoptionRate}%` }}></div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', width: '32px' }}>{adopt.adoptionRate}%</span>
                    </div>
                  </td>

                  <td>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this launch metrics tracker?")) {
                          deleteFeatureAdoption(adopt.id);
                        }
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      {editingItem && (
        <AdoptionDetailModal 
          item={featureAdoptions.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updateFeatureAdoption}
        />
      )}
    </>
  );
};
