import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Check,
  Star,
  Link,
  CheckCircle
} from 'lucide-react';
import type {
  ProductItem,
  StudentProject
} from '../../types';
import {
  getPOCBadgeStyle,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToUserPattern,
  getDateSpanStyle,
  isCompletedStatus
} from '../common/tableUtils';
import {
  DateDiffBadge,
  AssignFeedbackModal,
  MultiSelectDropdown,
  FeedbackRatingCell,
  FeedbackDrawer
} from '../common/TableShared';

export const StudentProjectsTable: React.FC = () => {
  const { studentProjects, updateStudentProject, addStudentProject, deleteStudentProject, openPreviewForFeature, statuses, productItems, canUserEdit, currentUser, confirm, formConfigs } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [assignModalProject, setAssignModalProject] = useState<StudentProject | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof StudentProject | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const studentStatuses = statuses.map(s => s.label);
  const statusOptions = studentStatuses.length > 0 ? studentStatuses : ['Delivered', 'Cancelled', 'In-Progress'];

  const handleSort = (field: keyof StudentProject) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof StudentProject } | null>(null);
  const [inlineCellValue, setInlineCellValue] = useState('');
  const clickupInputRef = useRef<HTMLInputElement>(null);

  const startCellEdit = (p: StudentProject, field: keyof StudentProject) => {
    setEditingProjectId(null);
    setInlineCellValue(String(p[field] || ''));
    setEditingCell({ id: p.id, field });
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    updateStudentProject(editingCell.id, { [editingCell.field]: inlineCellValue } as Partial<StudentProject>);
    setEditingCell(null);
  };



  const renderClickupStatusCell = (p: StudentProject) => {
    const isEditing = editingCell?.id === p.id && editingCell.field === 'clickupStatus';
    if (isEditing) {
      return (
        <input
          autoFocus
          ref={clickupInputRef}
          type="text"
          value={inlineCellValue}
          onChange={(e) => setInlineCellValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveCellEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditingCell(null);
            }
          }}
          onBlur={saveCellEdit}
          style={{
            width: '100%',
            padding: '4px 6px',
            backgroundColor: 'var(--background)',
            border: '1.5px solid var(--primary)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
      );
    }

    const display = p.clickupStatus ? (
      <span style={getClickupBadgeStyle(p.clickupStatus)}>
        {p.clickupStatus}{p.clickupSubtasksCount ? ` (${p.clickupSubtasksCount})` : ""}
      </span>
    ) : '—';

    return (
      <div 
        onClick={(e) => { e.stopPropagation(); startCellEdit(p, 'clickupStatus'); }}
        style={{ width: '100%', minHeight: '20px' }}
      >
        {display}
      </div>
    );
  };

  const filtered = studentProjects.filter(p => {
    const matchesSuperPriority = !filterSuperPriorityOnly || !!p.raisedByTarunSir;
    if (!matchesSuperPriority) return false;

    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(p.status);
    if (!matchesStatus) return false;
    
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.thingsWeBuild || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    const aComp = isCompletedStatus(a.status);
    const bComp = isCompletedStatus(b.status);
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (sortField) {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  const handleAddNew = () => {
    setSearchQuery('');
    setSortField(null);
    const newItem: StudentProject = {
      id: `proj-${Date.now()}`,
      title: 'New Project',
      description: '',
      thingsWeBuild: '',
      status: '',
      assigned: '',
      blocker: '',
      completeInfoDate: '',
      priority: undefined,
      poc: currentUser?.name || 'Akash Sharma',
      clickupStatus: '',
      taskLink: '',
      productDeadline: '',
      uiux: '',
      deadline: '',
      finalRelease: '',
      raisedByTarunSir: false,
      tarunSirApproval: false
    };
    addStudentProject(newItem);
    setTimeout(() => {
      openPreviewForFeature(newItem.title, { 
        id: newItem.id,
        description: newItem.description, 
        status: newItem.status as any, 
        priority: newItem.priority || '',
        poc: newItem.poc || '',
        clickupStatus: newItem.clickupStatus || '',
        taskLink: newItem.taskLink || '',
        blocker: newItem.blocker || '',
        deadline: newItem.deadline || newItem.completeInfoDate || '',
        uiux: newItem.uiux || '',
        finalRelease: newItem.finalRelease || '',
        productDeadline: newItem.productDeadline || '',
        raisedByTarunSir: newItem.raisedByTarunSir || false,
        tarunSirApproval: newItem.tarunSirApproval || false
      });
    }, 50);
  };

  return (
    <>
      <TabContainer
        title="Student Projects"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Project"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
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
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('title')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Project Title {sortField === 'title' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '120px' }}>Rating</th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                  Release Date ({(() => {
                    const comp = filtered.filter(p => {
                      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const matchedProduct = productItems.find(item => clean(item.feature) === clean(p.title));
                      return isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted;
                    }).length;
                    return `${comp}/${filtered.length}`;
                  })()}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const matchedProduct = productItems.find(item => {
                  const cleanFeature = clean(item.feature);
                  const cleanTitle = clean(p.title);
                  return cleanFeature === cleanTitle || item.id === `prod-temp-${p.id}`;
                });

                return (
                  <tr 
                    key={p.id} 
                    onClick={() => {
                      if (editingProjectId !== p.id && p.title.trim()) {
                        openPreviewForFeature(p.title, { 
                          id: p.id,
                          description: p.description, 
                          status: p.status as any, 
                          priority: p.priority || '',
                          poc: p.poc || '',
                          clickupStatus: p.clickupStatus || '',
                          taskLink: p.taskLink || '',
                          blocker: p.blocker || '',
                          deadline: p.deadline || p.completeInfoDate || '',
                          uiux: p.uiux || '',
                          finalRelease: p.finalRelease || '',
                          productDeadline: p.productDeadline || '',
                          raisedByTarunSir: p.raisedByTarunSir || false,
                          tarunSirApproval: p.tarunSirApproval || false,
                          product: p.product || '',
                          module: p.module || '',
                          type: p.type || ''
                        } as Partial<ProductItem>);
                      }
                    }} 
                    className={p.blocker ? 'row-blocked' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                  <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                      {editingProjectId === p.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const finalVal = inlineEditValue.trim() || 'New Student Project';
                              updateStudentProject(p.id, { title: finalVal });
                              setEditingProjectId(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingProjectId(null);
                            }
                          }}
                          onBlur={() => {
                            const finalVal = inlineEditValue.trim() || 'New Student Project';
                            updateStudentProject(p.id, { title: finalVal });
                            setEditingProjectId(null);
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
                          {p.title || 'Untitled Project'}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {p.priority && (
                          <span className={`badge badge-${p.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                            {p.priority}
                          </span>
                        )}
                        {p.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={10} fill="currentColor" /> Super Priority
                          </span>
                        )}
                        {p.tarunSirApproval && (
                          <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                            <CheckCircle size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{p.product || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      {p.poc ? (
                          <span style={{ ...getPOCBadgeStyle(p.poc) }}>
                              {p.poc}
                          </span>
                      ) : '—'}
                      {p.clickupAssignee && (
                        <div className="cu-tooltip-container">
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            CU: {formatClickupAssignee(p.clickupAssignee)}
                          </span>
                          <span className="cu-tooltip-text">
                            {p.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {p.status ? (() => {
                      const matched = statuses.find(s => s.label.toLowerCase() === p.status.trim().toLowerCase());
                      if (matched) {
                        return (
                          <span className="badge" style={{
                            backgroundColor: `${matched.color}14`,
                            color: matched.color,
                            borderColor: `${matched.color}33`,
                            borderStyle: 'solid',
                            borderWidth: '1px'
                          }}>
                            {p.status}
                          </span>
                        );
                      }
                      return (
                        <span className={`badge ${
                          isCompletedStatus(p.status) ? 'status-completed' :
                          (p.status === 'Cancelled' || (p.status as string) === 'On Hold') ? 'status-hold' : 'status-progress'
                        }`}>
                          {p.status}
                        </span>
                      );
                    })() : '—'}
                  </td>
                  <td>
                    {renderClickupStatusCell(p)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <FeedbackRatingCell 
                      itemId={p.id} 
                      category="student-projects" 
                      onCellClick={(id, cat) => {
                        setDrawerItemId(id);
                        setDrawerCategory(cat);
                      }}
                    />
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.createdAt} currentDate={p.productDeadline} />
                    {p.productDeadline ? (
                      <span style={getDateSpanStyle(p.productDeadline, isCompletedStatus(p.status) || !!matchedProduct?.productDeadlineCompleted)}>
                        {formatDateToUserPattern(p.productDeadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.productDeadline || p.createdAt} currentDate={p.uiux} />
                    {p.uiux ? (
                      <span style={getDateSpanStyle(p.uiux, isCompletedStatus(p.status) || !!matchedProduct?.uiuxCompleted)}>
                        {formatDateToUserPattern(p.uiux)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.uiux || p.productDeadline || p.createdAt} currentDate={p.deadline || p.completeInfoDate} />
                    {(p.deadline || p.completeInfoDate) ? (
                      <span style={getDateSpanStyle(p.deadline || p.completeInfoDate, isCompletedStatus(p.status) || !!matchedProduct?.deadlineCompleted)}>
                        {formatDateToUserPattern(p.deadline || p.completeInfoDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.deadline || p.completeInfoDate || p.uiux || p.productDeadline || p.createdAt} currentDate={p.finalRelease} />
                    {p.finalRelease ? (
                      <span style={getDateSpanStyle(p.finalRelease, isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted)}>
                        {formatDateToUserPattern(p.finalRelease)}
                      </span>
                    ) : (isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted) ? (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const projForm = p.feedbackFormId ? formConfigs.find(f => f.id === p.feedbackFormId) : null;
                        const tip = copiedId === p.id 
                          ? "Link Copied!" 
                          : (projForm ? `Feedback Form: "${projForm.title || projForm.id}" (Click to copy link)` : (p.feedbackFormId ? "Copy Feedback Link" : "Assign Form & Copy Link"));
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (p.feedbackFormId) {
                                const link = `${window.location.origin}/?feedback=${p.id}&category=student-projects&formId=${p.feedbackFormId}`;
                                navigator.clipboard.writeText(link).then(() => {
                                  setCopiedId(p.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                });
                              } else {
                                setAssignModalProject(p);
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: copiedId === p.id ? 'var(--success)' : (p.feedbackFormId ? 'var(--primary)' : 'var(--text-secondary)'),
                              display: 'flex',
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title={tip}
                          >
                            {copiedId === p.id ? <Check size={12} /> : <Link size={12} />}
                          </button>
                        );
                      })()}
                      {canUserEdit && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirm("Are you sure you want to delete this project?", "Delete Project")) {
                              deleteStudentProject(p.id);
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </TabContainer>
      <FeedbackDrawer
        itemId={drawerItemId}
        category={drawerCategory}
        onClose={() => {
          setDrawerItemId(null);
          setDrawerCategory(null);
        }}
      />
      {assignModalProject && (
        <AssignFeedbackModal
          isOpen={!!assignModalProject}
          onClose={() => setAssignModalProject(null)}
          itemId={assignModalProject.id}
          itemTitle={assignModalProject.title}
          category="student-projects"
          currentFormId={assignModalProject.feedbackFormId}
          onAssigned={(assignedFormId) => {
            const link = `${window.location.origin}/?feedback=${assignModalProject.id}&category=student-projects&formId=${assignedFormId}`;
            navigator.clipboard.writeText(link).then(() => {
              setCopiedId(assignModalProject.id);
              setTimeout(() => setCopiedId(null), 2000);
            });
          }}
        />
      )}
    </>
  );
};

/* =========================================================================
   4. STUDENT MEETINGS SCHEDULE MODAL & COMPONENT
   ========================================================================= */

