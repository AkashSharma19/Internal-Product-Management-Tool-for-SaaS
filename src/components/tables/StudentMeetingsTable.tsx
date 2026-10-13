import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { TabContainer } from '../TabContainer';
import {
  Trash2,
  Edit2,
  X,
  Check,
  Sparkles,
  Link,
  ChevronUp,
  ChevronDown,
  Pin
} from 'lucide-react';
import type {
  ProductItem,
  AMASession,
  StudentMeeting
} from '../../types';
import {
  isTaskLinked,
  getPOCBadgeStyle,
  exportAttendeeFeedbackToExcel,
  getClickupBadgeStyle,
  formatClickupAssignee,
  formatDateToUserPattern,
  getDateSpanStyle,
  formatToDatetimeLocalValue,
  isCompletedStatus
} from '../common/tableUtils';
import {
  DateDiffBadge,
  AssignFeedbackModal,
  DiscussionTextArea,
  AIMeetingAssistantModal,
  MultiSelectDropdown,
  CategoryPillSelect,
  ProgramMultiSelectPill,
  CohortMultiSelectPill,
  FeedbackRatingCell,
  FeedbackDrawer
} from '../common/TableShared';

export interface StudentMeetingDetailModalProps {
  item: StudentMeeting;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<StudentMeeting>) => void;
}

export const StudentMeetingDetailModal: React.FC<StudentMeetingDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const { canUserEdit } = useDashboard();
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
          <h3 className="modal-title" style={{ fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", color: 'var(--primary)' }}>
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
              {canUserEdit && <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const StudentMeetingsTable: React.FC = () => {
  const { 
    amaSessions, addAMASession, updateAMASession, deleteAMASession,
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers, statuses, currentUser, confirm,
    categories, programs: configPrograms, cohorts: configCohorts, fetchPaginatedMeetingsData,
    meetingSearchQuery, setMeetingSearchQuery,
    highlightedCallId, setHighlightedCallId,
    feedbackSubmissions, formConfigs
  } = useDashboard();

  // Derive speakers list from configuration context (live — updates when Config tab changes)
  const speakersList = (configSpeakers || []).map(s => s.name);

  // Dynamic Programs list derived from configuration
  const programsList = useMemo(() => {
    const list = (configPrograms || []).map(p => p.name).filter(Boolean);
    if (list.length === 0) return ['UG', 'PGP', 'YLC', 'All'];
    return list;
  }, [configPrograms]);

  // Dynamic programCohortsMap derived from configuration
  const programCohortsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    const programIdToName: Record<string, string> = {};
    (configPrograms || []).forEach(p => {
      programIdToName[p.id] = p.name;
      map[p.name] = [];
    });

    (configCohorts || []).forEach(c => {
      if (c.active !== false && c.name) {
        const progName = programIdToName[c.programId] || c.programId;
        if (progName) {
          if (!map[progName]) map[progName] = [];
          if (!map[progName].includes(c.name)) map[progName].push(c.name);
        }
      }
    });

    if (Object.keys(map).length === 0) {
      return {
        'UG': ['UG-27,28,29', 'UGTBM 1', 'UGTBM 2', 'UG-DSAI-2029'],
        'PGP': ['PGP TBM', 'PGP-26', 'PGP-27'],
        'YLC': ['YLC 27', 'YLC 28'],
        'All': ['All Cohorts']
      };
    }
    return map;
  }, [configPrograms, configCohorts]);

  // All active standard cohorts list derived from configuration
  const allStandardCohorts = useMemo(() => {
    const list = (configCohorts || [])
      .filter(c => c.active !== false && c.name)
      .map(c => c.name);
    if (list.length === 0) {
      return ['UG-27,28,29', 'UGTBM 1', 'UGTBM 2', 'UG-DSAI-2029', 'PGP TBM', 'PGP-26', 'PGP-27', 'YLC 27', 'YLC 28', 'All Cohorts'];
    }
    return list;
  }, [configCohorts]);

  const getProgramForCohort = useCallback((cohortName: string): string => {
    for (const [prog, cohortList] of Object.entries(programCohortsMap)) {
      if (cohortList.includes(cohortName)) {
        return prog;
      }
    }
    const matchingCohort = (configCohorts || []).find(c => c.name === cohortName);
    if (matchingCohort) {
      const prog = (configPrograms || []).find(p => p.id === matchingCohort.programId);
      if (prog) return prog.name;
    }
    if (cohortName.startsWith('UG')) return 'UG';
    if (cohortName.startsWith('PGP')) return 'PGP';
    if (cohortName.startsWith('YLC')) return 'YLC';
    return programsList[0] || 'UG';
  }, [programCohortsMap, configCohorts, configPrograms, programsList]);

  // Resolvers for Category, Program, Cohort from Configuration
  const resolveAMAProgramId = useCallback((ama: AMASession) => {
    if (ama.programId) return ama.programId;
    if (ama.program) {
      const names = ama.program.split(',').map(s => s.trim()).filter(Boolean);
      const matchedIds = names.map(n => {
        const found = (configPrograms || []).find(p => p.name.toLowerCase() === n.toLowerCase() || p.id === n);
        return found ? found.id : '';
      }).filter(Boolean);
      if (matchedIds.length > 0) return matchedIds.join(', ');
    }
    const cohIds = (ama.cohortId || '').split(',').map(s => s.trim()).filter(Boolean);
    const cohNames = (ama.cohort || '').split(',').map(s => s.trim()).filter(Boolean);
    const cohProgs = new Set<string>();
    cohIds.forEach(cid => {
      const c = (configCohorts || []).find(ch => ch.id === cid);
      if (c?.programId) cohProgs.add(c.programId);
    });
    cohNames.forEach(cn => {
      const c = (configCohorts || []).find(ch => ch.name.toLowerCase() === cn.toLowerCase());
      if (c?.programId) cohProgs.add(c.programId);
    });
    if (cohProgs.size > 0) return Array.from(cohProgs).join(', ');
    return '';
  }, [configPrograms, configCohorts]);

  const resolveAMAProgramName = useCallback((ama: AMASession) => {
    if (ama.program) return ama.program;
    const pIds = (resolveAMAProgramId(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
    const names = pIds.map(id => (configPrograms || []).find(p => p.id === id)?.name).filter(Boolean);
    return names.join(', ');
  }, [resolveAMAProgramId, configPrograms]);

  const resolveAMACohortId = useCallback((ama: AMASession) => {
    if (ama.cohortId) return ama.cohortId;
    if (!ama.cohort) return '';
    // Resolve cohort names against configCohorts scoped to this meeting's program
    const progIds = (resolveAMAProgramId(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
    const candidateCohorts = progIds.length > 0
      ? (configCohorts || []).filter(c => progIds.includes(c.programId))
      : (configCohorts || []);
    const names = ama.cohort.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const matchedIds = candidateCohorts
      .filter(c => names.includes(c.name.toLowerCase()))
      .map(c => c.id);
    if (matchedIds.length > 0) return matchedIds.join(', ');
    const fallbackIds = (configCohorts || [])
      .filter(c => names.includes(c.name.toLowerCase()))
      .map(c => c.id);
    return fallbackIds.join(', ');
  }, [configCohorts, resolveAMAProgramId]);

  const resolveAMACohortName = useCallback((ama: AMASession) => {
    if (ama.cohort) return ama.cohort;
    const cohIds = (resolveAMACohortId(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
    if (cohIds.length === 0) return '';
    const names = cohIds
      .map(id => (configCohorts || []).find(c => c.id === id)?.name)
      .filter(Boolean);
    return names.join(', ');
  }, [resolveAMACohortId, configCohorts]);

  const resolveAMACategoryId = useCallback((ama: AMASession) => {
    if (ama.categoryId) return ama.categoryId;
    if (ama.category) {
      const matched = (categories || []).find(c => c.name === ama.category || c.id === ama.category);
      if (matched) return matched.id;
    }
    const progIds = (resolveAMAProgramId(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const pid of progIds) {
      const prog = (configPrograms || []).find(p => p.id === pid || p.name === pid);
      if (prog?.categoryId) return prog.categoryId;
    }
    const cohIds = (resolveAMACohortId(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const cid of cohIds) {
      const coh = (configCohorts || []).find(c => c.id === cid || c.name === cid);
      if (coh?.programId) {
        const cohProg = (configPrograms || []).find(p => p.id === coh.programId);
        if (cohProg?.categoryId) return cohProg.categoryId;
      }
    }
    return '';
  }, [categories, configPrograms, configCohorts, resolveAMAProgramId, resolveAMACohortId]);

  const resolveAMACategorySelection = useCallback((ama: AMASession) => {
    return resolveAMACategoryId(ama) || '__uncategorized__';
  }, [resolveAMACategoryId]);

  const resolveAMACategoryName = useCallback((ama: AMASession) => {
    if (ama.category) return ama.category;
    const catId = resolveAMACategoryId(ama);
    if (catId) {
      const cat = (categories || []).find(c => c.id === catId);
      if (cat) return cat.name;
    }
    const progName = resolveAMAProgramName(ama);
    if (progName) return 'Uncategorized / Existing';
    return '';
  }, [categories, resolveAMACategoryId, resolveAMAProgramName]);

  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterCohorts, setFilterCohorts] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);
  const [assignModalItem, setAssignModalItem] = useState<{ id: string; title: string; formId?: string; } | null>(null);
  const [selectedAiMeeting, setSelectedAiMeeting] = useState<{
    id: string;
    text: string;
    title: string;
    type: 'ama' | 'call' | 'tarun';
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setFilterStatuses([]);
    setFilterCategories([]);
    setFilterPrograms([]);
    setFilterCohorts([]);
    setFilterPocs([]);
    setCurrentPage(1);
  }, [subTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSuperPriorityOnly, filterStatuses, filterCategories, filterPrograms, filterCohorts, filterPocs]);

  // Sorting states
  const [amaSortField, setAmaSortField] = useState<keyof AMASession | null>('date');
  const [amaSortAsc, setAmaSortAsc] = useState(false);

  const [feedbackSortField, setFeedbackSortField] = useState<keyof ProductItem | 'amaDate' | 'amaProgram' | 'amaCohort' | 'amaSpeaker' | null>(null);
  const [feedbackSortAsc, setFeedbackSortAsc] = useState(true);

  const handleAmaSort = (field: keyof AMASession) => {
    if (amaSortField === field) {
      setAmaSortAsc(!amaSortAsc);
    } else {
      setAmaSortField(field);
      setAmaSortAsc(true);
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

  const statusOptions = statuses.map(s => s.label).length > 0 ? statuses.map(s => s.label) : ['Scheduled', 'Completed', 'Postponed', 'On Hold', 'In Progress', 'Ongoing'];

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


  // Accordion state for AMA sessions
  const [expandedAMAId, setExpandedAMAId] = useState<string | null>(null);

  // Inline editing state for related features in expanded AMA session
  const [editingRelatedFeatureId, setEditingRelatedFeatureId] = useState<string | null>(null);
  const [inlineRelatedFeatureValue, setInlineRelatedFeatureValue] = useState('');
  const editRelatedFeatureInputRef = useRef<HTMLInputElement>(null);

  const getRelatedFeatures = (ama: AMASession) => {
    const matchesId = productItems.filter(item => 
      !item.id.startsWith('prod-temp-') && 
      item.notes && 
      item.notes.includes(`AMA Session ID: ${ama.id}`)
    );
    if (filterSuperPriorityOnly) {
      return matchesId.filter(feat => feat.raisedByTarunSir);
    }
    return matchesId;
  };



  // Helper to find the parent AMA session for a feedback item
  const getParentAma = (item: ProductItem): AMASession | undefined => {
    if (item.notes && item.notes.includes('AMA Session ID:')) {
      const match = item.notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
      if (match && match[1]) {
        return amaSessions.find(ama => ama.id === match[1]);
      }
    }
    return undefined;
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

  const [paginatedAMASessions, setPaginatedAMASessions] = useState<AMASession[]>([]);
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
    if (highlightedCallId && paginatedAMASessions.length > 0) {
      const hasItem = paginatedAMASessions.some(ama => ama.id === highlightedCallId);
      if (hasItem) {
        setExpandedAMAId(highlightedCallId);
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
  }, [highlightedCallId, paginatedAMASessions, setHighlightedCallId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'amaSessions',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        categories: filterCategories,
        programs: filterPrograms,
        cohorts: filterCohorts,
        pocs: filterPocs,
        sortField: amaSortField || undefined,
        sortAsc: amaSortAsc
      });
      if (active) {
        if (res.success) {
          setPaginatedAMASessions(res.data);
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
    filterCategories,
    filterPrograms,
    filterCohorts,
    filterPocs,
    amaSortField,
    amaSortAsc,
    amaSessions,
    fetchPaginatedMeetingsData
  ]);

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
        type: 'amaFeedback',
        page: subTab === 'feedback' ? currentPage : 1,
        limit: subTab === 'feedback' ? pageSize : 1,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        categories: filterCategories,
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
    filterCategories,
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

  const handleAddNew = () => {
    setSearchQuery('');
    setAmaSortField(null);
    if (subTab === 'schedule') {
      const newAMA: AMASession = {
        id: `ama-${Date.now()}`,
        date: new Date().toISOString().slice(0, 16),
        topic: 'New AMA Session',
        speaker: '',
        cohort: '',
        cohortId: '',
        program: '',
        programId: '',
        category: '',
        categoryId: '',
        link: '',
        status: 'Scheduled',
        discussion: ''
      };
      addAMASession(newAMA);
      setInlineAMATopicValue('New AMA Session');
      setEditingAMATopicId(newAMA.id);
      setExpandedAMAId(newAMA.id);
    }
  };

  const filterCounts = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const programCounts: Record<string, number> = {};
    const cohortCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const pocCounts: Record<string, number> = {};

    if (subTab === 'schedule') {
      const list = (amaSessions && amaSessions.length > 0) ? amaSessions : paginatedAMASessions;
      list.forEach(ama => {
        const st = ama.status || 'Scheduled';
        statusCounts[st] = (statusCounts[st] || 0) + 1;

        if (ama.speaker) {
          pocCounts[ama.speaker] = (pocCounts[ama.speaker] || 0) + 1;
        }

        const catName = resolveAMACategoryName(ama);
        if (catName) {
          categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        }

        const progNames = (resolveAMAProgramName(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
        const seenProgs = new Set<string>();
        progNames.forEach(name => {
          const matched = (configPrograms || []).find(p => p.name.toLowerCase() === name.toLowerCase() || p.id === name);
          const stdName = matched ? matched.name : name;
          if (stdName && !seenProgs.has(stdName)) {
            seenProgs.add(stdName);
            programCounts[stdName] = (programCounts[stdName] || 0) + 1;
          }
        });

        const cohNames = (resolveAMACohortName(ama) || '').split(',').map(s => s.trim()).filter(Boolean);
        const seenCohs = new Set<string>();
        cohNames.forEach(name => {
          const matched = (configCohorts || []).find(c => c.name.toLowerCase() === name.toLowerCase() || c.id === name);
          const stdName = matched ? matched.name : name;
          if (stdName && !seenCohs.has(stdName)) {
            seenCohs.add(stdName);
            cohortCounts[stdName] = (cohortCounts[stdName] || 0) + 1;
          }
        });
      });
    } else {
      const list = paginatedFeedbackFeatures;
      list.forEach(feat => {
        const parent = getParentAma(feat);
        if (parent) {
          const catName = resolveAMACategoryName(parent);
          if (catName) {
            categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
          }
          const progNames = (resolveAMAProgramName(parent) || '').split(',').map(s => s.trim()).filter(Boolean);
          const seenProgs = new Set<string>();
          progNames.forEach(name => {
            const matched = (configPrograms || []).find(p => p.name.toLowerCase() === name.toLowerCase() || p.id === name);
            const stdName = matched ? matched.name : name;
            if (stdName && !seenProgs.has(stdName)) {
              seenProgs.add(stdName);
              programCounts[stdName] = (programCounts[stdName] || 0) + 1;
            }
          });
          const cohNames = (resolveAMACohortName(parent) || '').split(',').map(s => s.trim()).filter(Boolean);
          const seenCohs = new Set<string>();
          cohNames.forEach(name => {
            const matched = (configCohorts || []).find(c => c.name.toLowerCase() === name.toLowerCase() || c.id === name);
            const stdName = matched ? matched.name : name;
            if (stdName && !seenCohs.has(stdName)) {
              seenCohs.add(stdName);
              cohortCounts[stdName] = (cohortCounts[stdName] || 0) + 1;
            }
          });
        }
        if (feat.poc) {
          pocCounts[feat.poc] = (pocCounts[feat.poc] || 0) + 1;
        }
        if (feat.status) {
          statusCounts[feat.status] = (statusCounts[feat.status] || 0) + 1;
        }
      });
    }

    return { categoryCounts, programCounts, cohortCounts, statusCounts, pocCounts };
  }, [subTab, amaSessions, paginatedAMASessions, paginatedFeedbackFeatures, resolveAMACategoryName, resolveAMAProgramName, resolveAMACohortName, configPrograms, configCohorts]);

  return (
    <>
      <TabContainer
        title="Student Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add AMA' : undefined}
        onExportFeedbackCSV={() => {
          exportAttendeeFeedbackToExcel('ama-meetings', feedbackSubmissions, formConfigs, [], amaSessions);
        }}
        searchPlaceholder={subTab === 'schedule' ? 'Search AMA sessions...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
              counts={filterCounts.statusCounts}
            />
            <MultiSelectDropdown
              options={[
                ...categories.filter(c => c.active !== false).map(c => c.name),
                'Uncategorized / Existing'
              ]}
              selectedValues={filterCategories}
              onChange={setFilterCategories}
              placeholder="Category"
              counts={filterCounts.categoryCounts}
            />
            <MultiSelectDropdown
              options={configPrograms.filter(p => filterCategories.length === 0 || filterCategories.includes(
                p.categoryId ? categories.find(c => c.id === p.categoryId)?.name || '' : 'Uncategorized / Existing'
              )).map(p => p.name)}
              selectedValues={filterPrograms}
              onChange={setFilterPrograms}
              placeholder="Program"
              counts={filterCounts.programCounts}
            />
            <MultiSelectDropdown
              options={(() => {
                let available = configCohorts.filter(c => c.active !== false && c.name);
                if (filterPrograms.length > 0) {
                  const progIds = configPrograms.filter(p => filterPrograms.includes(p.name)).map(p => p.id);
                  available = available.filter(c => progIds.includes(c.programId));
                }
                return Array.from(new Set(available.map(c => c.name)));
              })()}
              selectedValues={filterCohorts}
              onChange={setFilterCohorts}
              placeholder="Cohort"
              counts={filterCounts.cohortCounts}
            />
            <MultiSelectDropdown
              options={speakersList}
              selectedValues={filterPocs}
              onChange={setFilterPocs}
              placeholder="Feature POC"
              counts={filterCounts.pocCounts}
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
            Feedback {feedbackTotalItems > 0 ? `(${feedbackCompletedItems}/${feedbackTotalItems})` : ''}
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleAmaSort('date')} style={{ width: '130px', cursor: 'pointer' }}>Date {amaSortField === 'date' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('topic')} style={{ cursor: 'pointer' }}>Topic / Theme {amaSortField === 'topic' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('speaker')} style={{ width: '190px', cursor: 'pointer' }}>Speaker(s) {amaSortField === 'speaker' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('categoryId' as any)} style={{ width: '140px', cursor: 'pointer' }}>Category {amaSortField === 'categoryId' || (amaSortField as any) === 'category' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('programId' as any)} style={{ width: '150px', cursor: 'pointer' }}>Program {amaSortField === 'programId' || (amaSortField as any) === 'program' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('cohort')} style={{ width: '140px', cursor: 'pointer' }}>Cohort {amaSortField === 'cohort' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {amaSortField === 'status' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '110px' }}>Rating</th>
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
                        <div className="skeleton-line" style={{ height: '14px', width: '90%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '110px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '85px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '95px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '85px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '50px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedAMASessions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No AMA sessions found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedAMASessions.map(ama => {
                  const related = getRelatedFeatures(ama);
                  const isExpanded = expandedAMAId === ama.id;
                  return (
                    <React.Fragment key={ama.id}>
                      <tr 
                        id={`call-row-${ama.id}`}
                        onClick={() => setExpandedAMAId(isExpanded ? null : ama.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : (ama.pinned ? 'var(--primary-glow)' : 'transparent'),
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
                            {ama.pinned && (
                              <Pin size={12} style={{ marginRight: '6px', color: 'var(--primary)', fill: 'var(--primary)', flexShrink: 0 }} />
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
                              <span>{formatDateToUserPattern(ama.date)}</span>
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
                            ama.speaker ? (
                              <span style={getPOCBadgeStyle(ama.speaker)}>
                                {ama.speaker}
                              </span>
                            ) : '—'
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                          {(() => {
                            const selectedCat = resolveAMACategorySelection(ama);
                            return (
                              <CategoryPillSelect
                                value={selectedCat}
                                categories={categories}
                                onChange={(newCatId) => {
                                  const catName = categories.find(c => c.id === newCatId)?.name || '';
                                  const isUncat = newCatId === '__uncategorized__';
                                  const currProgIds = (ama.programId || '').split(',').map(s => s.trim()).filter(Boolean);
                                  const matchingProgs = configPrograms.filter(p => currProgIds.includes(p.id) && (!newCatId || isUncat || p.categoryId === newCatId));
                                  const retainsPrograms = matchingProgs.length > 0;
                                  updateAMASession(ama.id, {
                                    categoryId: isUncat ? '' : newCatId,
                                    category: isUncat ? '' : catName,
                                    ...(!retainsPrograms && currProgIds.length > 0 ? { programId: '', program: '', cohortId: '', cohort: '' } : {})
                                  });
                                }}
                              />
                            );
                          })()}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                          {(() => {
                            const selectedCatId = resolveAMACategoryId(ama);
                            const progId = resolveAMAProgramId(ama);
                            const progName = resolveAMAProgramName(ama);
                            return (
                              <ProgramMultiSelectPill
                                programIds={progId}
                                programNames={progName}
                                programs={configPrograms}
                                categoryId={selectedCatId}
                                onChange={(newIds, newNames, inferredCatId) => {
                                  const updates: Partial<AMASession> = {
                                    programId: newIds,
                                    program: newNames
                                  };
                                  if (inferredCatId && !selectedCatId) {
                                    updates.categoryId = inferredCatId;
                                    const catObj = categories.find(c => c.id === inferredCatId);
                                    if (catObj) updates.category = catObj.name;
                                  }
                                  const newIdList = newIds.split(',').map(s => s.trim()).filter(Boolean);
                                  if (newIdList.length > 0 && ama.cohortId) {
                                    const currCohIds = ama.cohortId.split(',').map(s => s.trim()).filter(Boolean);
                                    const stillValidCohorts = configCohorts.filter(c => currCohIds.includes(c.id) && newIdList.includes(c.programId));
                                    updates.cohortId = stillValidCohorts.map(c => c.id).join(', ');
                                    updates.cohort = stillValidCohorts.map(c => c.name).join(', ');
                                  }
                                  updateAMASession(ama.id, updates);
                                }}
                              />
                            );
                          })()}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                          {(() => {
                            const progId = resolveAMAProgramId(ama);
                            const progName = resolveAMAProgramName(ama);
                            const resolvedCohId = resolveAMACohortId(ama);
                            const resolvedCohName = resolveAMACohortName(ama);
                            return (
                              <CohortMultiSelectPill
                                cohortIds={resolvedCohId}
                                cohortNames={resolvedCohName}
                                cohorts={configCohorts}
                                programIds={progId}
                                programNames={progName}
                                programs={configPrograms}
                                onChange={(newIds, newNames, inferredProgs) => {
                                  const updates: Partial<AMASession> = {
                                    cohortId: newIds,
                                    cohort: newNames
                                  };
                                  if ((!ama.programId && !ama.program) && inferredProgs && inferredProgs.length > 0) {
                                    updates.programId = inferredProgs.map(p => p.id).join(', ');
                                    updates.program = inferredProgs.map(p => p.name).join(', ');
                                    const firstCatId = inferredProgs.find(p => p.categoryId)?.categoryId;
                                    if (firstCatId && !ama.categoryId) {
                                      updates.categoryId = firstCatId;
                                      const catObj = categories.find(c => c.id === firstCatId);
                                      if (catObj) updates.category = catObj.name;
                                    }
                                  }
                                  updateAMASession(ama.id, updates);
                                }}
                              />
                            );
                          })()}
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
                        <td onClick={(e) => e.stopPropagation()}>
                          <FeedbackRatingCell 
                            itemId={ama.id} 
                            category="ama-meetings" 
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
                                updateAMASession(ama.id, { pinned: !ama.pinned });
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: ama.pinned ? 'var(--primary)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title={ama.pinned ? "Unpin Row" : "Pin Row"}
                            >
                              <Pin size={12} style={{ transform: ama.pinned ? 'none' : 'rotate(45deg)' }} />
                            </button>
                            {(() => {
                              const amaForm = ama.feedbackFormId ? formConfigs.find(f => f.id === ama.feedbackFormId) : null;
                              const tip = copiedId === ama.id 
                                ? "Link Copied!" 
                                : (amaForm ? `Feedback Form: "${amaForm.title || amaForm.id}" (Click to copy link)` : (ama.feedbackFormId ? "Copy Feedback Link" : "Assign Form & Copy Link"));
                              return (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (ama.feedbackFormId) {
                                      const link = `${window.location.origin}/?feedback=${ama.id}&category=ama-meetings&formId=${ama.feedbackFormId}`;
                                      navigator.clipboard.writeText(link).then(() => {
                                        setCopiedId(ama.id);
                                        setTimeout(() => setCopiedId(null), 2000);
                                      });
                                    } else {
                                      setAssignModalItem({
                                        id: ama.id,
                                        title: ama.topic || ama.speaker || 'AMA Session',
                                        formId: ama.feedbackFormId
                                      });
                                    }
                                  }}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: copiedId === ama.id ? 'var(--success)' : (ama.feedbackFormId ? 'var(--primary)' : 'var(--text-secondary)'), 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    padding: '4px'
                                  }}
                                  title={tip}
                                >
                                  {copiedId === ama.id ? <Check size={12} /> : <Link size={12} />}
                                </button>
                              );
                            })()}
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
                              onClick={async () => {
                                if (await confirm("Are you sure you want to delete this AMA session?", "Delete AMA Session")) {
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
                          <td colSpan={9} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
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
                              {/* Top Split: Discussion & Description */}
                              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Discussion / Description</label>
                                    {ama.discussion && ama.discussion.trim() && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAiMeeting({
                                            id: ama.id,
                                            text: ama.discussion || '',
                                            title: ama.topic || ama.cohort || 'Student Meeting',
                                            type: 'ama'
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
                                    initialValue={ama.discussion || ''}
                                    onSave={(val) => updateAMASession(ama.id, { discussion: val })}
                                    placeholder="Enter meeting description and discussion details..."
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
                                        id: `prod-ama-${Date.now()}`,
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
                                        notes: `AMA Session ID: ${ama.id} | AMA Cohort: ${ama.cohort || ''}`,
                                        product: '',
                                        module: ama.cohort,
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: '',
                                        createdAt: new Date().toISOString()
                                      };
                                      addProductItem(newItem);
                                      setInlineRelatedFeatureValue('');
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
                                  <span style={{ fontSize: '0.8rem' }}>No associated feature requests found for this session.</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newItem: ProductItem = {
                                        id: `prod-ama-${Date.now()}`,
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
                                        notes: `AMA Session ID: ${ama.id} | AMA Cohort: ${ama.cohort || ''}`,
                                        product: '',
                                        module: ama.cohort,
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: '',
                                        createdAt: new Date().toISOString()
                                      };
                                      addProductItem(newItem);
                                      setInlineRelatedFeatureValue('');
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
            {(() => {
              const activePage = Math.min(currentPage, totalPages);
              const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
              const endIndex = Math.min(startIndex + pageSize, totalItems);
              return totalItems > 0 && (
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
            );
            })()}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>Feature {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaDate')} style={{ width: '180px', cursor: 'pointer' }}>Date-time {feedbackSortField === 'amaDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaProgram')} style={{ width: '100px', cursor: 'pointer' }}>Program {feedbackSortField === 'amaProgram' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaCohort')} style={{ width: '120px', cursor: 'pointer' }}>Cohort {feedbackSortField === 'amaCohort' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaSpeaker')} style={{ width: '160px', cursor: 'pointer' }}>Speaker {feedbackSortField === 'amaSpeaker' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
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
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
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
                ) : paginatedFeedbackFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No feedback features found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbackFeatures.map(feat => {
                  const parentAma = getParentAma(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      className={feat.blocker ? 'row-blocked' : ''}
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
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
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
                            formatDateToUserPattern(parentAma.date)
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
                            parentAma.speaker ? (
                              <span style={getPOCBadgeStyle(parentAma.speaker)}>
                                {parentAma.speaker}
                              </span>
                            ) : '—'
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
      {assignModalItem && (
        <AssignFeedbackModal
          isOpen={!!assignModalItem}
          onClose={() => setAssignModalItem(null)}
          itemId={assignModalItem.id}
          itemTitle={assignModalItem.title}
          category="ama-meetings"
          currentFormId={assignModalItem.formId}
          onAssigned={(assignedFormId) => {
            const link = `${window.location.origin}/?feedback=${assignModalItem.id}&category=ama-meetings&formId=${assignedFormId}`;
            navigator.clipboard.writeText(link).then(() => {
              setCopiedId(assignModalItem.id);
              setTimeout(() => setCopiedId(null), 2000);
            });
          }}
        />
      )}
      {selectedAiMeeting && (
        <AIMeetingAssistantModal
          isOpen={!!selectedAiMeeting}
          onClose={() => setSelectedAiMeeting(null)}
          meetingId={selectedAiMeeting.id}
          meetingText={selectedAiMeeting.text}
          meetingTitle={selectedAiMeeting.title}
          meetingType={selectedAiMeeting.type}
          onApplySummary={(sum) => {
            updateAMASession(selectedAiMeeting.id, { discussion: sum });
          }}
        />
      )}
    </>
  );
};
