import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Star,
  CheckCircle
} from 'lucide-react';
import type {
  DailyIssue
} from '../../types';
import {
  getPOCBadgeStyle,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToUserPattern,
  getDateSpanStyle
} from '../common/tableUtils';
import {
  DateDiffBadge,
  MultiSelectDropdown
} from '../common/TableShared';

export const IssuesTable: React.FC = () => {
  const { dailyIssues, addDailyIssue, deleteDailyIssue, statuses, setPreviewProductId, previewProductId, currentUser, confirm, fetchPaginatedMeetingsData } = useDashboard();
  const [subTab, setSubTab] = useState<'Bug' | 'Improvement'>('Bug');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];
  const [sortField, setSortField] = useState<keyof DailyIssue | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Fallback calculations from loaded dailyIssues context
  const dailyNeedsList = useMemo(() => {
    return dailyIssues.filter(item => 
      !['Feature Gap', 'Enhancement', 'BUG', 'New Feature', 'Data Needed', 'Term Report/ Transcript'].includes(item.type || '')
    );
  }, [dailyIssues]);

  const bugsList = useMemo(() => {
    return dailyNeedsList.filter(item => item.type !== 'Improvement');
  }, [dailyNeedsList]);

  const improvementsList = useMemo(() => {
    return dailyNeedsList.filter(item => item.type === 'Improvement');
  }, [dailyNeedsList]);

  const fallbackTotalBugs = bugsList.length;
  const fallbackCompletedBugs = bugsList.filter(b => !!b.finalReleaseCompleted).length;
  const fallbackTotalImprovements = improvementsList.length;
  const fallbackCompletedImprovements = improvementsList.filter(i => !!i.finalReleaseCompleted).length;

  const [serverCounts, setServerCounts] = useState<{
    totalBugs?: number;
    completedBugs?: number;
    totalImprovements?: number;
    completedImprovements?: number;
  }>({});

  const displayTotalBugs = serverCounts.totalBugs ?? fallbackTotalBugs;
  const displayCompletedBugs = serverCounts.completedBugs ?? fallbackCompletedBugs;
  const displayTotalImprovements = serverCounts.totalImprovements ?? fallbackTotalImprovements;
  const displayCompletedImprovements = serverCounts.completedImprovements ?? fallbackCompletedImprovements;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedIssues, setPaginatedIssues] = useState<DailyIssue[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPriority, filterSuperPriorityOnly, filterStatuses, subTab]);

  const loadData = useCallback(async () => {
    setIsFetching(true);
    const res = await fetchPaginatedMeetingsData({
      type: 'dailyIssues',
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      superPriority: filterSuperPriorityOnly,
      priority: filterPriority !== 'All' ? filterPriority : undefined,
      statuses: filterStatuses,
      sortField: sortField || undefined,
      sortAsc: sortAsc,
      issueType: subTab
    });

    if (res && res.success) {
      if (res.totalBugs !== undefined) {
        setServerCounts({
          totalBugs: res.totalBugs,
          completedBugs: res.completedBugs,
          totalImprovements: res.totalImprovements,
          completedImprovements: res.completedImprovements
        });
      }

      // Detect if server properly filtered by subTab:
      const isServerFiltered = res.data && res.data.length > 0
        ? res.data.every((item: DailyIssue) => subTab === 'Improvement' ? item.type === 'Improvement' : item.type !== 'Improvement')
        : (res.totalBugs !== undefined);

      if (isServerFiltered && res.totalBugs !== undefined) {
        setPaginatedIssues(res.data || []);
        setTotalItems(res.totalItems || 0);
        setCompletedItems(res.completedItems || 0);
        setTotalPages(res.totalPages || 1);
      } else {
        // Resilient fallback if local Node process was not yet restarted
        const baseList = subTab === 'Improvement' ? improvementsList : bugsList;
        const filtered = baseList.filter(item => {
          if (filterPriority !== 'All' && item.priority !== filterPriority) return false;
          if (filterSuperPriorityOnly && !item.raisedByTarunSir) return false;
          if (filterStatuses.length > 0 && !filterStatuses.includes(item.status || '')) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matches =
              (item.module || '').toLowerCase().includes(q) ||
              (item.poc || item.contact || '').toLowerCase().includes(q) ||
              (item.notes || item.issues || '').toLowerCase().includes(q) ||
              (item.product || '').toLowerCase().includes(q);
            if (!matches) return false;
          }
          return true;
        });

        const sorted = [...filtered].sort((a, b) => {
          const aComp = !!a.finalReleaseCompleted;
          const bComp = !!b.finalReleaseCompleted;
          if (aComp !== bComp) return aComp ? 1 : -1;
          if (sortField) {
            const valA = String(a[sortField] || '').toLowerCase();
            const valB = String(b[sortField] || '').toLowerCase();
            return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return 0;
        });

        const total = sorted.length;
        const pages = Math.ceil(total / pageSize) || 1;
        const activeP = Math.min(Math.max(1, currentPage), pages);
        const start = (activeP - 1) * pageSize;
        const pData = sorted.slice(start, start + pageSize);
        const completed = sorted.filter(item => !!item.finalReleaseCompleted).length;

        setPaginatedIssues(pData);
        setTotalItems(total);
        setCompletedItems(completed);
        setTotalPages(pages);
      }
    }
    setIsFetching(false);
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterPriority,
    filterSuperPriorityOnly,
    filterStatuses,
    subTab,
    sortField,
    sortAsc,
    fetchPaginatedMeetingsData,
    improvementsList,
    bugsList
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!previewProductId) {
      loadData();
    }
  }, [previewProductId, loadData]);

  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const handleSort = (field: keyof DailyIssue) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleAddNew = async () => {
    const newId = String(Date.now());
    const newItem: DailyIssue = {
      id: newId,
      cohort: '',
      product: '',
      module: `New ${subTab === 'Improvement' ? 'Improvement' : 'Bug'}`,
      type: subTab === 'Improvement' ? 'Improvement' : 'Bug',
      issues: '',
      contact: '',
      priority: '',
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      uiux: '',
      finalRelease: '',
      productDeadline: '',
      raisedByTarunSir: false,
      tarunSirApproval: false,
      createdAt: new Date().toISOString()
    };
    await addDailyIssue(newItem);
    setSearchQuery('');
    setSortField(null);
    loadData();
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };

  const renderDateCell = (item: DailyIssue, field: keyof DailyIssue, previousFields?: (keyof DailyIssue)[]) => {
    const value = String(item[field] || '');
    const completedField = `${String(field)}Completed` as keyof DailyIssue;
    const completed = Boolean(item[completedField]);
    let prevDate = '';
    if (previousFields) {
      for (const pf of previousFields) {
        if (item[pf]) {
          prevDate = String(item[pf]);
          break;
        }
      }
    }
    return (
      <>
        {prevDate && <DateDiffBadge prevDate={prevDate} currentDate={value} />}
        <span style={getDateSpanStyle(value, completed)}>
          {value ? formatDateToUserPattern(value) : '—'}
        </span>
      </>
    );
  };

  const renderRow = (item: DailyIssue) => {
    return (
      <tr 
        key={item.id} 
        className={item.blocker ? 'row-blocked' : ''}
        onClick={() => setPreviewProductId(item.id)} 
        style={{ cursor: 'pointer' }}
      >
        <td
          className="sticky-col"
          style={{ fontWeight: 600, width: '300px', minWidth: '300px', maxWidth: '300px', whiteSpace: 'normal' }}
        >
          <div style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>
            {item.product && (
              <div style={{
                fontSize: '0.68rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 700,
                marginBottom: '2px'
              }}>
                {item.product}
              </div>
            )}
            <div>
              <span>
                {item.module || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
              </span>
              {item.priority && (
                <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ marginLeft: '6px', padding: '1px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', fontWeight: 650, whiteSpace: 'nowrap' }}>
                  {item.priority}
                </span>
              )}
              {item.raisedByTarunSir && (
                <span className="badge-super-priority" style={{ marginLeft: '6px', padding: '1px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', gap: '2px', whiteSpace: 'nowrap' }}>
                  <Star size={10} fill="currentColor" /> Super Priority
                </span>
              )}
              {item.tarunSirApproval && (
                <span className="badge-verified" style={{ marginLeft: '6px', padding: '1px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650, whiteSpace: 'nowrap' }}>
                  <CheckCircle size={10} /> Verified
                </span>
              )}
            </div>
          </div>
        </td>
        <td>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            {item.poc ? (
              <span style={{ ...getPOCBadgeStyle(item.poc) }}>
                {item.poc}
              </span>
            ) : item.contact ? (
              <span style={{ ...getPOCBadgeStyle(item.contact) }}>
                {item.contact}
              </span>
            ) : '—'}
            {item.clickupAssignee && (
              <div className="cu-tooltip-container">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                  CU: {formatClickupAssignee(item.clickupAssignee)}
                </span>
                <span className="cu-tooltip-text">
                  {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                </span>
              </div>
            )}
          </div>
        </td>
        <td>
          {item.status ? (() => {
            const matched = statuses.find(s => s.label === item.status);
            if (matched) {
              return (
                <span className="badge" style={{
                  backgroundColor: `${matched.color}14`,
                  color: matched.color,
                  borderColor: `${matched.color}33`,
                  borderStyle: 'solid',
                  borderWidth: '1px'
                }}>
                  {item.status}
                </span>
              );
            }
            return (
              <span className={`badge ${
                item.status === 'On Hold' ? 'status-hold' :
                item.status === 'In Progress' ? 'status-progress' :
                item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
              }`}>
                {item.status}
              </span>
            );
          })() : '—'}
        </td>
        <td>
          {item.clickupStatus ? (
            <span style={getClickupBadgeStyle(item.clickupStatus)}>
              {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
            </span>
          ) : '—'}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'productDeadline', ['createdAt'])}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'uiux', ['productDeadline', 'createdAt'])}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'deadline', ['uiux', 'productDeadline', 'createdAt'])}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'finalRelease', ['deadline', 'uiux', 'productDeadline', 'createdAt'])}
        </td>
        <td>
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              if (await confirm("Are you sure you want to delete this daily need?", "Delete Daily Need")) {
                await deleteDailyIssue(item.id);
                loadData();
              }
            }} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <TabContainer
      title="Daily Needs"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onAddClick={handleAddNew}
      addLabel={subTab === 'Improvement' ? 'Add Improvement' : 'Add Bug'}
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="P0">P0 (Critical)</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>
          <MultiSelectDropdown
            options={statusOptions}
            selectedValues={filterStatuses}
            onChange={setFilterStatuses}
            placeholder="Status"
          />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
        {/* SUB-TABS ROW: Bug & Improvement with counts like 3/10 */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            type="button"
            onClick={() => setSubTab('Bug')}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'Bug' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'Bug' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 650,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Bug</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: '10px',
              backgroundColor: subTab === 'Bug' ? 'rgba(239, 68, 68, 0.12)' : 'var(--background-alt)',
              color: subTab === 'Bug' ? '#ef4444' : 'var(--text-muted)',
              border: `1px solid ${subTab === 'Bug' ? 'rgba(239, 68, 68, 0.25)' : 'var(--border)'}`
            }}>
              {displayCompletedBugs}/{displayTotalBugs}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('Improvement')}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'Improvement' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'Improvement' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 650,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Improvement</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: '10px',
              backgroundColor: subTab === 'Improvement' ? 'rgba(59, 130, 246, 0.12)' : 'var(--background-alt)',
              color: subTab === 'Improvement' ? '#2563eb' : 'var(--text-muted)',
              border: `1px solid ${subTab === 'Improvement' ? 'rgba(59, 130, 246, 0.25)' : 'var(--border)'}`
            }}>
              {displayCompletedImprovements}/{displayTotalImprovements}
            </span>
          </button>
        </div>
        <div className="table-responsive" style={{ flex: 1, overflow: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '300px', minWidth: '300px', maxWidth: '300px', cursor: 'pointer' }}>Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ cursor: 'pointer' }}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ cursor: 'pointer' }}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ cursor: 'pointer' }}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ cursor: 'pointer' }}>Final ({completedItems}/{totalItems}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}></td>
                  </tr>
                ))
              ) : paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No active {subTab === 'Improvement' ? 'improvements' : 'bugs'} logged.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map(item => renderRow(item))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer - Always visible */}
        <div style={{
          zIndex: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--panel-bg)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1 || totalItems === 0}
                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (activePage === 1 || totalItems === 0) ? 0.5 : 1, cursor: (activePage === 1 || totalItems === 0) ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ minWidth: '45px', textAlign: 'center' }}>
                Page {activePage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages || totalItems === 0}
                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (activePage === totalPages || totalItems === 0) ? 0.5 : 1, cursor: (activePage === totalPages || totalItems === 0) ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </TabContainer>
  );
};
