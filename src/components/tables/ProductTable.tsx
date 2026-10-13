import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Star,
  Link,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type {
  ProductItem
} from '../../types';
import {
  isTaskLinked,
  getPOCBadgeStyle,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToUserPattern,
  getDateSpanStyle
} from '../common/tableUtils';
import {
  DateDiffBadge,
  CSVImportModal,
  MultiSelectDropdown
} from '../common/TableShared';

export const ProductTable: React.FC = () => {
  const { productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId, statuses, canUserEdit, currentUser, confirm } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPriority, filterStatuses, filterSuperPriorityOnly]);

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
    if (item.id.startsWith('prod-temp-') || item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-') || item.id.startsWith('prod-tarun-') || item.id.startsWith('prod-breakdown-')) return false;
    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesPriority = filterPriority === 'All' || item.priority === filterPriority;
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(item.status);
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesSuperPriority;
  });

  // Sort
  filtered.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (sortField) {
      const valA = String(a[sortField]).toLowerCase();
      const valB = String(b[sortField]).toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return 0;
  });

  // Slice for pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const completedFinalCount = filtered.filter(item => !!item.finalReleaseCompleted).length;
  const totalFinalCount = filtered.length;


  const handleAddNew = () => {
    // Reset search query and sort to ensure the new row is visible at the top
    setSearchQuery('');
    setSortField(null);

     const newItem: ProductItem = {
      id: `prod-${Date.now()}`,
      feature: 'New Priority Request',
      description: '',
      tarunSirApproval: false,
      raisedByTarunSir: false,
      priority: '',
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      product: '',
      uiux: '',
      finalRelease: '',
      productDeadline: '',
      committedDate: '',
      createdAt: new Date().toISOString()
    };
    addProductItem(newItem);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
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
        poc: row[4] || currentUser?.name || 'Akash Sharma',
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
        description: row[15] || '',
        createdAt: new Date().toISOString()
      };
      addProductItem(newItem);
    });
  };

  // CSV and table render wrapper follows

  return (
    <>
      <TabContainer
        title="Priority Requests"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Feature"
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
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('product')} style={{ cursor: 'pointer' }}>Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ cursor: 'pointer' }}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ cursor: 'pointer' }}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ cursor: 'pointer' }}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ cursor: 'pointer' }}>Final ({completedFinalCount}/{totalFinalCount}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => {
                    if (editingFeatureId !== item.id) {
                      setPreviewProductId(item.id);
                    }
                  }} 
                  className={`${deletingIds.has(item.id) ? 'row-deleting' : ''} ${item.blocker ? 'row-blocked' : ''}`}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
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
                        <span 
                          onDoubleClick={(e) => {
                            if (!canUserEdit) return;
                            e.stopPropagation();
                            setEditingFeatureId(item.id);
                            setInlineEditValue(item.feature);
                          }}
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}
                        >
                          {item.feature}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {item.priority && (
                          <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                            {item.priority}
                          </span>
                        )}
                        {item.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={10} fill="currentColor" /> Super Priority
                          </span>
                        )}
                        {item.tarunSirApproval && (
                          <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                            <CheckCircle size={10} /> Verified
                          </span>
                        )}
                        {isTaskLinked(item.notes, item.id) && (
                          <span className="badge-linked" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)', fontWeight: 650 }}>
                            <Link size={10} /> Linked
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{item.product || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      {item.poc ? (
                          <span style={{ ...getPOCBadgeStyle(item.poc) }}>
                              {item.poc}
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
                      const matched = statuses.find(s => s.label.toLowerCase() === item.status.trim().toLowerCase());
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
                    <DateDiffBadge prevDate={item.createdAt} currentDate={item.productDeadline} />
                    {item.productDeadline ? (
                      <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                        {formatDateToUserPattern(item.productDeadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.productDeadline || item.createdAt} currentDate={item.uiux} />
                    {item.uiux ? (
                      <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                        {formatDateToUserPattern(item.uiux)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.uiux || item.productDeadline || item.createdAt} currentDate={item.deadline} />
                    {item.deadline ? (
                      <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                        {formatDateToUserPattern(item.deadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline || item.createdAt} currentDate={item.finalRelease} />
                    {item.finalRelease ? (
                      <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                        {formatDateToUserPattern(item.finalRelease)}
                      </span>
                    ) : item.finalReleaseCompleted ? (
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

                  <td>
                    {canUserEdit && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                            setDeletingIds(prev => new Set(prev).add(item.id));
                            setTimeout(() => {
                              deleteProductItem(item.id);
                              setDeletingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
                            }, 320);
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--panel-bg)',
          borderRadius: '0 0 12px 12px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          userSelect: 'none',
          marginTop: '-1px'
        }}>
          <div>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-select"
                style={{
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  height: '26px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {[20, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--background-alt)'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              
              <span style={{ margin: '0 4px', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--background-alt)'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </TabContainer>

      <CSVImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCSV}
        title="Priority Requests"
        headers={['Feature', 'Tarun Sir Approval (Yes/No)', 'Raised by Tarun Sir (Yes/No)', 'Priority (P0/P1/P2)', 'POC Name', 'Status (In Progress/On Hold)', 'Clickup Status', 'Task URL', 'Blockers', 'Deadline Date', 'Notes text', 'Product mapping', 'UIUX Date', 'Final Release Date', 'Product Deadline Date', 'Description']}
      />
    </>
  );
};
