import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  MessageSquare
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
  DateDiffBadge
} from '../common/TableShared';

export const FeatureRequestsTable: React.FC = () => {
  const { dailyIssues, deleteDailyIssue, statuses, setPreviewProductId, confirm, comments, lastOpenedMap, fetchPaginatedMeetingsData } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduct, setFilterProduct] = useState('All');
  const [sortField, setSortField] = useState<keyof DailyIssue | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const featuresList = dailyIssues.filter(item => ['Feature Gap', 'Enhancement', 'New Feature', 'Data Needed', 'Term Report/ Transcript'].includes(item.type || ''));
  const totalFeatures = featuresList.length;
  const completedFeatures = featuresList.filter(f => !!f.finalReleaseCompleted).length;

  const bugsList = dailyIssues.filter(item => item.type === 'BUG');
  const totalBugs = bugsList.length;
  const completedBugs = bugsList.filter(b => !!b.finalReleaseCompleted).length;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedRequests, setPaginatedRequests] = useState<DailyIssue[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [subTab, setSubTab] = useState<'features' | 'bugs'>('features');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterProduct, subTab]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'featureRequests',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        product: filterProduct !== 'All' ? filterProduct : undefined,
        sortField: sortField || undefined,
        sortAsc: sortAsc,
        requestType: subTab === 'bugs' ? 'BUG' : 'FEATURE'
      });
      if (active) {
        if (res.success) {
          setPaginatedRequests(res.data);
          setTotalItems(res.totalItems);
          setCompletedItems(res.completedItems || 0);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterProduct,
    sortField,
    sortAsc,
    dailyIssues,
    subTab,
    fetchPaginatedMeetingsData
  ]);

  const activePage = Math.min(currentPage, totalPages);
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

  const allProducts = Array.from(new Set(dailyIssues.map(i => i.product).filter(Boolean)));

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

  return (
    <TabContainer
      title="Requested Features"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
            <option value="All">All Products</option>
            {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
        {/* SUB-TABS ROW */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            onClick={() => setSubTab('features')}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'features' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'features' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Feature Requests ({completedFeatures}/{totalFeatures})
          </button>
          <button
            onClick={() => setSubTab('bugs')}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'bugs' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'bugs' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Bugs ({completedBugs}/{totalBugs})
          </button>
        </div>
        <div className="table-responsive" style={{ flex: 1, overflow: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '320px', minWidth: '320px', maxWidth: '320px', cursor: 'pointer' }}>Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('cohort')} style={{ width: '120px', cursor: 'pointer' }}>Program {sortField === 'cohort' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>Raised By {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '120px' }}>POC Owner</th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                  Release Date ({completedItems}/{totalItems}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}></td>
                  </tr>
                ))
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No feature requests yet. Requests submitted via the public calendar will appear here.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map(item => {
                  const statusMatch = statuses.find(s => s.label === item.status);
                  const itemComments = comments.filter((c: any) => c.itemId === item.id);
                  const lastOpened = lastOpenedMap[item.id];
                  const unreadCount = itemComments.filter((c: any) => {
                    if (!lastOpened) return true;
                    return new Date(c.createdAt).getTime() > lastOpened;
                  }).length;

                  return (
                    <tr key={item.id} onClick={() => setPreviewProductId(item.id)} style={{ cursor: 'pointer' }}>
                      <td className="sticky-col" style={{ fontWeight: 600, width: '320px', minWidth: '320px', maxWidth: '320px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {item.product || 'No Product Group'}
                            </span>
                            <span style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 600, 
                              color: item.type === 'BUG' ? 'var(--danger, #ef4444)' : 'var(--text-secondary)', 
                              background: item.type === 'BUG' ? 'var(--danger-bg, rgba(239, 68, 68, 0.1))' : 'var(--background-alt)', 
                              border: item.type === 'BUG' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
                              padding: '1px 6px', 
                              borderRadius: '4px'
                            }}>
                              ✦ {item.type}
                            </span>
                            {item.priority && (
                              <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '1px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                {item.priority}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', lineHeight: '1.3' }}>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.module || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                            </span>
                            {unreadCount > 0 && (
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger, #ef4444)',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '8px',
                                  lineHeight: 1,
                                  flexShrink: 0
                                }}
                                title={`${unreadCount} unread comments`}
                              >
                                <MessageSquare size={10} fill="var(--danger, #ef4444)" />
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{item.cohort || '—'}</td>
                      <td>
                        {(item.contact || item.poc) ? (() => {
                          const fullVal = item.contact || item.poc || '';
                          const nameOnly = fullVal.split('(')[0].trim();
                          const emailOnly = fullVal.includes('(') ? fullVal.slice(fullVal.indexOf('(') + 1, fullVal.lastIndexOf(')')).trim() : '';

                          return (
                            <div className="cu-tooltip-container">
                              <span style={getPOCBadgeStyle(nameOnly)}>
                                {nameOnly}
                              </span>
                              {emailOnly && (
                                <span className="cu-tooltip-text" style={{ whiteSpace: 'nowrap' }}>
                                  {emailOnly}
                                </span>
                              )}
                            </div>
                          );
                        })() : '—'}
                      </td>
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
                        {item.status ? (
                          statusMatch ? (
                            <span className="badge" style={{
                              backgroundColor: `${statusMatch.color}14`,
                              color: statusMatch.color,
                              borderColor: `${statusMatch.color}33`,
                              borderStyle: 'solid',
                              borderWidth: '1px'
                            }}>{item.status}</span>
                          ) : (
                            <span className={`badge ${
                              item.status === 'On Hold' ? 'status-hold' :
                              item.status === 'In Progress' ? 'status-progress' :
                              item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                            }`}>{item.status}</span>
                          )
                        ) : '—'}
                      </td>
                      <td>
                        {item.clickupStatus ? (
                          <span style={getClickupBadgeStyle(item.clickupStatus)}>
                            {item.clickupStatus}
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
                            if (await confirm("Are you sure you want to delete this feature request?", "Delete Feature Request")) {
                              deleteDailyIssue(item.id);
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
