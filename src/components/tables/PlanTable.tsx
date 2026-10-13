import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  ExternalLink,
  X,
  Palette,
  Code,
  Sparkles,
  Inbox,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Rocket,
  MessageSquare
} from 'lucide-react';
import type {
  PlanItem
} from '../../types';
import {
  getClickupBadgeStyle,
  parseDateToYYYYMMDD,
  formatDateToUserPattern,
  getDateSpanStyle
} from '../common/tableUtils';

interface PlanDetailModalProps {
  item: PlanItem;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<PlanItem>) => void;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const { canUserEdit } = useDashboard();
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
          <h3 className="modal-title" style={{ fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", color: 'var(--primary)' }}>
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
                <option value="Release">Release</option>
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
                <option value="open">Product</option>
                <option value="in design">In Design</option>
                <option value="development">Development</option>
                <option value="released">Released</option>
                <option value="closed">Closed</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem' }}>
              <input 
                type="checkbox" 
                id="task-completed-checkbox"
                checked={!!draft.completed} 
                onChange={(e) => setDraft({ ...draft, completed: e.target.checked })} 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="task-completed-checkbox" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Mark as Completed</label>
            </div>

            <div className="form-group">
              <label className="form-label">Sprint Link / References</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.link} 
                onChange={(e) => setDraft({ ...draft, link: e.target.value })} 
                placeholder="e.g. ClickUp URL or documentation"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ClickUp Status</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.clickupStatus || ''} 
                onChange={(e) => setDraft({ ...draft, clickupStatus: e.target.value })} 
                placeholder="Syncs from ClickUp or manual input"
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
                  item.status === 'released' ? 'status-released' :
                  item.status === 'development' ? 'clickup-development' :
                  item.status === 'closed' ? 'clickup-closed' : 'clickup-open'
                }`}>
                  {item.status === 'open' ? 'Product' : item.status}
                </span>
              </div>
            </div>

            <div className="detail-group">
              <span className="detail-label">Completion Status</span>
              <div>
                {item.completed ? (
                  <span className="badge status-done" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={12} /> Completed
                  </span>
                ) : (
                  <span className="badge clickup-open">Active</span>
                )}
              </div>
            </div>

            {item.clickupStatus && (
              <div className="detail-group">
                <span className="detail-label">ClickUp Status</span>
                <div>
                  <span style={getClickupBadgeStyle(item.clickupStatus)}>
                    {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
                  </span>
                </div>
              </div>
            )}

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
              {canUserEdit && <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const PlanTable: React.FC = () => {
  const {
    planItems, updatePlanItem, deletePlanItem,
    productItems, studentProjects, contentItems, studentMeetings,
    dailyIssues,
    openPreviewForFeature, canUserEdit, confirm, comments, lastOpenedMap,
    isLoadingSprint, fetchSprintData
  } = useDashboard();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  });

  useEffect(() => {
    fetchSprintData(selectedMonth);
  }, [selectedMonth, fetchSprintData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const showAutoItems = true;
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);

  // Helper to find a matching product item to read completion status
  const findMatchingProductItem = (title: string) => {
    if (!title) return null;
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = clean(title);
    
    // 1. Check exact or substring match
    let match = productItems.find(item => {
      const cleanFeature = clean(item.feature);
      return cleanName.includes(cleanFeature) || cleanFeature.includes(cleanName);
    });

    // 2. Token overlap match
    if (!match) {
      const nameWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      match = productItems.find(item => {
        const featureWords = item.feature.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const common = nameWords.filter(w => featureWords.includes(w));
        return common.length >= 2;
      });
    }
    return match;
  };

  // ── Month options ──────────────────────────────────────────────────────────
  const getMonthSortValue = (monthStr: string): number => {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const parts = monthStr.trim().split(/\s+/);
    if (parts.length !== 2) return 0;
    const m = months[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (m === undefined || isNaN(y)) return 0;
    return y * 12 + m;
  };

  const manualMonths = Array.from(new Set(planItems.map(item => item.month)));
  const extraMonths = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'].flatMap(m =>
    ['2026', '2027'].map(y => `${m} ${y}`)
  );
  const allMonths = Array.from(new Set([...manualMonths, ...extraMonths]));
  allMonths.sort((a, b) => getMonthSortValue(a) - getMonthSortValue(b));

  const currentIndex = allMonths.indexOf(selectedMonth);

  const handlePrevMonth = () => {
    if (currentIndex > 0) {
      setSelectedMonth(allMonths[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (currentIndex < allMonths.length - 1) {
      setSelectedMonth(allMonths[currentIndex + 1]);
    }
  };

  const handleToday = () => {
    const now = new Date();
    const todayMonthStr = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    setSelectedMonth(todayMonthStr);
  };

  // ── Parse a date string → { year, month } (1-indexed) ─────────────────────
  const parseDateMonth = (dateStr: string | undefined): { year: number; month: number } | null => {
    if (!dateStr) return null;
    const iso = parseDateToYYYYMMDD(dateStr);
    if (!iso) return null;
    const [y, m] = iso.split('-').map(Number);
    if (!y || !m) return null;
    return { year: y, month: m };
  };

  // Parse the selected month label → { year, month }
  const parseSelectedMonth = (): { year: number; month: number } | null => {
    const months: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };
    const parts = selectedMonth.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const m = months[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (!m || !y) return null;
    return { year: y, month: m };
  };

  const dateInSelectedMonth = (dateStr: string | undefined): boolean => {
    const sm = parseSelectedMonth();
    if (!sm) return false;
    const dm = parseDateMonth(dateStr);
    if (!dm) return false;
    return dm.year === sm.year && dm.month === sm.month;
  };

  // ── Build aggregated "auto" items from all data sources ────────────────────
  interface AutoItem {
    id: string;
    title: string;
    source: 'Priority Requests' | 'Student Projects' | 'Content Pipeline' | 'AMA & Meetings' | 'Admin Calls' | 'Tarun Sir Meetings' | 'Product Breakdown' | 'Feature Requests';
    column: 'product' | 'design' | 'dev' | 'release';
    priority?: string;
    poc?: string;
    status?: string;
    date: string;
    dateLabel: string;
    rawItem: any;
  }

  const autoItems: AutoItem[] = [];

  if (showAutoItems) {
    // ProductItems
    productItems.forEach(item => {
      if (item.id.startsWith('prod-temp-')) return;
      if (item.status === 'Completed') return;
      const isBreakdown = item.id.startsWith('prod-breakdown-');
      const itemSource = item.id.startsWith('prod-ama-') 
        ? 'AMA & Meetings' 
        : item.id.startsWith('prod-call-')
          ? 'Admin Calls'
          : item.id.startsWith('prod-tarun-')
            ? 'Tarun Sir Meetings'
            : isBreakdown 
              ? 'Product Breakdown' 
              : 'Priority Requests';
      if (dateInSelectedMonth(item.productDeadline)) {
        autoItems.push({
          id: `auto-prod-specs-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'product',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.productDeadline,
          dateLabel: 'Specs',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.uiux)) {
        autoItems.push({
          id: `auto-prod-uiux-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'design',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.uiux,
          dateLabel: 'UI/UX',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.deadline)) {
        autoItems.push({
          id: `auto-prod-dev-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'dev',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.deadline,
          dateLabel: 'Dev',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.finalRelease)) {
        autoItems.push({
          id: `auto-prod-release-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'release',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.finalRelease,
          dateLabel: 'Release',
          rawItem: item
        });
      }
    });

    // StudentProjects
    studentProjects.forEach(p => {
      if (p.status === 'Delivered' || p.status === 'Cancelled') return;
      if (dateInSelectedMonth(p.productDeadline)) {
        autoItems.push({
          id: `auto-proj-specs-${p.id}`,
          title: p.title,
          source: 'Student Projects',
          column: 'product',
          priority: p.priority,
          poc: p.poc,
          status: p.status,
          date: p.productDeadline!,
          dateLabel: 'Specs',
          rawItem: p
        });
      }
      if (dateInSelectedMonth(p.uiux)) {
        autoItems.push({
          id: `auto-proj-uiux-${p.id}`,
          title: p.title,
          source: 'Student Projects',
          column: 'design',
          priority: p.priority,
          poc: p.poc,
          status: p.status,
          date: p.uiux!,
          dateLabel: 'UI/UX',
          rawItem: p
        });
      }
      if (dateInSelectedMonth(p.deadline || p.completeInfoDate)) {
        autoItems.push({
          id: `auto-proj-dev-${p.id}`,
          title: p.title,
          source: 'Student Projects',
          column: 'dev',
          priority: p.priority,
          poc: p.poc,
          status: p.status,
          date: p.deadline || p.completeInfoDate,
          dateLabel: 'Dev',
          rawItem: p
        });
      }
    });

    // ContentItems
    contentItems.forEach(item => {
      if (dateInSelectedMonth(item.productDeadline)) {
        autoItems.push({
          id: `auto-content-specs-${item.id}`,
          title: item.module,
          source: 'Content Pipeline',
          column: 'product',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.productDeadline!,
          dateLabel: 'Specs',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.uiux)) {
        autoItems.push({
          id: `auto-content-uiux-${item.id}`,
          title: item.module,
          source: 'Content Pipeline',
          column: 'design',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.uiux!,
          dateLabel: 'UI/UX',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.deadline)) {
        autoItems.push({
          id: `auto-content-dev-${item.id}`,
          title: item.module,
          source: 'Content Pipeline',
          column: 'dev',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.deadline!,
          dateLabel: 'Dev',
          rawItem: item
        });
      }
    });

    // StudentMeetings
    studentMeetings.forEach(m => {
      if (m.status === 'Completed') return;
      if (dateInSelectedMonth(m.productDeadline)) {
        autoItems.push({
          id: `auto-meet-specs-${m.id}`,
          title: m.cohort,
          source: 'AMA & Meetings',
          column: 'product',
          priority: m.priority,
          poc: m.poc,
          status: m.status,
          date: m.productDeadline!,
          dateLabel: 'Specs',
          rawItem: m
        });
      }
      if (dateInSelectedMonth(m.uiux)) {
        autoItems.push({
          id: `auto-meet-uiux-${m.id}`,
          title: m.cohort,
          source: 'AMA & Meetings',
          column: 'design',
          priority: m.priority,
          poc: m.poc,
          status: m.status,
          date: m.uiux!,
          dateLabel: 'UI/UX',
          rawItem: m
        });
      }
      if (dateInSelectedMonth(m.deadline)) {
        autoItems.push({
          id: `auto-meet-dev-${m.id}`,
          title: m.cohort,
          source: 'AMA & Meetings',
          column: 'dev',
          priority: m.priority,
          poc: m.poc,
          status: m.status,
          date: m.deadline!,
          dateLabel: 'Dev',
          rawItem: m
        });
      }
    });

    // Feature Requests (from dailyIssues)
    dailyIssues.forEach(item => {
      if (item.type !== 'Feature Gap' && item.type !== 'Enhancement') return;
      if (item.status === 'Completed') return;
      
      const itemSource = 'Feature Requests';
      if (dateInSelectedMonth(item.productDeadline)) {
        autoItems.push({
          id: `auto-req-specs-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'product',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.productDeadline!,
          dateLabel: 'Specs',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.uiux)) {
        autoItems.push({
          id: `auto-req-uiux-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'design',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.uiux!,
          dateLabel: 'UI/UX',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.deadline)) {
        autoItems.push({
          id: `auto-req-dev-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'dev',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.deadline!,
          dateLabel: 'Dev',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.finalRelease)) {
        autoItems.push({
          id: `auto-req-release-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'release',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.finalRelease!,
          dateLabel: 'Release',
          rawItem: item
        });
      }
    });
  }

  // Sort auto items by date
  autoItems.sort((a, b) => {
    const da = parseDateToYYYYMMDD(a.date);
    const db = parseDateToYYYYMMDD(b.date);
    return da.localeCompare(db);
  });

  // ── Manual plan items ──────────────────────────────────────────────────────
  const filteredPlan = planItems.filter(item => {
    const matchesMonth = item.month === selectedMonth;
    const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase());
    const matchedProduct = findMatchingProductItem(item.task);
    const matchesSuperPriority = !filterSuperPriorityOnly || !!matchedProduct?.raisedByTarunSir;
    return matchesMonth && matchesSearch && matchesSuperPriority;
  });

  // ── Filtered auto items by search ──────────────────────────────────────────
  const filteredAuto = autoItems.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSuperPriority = !filterSuperPriorityOnly || !!a.rawItem?.raisedByTarunSir;
    return matchesSearch && matchesSuperPriority;
  });


  // HTML5 Drag-and-drop operations (manual items only)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canUserEdit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    if (!canUserEdit) return;
    e.preventDefault();
    setDraggedOverColumn(colId);
  };
  const handleDragLeave = () => setDraggedOverColumn(null);
  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    if (!canUserEdit) return;
    e.preventDefault();
    setDraggedOverColumn(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || itemId.startsWith('auto-')) return;
    const statusMap: Record<string, string> = {
      product: 'open',
      design: 'in design',
      dev: 'development',
      release: 'released'
    };
    if (statusMap[targetColId]) updatePlanItem(itemId, { status: statusMap[targetColId] as any });
  };

  const COLUMNS = [
    { id: 'product', title: 'Product Specs', statuses: ['open'], headerClass: 'product', icon: <Inbox size={14} style={{ color: 'var(--text-muted)' }} /> },
    { id: 'design', title: 'UI/UX Design', statuses: ['in design'], headerClass: 'design', icon: <Palette size={14} style={{ color: 'var(--primary)' }} /> },
    { id: 'dev', title: 'Development', statuses: ['development', 'testing', 'tested'], headerClass: 'dev', icon: <Code size={14} style={{ color: 'var(--info)' }} /> },
    { id: 'release', title: 'Release', statuses: ['released', 'closed', 'Done'], headerClass: 'release', icon: <Rocket size={14} style={{ color: 'hsl(142,65%,38%)' }} /> }
  ];

  // Source badge colour map
  const sourceColors: Record<string, { bg: string; color: string }> = {
    'Priority Requests': { bg: 'hsla(245,80%,60%,0.12)', color: 'hsl(245,70%,50%)' },
    'Student Projects':  { bg: 'hsla(199,80%,50%,0.12)', color: 'hsl(199,80%,38%)' },
    'Content Pipeline':  { bg: 'hsla(38,90%,50%,0.12)',  color: 'hsl(38,85%,38%)' },
    'AMA & Meetings':    { bg: 'hsla(142,70%,45%,0.12)', color: 'hsl(142,65%,32%)' },
    'Student Meetings':  { bg: 'hsla(142,70%,45%,0.12)', color: 'hsl(142,65%,32%)' },
    'Admin Calls':       { bg: 'hsla(342,80%,55%,0.12)', color: 'hsl(342,70%,45%)' },
    'Admin Meetings':    { bg: 'hsla(342,80%,55%,0.12)', color: 'hsl(342,70%,45%)' },
    'Product Breakdown': { bg: 'hsla(271,80%,60%,0.12)', color: 'hsl(271,70%,50%)' },
    'Feature Requests':  { bg: 'hsla(325,80%,60%,0.12)', color: 'hsl(325,70%,50%)' },
  };

  return (
    <>
      <TabContainer
        title="Sprint Planning"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="calendar-nav-buttons" style={{ height: '32px' }}>
              <button 
                type="button"
                className="calendar-nav-btn" 
                onClick={handlePrevMonth} 
                disabled={currentIndex <= 0}
                style={{ height: '100%', minWidth: '30px', opacity: currentIndex <= 0 ? 0.5 : 1, cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer' }}
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>
              <button 
                type="button"
                className="calendar-nav-btn" 
                onClick={handleToday}
                style={{ height: '100%', minWidth: '120px', textAlign: 'center' }}
                title="Jump to Current Month"
              >
                {selectedMonth}
              </button>
              <button 
                type="button"
                className="calendar-nav-btn" 
                onClick={handleNextMonth} 
                disabled={currentIndex >= allMonths.length - 1}
                style={{ height: '100%', minWidth: '30px', opacity: currentIndex >= allMonths.length - 1 ? 0.5 : 1, cursor: currentIndex >= allMonths.length - 1 ? 'not-allowed' : 'pointer' }}
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >

        {isLoadingSprint ? (
          <div className="kanban-board-container animate-pulse" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', height: '100%', minHeight: '500px' }}>
            {[1, 2, 3, 4].map(col => (
              <div key={col} style={{
                backgroundColor: 'var(--background-alt)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ width: '50%', height: '18px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                {[1, 2, 3].map(row => (
                  <div key={row} style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    height: '80px'
                  }}>
                    <div style={{ width: '85%', height: '14px', backgroundColor: 'var(--border-light)', borderRadius: '3px' }} />
                    <div style={{ width: '40%', height: '10px', backgroundColor: 'var(--border-light)', borderRadius: '3px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--border-light)' }} />
                      <div style={{ width: '40px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-light)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="kanban-board-container">
            {COLUMNS.map(col => {
            const getAutoItemCompleted = (a: any) => {
              const isFeatureRequest = a.rawItem && (a.rawItem.type === 'Feature Gap' || a.rawItem.type === 'Enhancement');
              
              if (isFeatureRequest) {
                const isOverallCompleted = a.rawItem.status === 'Completed';
                if (a.column === 'product') {
                  return !!a.rawItem.productDeadlineCompleted || isOverallCompleted;
                } else if (a.column === 'design') {
                  return !!a.rawItem.uiuxCompleted || isOverallCompleted;
                } else if (a.column === 'dev') {
                  return !!a.rawItem.deadlineCompleted || isOverallCompleted;
                } else if (a.column === 'release') {
                  return !!a.rawItem.finalReleaseCompleted || isOverallCompleted;
                }
                return false;
              }

              const matchedProduct = findMatchingProductItem(a.title);
              if (a.column === 'product') {
                const isProductCompleted = matchedProduct
                  ? (!!matchedProduct.productDeadlineCompleted || !!matchedProduct.tarunSirApproval || matchedProduct.status === 'Completed')
                  : false;
                return isProductCompleted || a.status === 'Completed' || a.status === 'Delivered';
              } else if (a.column === 'design') {
                const isUiuxCompleted = matchedProduct
                  ? (!!matchedProduct.uiuxCompleted || matchedProduct.status === 'Completed')
                  : false;
                return isUiuxCompleted || a.status === 'Completed' || a.status === 'Delivered';
              } else if (a.column === 'dev') {
                const isDevCompleted = matchedProduct
                  ? (!!matchedProduct.deadlineCompleted || matchedProduct.status === 'Completed' || matchedProduct.clickupStatus?.toLowerCase() === 'closed')
                  : false;
                return isDevCompleted || a.status === 'Completed' || a.status === 'Delivered';
              } else if (a.column === 'release') {
                const isReleased = matchedProduct
                  ? (!!matchedProduct.finalReleaseCompleted || matchedProduct.status === 'Completed')
                  : false;
                return isReleased || a.status === 'Completed' || a.status === 'Delivered';
              }
              return false;
            };

            const manualColItems = filteredPlan.filter(item => col.statuses.includes(item.status));
            const autoColItems = filteredAuto.filter(a => a.column === col.id);

            const combinedItems = [
              ...autoColItems.map(a => ({
                type: 'auto' as const,
                id: a.id,
                isCompleted: getAutoItemCompleted(a),
                data: a
              })),
              ...manualColItems.map(item => ({
                type: 'manual' as const,
                id: item.id,
                isCompleted: !!item.completed,
                data: item
              }))
            ];

            combinedItems.sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0));

            const totalCount = combinedItems.length;
            const completedCount = combinedItems.filter(item => item.isCompleted).length;

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
                  <span className="kanban-card-count">{completedCount}/{totalCount}</span>
                </div>

                <div className="kanban-column-body">
                  {combinedItems.map(item => {
                    if (item.type === 'auto') {
                      const a = item.data;
                      const clr = sourceColors[a.source] || { bg: 'var(--panel-bg)', color: 'var(--text-secondary)' };
                      const isCompleted = item.isCompleted;
                      const isFeatureRequest = a.rawItem && (a.rawItem.type === 'Feature Gap' || a.rawItem.type === 'Enhancement');
                      const matchedProduct = isFeatureRequest ? null : findMatchingProductItem(a.title);

                      const baseId = a.rawItem?.id || matchedProduct?.id;
                      let unreadCount = 0;
                      if (baseId) {
                        const itemComments = comments.filter((c: any) => c.itemId === baseId);
                        const lastOpened = lastOpenedMap[baseId];
                        unreadCount = itemComments.filter((c: any) => {
                          if (!lastOpened) return true;
                          return new Date(c.createdAt).getTime() > lastOpened;
                        }).length;
                      }

                      return (
                        <div
                          key={a.id}
                          className={`kanban-card ${isCompleted ? 'completed-card' : ''}`}
                          style={{
                            borderLeft: isCompleted ? undefined : `3px solid ${clr.color}`,
                            cursor: 'pointer',
                            opacity: 1
                          }}
                          onClick={() => {
                            if (a.rawItem) {
                              openPreviewForFeature(a.title || a.rawItem.feature || a.rawItem.module, {
                                ...a.rawItem,
                                status: (a.status || a.rawItem.status) as any,
                                priority: (a.priority || a.rawItem.priority) as any,
                                poc: a.poc || a.rawItem.poc,
                              });
                            } else {
                              openPreviewForFeature(a.title, {
                                status: a.status as any,
                                priority: a.priority as any,
                                poc: a.poc,
                              });
                            }
                          }}
                        >
                          <div className="kanban-card-title" style={{ fontSize: '0.8rem', lineHeight: 1.35, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span>{a.title}</span>
                            {unreadCount > 0 && (
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger, #ef4444)',
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  padding: '1.5px 5px',
                                  borderRadius: '6px',
                                  lineHeight: 1,
                                  flexShrink: 0
                                }}
                                title={`${unreadCount} unread comments`}
                              >
                                <MessageSquare size={9} fill="var(--danger, #ef4444)" />
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="kanban-card-footer" style={{ marginTop: '0.5rem' }}>
                            <div className="kanban-card-tags" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
                              {/* Source badge */}
                              <span style={{
                                background: clr.bg, color: clr.color,
                                border: `1px solid ${clr.color}44`,
                                borderRadius: '10px', padding: '1px 6px',
                                fontSize: '0.65rem', fontWeight: 700
                              }}>{a.source === 'AMA & Meetings' ? 'Student Meetings' : a.source === 'Admin Calls' ? 'Admin Meetings' : a.source}</span>

                              {/* ClickUp Status badge */}
                              {(() => {
                                const clickupStatus = a.rawItem?.clickupStatus || matchedProduct?.clickupStatus;
                                if (clickupStatus) {
                                  return (
                                    <span style={{
                                      ...getClickupBadgeStyle(clickupStatus),
                                      fontSize: '0.65rem',
                                      padding: '1.5px 6px',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase',
                                      fontWeight: 750
                                    }}>
                                      {clickupStatus}
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              {/* Date label badge */}
                              {(() => {
                                const dynamicStyle = getDateSpanStyle(a.date, isCompleted);
                                const hasHighlight = Object.keys(dynamicStyle).length > 0;
                                return (
                                  <span style={{
                                    background: hasHighlight ? dynamicStyle.backgroundColor : 'var(--background)',
                                    color: hasHighlight ? dynamicStyle.color : 'var(--text-secondary)',
                                    border: hasHighlight ? 'none' : '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1px 6px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    <Clock size={9} />
                                    {a.dateLabel}: {formatDateToUserPattern(a.date)}
                                  </span>
                                );
                              })()}

                              {/* Priority */}
                              {a.priority && (
                                <span className={`badge badge-${a.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                                  {a.priority}
                                </span>
                              )}

                              {/* Super Priority */}
                              {(a.rawItem?.raisedByTarunSir || matchedProduct?.raisedByTarunSir) && (
                                <span className="badge-super-priority" style={{ fontSize: '0.6rem', padding: '1px 5px', gap: '2px', display: 'inline-flex', alignItems: 'center' }}>
                                  <Sparkles size={8} /> Super Priority
                                </span>
                              )}
                            </div>
                            {a.poc && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {a.poc}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const manualItem = item.data;
                      const isCompleted = item.isCompleted;
                      const matchedProduct = findMatchingProductItem(manualItem.task);
                      const baseId = matchedProduct?.id;
                      let unreadCount = 0;
                      if (baseId) {
                        const itemComments = comments.filter((c: any) => c.itemId === baseId);
                        const lastOpened = lastOpenedMap[baseId];
                        unreadCount = itemComments.filter((c: any) => {
                          if (!lastOpened) return true;
                          return new Date(c.createdAt).getTime() > lastOpened;
                        }).length;
                      }

                      return (
                        <div
                          key={manualItem.id}
                          className={`kanban-card ${isCompleted ? 'completed-card' : ''}`}
                          draggable={canUserEdit}
                          onDragStart={(e) => handleDragStart(e, manualItem.id)}
                          onClick={() => openPreviewForFeature(manualItem.task, { status: manualItem.status as any, clickupStatus: manualItem.status, taskLink: manualItem.link })}
                        >
                          <div className="kanban-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span>{manualItem.task}</span>
                            {unreadCount > 0 && (
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger, #ef4444)',
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  padding: '1.5px 5px',
                                  borderRadius: '6px',
                                  lineHeight: 1,
                                  flexShrink: 0
                                }}
                                title={`${unreadCount} unread comments`}
                              >
                                <MessageSquare size={9} fill="var(--danger, #ef4444)" />
                                {unreadCount}
                              </span>
                            )}
                          </div>

                          <div className="kanban-card-footer">
                            <div className="kanban-card-tags">
                              <span className={`kanban-badge-category ${manualItem.category.toLowerCase().replace('/', '')}`}>
                                {manualItem.category}
                              </span>
                              <span className="kanban-badge-month">
                                <Clock size={10} />
                                {manualItem.month}
                              </span>
                              {(() => {
                                const matchedProduct = findMatchingProductItem(manualItem.task);
                                const clickupStatus = manualItem.clickupStatus || matchedProduct?.clickupStatus;
                                if (clickupStatus) {
                                  return (
                                    <span style={{
                                      ...getClickupBadgeStyle(clickupStatus),
                                      fontSize: '0.65rem',
                                      padding: '1.5px 6px',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase',
                                      fontWeight: 750
                                    }}>
                                      {clickupStatus}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {(() => {
                                const matchedProduct = findMatchingProductItem(manualItem.task);
                                if (matchedProduct?.raisedByTarunSir) {
                                  return (
                                    <span className="badge-super-priority" style={{ fontSize: '0.6rem', padding: '1px 5px', gap: '2px', display: 'inline-flex', alignItems: 'center' }}>
                                      <Sparkles size={8} /> Super Priority
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                              {canUserEdit && (
                                <button
                                  onClick={() => updatePlanItem(manualItem.id, { completed: !manualItem.completed })}
                                  className={`kanban-complete-btn ${isCompleted ? 'active' : ''}`}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: isCompleted ? 'var(--success)' : 'var(--text-muted)',
                                    display: 'inline-flex', alignItems: 'center', padding: '2px',
                                    transition: 'color 0.2s'
                                  }}
                                  title={isCompleted ? 'Mark Active' : 'Mark Completed'}
                                >
                                  <CheckCircle size={12} />
                                </button>
                              )}
                              {manualItem.link && (
                                <a
                                  href={manualItem.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="clickup-action-link"
                                  style={{ padding: '2px', borderRadius: '4px' }}
                                  title="Open Reference Link"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              {canUserEdit && (
                                <button
                                  onClick={async () => {
                                    if (await confirm('Are you sure you want to delete this sprint task?', 'Delete Sprint Task')) {
                                      deletePlanItem(manualItem.id);
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '2px' }}
                                  title="Delete Task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}

                  {totalCount === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '1.5rem 0.5rem',
                      color: 'var(--text-muted)', fontSize: '0.75rem',
                      border: '1px dashed var(--border)', borderRadius: '8px'
                    }}>
                      No items for {selectedMonth}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
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
// ProjectDetailModal is deprecated in favor of unified ProductDetailView

