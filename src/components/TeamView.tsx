import React, { useState, useEffect, useCallback } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  RefreshCw, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import { 
  DateDiffBadge, 
  getDateSpanStyle, 
  formatDateToShortPattern, 
  getClickupBadgeStyle 
} from './Tables';

interface UnifiedTask {
  id: string;
  sourceId: string;
  feature: string;
  source: 'Priority Requests' | 'Feedback' | 'Product Breakdown' | 'Sprint Planning' | 'Student Projects' | 'Content Pipeline' | 'Daily Issues' | 'Feature Requests';
  product: string;
  module?: string;
  status: string;
  clickupStatus: string;
  clickupAssignee: string;
  clickupSubtasksCount?: number;
  taskLink?: string;
  priority?: string;
  productDeadline?: string;
  uiux?: string;
  deadline?: string;
  finalRelease?: string;
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  createdAt?: string;
  rawItem: any;
}

interface TeamMember {
  name: string;
  totalCount: number;
  activeCount: number;
  statusCounts: Record<string, number>;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAssigneeColor = (name: string) => {
  if (!name) return 'var(--text-muted)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hexColors = [
    '#4f46e5', '#0284c7', '#059669', '#ca8a04', 
    '#ea580c', '#db2777', '#7c3aed', '#0891b2', 
    '#e11d48', '#2563eb', '#16a34a', '#d97706'
  ];
  return hexColors[Math.abs(hash) % hexColors.length];
};

export const TeamView: React.FC = () => {
  const {
    setPreviewProductId,
    syncClickupTask,
    syncStatus,
    deleteProductItem,
    deletePlanItem,
    deleteStudentProject,
    deleteContentItem,
    deleteDailyIssue,
    confirm,
    fetchTeamAssignees,
    fetchTeamMemberTasks
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [hideReleased, setHideReleased] = useState(true);
  const [sortField, setSortField] = useState<'name' | 'activeCount'>('activeCount');
  const [sortAsc, setSortAsc] = useState(false); // default desc for active tasks count
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Data lists
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Lazy-loaded tasks cache
  const [userTasks, setUserTasks] = useState<Record<string, UnifiedTask[]>>({});
  const [loadingUserTasks, setLoadingUserTasks] = useState<Record<string, boolean>>({});

  // Sync state for individual tasks
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);

  // Fetch current page of assignees from the server
  const loadAssignees = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetchTeamAssignees({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        hideReleased,
        sortField,
        sortAsc
      });
      if (res.success) {
        setUsers(res.data);
        setTotalItems(res.totalItems);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Failed to load assignees:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentPage, pageSize, searchQuery, hideReleased, sortField, sortAsc, fetchTeamAssignees]);

  // Load assignees on mount and when filter/paging changes
  useEffect(() => {
    loadAssignees();
  }, [loadAssignees]);

  // Fetch tasks for a specific user
  const loadUserTasks = useCallback(async (userName: string) => {
    setLoadingUserTasks(prev => ({ ...prev, [userName]: true }));
    try {
      const res = await fetchTeamMemberTasks({
        name: userName,
        hideReleased,
        search: searchQuery
      });
      if (res.success) {
        setUserTasks(prev => ({ ...prev, [userName]: res.data }));
      }
    } catch (err) {
      console.error(`Failed to load tasks for ${userName}:`, err);
    } finally {
      setLoadingUserTasks(prev => ({ ...prev, [userName]: false }));
    }
  }, [hideReleased, searchQuery, fetchTeamMemberTasks]);

  // Refresh tasks of currently expanded user if filters/search change
  useEffect(() => {
    if (expandedUser) {
      loadUserTasks(expandedUser);
    }
  }, [expandedUser, searchQuery, hideReleased, loadUserTasks]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, hideReleased, sortField, sortAsc]);

  const handleExpandUser = (userName: string) => {
    if (expandedUser === userName) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userName);
      loadUserTasks(userName);
    }
  };

  const handleSyncTask = async (e: React.MouseEvent, task: UnifiedTask, userName: string) => {
    e.stopPropagation();
    if (!task.taskLink || syncingTaskId) return;
    setSyncingTaskId(task.id);
    try {
      await syncClickupTask(task.taskLink);
      loadUserTasks(userName);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, task: UnifiedTask, userName: string) => {
    e.stopPropagation();
    const confirmed = await confirm(`Are you sure you want to delete this task from ${task.source}?`, "Delete Task");
    if (confirmed) {
      try {
        const src = task.source;
        if (src === 'Priority Requests' || src === 'Feedback' || src === 'Product Breakdown') {
          await deleteProductItem(task.sourceId);
        } else if (src === 'Sprint Planning') {
          await deletePlanItem(task.sourceId);
        } else if (src === 'Student Projects') {
          await deleteStudentProject(task.sourceId);
        } else if (src === 'Content Pipeline') {
          await deleteContentItem(task.sourceId);
        } else if (src === 'Daily Issues' || src === 'Feature Requests') {
          await deleteDailyIssue(task.sourceId);
        }
        
        loadAssignees();
        loadUserTasks(userName);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const renderAssigneesSkeleton = () => {
    return Array.from({ length: pageSize }).map((_, idx) => (
      <tr key={`user-skeleton-${idx}`}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <div className="skeleton-shimmer" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
            <div className="skeleton-shimmer" style={{ width: '120px', height: '14px' }} />
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="skeleton-shimmer" style={{ width: '24px', height: '16px', borderRadius: '10px' }} />
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', gap: '4px' }}>
            <div className="skeleton-shimmer" style={{ width: '50px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '65px', height: '14px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '40px', height: '14px', borderRadius: '4px' }} />
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="skeleton-shimmer" style={{ width: '14px', height: '14px', borderRadius: '4px' }} />
          </div>
        </td>
      </tr>
    ));
  };

  const renderTasksSkeleton = () => {
    return Array.from({ length: 3 }).map((_, idx) => (
      <tr key={`task-skeleton-${idx}`}>
        <td>
          <div className="skeleton-shimmer" style={{ width: '80%', height: '12px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '90px', height: '14px', borderRadius: '4px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '80px', height: '12px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '70px', height: '14px', borderRadius: '4px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '55px', height: '12px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '55px', height: '12px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '55px', height: '12px' }} />
        </td>
        <td>
          <div className="skeleton-shimmer" style={{ width: '55px', height: '12px' }} />
        </td>
        <td>
          <div style={{ width: '40px' }} />
        </td>
      </tr>
    ));
  };

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Skeleton Animation Style Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, var(--background-alt) 25%, var(--border-light) 50%, var(--background-alt) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
      `}} />

      <TabContainer
        title="Team Workspace"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search team members or tasks..."
        filterComponent={
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                backgroundColor: hideReleased ? 'var(--success)' : 'var(--border-dark)',
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
          </div>
        }
      >
        {/* Main Content Area containing the single grid-table matching the Tarun Sir Meetings design */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="table-responsive" style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <table className="grid-table">
              <thead>
                <tr>
                  <th 
                    onClick={() => {
                      if (sortField === 'name') {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortField('name');
                        setSortAsc(true);
                      }
                    }}
                    style={{ width: '220px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >
                    Team Member {sortField === 'name' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th 
                    onClick={() => {
                      if (sortField === 'activeCount') {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortField('activeCount');
                        setSortAsc(false); // default desc
                      }
                    }}
                    style={{ width: '140px', textAlign: 'center', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >
                    Active Tasks {sortField === 'activeCount' ? (sortAsc ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th>ClickUp Status Breakdown</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoadingUsers ? (
                  renderAssigneesSkeleton()
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No team members or tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  users.map(user => {
                    const isOpen = expandedUser === user.name;
                    const initials = getInitials(user.name);
                    const avatarBg = getAssigneeColor(user.name);
                    const tasks = userTasks[user.name] || [];
                    const isLoadingTasks = loadingUserTasks[user.name];

                    return (
                      <React.Fragment key={user.name}>
                        {/* Member Row */}
                        <tr
                          onClick={() => handleExpandUser(user.name)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isOpen ? 'var(--background-alt)' : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                          className="accordion-header-row"
                        >
                          <td style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </div>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: avatarBg,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                boxShadow: 'var(--shadow-sm)',
                                flexShrink: 0
                              }}>
                                {initials}
                              </div>
                              <span>{user.name}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.725rem', fontWeight: 700 }}>
                              {user.activeCount}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {Object.entries(user.statusCounts).map(([status, count]) => {
                                const style = getClickupBadgeStyle(status);
                                return (
                                  <span 
                                    key={status} 
                                    style={{
                                      fontSize: '0.625rem',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      borderColor: 'var(--border)',
                                      ...style
                                    }}
                                  >
                                    {status}: {count}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <ChevronDown size={14} style={{ 
                              color: 'var(--text-muted)', 
                              transform: isOpen ? 'rotate(180deg)' : 'none', 
                              transition: 'transform 0.25s ease' 
                            }} />
                          </td>
                        </tr>

                        {/* Accordion Expansion (Sub-table containing tasks) */}
                        {isOpen && (
                          <tr style={{ background: 'var(--background)' }}>
                            <td colSpan={4} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                              <div style={{
                                background: 'var(--panel-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '1.25rem',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1.25rem',
                                position: 'relative'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>
                                    Assigned ClickUp Tasks ({user.totalCount})
                                  </h4>
                                </div>

                                {!isLoadingTasks && tasks.length === 0 ? (
                                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                    No active tasks assigned.
                                  </div>
                                ) : (
                                  <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                                    <table className="grid-table" style={{ background: 'var(--background)' }}>
                                      <thead>
                                        <tr style={{ background: 'var(--background-alt)' }}>
                                          <th>Task / Feature</th>
                                          <th style={{ width: '130px' }}>Source</th>
                                          <th style={{ width: '150px' }}>Product</th>
                                          <th style={{ width: '110px' }}>Status</th>
                                          <th style={{ width: '80px', position: 'relative' }}>Specs</th>
                                          <th style={{ width: '80px', position: 'relative' }}>UI/UX</th>
                                          <th style={{ width: '80px', position: 'relative' }}>Dev</th>
                                          <th style={{ width: '80px', position: 'relative' }}>Release</th>
                                          <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {isLoadingTasks ? (
                                          renderTasksSkeleton()
                                        ) : (
                                          tasks.map(task => {
                                            const canPreview = task.source === 'Priority Requests' || 
                                                               task.source === 'Feedback' || 
                                                               task.source === 'Product Breakdown' || 
                                                               task.source === 'Daily Issues' || 
                                                               task.source === 'Feature Requests' || 
                                                               task.source === 'Content Pipeline';
                                            return (
                                              <tr 
                                                key={task.id}
                                                onDoubleClick={() => {
                                                  if (canPreview) setPreviewProductId(task.sourceId);
                                                }}
                                                style={{ cursor: canPreview ? 'pointer' : 'default' }}
                                                title={canPreview ? "Double click to open detail drawer" : "Detail drawer not available for this source"}
                                              >
                                                {/* Task / Feature Title */}
                                                <td style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'normal', minWidth: '160px' }}>
                                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
                                                    {task.priority && (
                                                      <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', flexShrink: 0, marginTop: '2px' }}>
                                                        {task.priority}
                                                      </span>
                                                    )}
                                                    <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{task.feature}</span>
                                                  </div>
                                                </td>

                                                {/* Source Category */}
                                                <td style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                  <span style={{ 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px', 
                                                    backgroundColor: 'var(--background-alt)', 
                                                    border: '1.5px solid var(--border-light)' 
                                                  }}>
                                                    {task.source}
                                                  </span>
                                                </td>

                                                {/* Product / Module */}
                                                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                  <div style={{ fontWeight: 600 }}>{task.product}</div>
                                                  {task.module && task.module !== task.feature && (
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{task.module}</div>
                                                  )}
                                                </td>

                                                {/* Status */}
                                                <td>
                                                  {task.clickupStatus ? (
                                                    <span style={getClickupBadgeStyle(task.clickupStatus)}>
                                                      {task.clickupStatus}
                                                    </span>
                                                  ) : task.status ? (
                                                    <span className={`status-pill ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                      {task.status}
                                                    </span>
                                                  ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                  )}
                                                </td>

                                                {/* Specs Date */}
                                                <td style={{ position: 'relative', fontSize: '0.725rem' }}>
                                                  <DateDiffBadge prevDate={task.createdAt} currentDate={task.productDeadline} />
                                                  {task.productDeadline ? (
                                                    <span style={getDateSpanStyle(task.productDeadline, task.productDeadlineCompleted)}>
                                                      {formatDateToShortPattern(task.productDeadline)}
                                                    </span>
                                                  ) : '—'}
                                                </td>

                                                {/* UI/UX Date */}
                                                <td style={{ position: 'relative', fontSize: '0.725rem' }}>
                                                  <DateDiffBadge prevDate={task.productDeadline || task.createdAt} currentDate={task.uiux} />
                                                  {task.uiux ? (
                                                    <span style={getDateSpanStyle(task.uiux, task.uiuxCompleted)}>
                                                      {formatDateToShortPattern(task.uiux)}
                                                    </span>
                                                  ) : '—'}
                                                </td>

                                                {/* Dev Date */}
                                                <td style={{ position: 'relative', fontSize: '0.725rem' }}>
                                                  <DateDiffBadge prevDate={task.uiux || task.productDeadline || task.createdAt} currentDate={task.deadline} />
                                                  {task.deadline ? (
                                                    <span style={getDateSpanStyle(task.deadline, task.deadlineCompleted)}>
                                                      {formatDateToShortPattern(task.deadline)}
                                                    </span>
                                                  ) : '—'}
                                                </td>

                                                {/* Release Date */}
                                                <td style={{ position: 'relative', fontSize: '0.725rem' }}>
                                                  <DateDiffBadge prevDate={task.deadline || task.uiux || task.productDeadline || task.createdAt} currentDate={task.finalRelease} />
                                                  {task.finalRelease ? (
                                                    <span style={getDateSpanStyle(task.finalRelease, task.finalReleaseCompleted)}>
                                                      {formatDateToShortPattern(task.finalRelease)}
                                                    </span>
                                                  ) : '—'}
                                                </td>

                                                {/* Actions */}
                                                <td>
                                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    {/* Edit Button */}
                                                    {canPreview ? (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setPreviewProductId(task.sourceId);
                                                        }}
                                                        style={{
                                                          background: 'none',
                                                          border: 'none',
                                                          cursor: 'pointer',
                                                          color: 'var(--text-secondary)',
                                                          display: 'inline-flex',
                                                          alignItems: 'center',
                                                          padding: '4px',
                                                          transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                                        title="Edit Task"
                                                      >
                                                        <Edit2 size={12} />
                                                      </button>
                                                    ) : (
                                                      <div style={{ width: '20px' }} />
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                      onClick={(e) => handleDeleteTask(e, task, user.name)}
                                                      style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--danger)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        padding: '4px',
                                                        transition: 'all 0.15s'
                                                      }}
                                                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                                                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                                                      title="Delete Task"
                                                    >
                                                      <Trash2 size={12} />
                                                    </button>

                                                    {/* Sync clickup task if task link is present */}
                                                    {task.taskLink && (
                                                      <>
                                                        <a 
                                                          href={task.taskLink} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer"
                                                          style={{
                                                            color: 'var(--text-muted)',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s'
                                                          }}
                                                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-glow)'; }}
                                                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                          title="View in ClickUp"
                                                          onClick={(e) => e.stopPropagation()}
                                                        >
                                                          <ExternalLink size={12} />
                                                        </a>
                                                        <button
                                                          onClick={(e) => handleSyncTask(e, task, user.name)}
                                                          disabled={syncingTaskId === task.id || syncStatus === 'syncing'}
                                                          style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: syncingTaskId === task.id ? 'not-allowed' : 'pointer',
                                                            color: syncingTaskId === task.id ? 'var(--primary)' : 'var(--text-muted)',
                                                            padding: '4px',
                                                            borderRadius: '4px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s'
                                                          }}
                                                          onMouseEnter={e => { if (syncingTaskId !== task.id) { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-glow)'; } }}
                                                          onMouseLeave={e => { if (syncingTaskId !== task.id) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; } }}
                                                          title="Sync task status"
                                                        >
                                                          <RefreshCw size={12} className={syncingTaskId === task.id ? 'animate-spin' : ''} />
                                                        </button>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Pagination Bar */}
        <div style={{
          zIndex: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--panel-bg)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          {/* Left: Info */}
          <div>
            Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems === 0 ? 0 : startIndex + 1}</span> to{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> team members
          </div>

          {/* Right: Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Page Size Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 24px 4px 8px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={activePage === 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: activePage === 1 ? 'var(--background-alt)' : 'var(--background)',
                  color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s'
                }}
                title="First Page"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: activePage === 1 ? 'var(--background-alt)' : 'var(--background)',
                  color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s'
                }}
                title="Previous Page"
              >
                ‹
              </button>
              
              <span style={{ margin: '0 0.5rem', fontWeight: 600 }}>
                Page {activePage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: activePage === totalPages ? 'var(--background-alt)' : 'var(--background)',
                  color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s'
                }}
                title="Next Page"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={activePage === totalPages}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--border)',
                  backgroundColor: activePage === totalPages ? 'var(--background-alt)' : 'var(--background)',
                  color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s'
                }}
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </TabContainer>
    </div>
  );
};
