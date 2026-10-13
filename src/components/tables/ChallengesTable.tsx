import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import { ensureHtmlDescription } from '../../utils/text';
import {
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Link,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type {
  Challenge
} from '../../types';

// CHALLENGES MULTI SELECT DROPDOWN COMPONENT
// ============================================================================
interface ChallengesMultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  isOpen: boolean;
  onToggle: () => void;
  customSection?: React.ReactNode;
}

const ChallengesMultiSelectDropdown: React.FC<ChallengesMultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  isOpen,
  onToggle,
  customSection
}) => {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div 
        onClick={onToggle}
        style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.6rem 0.8rem',
          fontSize: '0.85rem',
          color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
          {selected.length > 0 
            ? `${selected.length} selected (${selected.join(', ')})` 
            : placeholder}
        </span>
        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          marginTop: '4px',
          maxHeight: '180px',
          overflowY: 'auto',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}>
          {options.length === 0 && !customSection ? (
            <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            options.map(opt => {
              const isChecked = selected.includes(opt);
              return (
                <label 
                  key={opt} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer', 
                    padding: '4px 6px',
                    borderRadius: '4px',
                    backgroundColor: isChecked ? 'var(--background-alt)' : 'transparent',
                    color: 'var(--text-primary)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selected, opt]);
                      } else {
                        onChange(selected.filter(x => x !== opt));
                      }
                    }}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  {opt}
                </label>
              );
            })
          )}
          {customSection && (
            <div 
              style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.4rem', marginTop: '0.2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              {customSection}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              marginTop: '0.25rem',
              padding: '4px',
              fontSize: '0.75rem',
              fontWeight: 750,
              color: 'var(--primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'right'
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CHALLENGES TRACKER TABLE
// ============================================================================

export const ChallengesTable: React.FC = () => {
  const { 
    challenges, addChallenge, updateChallenge, deleteChallenge,
    productItems, speakers, setPreviewProductId, canUserEdit, confirm,
    directoryContacts, programs: configPrograms, cohorts: configCohorts,
    fetchPaginatedMeetingsData
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterBlockerOnly, setFilterBlockerOnly] = useState(false);

  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSolutionId, setEditingSolutionId] = useState<string | null>(null);
  const [viewingDescChallenge, setViewingDescChallenge] = useState<Challenge | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [paginatedChallenges, setPaginatedChallenges] = useState<Challenge[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDepartment, filterStatus, filterPriority, filterBlockerOnly]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'challenges',
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        priority: filterPriority !== 'All' ? filterPriority : undefined,
        statuses: filterStatus !== 'All' ? [filterStatus] : undefined,
        departments: filterDepartment !== 'All' ? [filterDepartment] : undefined,
        blockersOnly: filterBlockerOnly
      });
      if (active) {
        if (res.success) {
          setPaginatedChallenges(res.data);
          setTotalItems(res.totalItems);
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
    itemsPerPage,
    searchQuery,
    filterDepartment,
    filterStatus,
    filterPriority,
    filterBlockerOnly,
    challenges,
    fetchPaginatedMeetingsData
  ]);

  // Form states for new challenge
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPoc, setNewPoc] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newStatus, setNewStatus] = useState<'Pending' | 'In Progress' | 'Solved' | 'Unsolved'>('Pending');
  const [newSolution, setNewSolution] = useState('');
  const [newRelatedTaskId, setNewRelatedTaskId] = useState('');
  const [newIsBlocker, setNewIsBlocker] = useState(false);

  // Multi-select lists states
  const [newDepartments, setNewDepartments] = useState<string[]>([]);
  const [newPrograms, setNewPrograms] = useState<string[]>([]);
  const [newCohorts, setNewCohorts] = useState<string[]>([]);
  const [customDept, setCustomDept] = useState('');
  const [editCustomDept, setEditCustomDept] = useState('');

  // Dropdown visibility states
  const [activeDropdownNew, setActiveDropdownNew] = useState<'program' | 'cohort' | 'department' | null>(null);
  const [activeDropdownEdit, setActiveDropdownEdit] = useState<'program' | 'cohort' | 'department' | null>(null);


  // Global list of departments from contacts and cohorts (for filter dropdown and custom value checks)
  const availableDepartmentsGlobal = useMemo(() => {
    const allCohortDepts = (configCohorts || [])
      .flatMap(c => c.departments || [])
      .map(d => d.trim())
      .filter(d => d !== '');

    const allContactsDepts = (directoryContacts || [])
      .map(c => c.department?.trim())
      .filter(d => d && d !== '');

    return Array.from(new Set([...allCohortDepts, ...allContactsDepts])).sort();
  }, [configCohorts, directoryContacts]);

  const availablePrograms = useMemo(() => {
    return (configPrograms || []).map(p => p.name).sort();
  }, [configPrograms]);

  // ==========================================================================
  // DEPENDENCY CALCULATIONS - CREATE MODAL
  // ==========================================================================

  // Cohorts are dependent on the Programs selected
  const availableCohortsForNew = useMemo(() => {
    if (newPrograms.length === 0) {
      // If no program selected, show all cohorts
      return (configCohorts || []).map(c => c.name).sort();
    }
    const progIds = (configPrograms || [])
      .filter(p => newPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());
    
    return (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        return cohortProgId && progIds.includes(cohortProgId);
      })
      .map(c => c.name)
      .sort();
  }, [configCohorts, configPrograms, newPrograms]);

  // Departments are dependent on the Programs and Cohorts selected
  const availableDepartmentsForNew = useMemo(() => {
    if (newPrograms.length === 0 && newCohorts.length === 0) {
      return availableDepartmentsGlobal;
    }

    // Get normalized selected program IDs
    const progIds = (configPrograms || [])
      .filter(p => newPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());

    // Get normalized selected cohort names/IDs
    const selectedCohortNamesLower = newCohorts.map(c => c.toLowerCase().trim());
    const cohortIds = (configCohorts || [])
      .filter(c => selectedCohortNamesLower.includes(c.name.toLowerCase().trim()))
      .map(c => c.id.toLowerCase().trim());

    // Filter cohorts departments belonging to selected programs or cohorts
    const filteredCohortDepts = (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        const cohortId = c.id?.toLowerCase().trim();
        return (
          (cohortProgId && progIds.includes(cohortProgId)) ||
          (cohortId && cohortIds.includes(cohortId))
        );
      })
      .flatMap(c => c.departments || [])
      .map(d => d.trim())
      .filter(d => d !== '');

    // Filter contacts departments belonging to selected programs or cohorts
    const filteredContactDepts = (directoryContacts || [])
      .filter(c => {
        const contactProgId = c.programId?.toLowerCase().trim();
        const contactCohortId = c.cohortId?.toLowerCase().trim();
        return (
          (contactProgId && progIds.includes(contactProgId)) ||
          (contactCohortId && cohortIds.includes(contactCohortId))
        );
      })
      .map(c => c.department?.trim())
      .filter(d => d && d !== '');

    return Array.from(new Set([...filteredCohortDepts, ...filteredContactDepts])).sort();
  }, [directoryContacts, configCohorts, configPrograms, newPrograms, newCohorts, availableDepartmentsGlobal]);

  // Auto-cleanup selected cohorts when available list changes
  useEffect(() => {
    if (isCreateModalOpen) {
      setNewCohorts(prev => prev.filter(c => availableCohortsForNew.includes(c)));
    }
  }, [newPrograms, availableCohortsForNew, isCreateModalOpen]);

  // Auto-cleanup selected departments when available list changes (safeguard custom typed entries)
  useEffect(() => {
    if (isCreateModalOpen) {
      setNewDepartments(prev => 
        prev.filter(d => availableDepartmentsForNew.includes(d) || !availableDepartmentsGlobal.includes(d))
      );
    }
  }, [newPrograms, newCohorts, availableDepartmentsForNew, availableDepartmentsGlobal, isCreateModalOpen]);


  // ==========================================================================
  // DEPENDENCY CALCULATIONS - EDIT MODAL
  // ==========================================================================

  const editingPrograms = editingChallenge?.programs || [];
  const editingCohorts = editingChallenge?.cohorts || [];

  // Cohorts are dependent on the Programs selected
  const availableCohortsForEdit = useMemo(() => {
    if (editingPrograms.length === 0) {
      return (configCohorts || []).map(c => c.name).sort();
    }
    const progIds = (configPrograms || [])
      .filter(p => editingPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());
    
    return (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        return cohortProgId && progIds.includes(cohortProgId);
      })
      .map(c => c.name)
      .sort();
  }, [configCohorts, configPrograms, editingPrograms]);

  // Departments are dependent on the Programs and Cohorts selected
  const availableDepartmentsForEdit = useMemo(() => {
    if (editingPrograms.length === 0 && editingCohorts.length === 0) {
      return availableDepartmentsGlobal;
    }

    const progIds = (configPrograms || [])
      .filter(p => editingPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());

    const selectedCohortNamesLower = editingCohorts.map(c => c.toLowerCase().trim());
    const cohortIds = (configCohorts || [])
      .filter(c => selectedCohortNamesLower.includes(c.name.toLowerCase().trim()))
      .map(c => c.id.toLowerCase().trim());

    const filteredCohortDepts = (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        const cohortId = c.id?.toLowerCase().trim();
        return (
          (cohortProgId && progIds.includes(cohortProgId)) ||
          (cohortId && cohortIds.includes(cohortId))
        );
      })
      .flatMap(c => c.departments || [])
      .map(d => d.trim())
      .filter(d => d !== '');

    const filteredContactDepts = (directoryContacts || [])
      .filter(c => {
        const contactProgId = c.programId?.toLowerCase().trim();
        const contactCohortId = c.cohortId?.toLowerCase().trim();
        return (
          (contactProgId && progIds.includes(contactProgId)) ||
          (contactCohortId && cohortIds.includes(contactCohortId))
        );
      })
      .map(c => c.department?.trim())
      .filter(d => d && d !== '');

    return Array.from(new Set([...filteredCohortDepts, ...filteredContactDepts])).sort();
  }, [directoryContacts, configCohorts, configPrograms, editingPrograms, editingCohorts, availableDepartmentsGlobal]);

  // Auto-cleanup selected cohorts when available list changes
  useEffect(() => {
    if (editingChallenge) {
      const filteredCohorts = editingCohorts.filter(c => availableCohortsForEdit.includes(c));
      if (filteredCohorts.length !== editingCohorts.length) {
        setEditingChallenge(prev => prev ? { ...prev, cohorts: filteredCohorts } : null);
      }
    }
  }, [editingPrograms, availableCohortsForEdit, editingChallenge, editingCohorts]);

  // Auto-cleanup selected departments when available list changes (safeguard custom typed entries)
  useEffect(() => {
    if (editingChallenge) {
      const currentDepts = editingChallenge.departments || [];
      const filteredDepts = currentDepts.filter(d => 
        availableDepartmentsForEdit.includes(d) || !availableDepartmentsGlobal.includes(d)
      );
      if (filteredDepts.length !== currentDepts.length) {
        setEditingChallenge(prev => prev ? { ...prev, departments: filteredDepts } : null);
      }
    }
  }, [editingPrograms, editingCohorts, availableDepartmentsForEdit, availableDepartmentsGlobal, editingChallenge]);


  // ==========================================================================
  // FILTER CHALLENGES FOR VIEW LISTING
  // ==========================================================================



  const activePage = Math.min(currentPage, totalPages);

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newChal: Challenge = {
      id: `chal-${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      departments: newDepartments,
      programs: newPrograms,
      cohorts: newCohorts,
      poc: newPoc,
      priority: newPriority,
      status: newStatus,
      solution: newStatus === 'Solved' ? newSolution.trim() : '',
      relatedTaskId: newRelatedTaskId,
      isBlocker: newIsBlocker,
      loggedDate: new Date().toISOString().split('T')[0]
    };

    addChallenge(newChal);
    setIsCreateModalOpen(false);
    
    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewPoc('');
    setNewPriority('Medium');
    setNewStatus('Pending');
    setNewSolution('');
    setNewRelatedTaskId('');
    setNewIsBlocker(false);
    setNewDepartments([]);
    setNewPrograms([]);
    setNewCohorts([]);
    setCustomDept('');
    setActiveDropdownNew(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;

    updateChallenge(editingChallenge.id, editingChallenge);
    setEditingChallenge(null);
    setEditCustomDept('');
    setActiveDropdownEdit(null);
  };

  const handleDelete = async (id: string) => {
    const isOk = await confirm('Are you sure you want to delete this challenge?', 'Confirm Delete');
    if (isOk) {
      deleteChallenge(id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f97316';
      case 'Low': return '#6b7280';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Solved': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'Pending': return '#eab308';
      case 'Unsolved': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const toggleDropdownNew = (type: 'program' | 'cohort' | 'department') => {
    setActiveDropdownNew(prev => prev === type ? null : type);
  };

  const toggleDropdownEdit = (type: 'program' | 'cohort' | 'department') => {
    setActiveDropdownEdit(prev => prev === type ? null : type);
  };

  return (
    <TabContainer
      title="Challenges Tracker"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search challenges, descriptions, POCs..."
      onAddClick={canUserEdit ? () => setIsCreateModalOpen(true) : undefined}
      addLabel="Log Challenge"
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="All">All Departments</option>
            {availableDepartmentsGlobal.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Solved">Solved</option>
            <option value="Unsolved">Unsolved</option>
          </select>

          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
            <input 
              type="checkbox" 
              className="form-checkbox"
              checked={filterBlockerOnly} 
              onChange={(e) => setFilterBlockerOnly(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            Blockers Only
          </label>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
        {totalItems === 0 && !isFetching ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <AlertCircle size={28} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No challenges logged matching filters</p>
          </div>
        ) : (
          <>
            <div className="table-responsive" style={{ flex: 1, overflow: 'auto' }}>
              <table className="grid-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, width: '130px' }}>Description</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '120px' }}>Program</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '120px' }}>Cohort</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '150px' }}>Department</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, width: '130px' }}>Status</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '280px' }}>Resolution</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching ? (
                    Array.from({ length: Math.min(itemsPerPage, 8) }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '24px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '110px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '200px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}></td>
                      </tr>
                    ))
                  ) : (
                    paginatedChallenges.map(item => {
                      const linkedTask = productItems.find(p => p.id === item.relatedTaskId);
                      return (
                        <tr key={item.id}>
                          {/* Title */}
                          <td style={{ verticalAlign: 'middle', whiteSpace: 'normal', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                              {item.isBlocker && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ef444420',
                                  color: '#ef4444',
                                  border: '1px solid #ef444430'
                                }}>
                                  🚨 BLOCKER
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                backgroundColor: getPriorityColor(item.priority) + '15',
                                color: getPriorityColor(item.priority),
                                border: `1px solid ${getPriorityColor(item.priority)}25`
                              }}>
                                {item.priority}
                              </span>
                            </div>
                            {linkedTask && (
                              <div style={{ marginTop: '4px' }}>
                                <button
                                  onClick={() => setPreviewProductId(linkedTask.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    fontSize: '0.67rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline'
                                  }}
                                >
                                  <Link size={10} /> Related Feature
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Description Popup Button */}
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            {item.description ? (
                              <button
                                onClick={() => setViewingDescChallenge(item)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}
                              >
                                View Description
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.7rem' }}>—</span>
                            )}
                          </td>

                          {/* Program */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                              {item.programs && item.programs.length > 0 ? (
                                <>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)' }}>{item.programs[0]}</span>
                                  {item.programs.length > 1 && (
                                    <div className="cu-tooltip-container" style={{ display: 'inline-block' }}>
                                      <span 
                                        style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                      >
                                        +{item.programs.length - 1}
                                      </span>
                                      <span className="cu-tooltip-text">
                                        {item.programs.join('\n')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Cohort */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                              {item.cohorts && item.cohorts.length > 0 ? (
                                <>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#0891b2' }}>{item.cohorts[0]}</span>
                                  {item.cohorts.length > 1 && (
                                    <div className="cu-tooltip-container" style={{ display: 'inline-block' }}>
                                      <span 
                                        style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                      >
                                        +{item.cohorts.length - 1}
                                      </span>
                                      <span className="cu-tooltip-text">
                                        {item.cohorts.join('\n')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Department */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                              {item.departments && item.departments.length > 0 ? (
                                <>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-secondary)' }}>{item.departments[0]}</span>
                                  {item.departments.length > 1 && (
                                    <div className="cu-tooltip-container" style={{ display: 'inline-block' }}>
                                      <span 
                                        style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-muted)', cursor: 'pointer' }}
                                      >
                                        +{item.departments.length - 1}
                                      </span>
                                      <span className="cu-tooltip-text">
                                        {item.departments.join('\n')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            {canUserEdit ? (
                              <select
                                value={item.status}
                                onChange={(e) => updateChallenge(item.id, { status: e.target.value as any })}
                                className="badge"
                                style={{
                                  backgroundColor: getStatusColor(item.status) + '14',
                                  color: getStatusColor(item.status),
                                  borderColor: getStatusColor(item.status) + '33',
                                  borderStyle: 'solid',
                                  borderWidth: '1px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  textAlign: 'center'
                                }}
                              >
                                <option value="Pending" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>Pending</option>
                                <option value="In Progress" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>In Progress</option>
                                <option value="Solved" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>Solved</option>
                                <option value="Unsolved" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>Unsolved</option>
                              </select>
                            ) : (
                              <span className="badge" style={{
                                backgroundColor: getStatusColor(item.status) + '14',
                                color: getStatusColor(item.status),
                                borderColor: getStatusColor(item.status) + '33',
                                borderStyle: 'solid',
                                borderWidth: '1px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                display: 'inline-block'
                              }}>
                                {item.status}
                              </span>
                            )}
                          </td>

                          {/* Resolution */}
                          <td 
                            onClick={() => canUserEdit && setEditingSolutionId(item.id)}
                            style={{ verticalAlign: 'middle', cursor: canUserEdit ? 'pointer' : 'default' }}
                          >
                            {editingSolutionId === item.id ? (
                              <textarea
                                value={item.solution || ''}
                                placeholder="Type solution and click away..."
                                onChange={(e) => updateChallenge(item.id, { solution: e.target.value })}
                                onBlur={() => setEditingSolutionId(null)}
                                autoFocus
                                rows={1}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = `${el.scrollHeight}px`;
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  backgroundColor: 'var(--background)',
                                  border: '1px solid var(--primary)',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  fontSize: '0.75rem',
                                  color: 'var(--text-primary)',
                                  resize: 'none',
                                  fontFamily: 'inherit',
                                  overflowY: 'hidden',
                                  outline: 'none',
                                  boxShadow: '0 0 0 2px var(--primary-glow)'
                                }}
                              />
                            ) : item.solution ? (
                              <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                                borderLeft: '3px solid var(--success)',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {item.solution}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                                {canUserEdit ? '— (Click to add solution)' : 'No solution logged'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            {canUserEdit && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingChallenge(item); }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Edit Challenge"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Delete Challenge"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--panel-bg)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              userSelect: 'none',
              marginTop: '-1px'
            }}>
              <div>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{totalItems > 0 ? (activePage - 1) * itemsPerPage + 1 : 0}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(activePage * itemsPerPage, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
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
                    disabled={activePage === 1}
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
                      cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                      opacity: activePage === 1 ? 0.4 : 1,
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--background-alt)'
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  <span style={{ margin: '0 4px', fontWeight: 600 }}>
                    Page {activePage} of {totalPages}
                  </span>

                  <button
                    disabled={activePage === totalPages}
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
                      cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: activePage === totalPages ? 0.4 : 1,
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--background-alt)'
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '540px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Log Operations Challenge</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Challenge Title*</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Sandbox environment compilation errors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description & Details</label>
                <textarea
                  placeholder="Provide logs, reproduction steps, or issues..."
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    resize: 'none',
                    fontFamily: 'inherit',
                    overflowY: 'hidden'
                  }}
                />
              </div>

              {/* Programs and Cohorts Custom Dropdowns */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Programs"
                    options={availablePrograms}
                    selected={newPrograms}
                    onChange={setNewPrograms}
                    placeholder="Select Programs..."
                    isOpen={activeDropdownNew === 'program'}
                    onToggle={() => toggleDropdownNew('program')}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Cohorts"
                    options={availableCohortsForNew}
                    selected={newCohorts}
                    onChange={setNewCohorts}
                    placeholder="Select Cohorts..."
                    isOpen={activeDropdownNew === 'cohort'}
                    onToggle={() => toggleDropdownNew('cohort')}
                  />
                </div>
              </div>

              {/* Departments Custom Dropdown */}
              <div>
                <ChallengesMultiSelectDropdown
                  label="Departments"
                  options={availableDepartmentsForNew}
                  selected={newDepartments}
                  onChange={setNewDepartments}
                  placeholder="Select Departments..."
                  isOpen={activeDropdownNew === 'department'}
                  onToggle={() => toggleDropdownNew('department')}
                  customSection={
                    <div style={{ display: 'flex', gap: '0.4rem', padding: '2px 4px' }}>
                      <input
                        type="text"
                        placeholder="Or add manually..."
                        value={customDept}
                        onChange={(e) => setCustomDept(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customDept.trim() && !newDepartments.includes(customDept.trim())) {
                            setNewDepartments([...newDepartments, customDept.trim()]);
                            setCustomDept('');
                          }
                        }}
                        style={{
                          padding: '0 0.5rem',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--background-alt)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  }
                />
              </div>

              {/* Status and POC */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Solved">Solved</option>
                    <option value="Unsolved">Unsolved</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>POC Speaker</label>
                  <select
                    value={newPoc}
                    onChange={(e) => setNewPoc(e.target.value)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {speakers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority & Blocker Checkbox */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
                  <input 
                    type="checkbox"
                    id="newIsBlocker"
                    checked={newIsBlocker}
                    onChange={(e) => setNewIsBlocker(e.target.checked)}
                    style={{ accentColor: 'var(--danger)', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="newIsBlocker" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', cursor: 'pointer', userSelect: 'none' }}>
                    Blocking Progress
                  </label>
                </div>
              </div>

              {/* Solution Description */}
              {newStatus === 'Solved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Resolution Solution*</label>
                  <textarea
                    required
                    placeholder="Describe how this challenge was mitigated or solved..."
                    rows={2}
                    value={newSolution}
                    onChange={(e) => setNewSolution(e.target.value)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {/* Link Product Feature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Link to Product Feature</label>
                <select
                  value={newRelatedTaskId}
                  onChange={(e) => setNewRelatedTaskId(e.target.value)}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">No Related Task</option>
                  {productItems.map(p => <option key={p.id} value={p.id}>{p.feature} ({p.id})</option>)}
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="premium-timeline-btn btn-secondary"
                  style={{ flex: 1, height: '36px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-timeline-btn btn-primary"
                  style={{ flex: 2, height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  Log Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingChallenge && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '540px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Edit Challenge</h3>
              <button onClick={() => { setEditingChallenge(null); setEditCustomDept(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Challenge Title*</label>
                <input
                  type="text"
                  required
                  value={editingChallenge.title}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description & Details</label>
                <textarea
                  rows={2}
                  value={editingChallenge.description || ''}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, description: e.target.value })}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    resize: 'none',
                    fontFamily: 'inherit',
                    overflowY: 'hidden'
                  }}
                />
              </div>

              {/* Programs and Cohorts Custom Dropdowns */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Programs"
                    options={availablePrograms}
                    selected={editingChallenge.programs || []}
                    onChange={(selectedProgs) => setEditingChallenge({ ...editingChallenge, programs: selectedProgs })}
                    placeholder="Select Programs..."
                    isOpen={activeDropdownEdit === 'program'}
                    onToggle={() => toggleDropdownEdit('program')}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Cohorts"
                    options={availableCohortsForEdit}
                    selected={editingChallenge.cohorts || []}
                    onChange={(selectedCohs) => setEditingChallenge({ ...editingChallenge, cohorts: selectedCohs })}
                    placeholder="Select Cohorts..."
                    isOpen={activeDropdownEdit === 'cohort'}
                    onToggle={() => toggleDropdownEdit('cohort')}
                  />
                </div>
              </div>

              {/* Departments Custom Dropdown */}
              <div>
                <ChallengesMultiSelectDropdown
                  label="Departments"
                  options={availableDepartmentsForEdit}
                  selected={editingChallenge.departments || []}
                  onChange={(selectedDepts) => setEditingChallenge({ ...editingChallenge, departments: selectedDepts })}
                  placeholder="Select Departments..."
                  isOpen={activeDropdownEdit === 'department'}
                  onToggle={() => toggleDropdownEdit('department')}
                  customSection={
                    <div style={{ display: 'flex', gap: '0.4rem', padding: '2px 4px' }}>
                      <input
                        type="text"
                        placeholder="Or add manually..."
                        value={editCustomDept}
                        onChange={(e) => setEditCustomDept(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const currentDepts = editingChallenge.departments || [];
                          if (editCustomDept.trim() && !currentDepts.includes(editCustomDept.trim())) {
                            setEditingChallenge({ ...editingChallenge, departments: [...currentDepts, editCustomDept.trim()] });
                            setEditCustomDept('');
                          }
                        }}
                        style={{
                          padding: '0 0.5rem',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--background-alt)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  }
                />
              </div>

              {/* Status and POC */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</label>
                  <select
                    value={editingChallenge.status}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, status: e.target.value as any })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Solved">Solved</option>
                    <option value="Unsolved">Unsolved</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>POC Speaker</label>
                  <select
                    value={editingChallenge.poc}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, poc: e.target.value })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {speakers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority & Blocker Checkbox */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Priority</label>
                  <select
                    value={editingChallenge.priority}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, priority: e.target.value as any })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
                  <input 
                    type="checkbox"
                    id="editIsBlocker"
                    checked={!!editingChallenge.isBlocker}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, isBlocker: e.target.checked })}
                    style={{ accentColor: 'var(--danger)', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="editIsBlocker" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', cursor: 'pointer', userSelect: 'none' }}>
                    Blocking Progress
                  </label>
                </div>
              </div>

              {/* Resolution Description */}
              {editingChallenge.status === 'Solved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Resolution Solution*</label>
                  <textarea
                    required
                    placeholder="Describe how this challenge was mitigated or solved..."
                    rows={2}
                    value={editingChallenge.solution || ''}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, solution: e.target.value })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {/* Link Product Feature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Link to Product Feature</label>
                <select
                  value={editingChallenge.relatedTaskId || ''}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, relatedTaskId: e.target.value })}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">No Related Task</option>
                  {productItems.map(p => <option key={p.id} value={p.id}>{p.feature} ({p.id})</option>)}
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setEditingChallenge(null); setEditCustomDept(''); }}
                  className="premium-timeline-btn btn-secondary"
                  style={{ flex: 1, height: '36px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-timeline-btn btn-primary"
                  style={{ flex: 2, height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DESCRIPTION MODAL */}
      {viewingDescChallenge && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Description & Details
              </h3>
              <button 
                onClick={() => setViewingDescChallenge(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Challenge Title</strong>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {viewingDescChallenge.title}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description Details</strong>
              <div 
                style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  lineHeight: 1.5, 
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--background)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)'
                }}
                dangerouslySetInnerHTML={{ __html: ensureHtmlDescription(viewingDescChallenge.description) }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
              <button
                onClick={() => setViewingDescChallenge(null)}
                className="premium-timeline-btn btn-secondary"
                style={{ height: '36px', padding: '0 1.5rem', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </TabContainer>
  );
};

// ==========================================
// 14.5 MANAGE SUPPORT DOCS MODAL
