import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Edit2,
  Check,
  Sparkles,
  Link,
  ChevronUp,
  ChevronDown,
  Pin
} from 'lucide-react';
import type {
  ProductItem,
  AdminCall
} from '../../types';
import {
  isTaskLinked,
  getPOCBadgeStyle,
  downloadCSV,
  exportAttendeeFeedbackToExcel,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToShortPattern,
  formatDateToUserPattern,
  getDateSpanStyle,
  isCompletedStatus
} from '../common/tableUtils';
import {
  CustomDatePicker,
  DateDiffBadge,
  AssignFeedbackModal,
  DiscussionTextArea,
  AIMeetingAssistantModal,
  MultiSelectDropdown,
  CategoryPillSelect,
  ProgramMultiSelectPill,
  FeedbackRatingCell,
  FeedbackDrawer
} from '../common/TableShared';

export const AdminCallsTable: React.FC = () => {
  const { 
    adminCalls, updateAdminCall, addAdminCall, deleteAdminCall, 
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers, statuses, currentUser, confirm,
    categories, programs, fetchPaginatedMeetingsData,
    meetingSearchQuery, setMeetingSearchQuery,
    highlightedCallId, setHighlightedCallId,
    feedbackSubmissions, formConfigs
  } = useDashboard();
  
  const speakersList = configSpeakers.map(s => s.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAiMeeting, setSelectedAiMeeting] = useState<{
    id: string;
    text: string;
    title: string;
    type: 'ama' | 'call' | 'tarun';
  } | null>(null);
  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);
  const [assignModalItem, setAssignModalItem] = useState<{ id: string; title: string; formId?: string; } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setFilterStatuses([]);
    setFilterCategories([]);
    setFilterPrograms([]);
    setFilterPocs([]);
    setCurrentPage(1);
  }, [subTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSuperPriorityOnly, filterStatuses, filterCategories, filterPrograms, filterPocs]);

  useEffect(() => {
    if (filterCategories.length === 0) return;
    const validPrograms = new Set(programs
      .filter(program => filterCategories.includes(
        program.categoryId
          ? categories.find(category => category.id === program.categoryId)?.name || ''
          : 'Uncategorized / Existing'
      ))
      .map(program => program.name));
    setFilterPrograms(previous => {
      const next = previous.filter(program => validPrograms.has(program));
      return next.length === previous.length ? previous : next;
    });
  }, [filterCategories, categories, programs]);

  // Sorting states
  const [callSortField, setCallSortField] = useState<keyof AdminCall | null>('date');
  const [callSortAsc, setCallSortAsc] = useState(false);

  const [feedbackSortField, setFeedbackSortField] = useState<keyof ProductItem | 'callDate' | 'callPoc' | 'callTopic' | null>(null);
  const [feedbackSortAsc, setFeedbackSortAsc] = useState(true);

  const handleCallSort = (field: keyof AdminCall) => {
    if (callSortField === field) {
      setCallSortAsc(!callSortAsc);
    } else {
      setCallSortField(field);
      setCallSortAsc(true);
    }
  };

  const handleFeedbackSort = (field: typeof feedbackSortField) => {
    if (feedbackSortField === field) {
      setFeedbackSortAsc(!feedbackSortAsc);
    } else {
      setFeedbackSortField(field);
      setFeedbackSortAsc(true);
    }
  };

  const statusOptions = statuses.map(s => s.label).length > 0 ? statuses.map(s => s.label) : ['Scheduled', 'Pending Actions', 'Completed', 'On Hold', 'In Progress', 'Ongoing'];

  const resolveCallPrograms = (call: AdminCall) => {
    const ids = (call.programId || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      const matched = programs.filter(p => ids.includes(p.id));
      if (matched.length > 0) return matched;
    }
    const names = (call.program || '').split(',').map(s => s.trim()).filter(Boolean);
    if (names.length > 0) {
      const matched = programs.filter(p => names.includes(p.name));
      if (matched.length > 0) return matched;
    }
    return [];
  };
  const resolveCallProgram = (call: AdminCall) => resolveCallPrograms(call)[0] || null;
  const resolveCallCategoryId = (call: AdminCall) => call.categoryId || resolveCallProgram(call)?.categoryId || '';
  const resolveCallCategorySelection = (call: AdminCall) => resolveCallCategoryId(call) || '__uncategorized__';
  const resolveCallCategoryName = (call: AdminCall) => categories.find(c => c.id === resolveCallCategoryId(call))?.name || 'Uncategorized / Existing';

  // Inline editing states for Admin Calls
  const [editingCallDateId, setEditingCallDateId] = useState<string | null>(null);

  const [editingCallPocId, setEditingCallPocId] = useState<string | null>(null);
  const [inlineCallPocValue, setInlineCallPocValue] = useState('');

  const [editingCallTopicId, setEditingCallTopicId] = useState<string | null>(null);
  const [inlineCallTopicValue, setInlineCallTopicValue] = useState('');
  const editCallTopicInputRef = useRef<HTMLInputElement>(null);

  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Related features state
  const [editingCallRelatedId, setEditingCallRelatedId] = useState<string | null>(null);
  const [inlineCallRelatedValue, setInlineCallRelatedValue] = useState('');
  const editCallRelatedInputRef = useRef<HTMLInputElement>(null);

  // Inline editing states for Feedback tab
  const [editingFeedbackFeatureId, setEditingFeedbackFeatureId] = useState<string | null>(null);
  const [inlineFeedbackFeatureValue, setInlineFeedbackFeatureValue] = useState('');
  const editFeedbackFeatureInputRef = useRef<HTMLInputElement>(null);

  const [editingFeedbackDateId, setEditingFeedbackDateId] = useState<string | null>(null);
  const [inlineFeedbackDateValue, setInlineFeedbackDateValue] = useState('');
  const editFeedbackDateInputRef = useRef<HTMLInputElement>(null);

  const [editingFeedbackPocId, setEditingFeedbackPocId] = useState<string | null>(null);
  const [inlineFeedbackPocValue, setInlineFeedbackPocValue] = useState('');

  const [editingFeedbackTopicId, setEditingFeedbackTopicId] = useState<string | null>(null);
  const [inlineFeedbackTopicValue, setInlineFeedbackTopicValue] = useState('');
  const editFeedbackTopicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCallTopicId && editCallTopicInputRef.current) {
      editCallTopicInputRef.current.focus();
      editCallTopicInputRef.current.select();
    }
  }, [editingCallTopicId]);



  useEffect(() => {
    if (editingCallRelatedId && editCallRelatedInputRef.current) {
      editCallRelatedInputRef.current.focus();
      editCallRelatedInputRef.current.select();
    }
  }, [editingCallRelatedId]);

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
    if (editingFeedbackTopicId && editFeedbackTopicInputRef.current) {
      editFeedbackTopicInputRef.current.focus();
      editFeedbackTopicInputRef.current.select();
    }
  }, [editingFeedbackTopicId]);

  const getRelatedFeatures = (call: AdminCall) => {
    const matchesId = productItems.filter(item => 
      !item.id.startsWith('prod-temp-') && 
      item.notes && 
      item.notes.includes(`Admin Call ID: ${call.id}`)
    );
    return filterSuperPriorityOnly ? matchesId.filter(feat => feat.raisedByTarunSir) : matchesId;
  };

  const getParentCall = (item: ProductItem): AdminCall | undefined => {
    if (item.notes && item.notes.includes('Admin Call ID:')) {
      const match = item.notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
      if (match && match[1]) {
        return adminCalls.find(call => call.id === match[1]);
      }
    }
    // AMA features (prod-ama-) should never be matched to an Admin Call
    if (item.id.startsWith('prod-ama-')) return undefined;
    return undefined;
  };

  const [paginatedCalls, setPaginatedCalls] = useState<AdminCall[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (meetingSearchQuery) {
      setSearchQuery(meetingSearchQuery);
      setMeetingSearchQuery('');
    }
  }, [meetingSearchQuery, setMeetingSearchQuery]);

  useEffect(() => {
    if (highlightedCallId && paginatedCalls.length > 0) {
      const hasItem = paginatedCalls.some(call => call.id === highlightedCallId);
      if (hasItem) {
        setExpandedCallId(highlightedCallId);
        setHighlightedCallId(null);
        setTimeout(() => {
          const el = document.getElementById(`call-row-${highlightedCallId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => {
              el.classList.remove('highlight-pulse');
            }, 3000);
          }
        }, 150);
      }
    }
  }, [highlightedCallId, paginatedCalls, setHighlightedCallId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'adminCalls',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: callSortField || undefined,
        sortAsc: callSortAsc
      });
      if (active) {
        if (res.success) {
          setPaginatedCalls(res.data);
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
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    callSortField,
    callSortAsc,
    adminCalls,
    fetchPaginatedMeetingsData
  ]);

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const handleAddNew = () => {
    setSearchQuery('');
    const newCall: AdminCall = {
      id: `adm-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      adminPoc: currentUser?.name || (speakersList.length > 0 ? speakersList[0] : 'Akash Sharma'),
      cohortTopic: 'New Admin Call',
      discussion: '',
      actions: '',
      status: 'Scheduled',
      categoryId: categories.find(c => c.active !== false)?.id || '',
      programId: '',
      program: ''
    };
    addAdminCall(newCall);
    setInlineCallTopicValue('New Admin Call');
    setEditingCallTopicId(newCall.id);
    setExpandedCallId(newCall.id);
  };

  const [paginatedFeedbackFeatures, setPaginatedFeedbackFeatures] = useState<ProductItem[]>([]);
  const [feedbackTotalItems, setFeedbackTotalItems] = useState(0);
  const [feedbackCompletedItems, setFeedbackCompletedItems] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (subTab === 'feedback') {
        setIsFetchingFeedback(true);
      }
      const res = await fetchPaginatedMeetingsData({
        type: 'adminFeedback',
        page: subTab === 'feedback' ? currentPage : 1,
        limit: subTab === 'feedback' ? pageSize : 1,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: feedbackSortField || undefined,
        sortAsc: feedbackSortAsc
      });
      if (active) {
        if (res.success) {
          if (subTab === 'feedback') {
            setPaginatedFeedbackFeatures(res.data);
            setFeedbackTotalPages(res.totalPages);
          }
          setFeedbackTotalItems(res.totalItems);
          setFeedbackCompletedItems(res.completedItems || 0);
        }
        if (subTab === 'feedback') {
          setIsFetchingFeedback(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    subTab,
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    feedbackSortField,
    feedbackSortAsc,
    productItems,
    fetchPaginatedMeetingsData
  ]);

  const feedbackActivePage = Math.min(currentPage, feedbackTotalPages);
  const feedbackStartIndex = feedbackTotalItems === 0 ? 0 : (feedbackActivePage - 1) * pageSize;
  const feedbackEndIndex = Math.min(feedbackStartIndex + pageSize, feedbackTotalItems);

  return (
    <>
      <TabContainer
        title="Admin Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add Call' : undefined}
        onExportFeedbackCSV={() => {
          exportAttendeeFeedbackToExcel('admin-calls', feedbackSubmissions, formConfigs, adminCalls);
        }}
        onExportCSV={() => {
          if (subTab === 'schedule') {
            const headers = ['ID', 'Date', 'Admin POC', 'Category', 'Program', 'Topic / Agenda', 'Status', 'Discussion', 'Actions'];
            const rows = adminCalls.map(c => [c.id, c.date, c.adminPoc, resolveCallCategoryName(c), resolveCallProgram(c)?.name || c.program || '', c.cohortTopic, c.status, c.discussion, c.actions]);
            downloadCSV(`Admin_Calls_Schedule_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
          } else {
            const headers = ['ID', 'Feature', 'POC', 'Status', 'Clickup Status', 'Priority', 'Blocker', 'Notes', 'Deadline'];
            const rows = productItems.map(p => [p.id, p.feature, p.poc || '', p.status, p.clickupStatus || '', p.priority || '', p.blocker || '', p.notes || '', p.deadline || '']);
            downloadCSV(`Admin_Calls_Feedback_Requests_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
          }
        }}
        searchPlaceholder={subTab === 'schedule' ? 'Search admin calls...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <MultiSelectDropdown
              options={[
                ...categories.filter(c => c.active !== false).map(c => c.name),
                'Uncategorized / Existing'
              ]}
              selectedValues={filterCategories}
              onChange={setFilterCategories}
              placeholder="Category"
            />
            <MultiSelectDropdown
              options={programs.filter(p => filterCategories.length === 0 || filterCategories.includes(
                p.categoryId ? categories.find(c => c.id === p.categoryId)?.name || '' : 'Uncategorized / Existing'
              )).map(p => p.name)}
              selectedValues={filterPrograms}
              onChange={setFilterPrograms}
              placeholder="Program"
            />
            <MultiSelectDropdown
              options={speakersList}
              selectedValues={filterPocs}
              onChange={setFilterPocs}
              placeholder="Feature POC"
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
              setEditingFeedbackDateId(null);
              setEditingFeedbackPocId(null);
              setEditingFeedbackTopicId(null);
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
              setEditingFeedbackDateId(null);
              setEditingFeedbackPocId(null);
              setEditingFeedbackTopicId(null);
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
            Feedback {feedbackTotalItems > 0 ? `(${feedbackCompletedItems}/${feedbackTotalItems})` : ''}
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleCallSort('date')} style={{ width: '150px', cursor: 'pointer' }}>Call Date {callSortField === 'date' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('adminPoc')} style={{ width: '200px', cursor: 'pointer' }}>Admin / POC {callSortField === 'adminPoc' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('categoryId')} style={{ width: '150px', cursor: 'pointer' }}>Category {callSortField === 'categoryId' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('programId')} style={{ width: '150px', cursor: 'pointer' }}>Program {callSortField === 'programId' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('cohortTopic')} style={{ cursor: 'pointer' }}>Topic / Call Agenda {callSortField === 'cohortTopic' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('status')} style={{ width: '150px', cursor: 'pointer' }}>Status {callSortField === 'status' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '120px' }}>Rating</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '120px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '90%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '50px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '50px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No admin calls found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedCalls.map(call => {
                  const related = getRelatedFeatures(call);
                  const isExpanded = expandedCallId === call.id;
                  
                  return (
                    <React.Fragment key={call.id}>
                      <tr 
                        id={`call-row-${call.id}`}
                        onClick={() => setExpandedCallId(isExpanded ? null : call.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : (call.pinned ? 'var(--primary-glow)' : 'transparent'),
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCallDateId(call.id);
                          }}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          title="Click to edit Date"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {call.pinned && (
                              <Pin size={12} style={{ marginRight: '6px', color: 'var(--primary)', fill: 'var(--primary)', flexShrink: 0 }} />
                            )}
                            <span style={{ borderBottom: '1px dashed var(--text-muted)' }}>
                              {call.date ? formatDateToShortPattern(call.date) : 'Set Date'}
                            </span>
                            {editingCallDateId === call.id && (
                              <CustomDatePicker
                                value={call.date || ''}
                                onChange={(date) => updateAdminCall(call.id, { date })}
                                onClose={() => setEditingCallDateId(null)}
                              />
                            )}
                          </div>
                        </td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCallPocId(call.id);
                            setInlineCallPocValue(call.adminPoc);
                          }}
                          title="Click to edit POC"
                        >
                          {editingCallPocId === call.id ? (
                            <select
                              autoFocus
                              value={inlineCallPocValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineCallPocValue(val);
                                updateAdminCall(call.id, { adminPoc: val });
                                setEditingCallPocId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setEditingCallPocId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingCallPocId(null);
                                }
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
                                cursor: 'pointer',
                              }}
                            >
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineCallPocValue && !speakersList.includes(inlineCallPocValue) && (
                                <option value={inlineCallPocValue}>{inlineCallPocValue}</option>
                              )}
                            </select>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{call.adminPoc}</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                          {(() => {
                            const selectedCat = resolveCallCategorySelection(call);
                            return (
                              <CategoryPillSelect
                                value={selectedCat}
                                categories={categories}
                                onChange={(newCatId) => updateAdminCall(call.id, {
                                  categoryId: newCatId === '__uncategorized__' ? '' : newCatId,
                                  programId: '',
                                  program: ''
                                })}
                              />
                            );
                          })()}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                          {(() => {
                            const selectedCat = resolveCallCategorySelection(call);
                            return (
                              <ProgramMultiSelectPill
                                programIds={call.programId || ''}
                                programNames={call.program || ''}
                                programs={programs}
                                categoryId={selectedCat}
                                disabled={!selectedCat}
                                onChange={(newIds, newNames) => updateAdminCall(call.id, {
                                  programId: newIds,
                                  program: newNames
                                })}
                              />
                            );
                          })()}
                        </td>
                        <td
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCallTopicId(call.id);
                            setInlineCallTopicValue(call.cohortTopic);
                          }}
                          style={{ fontWeight: 500 }}
                          title="Double click to edit Topic"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                            {editingCallTopicId === call.id ? (
                              <input
                                ref={editCallTopicInputRef}
                                type="text"
                                value={inlineCallTopicValue}
                                onChange={(e) => setInlineCallTopicValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineCallTopicValue.trim() || 'New Call Topic';
                                    updateAdminCall(call.id, { cohortTopic: finalVal });
                                    setEditingCallTopicId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingCallTopicId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineCallTopicValue.trim() || 'New Call Topic';
                                  updateAdminCall(call.id, { cohortTopic: finalVal });
                                  setEditingCallTopicId(null);
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
                                <span>{call.cohortTopic || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>

                                {related.length > 0 && (() => {
                                  const doneCount = related.filter(feat => feat.finalReleaseCompleted || isCompletedStatus(feat.status)).length;
                                  const clickupCount = related.filter(feat => !!feat.taskLink).length;
                                  const isAllDone = doneCount === related.length;
                                  const isAllClickup = clickupCount === related.length;
                                  return (
                                    <>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--primary-glow)', 
                                        color: isAllDone ? '#10b981' : 'var(--primary)', 
                                        border: isAllDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--primary-border)',
                                        fontWeight: 500
                                      }}>
                                        {doneCount}/{related.length} {related.length === 1 ? 'feature' : 'features'}
                                      </span>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllClickup ? 'rgba(16, 185, 129, 0.08)' : 'rgba(123, 97, 255, 0.08)', 
                                        color: isAllClickup ? '#10b981' : '#7b61ff', 
                                        border: isAllClickup ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(123, 97, 255, 0.25)',
                                        fontWeight: 500
                                      }}>
                                        {clickupCount}/{related.length} on ClickUp
                                      </span>
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            value={call.status || 'Scheduled'}
                            onChange={(e) => updateAdminCall(call.id, { status: e.target.value as any })}
                            onClick={(e) => e.stopPropagation()}
                            className={`badge ${
                              call.status === 'Completed' ? 'status-completed' :
                              call.status === 'Pending Actions' ? 'status-hold' : 'status-progress'
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
                            <option value="Pending Actions" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Pending Actions</option>
                          </select>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <FeedbackRatingCell 
                            itemId={call.id} 
                            category="admin-calls" 
                            onCellClick={(id, cat) => {
                              setDrawerItemId(id);
                              setDrawerCategory(cat);
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                updateAdminCall(call.id, { pinned: !call.pinned });
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: call.pinned ? 'var(--primary)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title={call.pinned ? "Unpin Row" : "Pin Row"}
                            >
                              <Pin size={12} style={{ transform: call.pinned ? 'none' : 'rotate(45deg)' }} />
                            </button>
                            {(() => {
                              const callForm = call.feedbackFormId ? formConfigs.find(f => f.id === call.feedbackFormId) : null;
                              const tip = copiedId === call.id 
                                ? "Link Copied!" 
                                : (callForm ? `Feedback Form: "${callForm.title || callForm.id}" (Click to copy link)` : (call.feedbackFormId ? "Copy Feedback Link" : "Assign Form & Copy Link"));
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (call.feedbackFormId) {
                                      const link = `${window.location.origin}/?feedback=${call.id}&category=admin-calls&formId=${call.feedbackFormId}`;
                                      navigator.clipboard.writeText(link).then(() => {
                                        setCopiedId(call.id);
                                        setTimeout(() => setCopiedId(null), 2000);
                                      });
                                    } else {
                                      setAssignModalItem({
                                        id: call.id,
                                        title: call.cohortTopic || call.adminPoc || 'Admin Call',
                                        formId: call.feedbackFormId
                                      });
                                    }
                                  }}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: copiedId === call.id ? 'var(--success)' : (call.feedbackFormId ? 'var(--primary)' : 'var(--text-secondary)'), 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    padding: '4px'
                                  }}
                                  title={tip}
                                >
                                  {copiedId === call.id ? <Check size={12} /> : <Link size={12} />}
                                </button>
                              );
                            })()}
                            <button 
                              onClick={() => {
                                setEditingCallTopicId(call.id);
                                setInlineCallTopicValue(call.cohortTopic);
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
                              onClick={async () => {
                                if (await confirm("Are you sure you want to delete this Call?", "Delete Call")) {
                                  deleteAdminCall(call.id);
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
                              title="Delete Call"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Expansion */}
                      {isExpanded && (
                        <tr style={{ background: 'var(--background)' }}>
                          <td colSpan={8} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '1.25rem',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1.25rem'
                            }}>
                              {/* Top Split: Discussion & Actions */}
                              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Attendees / Discussion</label>
                                    {call.discussion && call.discussion.trim() && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAiMeeting({
                                            id: call.id,
                                            text: call.discussion,
                                            title: call.cohortTopic || 'Admin Call',
                                            type: 'call'
                                          });
                                        }}
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '0.7rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(99,102,241,0.08)',
                                          border: '1px solid rgba(99,102,241,0.25)',
                                          color: 'var(--primary)',
                                          cursor: 'pointer',
                                          borderRadius: '4px',
                                          fontWeight: 600,
                                          transition: 'all 0.15s ease'
                                        }}
                                        title="Summarize meeting and extract feature requests using AI"
                                      >
                                        <Sparkles size={10} /> Summarize & Extract
                                      </button>
                                    )}
                                  </div>
                                  <DiscussionTextArea
                                    initialValue={call.discussion || ''}
                                    onSave={(val) => updateAdminCall(call.id, { discussion: val })}
                                    placeholder="Enter discussion details..."
                                    style={{
                                      width: '100%',
                                      minHeight: '80px',
                                      padding: '8px 10px',
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.8rem',
                                      fontFamily: 'inherit',
                                      resize: 'none',
                                      overflowY: 'hidden',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                              </div>

                              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

                              {/* Bottom Section: Related Features table */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Related Feature Requests</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newItem: ProductItem = {
                                        id: `prod-call-${Date.now()}`,
                                        feature: '',
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
                                        notes: `Admin Call ID: ${call.id} | Admin Call: ${call.cohortTopic || ''}`,
                                        product: '',
                                        module: '',
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: '',
                                        createdAt: new Date().toISOString()
                                      };
                                      addProductItem(newItem);
                                      setInlineCallRelatedValue('');
                                      setTimeout(() => {
                                        setPreviewProductId(newItem.id);
                                      }, 50);
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
                                           <th style={{ width: '120px' }}>Status</th>
                                          <th style={{ width: '120px' }}>POC</th>
                                          <th style={{ width: '100px' }}>ClickUp</th>
                                          <th style={{ width: '120px' }}>Specs Date</th>
                                          <th style={{ width: '120px' }}>UI/UX Date</th>
                                          <th style={{ width: '120px' }}>Dev Date</th>
                                          <th style={{ width: '120px' }}>Release Date ({related.filter(feat => !!feat.finalReleaseCompleted).length}/{related.length})</th>
                                          <th style={{ width: '40px' }}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {related.map(feat => (
                                          <tr 
                                            key={feat.id} 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (editingCallRelatedId !== feat.id) {
                                                setPreviewProductId(feat.id);
                                              }
                                            }} 
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>
                                              {editingCallRelatedId === feat.id ? (
                                                <input
                                                  ref={editCallRelatedInputRef}
                                                  type="text"
                                                  value={inlineCallRelatedValue}
                                                  onChange={(e) => setInlineCallRelatedValue(e.target.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      const finalVal = inlineCallRelatedValue.trim() || 'New Feature';
                                                      updateProductItem(feat.id, { feature: finalVal });
                                                      setEditingCallRelatedId(null);
                                                    } else if (e.key === 'Escape') {
                                                      e.preventDefault();
                                                      setEditingCallRelatedId(null);
                                                    }
                                                  }}
                                                  onBlur={() => {
                                                    const finalVal = inlineCallRelatedValue.trim() || 'New Feature';
                                                    updateProductItem(feat.id, { feature: finalVal });
                                                    setEditingCallRelatedId(null);
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
                                                  {feat.priority && (
                                                    <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                                      {feat.priority}
                                                    </span>
                                                  )}
                                                  {feat.raisedByTarunSir && (
                                                    <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                      <Sparkles size={8} /> Super Priority
                                                    </span>
                                                  )}
                                                  {isTaskLinked(feat.notes, feat.id) && (
                                                    <span className="badge-linked" style={{ padding: '2px 6px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 650 }}>
                                                      <Link size={8} /> Linked
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                            <td>{feat.product || '—'}</td>
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
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                {feat.poc ? (
                                                    <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                                        {feat.poc}
                                                    </span>
                                                ) : '—'}
                                                {feat.clickupAssignee && (
                                                  <div className="cu-tooltip-container">
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                                      CU: {formatClickupAssignee(feat.clickupAssignee)}
                                                    </span>
                                                    <span className="cu-tooltip-text">
                                                      {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td>
                                              {feat.clickupStatus ? (
                                                <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                  {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                                              {feat.productDeadline ? (
                                                <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.productDeadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                                              {feat.uiux ? (
                                                <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                  {formatDateToUserPattern(feat.uiux)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                                              {feat.deadline ? (
                                                <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.deadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                                              {feat.finalRelease ? (
                                                <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                  {formatDateToUserPattern(feat.finalRelease)}
                                                </span>
                                              ) : feat.finalReleaseCompleted ? (
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
                                              <button 
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
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
                                    <span style={{ fontSize: '0.8rem' }}>No associated feature requests found for this discussion.</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newItem: ProductItem = {
                                          id: `prod-call-${Date.now()}`,
                                          feature: 'New Feature Request',
                                          description: '',
                                          tarunSirApproval: false,
                                          raisedByTarunSir: false,
                                          priority: 'P2',
                                          poc: currentUser?.name || 'Akash Sharma',
                                          status: '',
                                          clickupStatus: '',
                                          taskLink: '',
                                          blocker: '',
                                          deadline: '',
                                          notes: `Admin Call ID: ${call.id} | Admin Call: ${call.cohortTopic || ''}`,
                                          product: '',
                                          module: '',
                                          uiux: '',
                                          finalRelease: '',
                                          productDeadline: '',
                                          createdAt: new Date().toISOString()
                                        };
                                        addProductItem(newItem);
                                        setInlineCallRelatedValue('');
                                        setTimeout(() => {
                                          setPreviewProductId(newItem.id);
                                        }, 50);
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                    >
                                      Create one now
                                    </button>
                                  </div>
                                )}
                              </div>
                              

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
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
                <div>
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startIndex + 1}</span> to{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> meetings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Rows per page:</span>
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
                      disabled={activePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === 1 ? 0.5 : 1, cursor: activePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {activePage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === totalPages ? 0.5 : 1, cursor: activePage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature / Call Agenda {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callDate')} style={{ width: '150px', cursor: 'pointer' }}>Call Date {feedbackSortField === 'callDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callPoc')} style={{ width: '180px', cursor: 'pointer' }}>Admin / POC {feedbackSortField === 'callPoc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                    Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetchingFeedback ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedFeedbackFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No feedback features found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbackFeatures.map(feat => {
                  const parentCall = getParentCall(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      className={feat.blocker ? 'row-blocked' : ''}
                      onClick={() => {
                        if (
                          editingFeedbackFeatureId !== feat.id &&
                          editingFeedbackDateId !== feat.id &&
                          editingFeedbackPocId !== feat.id &&
                          editingFeedbackTopicId !== feat.id
                        ) {
                          setPreviewProductId(feat.id);
                        }
                      }} 
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem', width: '100%' }}>
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
                              title="Double click to edit Feature Name"
                            >
                              {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                            </div>
                          )}

                          {parentCall ? (
                            editingFeedbackTopicId === feat.id ? (
                              <input
                                ref={editFeedbackTopicInputRef}
                                type="text"
                                value={inlineFeedbackTopicValue}
                                onChange={(e) => setInlineFeedbackTopicValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineFeedbackTopicValue.trim() || 'New Topic';
                                    updateAdminCall(parentCall.id, { cohortTopic: finalVal });
                                    setEditingFeedbackTopicId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingFeedbackTopicId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineFeedbackTopicValue.trim() || 'New Topic';
                                  updateAdminCall(parentCall.id, { cohortTopic: finalVal });
                                  setEditingFeedbackTopicId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.75rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <div
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFeedbackTopicId(feat.id);
                                  setInlineFeedbackTopicValue(parentCall.cohortTopic || '');
                                }}
                                style={{ 
                                  width: '100%', 
                                  cursor: 'pointer', 
                                  fontSize: '0.7rem', 
                                  color: 'var(--text-muted)', 
                                  fontWeight: 500,
                                  lineHeight: '1.2' 
                                }}
                                title="Double click to edit Call Agenda"
                              >
                                Call Agenda: {parentCall.cohortTopic || '—'}
                              </div>
                            )
                          ) : (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              Call Agenda: —
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {feat.priority && (
                              <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                {feat.priority}
                              </span>
                            )}
                            {feat.raisedByTarunSir && (
                              <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Sparkles size={10} /> Super Priority
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentCall) return;
                          e.stopPropagation();
                          setEditingFeedbackDateId(feat.id);
                          setInlineFeedbackDateValue(parentCall.date);
                        }}
                        title={parentCall ? "Double click to edit Date" : undefined}
                      >
                        {parentCall ? (
                          editingFeedbackDateId === feat.id ? (
                            <input
                              ref={editFeedbackDateInputRef}
                              type="date"
                              value={inlineFeedbackDateValue}
                              onChange={(e) => setInlineFeedbackDateValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    updateAdminCall(parentCall.id, { date: inlineFeedbackDateValue });
                                    setEditingFeedbackDateId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingFeedbackDateId(null);
                                  }
                              }}
                              onBlur={() => {
                                  updateAdminCall(parentCall.id, { date: inlineFeedbackDateValue });
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
                            formatDateToUserPattern(parentCall.date)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onClick={(e) => {
                          if (!parentCall) return;
                          e.stopPropagation();
                          setEditingFeedbackPocId(feat.id);
                          setInlineFeedbackPocValue(parentCall.adminPoc || '');
                        }}
                        title={parentCall ? "Click to edit POC" : undefined}
                      >
                        {parentCall ? (
                          editingFeedbackPocId === feat.id ? (
                            <select
                              autoFocus
                              value={inlineFeedbackPocValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineFeedbackPocValue(val);
                                updateAdminCall(parentCall.id, { adminPoc: val });
                                setEditingFeedbackPocId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackPocId(null);
                                }
                              }}
                              onBlur={() => setEditingFeedbackPocId(null)}
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
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineFeedbackPocValue && !speakersList.includes(inlineFeedbackPocValue) && (
                                <option value={inlineFeedbackPocValue}>{inlineFeedbackPocValue}</option>
                              )}
                            </select>
                          ) : (
                            parentCall.adminPoc || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{feat.product || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {feat.poc ? (
                              <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                  {feat.poc}
                              </span>
                          ) : '—'}
                          {feat.clickupAssignee && (
                            <div className="cu-tooltip-container">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                CU: {formatClickupAssignee(feat.clickupAssignee)}
                              </span>
                              <span className="cu-tooltip-text">
                                {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                              </span>
                            </div>
                          )}
                        </div>
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
                      <td>
                        {feat.clickupStatus ? (
                          <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                            {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                          <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                            {formatDateToUserPattern(feat.finalRelease)}
                          </span>
                        ) : feat.finalReleaseCompleted ? (
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
                          <button 
                            onClick={async () => {
                              if (await confirm("Are you sure you want to delete this feedback feature?", "Delete Feedback Feature")) {
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls for Feedback */}
            {feedbackTotalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--panel-bg)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {feedbackStartIndex + 1} to {feedbackEndIndex} of {feedbackTotalItems} entries
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
                      disabled={feedbackActivePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === 1 ? 0.5 : 1, cursor: feedbackActivePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {feedbackActivePage} of {feedbackTotalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, feedbackTotalPages))}
                      disabled={feedbackActivePage === feedbackTotalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === feedbackTotalPages ? 0.5 : 1, cursor: feedbackActivePage === feedbackTotalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </TabContainer>
      <FeedbackDrawer
        itemId={drawerItemId}
        category={drawerCategory}
        onClose={() => {
          setDrawerItemId(null);
          setDrawerCategory(null);
        }}
      />
      {selectedAiMeeting && (
        <AIMeetingAssistantModal
          isOpen={!!selectedAiMeeting}
          onClose={() => setSelectedAiMeeting(null)}
          meetingId={selectedAiMeeting.id}
          meetingText={selectedAiMeeting.text}
          meetingTitle={selectedAiMeeting.title}
          meetingType={selectedAiMeeting.type}
          onApplySummary={(sum) => {
            updateAdminCall(selectedAiMeeting.id, { discussion: sum });
          }}
        />
      )}
      {assignModalItem && (
        <AssignFeedbackModal
          isOpen={!!assignModalItem}
          onClose={() => setAssignModalItem(null)}
          itemId={assignModalItem.id}
          itemTitle={assignModalItem.title}
          category="admin-calls"
          currentFormId={assignModalItem.formId}
          onAssigned={(assignedFormId) => {
            const link = `${window.location.origin}/?feedback=${assignModalItem.id}&category=admin-calls&formId=${assignedFormId}`;
            navigator.clipboard.writeText(link).then(() => {
              setCopiedId(assignModalItem.id);
              setTimeout(() => setCopiedId(null), 2000);
            });
          }}
        />
      )}
    </>
  );
};
