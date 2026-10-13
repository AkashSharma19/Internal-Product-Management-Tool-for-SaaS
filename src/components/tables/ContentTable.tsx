import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Sparkles
} from 'lucide-react';
import type {
  ContentItem
} from '../../types';
import {
  getPOCBadgeStyle,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToShortPattern,
  getDateSpanStyle
} from '../common/tableUtils';
import {
  DateDiffBadge,
  MultiSelectDropdown
} from '../common/TableShared';

export const ContentTable: React.FC = () => {
  const { 
    contentItems, addContentItem, deleteContentItem, 
    setPreviewProductId, statuses: configStatuses, currentUser, confirm
  } = useDashboard();
  const contentStatuses = configStatuses;
  const statusOptions = contentStatuses.length > 0 
    ? contentStatuses.map(s => s.label) 
    : ['Idea', 'Writing', 'In Progress', 'Scheduled', 'Published'];
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering states
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  const getStatusColor = (status: string) => {
    const matched = contentStatuses.find(s => s.label === status);
    if (matched) return matched.color;
    switch (status) {
      case 'Published': return '#10b981';
      case 'Scheduled': return '#3b82f6';
      case 'In Progress': return '#f59e0b';
      case 'Writing': return '#8b5cf6';
      case 'Idea': return '#6b7280';
      default: return 'var(--surface-elevated)';
    }
  };
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<keyof ContentItem>('module');
  const [sortAsc, setSortAsc] = useState(true);






  // Handle new item add inline
  const handleAddNew = () => {
    setSearchQuery('');
    setSortField('module');
    const newItem: ContentItem = {
      id: `cont-${Date.now()}`,
      module: 'New Content Topic',
      subject: '',
      type: 'Video',
      poc: currentUser?.name || 'Akash Sharma',
      draftLink: '',
      status: '',
      publishDate: '',
      product: '',
      priority: '',
      clickupStatus: '',
      productDeadline: '',
      uiux: '',
      deadline: '',
      finalRelease: '',
      productDeadlineCompleted: false,
      uiuxCompleted: false,
      deadlineCompleted: false,
      finalReleaseCompleted: false,
      raisedByTarunSir: false
    };
    addContentItem(newItem);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };


  // 1. Search & Super Priority filter
  let filtered = contentItems.filter(item => {
    const matchesSearch = 
      item.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.product || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    return matchesSearch && matchesSuperPriority;
  });

  // 3. Status filter
  if (filterStatuses.length > 0) {
    filtered = filtered.filter(item => filterStatuses.includes(item.status));
  }

  // 4. Header sorting
  const handleSort = (field: keyof ContentItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return 0;
  });

  return (
    <>
      <TabContainer
        title="Content Pipeline"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Content Item"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>
                  Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('product')} style={{ width: '150px', cursor: 'pointer' }}>
                  Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>
                  POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>
                  Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>
                  Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>
                  Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>
                  UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>
                  Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                  Release Date ({filtered.filter(item => !!item.finalReleaseCompleted).length}/{filtered.length}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => setPreviewProductId(item.id)} 
                  style={{ cursor: 'pointer' }}
                >
                  {/* Module Name (Feature) */}
                  <td 
                    className="sticky-col" 
                    style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                      <span>{item.module || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {item.priority && (
                          <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                            {item.priority}
                          </span>
                        )}
                        {item.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Sparkles size={10} /> Super Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Product Group */}
                  <td>
                    {item.product || '—'}
                  </td>

                  {/* POC Owner */}
                  <td>
                    {item.poc ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={getPOCBadgeStyle(item.poc)}>
                          {item.poc}
                        </span>
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
                    ) : '—'}
                  </td>

                  {/* Status */}
                  <td>
                    {item.status ? (
                      <span className="badge" style={{ backgroundColor: getStatusColor(item.status), color: '#fff', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px' }}>
                        {item.status}
                      </span>
                    ) : '—'}
                  </td>

                  {/* ClickUp Status */}
                  <td>
                    {item.clickupStatus ? (
                      <span style={getClickupBadgeStyle(item.clickupStatus)}>
                        {item.clickupStatus}
                      </span>
                    ) : '—'}
                  </td>

                  {/* Specs Date (productDeadline) */}
                  <td>
                    <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                      {item.productDeadline ? formatDateToShortPattern(item.productDeadline) : '—'}
                    </span>
                  </td>

                  {/* UI/UX Date */}
                  <td style={{ position: 'relative' }}>
                    {item.uiux && <DateDiffBadge prevDate={item.productDeadline || item.createdAt} currentDate={item.uiux} />}
                    <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                      {item.uiux ? formatDateToShortPattern(item.uiux) : '—'}
                    </span>
                  </td>

                  {/* Dev Date */}
                  <td style={{ position: 'relative' }}>
                    {item.deadline && <DateDiffBadge prevDate={item.uiux || item.productDeadline || item.createdAt} currentDate={item.deadline} />}
                    <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                      {item.deadline ? formatDateToShortPattern(item.deadline) : '—'}
                    </span>
                  </td>

                  {/* Release Date */}
                  <td style={{ position: 'relative' }}>
                    {item.finalRelease && <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline || item.createdAt} currentDate={item.finalRelease} />}
                    <span style={
                      item.finalRelease ? getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted) : item.finalReleaseCompleted ? {
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      } : {}
                    }>
                      {item.finalRelease ? formatDateToShortPattern(item.finalRelease) : item.finalReleaseCompleted ? 'Delivered' : '—'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirm("Are you sure you want to delete this content item?", "Delete Content Item")) {
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

    </>
  );
};
