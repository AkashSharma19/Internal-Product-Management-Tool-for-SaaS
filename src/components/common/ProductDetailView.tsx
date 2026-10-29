import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { RichTextEditor } from '../RichTextEditor';
import {
  Trash2,
  ExternalLink,
  X,
  Check,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Palette,
  Code,
  Sparkles,
  Calendar,
  User,
  Flag,
  CheckSquare,
  Star,
  Link,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  Layers,
  Copy,
  History,
  Mail,
  FileText,
  Tag,
  Presentation
} from 'lucide-react';
import type {
  ProductItem,
  SupportDocItem,
  BlockerItem
} from '../../types';
import {
  getSupportDocs,
  getInitials,
  getAssigneeColor,
  formatClickupAssignee,
  extractClickupTaskId,
  formatDateToShortPattern,
  getDateDiffDays,
  isCompletedStatus,
  isDateOverdue
} from './tableUtils';
import type { HighlightedDate } from './TableShared';
import {
  CustomDatePicker,
  FieldHistoryModal,
  CreateClickupTaskModal,
  AttendeeFeedbackDetails,
  StatusDropdown
} from './TableShared';

export interface ProductDetailViewProps {
  item: ProductItem;
  onBack: () => void;
  onUpdate: (id: string, updated: Partial<ProductItem>) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ item, onBack, onUpdate }) => {
  const { studentProjects, speakers: configSpeakers, productGroups, statuses: configStatuses, clickupApiKey, syncClickupTask, activeTab, canUserEdit, currentUser, productItems, contentItems, dailyIssues, studentMeetings, setActiveSubtasksTaskLink, setPreviewProductId, deleteProductItem, comments, addComment, deleteComment, confirm } = useDashboard();
  const isDailyNeed = activeTab === 'issues' || dailyIssues.some(d => d.id === item.id);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copiedClickup, setCopiedClickup] = useState(false);
  const [historyField, setHistoryField] = useState<{ name: string; label: string } | null>(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [activeDiscussionTab, setActiveDiscussionTab] = useState<'local' | 'clickup'>('local');
  const blockerInputRef = useRef<HTMLInputElement>(null);
  const [clickupComments, setClickupComments] = useState<any[]>([]);
  const [loadingCuComments, setLoadingCuComments] = useState(false);
  const [cuCommentError, setCuCommentError] = useState<string | null>(null);  const fetchClickupComments = async () => {
    const taskId = extractClickupTaskId(item.taskLink);
    if (!taskId) return;
    setLoadingCuComments(true);
    setCuCommentError(null);
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch(`/api/data?action=clickup-comments&taskId=${encodeURIComponent(taskId)}`, {
        headers: { 'x-user-id': savedUserId }
      });
      const resData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(resData?.error || 'Failed to fetch comments from ClickUp');
      }
      if (resData?.success) {
        setClickupComments(resData.comments || []);
      } else {
        setCuCommentError(resData?.error || 'Failed to fetch ClickUp comments');
      }
    } catch (err: any) {
      setCuCommentError(err.message || 'Error fetching comments');
    } finally {
      setLoadingCuComments(false);
    }
  };

  useEffect(() => {
    if (activeDiscussionTab === 'clickup' && item.taskLink) {
      fetchClickupComments();
    }
  }, [activeDiscussionTab, item.taskLink]);

  const handleCopyClickupLink = async () => {
    if (!item.taskLink) return;
    try {
      await navigator.clipboard.writeText(item.taskLink);
      setCopiedClickup(true);
      setTimeout(() => setCopiedClickup(false), 2000);
    } catch (err) {
      console.error('Failed to copy clickup link', err);
    }
  };
  const [isEditingCreatedAt, setIsEditingCreatedAt] = useState(false);
  const [isEditingSpecsDate, setIsEditingSpecsDate] = useState(false);
  const [isEditingUiuxDate, setIsEditingUiuxDate] = useState(false);
  const [isEditingDevDate, setIsEditingDevDate] = useState(false);
  const [isEditingReleaseDate, setIsEditingReleaseDate] = useState(false);
  const [isEditingCommittedDate, setIsEditingCommittedDate] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [postAsBlocker, setPostAsBlocker] = useState(false);
  const [newBlockerText, setNewBlockerText] = useState('');

  const [newDocName, setNewDocName] = useState('');
  const [newDocLink, setNewDocLink] = useState('');
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('task_drawer_chat_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleChatCollapse = () => {
    setIsChatCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('task_drawer_chat_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleAddDocToProduct = () => {
    const trimmedLink = newDocLink.trim();
    if (!trimmedLink) return;
    const trimmedName = newDocName.trim() || 'Document';
    const currentDocs = getSupportDocs(item);
    const newDocItem: SupportDocItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      link: trimmedLink
    };
    const updatedDocs = [...currentDocs, newDocItem];
    onUpdate(item.id, {
      supportDocs: updatedDocs,
      supportDocLink: updatedDocs[0]?.link || ''
    });
    setNewDocName('');
    setNewDocLink('');
  };

  const handleDeleteDocFromProduct = (docId: string) => {
    const currentDocs = getSupportDocs(item);
    const updatedDocs = currentDocs.filter(d => d.id !== docId);
    onUpdate(item.id, {
      supportDocs: updatedDocs,
      supportDocLink: updatedDocs[0]?.link || ''
    });
  };

  // Initialize blockers from item.blockers or legacy item.blocker string
  const getInitialBlockers = useCallback((): BlockerItem[] => {
    if (Array.isArray(item.blockers)) {
      return item.blockers;
    }
    if (item.blocker && typeof item.blocker === 'string' && item.blocker.trim()) {
      const parts = item.blocker.split(';').map(p => p.trim()).filter(Boolean);
      return parts.map((text, idx) => ({
        id: `blk-legacy-${idx}`,
        text,
        resolved: false,
        createdAt: item.createdAt || new Date().toISOString(),
        createdBy: item.poc || 'Initial'
      }));
    }
    return [];
  }, [item.blockers, item.blocker, item.createdAt, item.poc]);

  const [blockersList, setBlockersList] = useState<BlockerItem[]>(getInitialBlockers);

  useEffect(() => {
    setBlockersList(getInitialBlockers());
  }, [item.id, item.blockers, item.blocker, getInitialBlockers]);

  const activeBlockers = useMemo(() => {
    return blockersList.filter(b => !b.resolved);
  }, [blockersList]);

  const saveBlockers = (updatedBlockers: BlockerItem[]) => {
    setBlockersList(updatedBlockers);
    const active = updatedBlockers.filter(b => !b.resolved);
    const blockerString = active.map(b => b.text.trim()).join('; ');
    if (canUserEdit) {
      onUpdate(item.id, { blockers: updatedBlockers, blocker: blockerString } as any);
    }
  };

  const handleAddBlocker = (text?: string) => {
    const textToAdd = (text !== undefined ? text : newBlockerText).trim();
    if (!textToAdd) return;
    const newB: BlockerItem = {
      id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      text: textToAdd,
      resolved: false,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'User'
    };
    const next = [...blockersList, newB];
    saveBlockers(next);
    if (text === undefined) {
      setNewBlockerText('');
    }
  };

  const handleToggleResolveBlocker = (blockerId: string) => {
    const next = blockersList.map(b => {
      if (b.id === blockerId) {
        const nextResolved = !b.resolved;
        return {
          ...b,
          resolved: nextResolved,
          resolvedAt: nextResolved ? new Date().toISOString() : undefined,
          resolvedBy: nextResolved ? (currentUser?.name || 'User') : undefined
        };
      }
      return b;
    });
    saveBlockers(next);
  };

  const handleDeleteBlocker = (blockerId: string) => {
    const next = blockersList.filter(b => b.id !== blockerId);
    saveBlockers(next);
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim()) return;
    setIsPostingComment(true);
    setCommentError('');
    try {
      const commentContent = newCommentText;
      const res = await addComment(item.id, commentContent, postAsBlocker);
      if (res.success) {
        if (postAsBlocker) {
          handleAddBlocker(commentContent);
          setPostAsBlocker(false);
        }
        setNewCommentText('');
      } else {
        setCommentError(res.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };



  const [isLinkingSearchOpen, setIsLinkingSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTasks, setSearchedTasks] = useState<ProductItem[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [isSearchingLink, setIsSearchingLink] = useState(false);
  const SEARCH_PAGE_SIZE = 5;

  // DB-backed search with debounce + pagination for the "Link to Task" widget
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchedTasks([]);
      setSearchTotal(0);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingLink(true);
      try {
        const headers: Record<string, string> = {};
        const savedUserId = localStorage.getItem('logged-in-user-id');
        if (savedUserId) headers['x-user-id'] = savedUserId;
        const res = await fetch(
          `/api/data?action=suggest-similar&query=${encodeURIComponent(q)}&excludeId=${item.id}&page=${searchPage}`,
          { headers }
        );
        if (!cancelled && res.ok) {
          const json = await res.json();
          if (json.success) {
            setSearchedTasks(json.data || []);
            setSearchTotal(json.total ?? 0);
          }
        }
      } catch (err) {
        console.error('Link search failed:', err);
      } finally {
        if (!cancelled) setIsSearchingLink(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, searchPage, item.id]);

  const [featureText, setFeatureText] = useState(item.feature || '');
  const [isFocused, setIsFocused] = useState(false);

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [featureText]);

  useEffect(() => {
    setFeatureText(item.feature || '');
  }, [item.feature]);

  const [similarTasks, setSimilarTasks] = useState<ProductItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = featureText.trim();
    if (query.length < 3) {
      setSimilarTasks([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const headers: Record<string, string> = {};
        const savedUserId = localStorage.getItem('logged-in-user-id');
        if (savedUserId) {
          headers['x-user-id'] = savedUserId;
        }

        const response = await fetch(`/api/data?action=suggest-similar&query=${encodeURIComponent(query)}&excludeId=${item.id}`, { headers });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            setSimilarTasks(resData.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch similar task suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [featureText, item.id]);

  const sessionInfo = useMemo(() => {
    const notesStr = item.notes || '';
    const match = notesStr.match(/(AMA Session|Admin Call|Tarun Sir Meeting) ID:\s*([^\s|]+)/);
    if (!match) return null;
    return {
      type: match[1],
      id: match[2],
      fullTag: `${match[1]} ID: ${match[2]}`
    };
  }, [item.notes]);

  const handleLinkTask = (targetTask: ProductItem) => {
    const existingNotes = targetTask.notes || '';
    const newNotes = existingNotes 
      ? `${existingNotes} | ${item.notes} | Linked Task: true` 
      : `${item.notes} | Linked Task: true`;
    
    // Update target task notes
    onUpdate(targetTask.id, { notes: newNotes });
    // Switch preview to target task
    setPreviewProductId(targetTask.id);
    // Delete placeholder task
    deleteProductItem(item.id);
  };



  const pocList = configSpeakers.map(s => s.name);
  const productList = productGroups.map(g => g.name);
  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;

  // Visual Workload Indicators mapping
  const pocActiveTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pocList.forEach(name => {
      counts[name] = 0;
    });

    const isTaskActive = (task: any) => {
      return !task.finalReleaseCompleted;
    };

    productItems.forEach((pi: ProductItem) => {
      if (pi.poc && isTaskActive(pi)) {
        counts[pi.poc] = (counts[pi.poc] || 0) + 1;
      }
    });

    if (Array.isArray(studentProjects)) {
      studentProjects.forEach((pi: any) => {
        if (pi.poc && isTaskActive(pi)) {
          counts[pi.poc] = (counts[pi.poc] || 0) + 1;
        }
      });
    }

    if (Array.isArray(contentItems)) {
      contentItems.forEach((pi: any) => {
        if (pi.poc && isTaskActive(pi)) {
          counts[pi.poc] = (counts[pi.poc] || 0) + 1;
        }
      });
    }

    if (Array.isArray(dailyIssues)) {
      dailyIssues.forEach((pi: any) => {
        const poc = pi.poc || pi.contact;
        if (poc && isTaskActive(pi)) {
          counts[poc] = (counts[poc] || 0) + 1;
        }
      });
    }

    if (Array.isArray(studentMeetings)) {
      studentMeetings.forEach((pi: any) => {
        if (pi.poc && isTaskActive(pi)) {
          counts[pi.poc] = (counts[pi.poc] || 0) + 1;
        }
      });
    }

    return counts;
  }, [productItems, studentProjects, contentItems, dailyIssues, studentMeetings, pocList]);

  // Overdue milestones flags
  const specsOverdue = isDateOverdue(item.productDeadline, item.productDeadlineCompleted);
  const uiuxOverdue = isDateOverdue(item.uiux, item.uiuxCompleted);
  const devOverdue = isDateOverdue(item.deadline, item.deadlineCompleted);
  const releaseOverdue = isDateOverdue(item.finalRelease, item.finalReleaseCompleted);
  const isOverallCompleted = isCompletedStatus(item.status);
  const committedOverdue = isDateOverdue(item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted);
  
  const realProjectId = item.id.startsWith('prod-temp-') ? item.id.replace('prod-temp-', '') : item.id;
  const isProject = item.id.startsWith('proj-') || studentProjects.some(p => p.id === realProjectId);

  const productStatuses = configStatuses;




  const getClickupStatusColor = (status: string) => {
    if (!status) return 'var(--text-secondary)';
    const s = status.toLowerCase().trim();
    if (['closed', 'done', 'completed', 'delivered', 'complete', 'resolved'].includes(s)) return '#10b981'; // Green
    if (['open', 'todo', 'to do', 'backlog', 'unstarted'].includes(s)) return '#6b7280'; // Grey
    if (['in progress', 'active', 'development', 'dev', 'in design', 'design', 'building'].includes(s)) return '#3b82f6'; // Blue
    if (['under review', 'review', 'discuss', 'discussing', 'discuss/review', 'in review', 'to review'].includes(s)) return '#f97316'; // Orange
    if (['testing', 'tested', 'qa', 'quality assurance', 'bug verification'].includes(s)) return '#a855f7'; // Purple
    if (['on hold', 'hold', 'paused', 'blocked', 'stuck', 'cancelled'].includes(s)) return '#ef4444'; // Red
    
    // Fallback to a stable hex color using hash
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hexColors = [
      '#7c3aed', '#db2777', '#0284c7', '#059669', '#ea580c', '#e11d48', '#4f46e5', '#0891b2', '#ca8a04'
    ];
    return hexColors[Math.abs(hash) % hexColors.length];
  };

  const getPriorityFlagColor = (prio: string) => {
    switch (prio) {
      case 'P0': return '#ef4444'; // Red
      case 'P1': return '#f97316'; // Orange
      case 'P2': return '#3b82f6'; // Blue
      case 'P3': return '#eab308'; // Yellow
      case 'P4': return '#9ca3af'; // Grey
      default: return '#9ca3af';
    }
  };

  const handleFieldUpdate = (field: keyof ProductItem, newValue: any) => {
    if (!canUserEdit) return;
    const oldValue = item[field];
    if (oldValue === newValue) return;

    // Call parent update
    if (field === 'taskLink' && !newValue) {
      onUpdate(item.id, { taskLink: '', clickupStatus: '' });
    } else {
      onUpdate(item.id, { [field]: newValue });
    }
  };

  const handleSyncClickup = async (taskLinkValue: string) => {
    if (!canUserEdit || !taskLinkValue) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await syncClickupTask(taskLinkValue);
      if (res) {
        const updates: Partial<ProductItem> = { 
          clickupStatus: res.status, 
          clickupSubtasksCount: res.subtasksCount,
          clickupAssignee: res.assignee
        };
        const currentName = (item.feature || '').trim();
        const isDefaultName = 
          currentName === '' || 
          currentName === 'New Priority Request' || 
          currentName === 'New Project' || 
          currentName === 'New Task' || 
          currentName === 'New Sprint Task Description' || 
          currentName === 'New Issue Logged' || 
          currentName.startsWith('Issue #') || 
          currentName.startsWith('Request #') || 
          currentName.toLowerCase().startsWith('new ') ||
          currentName.toLowerCase().startsWith('feature for ') ||
          currentName.toLowerCase().startsWith('related feature');
        if (res.name && isDefaultName) {
          updates.feature = res.name;
          setFeatureText(res.name);
        }
        onUpdate(item.id, updates);
      } else {
        setSyncError('Could not fetch status from ClickUp API. Please check your credentials or connection.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  

  

  

  const taskMilestoneHighlights = useMemo((): HighlightedDate[] => {
    const list: HighlightedDate[] = [];
    if (item.createdAt) list.push({ date: item.createdAt, label: 'Created', color: '#10b981' });
    if (item.productDeadline) list.push({ date: item.productDeadline, label: 'Specs', color: '#3b82f6' });
    if (item.uiux) list.push({ date: item.uiux, label: 'UI/UX', color: '#8b5cf6' });
    if (item.deadline) list.push({ date: item.deadline, label: 'Dev', color: '#f59e0b' });
    if (item.finalRelease) list.push({ date: item.finalRelease, label: 'Release', color: '#ec4899' });
    if (item.committedDate) list.push({ date: item.committedDate, label: 'Committed', color: '#6366f1' });
    return list;
  }, [item.createdAt, item.productDeadline, item.uiux, item.deadline, item.finalRelease, item.committedDate]);

  const steps = [
    {
      label: 'Created',
      date: item.createdAt,
      dateVal: item.createdAt ? formatDateToShortPattern(item.createdAt) : 'Set Date',
      completed: true,
      classStr: 'completed',
      isEditing: isEditingCreatedAt,
      setIsEditing: setIsEditingCreatedAt,
      icon: <CheckCircle size={14} />,
      historyField: null,
      completedKey: null
    },
    {
      label: 'Specs Date',
      date: item.productDeadline,
      dateVal: item.productDeadline ? formatDateToShortPattern(item.productDeadline) : 'Set Date',
      completed: !!item.productDeadlineCompleted,
      classStr: item.productDeadlineCompleted ? 'completed' : specsOverdue ? 'overdue' : 'active',
      isEditing: isEditingSpecsDate,
      setIsEditing: setIsEditingSpecsDate,
      icon: item.productDeadlineCompleted ? <Check size={14} /> : <Calendar size={14} />,
      historyField: 'productDeadline',
      historyLabel: 'Specs Date',
      completedKey: 'productDeadlineCompleted',
      diffDays: item.productDeadline ? getDateDiffDays(item.createdAt, item.productDeadline) : null,
      diffTitle: 'Days since Created Date'
    },
    {
      label: 'UI/UX Date',
      date: item.uiux,
      dateVal: item.uiux ? formatDateToShortPattern(item.uiux) : 'Set Date',
      completed: !!item.uiuxCompleted,
      classStr: item.uiuxCompleted ? 'completed' : uiuxOverdue ? 'overdue' : (item.productDeadlineCompleted ? 'active' : 'pending'),
      isEditing: isEditingUiuxDate,
      setIsEditing: setIsEditingUiuxDate,
      icon: item.uiuxCompleted ? <Check size={14} /> : <Palette size={14} />,
      historyField: 'uiux',
      historyLabel: 'UI/UX Date',
      completedKey: 'uiuxCompleted',
      diffDays: item.uiux ? getDateDiffDays(item.productDeadline || item.createdAt, item.uiux) : null,
      diffTitle: item.productDeadline ? 'Days since Specs Date' : 'Days since Created Date'
    },
    {
      label: 'Dev Date',
      date: item.deadline,
      dateVal: item.deadline ? formatDateToShortPattern(item.deadline) : 'Set Date',
      completed: !!item.deadlineCompleted,
      classStr: item.deadlineCompleted ? 'completed' : devOverdue ? 'overdue' : (item.uiuxCompleted ? 'active' : 'pending'),
      isEditing: isEditingDevDate,
      setIsEditing: setIsEditingDevDate,
      icon: item.deadlineCompleted ? <Check size={14} /> : <Code size={14} />,
      historyField: 'deadline',
      historyLabel: 'Dev Date',
      completedKey: 'deadlineCompleted',
      diffDays: item.deadline ? getDateDiffDays(item.uiux || item.productDeadline || item.createdAt, item.deadline) : null,
      diffTitle: item.uiux ? 'Days since UI/UX Date' : item.productDeadline ? 'Days since Specs Date' : 'Days since Created Date'
    },
    {
      label: 'Release Date',
      date: item.finalRelease,
      dateVal: item.finalRelease ? formatDateToShortPattern(item.finalRelease) : 'Set Date',
      completed: !!item.finalReleaseCompleted,
      classStr: item.finalReleaseCompleted ? 'completed' : releaseOverdue ? 'overdue' : (item.deadlineCompleted ? 'active' : 'pending'),
      isEditing: isEditingReleaseDate,
      setIsEditing: setIsEditingReleaseDate,
      icon: item.finalReleaseCompleted ? <Check size={14} /> : <Sparkles size={14} />,
      historyField: 'finalRelease',
      historyLabel: 'Release Date',
      completedKey: 'finalReleaseCompleted',
      diffDays: item.finalRelease ? getDateDiffDays(item.deadline || item.uiux || item.productDeadline || item.createdAt, item.finalRelease) : null,
      diffTitle: item.deadline ? 'Days since Dev Date' : item.uiux ? 'Days since UI/UX Date' : item.productDeadline ? 'Days since Specs Date' : 'Days since Created Date'
    },
    {
      label: 'Commited Date',
      date: item.committedDate,
      dateVal: item.committedDate ? formatDateToShortPattern(item.committedDate) : 'Set Date',
      completed: !!item.finalReleaseCompleted,
      classStr: item.finalReleaseCompleted ? 'completed' : committedOverdue ? 'overdue' : 'active',
      isEditing: isEditingCommittedDate,
      setIsEditing: setIsEditingCommittedDate,
      icon: item.finalReleaseCompleted ? <Check size={14} /> : <Calendar size={14} />,
      historyField: 'committedDate',
      historyLabel: 'Commited Date',
      completedKey: 'committedDateCompleted',
      diffDays: item.committedDate ? getDateDiffDays(item.finalRelease || item.deadline || item.uiux || item.productDeadline || item.createdAt, item.committedDate) : null,
      diffTitle: item.finalRelease ? 'Days since Release Date' : 'Days since Created Date'
    }
  ];

  return (
    <div className="premium-workspace product-detail-workspace animate-fade-in" key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: '100%', overflow: 'hidden', position: 'relative' }}>
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="product-detail-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', flexShrink: 0 }}>
        <div className="premium-breadcrumb">
          <button className="btn-back" style={{ width: '24px', height: '24px', borderRadius: '6px', marginRight: '0.25rem' }} onClick={onBack} title="Back to Table">
            <ArrowLeft size={12} />
          </button>
          <span>
            {activeTab === 'issues' ? 'Daily Needs' : 
             activeTab === 'projects' ? 'Student Projects' : 
             activeTab === 'meetings' ? 'Student Meetings' : 
             activeTab === 'admin' ? 'Admin Meetings' : 
             activeTab === 'content' ? 'Content Pipeline' : 
             activeTab === 'plan' ? 'Sprint Planning' : 
             'Priority Requests'}
          </span>
          <span>/</span>
          <span style={{ color: !item.product ? '#f97316' : 'var(--text-primary)', fontWeight: 600 }}>
            {item.product || '— Select Product Group —'}
          </span>
        </div>

        <div className="product-detail-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {canUserEdit && (
            <button
              onClick={async () => {
                const confirmed = await confirm("Are you sure you want to delete this feature?", "Delete Feature");
                if (confirmed) {
                  deleteProductItem(item.id);
                  onBack();
                }
              }}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.725rem',
                fontWeight: 600,
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginRight: '0.5rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
              title="Delete Feature"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
          <span style={{
            backgroundColor: 'var(--background-alt)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '0.675rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Task <span style={{ color: 'var(--text-primary)' }}>#{item.id}</span>
          </span>
        </div>
      </div>

      {/* TWO COLUMN CONTENT LAYOUT */}
      <div className="product-detail-body" style={{ display: 'flex', gap: isChatCollapsed ? '0' : '1.5rem', flex: 1, minHeight: 0, marginTop: '1rem', position: 'relative' }}>
        
        {/* LEFT COLUMN: Main details (scrollable) */}
        <div className="product-detail-main" style={{ flex: '1 1 0%', overflowY: 'auto', paddingRight: isChatCollapsed ? '0.25rem' : '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0, transition: 'padding 0.2s ease' }}>
          <div style={{ pointerEvents: canUserEdit ? 'auto' : 'none', opacity: canUserEdit ? 1 : 0.95, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Task Title (Editable) + inline link button */}
            <div style={{ position: 'relative' }}>
              {isDailyNeed && (
                <div style={{ marginBottom: '6px' }}>
                  <span style={{
                    backgroundColor: item.type === 'Improvement' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: item.type === 'Improvement' ? '#2563eb' : '#dc2626',
                    border: `1px solid ${item.type === 'Improvement' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Tag size={10} />
                    {item.type === 'Improvement' ? 'Improvement' : 'Bug'}
                  </span>
                </div>
              )}
              <textarea
                ref={titleTextareaRef}
                className="premium-title-input"
                style={{ paddingLeft: 0, fontSize: '1.5rem', borderBottom: '2px solid transparent', width: '100%', height: 'auto', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  if (featureText.trim() && featureText !== item.feature) {
                    handleFieldUpdate('feature', featureText.trim());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                value={featureText}
                onChange={(e) => setFeatureText(e.target.value)}
                placeholder="Task name"
                rows={1}
              />
              {/* Inline "Link to task" button — sits right below the title, no separate row */}
              {!isLinkingSearchOpen && (
                <button
                  onClick={() => setIsLinkingSearchOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.675rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                    opacity: 0.65,
                    transition: 'opacity 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.65'}
                >
                  🔗 Link to a Task with different name
                </button>
              )}
              {isFocused && (similarTasks.length > 0 || isSearching) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--panel-bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--background-alt)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Similar Tasks Found ({similarTasks.length})</span>
                    {isSearching && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>Searching DB...</span>}
                  </div>
                  {isSearching && similarTasks.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <style>{`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                      <div className="spinner-loader" style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid var(--text-muted)',
                        borderTop: '2px solid var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      <span>Searching similar features...</span>
                    </div>
                  ) : (
                    similarTasks.map(t => {
                      const isAlreadyLinked = sessionInfo && t.notes && t.notes.includes(sessionInfo.fullTag);
                      return (
                        <div 
                          key={t.id}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background-color 0.15s ease'
                          }}
                          className="similar-task-item"
                        >
                          <div 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setPreviewProductId(t.id);
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%', cursor: 'pointer' }}
                            title="Click to view task details"
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {t.feature}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Product: {t.product || '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {t.status && (
                              <span className={`badge badge-${t.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.65rem' }}>
                                {t.status}
                              </span>
                            )}
                            {sessionInfo && (
                              isAlreadyLinked ? (
                                <span style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  🔗 Linked
                                </span>
                              ) : (
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleLinkTask(t);
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                >
                                  🔗 Link Task
                                </button>
                              )
                            )}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setPreviewProductId(t.id);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Inline Search & Link Widget — DB-backed with pagination */}
            {isLinkingSearchOpen && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px dashed var(--primary-light)', backgroundColor: 'var(--primary-glow)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>🔗 Search & Link Any Task</span>
                  <button
                    onClick={() => { setIsLinkingSearchOpen(false); setSearchQuery(''); setSearchPage(1); setSearchedTasks([]); setSearchTotal(0); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="premium-input"
                    style={{ width: '100%', padding: '6px 28px 6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                    placeholder="Search across all tasks in DB..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchPage(1); }}
                    autoFocus
                  />
                  {isSearchingLink && (
                    <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', border: '2px solid var(--border)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  )}
                  {searchQuery && !isSearchingLink && (
                    <button className="search-clear-btn" onClick={() => { setSearchQuery(''); setSearchPage(1); setSearchedTasks([]); setSearchTotal(0); }} title="Clear search" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                {searchQuery.trim().length >= 2 && (
                  <div style={{ marginTop: '6px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                    {isSearchingLink && searchedTasks.length === 0 ? (
                      <div style={{ padding: '16px 12px', fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center' }}>Searching…</div>
                    ) : searchedTasks.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>No tasks found matching "{searchQuery}"</div>
                    ) : (
                      <>
                        {searchedTasks.map(t => {
                          const isAlreadyLinked = sessionInfo && t.notes && t.notes.includes(sessionInfo.fullTag);
                          return (
                            <div key={t.id} style={{ padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '72%' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.feature}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  #{t.id} · {t.product || '—'}
                                  {t.status ? <span style={{ marginLeft: '6px', backgroundColor: 'var(--background-alt)', border: '1px solid var(--border-light)', borderRadius: '3px', padding: '0 4px', fontSize: '0.65rem', fontWeight: 600 }}>{t.status}</span> : null}
                                </span>
                              </div>
                              <div>
                                {isAlreadyLinked ? (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🔗 Linked</span>
                                ) : (
                                  <button onMouseDown={(e) => { e.preventDefault(); handleLinkTask(t); setIsLinkingSearchOpen(false); setSearchQuery(''); setSearchPage(1); setSearchedTasks([]); setSearchTotal(0); }} className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Link</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Pagination bar */}
                        {searchTotal > SEARCH_PAGE_SIZE && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background-alt)' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {((searchPage - 1) * SEARCH_PAGE_SIZE) + 1}–{Math.min(searchPage * SEARCH_PAGE_SIZE, searchTotal)} of {searchTotal}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                disabled={searchPage <= 1 || isSearchingLink}
                                onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: searchPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: searchPage <= 1 ? 'default' : 'pointer', fontWeight: 600, opacity: searchPage <= 1 ? 0.5 : 1 }}
                              >← Prev</button>
                              <button
                                disabled={searchPage * SEARCH_PAGE_SIZE >= searchTotal || isSearchingLink}
                                onClick={() => setSearchPage(p => p + 1)}
                                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: searchPage * SEARCH_PAGE_SIZE >= searchTotal ? 'var(--text-muted)' : 'var(--text-primary)', cursor: searchPage * SEARCH_PAGE_SIZE >= searchTotal ? 'default' : 'pointer', fontWeight: 600, opacity: searchPage * SEARCH_PAGE_SIZE >= searchTotal ? 0.5 : 1 }}
                              >Next →</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* HORIZONTAL TIMELINE FOR MILESTONES */}
            <div className="premium-timeline-container" style={{ position: 'relative', zIndex: steps.some(s => s.isEditing) ? 50 : 20 }}>
              <h4 className="premium-timeline-title">Milestone Checkpoints</h4>
              <div className="premium-timeline-track-wrapper">
                <div className="premium-timeline-line-connector">
                  <div 
                    className="premium-timeline-progress-line" 
                    style={{ 
                      width: (() => {
                        const stepStates = [
                          true,
                          !!item.productDeadlineCompleted,
                          !!item.uiuxCompleted,
                          !!item.deadlineCompleted,
                          !!item.finalReleaseCompleted,
                          !!item.finalReleaseCompleted
                        ];
                        const completedCount = stepStates.filter(Boolean).length;
                        return `${((completedCount - 1) / (stepStates.length - 1)) * 100}%`;
                      })() 
                    }} 
                  />
                </div>
                <div className="premium-timeline-track">
                  {steps.map((step, idx) => (
                    <div key={idx} className={`premium-timeline-node ${step.classStr}`} style={{ position: 'relative', zIndex: step.isEditing ? 100 : 2 }}>
                      <div 
                        className="premium-timeline-circle"
                        onClick={() => step.setIsEditing(true)}
                        title={`Click to edit ${step.label}`}
                      >
                        {step.icon}
                      </div>
                      <div className="premium-timeline-content">
                        <span className="premium-timeline-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {step.label.replace(' Date', '')}
                          {step.historyField && (
                            <span 
                              title="View Change History" 
                              style={{ display: 'inline-flex', cursor: 'pointer', opacity: 0.6 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryField({ name: step.historyField!, label: step.historyLabel! });
                              }}
                            >
                              <History size={10} />
                            </span>
                          )}
                        </span>
                        
                        <span 
                          className="premium-timeline-date" 
                          onClick={() => step.setIsEditing(true)}
                        >
                          {step.label === 'Created' ? (item.createdAt ? formatDateToShortPattern(item.createdAt) : 'Set Date') : step.dateVal}
                        </span>

                        {step.isEditing && (
                          <CustomDatePicker
                            value={step.label === 'Created' ? (item.createdAt ? item.createdAt.substring(0, 10) : '') : (step.date || '')}
                            onChange={(date) => handleFieldUpdate(step.label === 'Created' ? 'createdAt' : step.historyField as any, date)}
                            onClose={() => step.setIsEditing(false)}
                            align={idx <= 1 ? 'left' : 'right'}
                            highlightedDates={taskMilestoneHighlights}
                          />
                        )}

                        <div className="premium-timeline-meta">
                          {step.completedKey && (
                            <input
                              type="checkbox"
                              className="premium-timeline-checkbox"
                              checked={step.completed}
                              onChange={(e) => {
                                if (step.label !== 'Commited Date') {
                                  handleFieldUpdate(step.completedKey as any, e.target.checked);
                                }
                              }}
                              disabled={step.label === 'Commited Date'}
                              style={step.label === 'Commited Date' ? { cursor: 'not-allowed', opacity: 0.8 } : undefined}
                              title={step.label === 'Commited Date' ? "Auto-checked when Release is completed" : `Mark ${step.label} as Completed`}
                            />
                          )}
                          {step.diffDays && (
                            <span className={`premium-timeline-diff-tag ${step.classStr === 'overdue' ? 'overdue' : ''}`} title={step.diffTitle}>
                              {step.diffDays}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2-COLUMN PROPERTIES GRID DASHBOARD */}
            <div className="premium-properties-dashboard">
              
              {/* PANEL 1: Lifecycle & Integration */}
              <div className="properties-panel" style={{ position: 'relative', zIndex: 30 }}>
                <h4 className="properties-panel-title">Lifecycle & Integration</h4>

                {/* Product Group */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ color: !item.product ? '#f97316' : undefined, fontWeight: !item.product ? '700' : undefined, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Layers size={13} style={{ color: !item.product ? '#f97316' : undefined, flexShrink: 0 }} /> Product Group
                  </span>
                  <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, justifyContent: 'flex-end' }}>
                    <div className={`premium-select-pill ${!item.product ? 'warning-highlight' : ''}`} style={{ minWidth: 0, maxWidth: '100%' }}>
                      <select
                        value={item.product || ''}
                        onChange={(e) => handleFieldUpdate('product', e.target.value)}
                        style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '130px' }}
                      >
                        <option value="">— Select Product Group —</option>
                        {productList.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                        {item.product && !productList.includes(item.product) && (
                          <option value={item.product}>{item.product}</option>
                        )}
                      </select>
                    </div>
                    {!item.product && (
                      <span className="animate-pulse" style={{ color: '#f97316', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>Required</span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="property-row-flat">
                  <span className="premium-property-label">
                    <CheckSquare size={13} /> status
                  </span>
                  <div className="premium-property-value">
                    <StatusDropdown
                      value={item.status}
                      onChange={(val) => handleFieldUpdate('status', val)}
                      productStatuses={productStatuses}
                    />
                  </div>
                </div>

                {/* Need Type - Only for Daily Needs */}
                {isDailyNeed && (
                  <div className="property-row-flat">
                    <span className="premium-property-label">
                      <Tag size={13} /> Need Type
                    </span>
                    <div className="premium-property-value">
                      <div className="premium-select-pill">
                        <select
                          value={item.type === 'Improvement' ? 'Improvement' : 'Bug'}
                          onChange={(e) => handleFieldUpdate('type', e.target.value)}
                        >
                          <option value="Bug">Bug</option>
                          <option value="Improvement">Improvement</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ClickUp Task Link */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Link size={13} style={{ flexShrink: 0 }} /> ClickUp Task
                  </span>
                  <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
                    <input
                      type="text"
                      style={{ 
                        color: 'var(--accent)', 
                        minWidth: 0,
                        maxWidth: '120px',
                        flex: 1,
                        textAlign: 'right', 
                        fontWeight: 500,
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                      }}
                      placeholder="Empty Link"
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== item.taskLink) {
                          handleFieldUpdate('taskLink', val);
                          if (val) {
                            handleSyncClickup(val);
                          }
                        }
                      }}
                      defaultValue={item.taskLink}
                    />
                    {item.taskLink ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto', flexShrink: 0, marginLeft: '2px' }}>
                        <a href={item.taskLink} target="_blank" rel="noreferrer" title="Open ClickUp Task" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                        </a>
                        <button
                          onClick={handleCopyClickupLink}
                          title={copiedClickup ? "Copied!" : "Copy ClickUp Link"}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: 0,
                            color: copiedClickup ? '#10b981' : 'var(--text-muted)',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {copiedClickup ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                    ) : (
                      clickupApiKey && (
                        <button
                          type="button"
                          onClick={() => setIsCreateTaskModalOpen(true)}
                          style={{
                            background: 'rgba(123, 97, 255, 0.08)',
                            border: '1px solid rgba(123, 97, 255, 0.25)',
                            borderRadius: '4px',
                            color: '#7b61ff',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            marginLeft: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease'
                          }}
                          title="Create this task directly on ClickUp"
                        >
                          <Plus size={10} /> Create
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* ClickUp Status */}
                {item.taskLink && (
                  <div className="property-row-flat">
                    <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={13} /> ClickUp Status
                      <span title="View ClickUp Status Change History" style={{ display: 'inline-flex', cursor: 'pointer', opacity: 0.6 }}>
                        <History 
                          size={12} 
                          onClick={() => setHistoryField({ name: 'clickupStatus', label: 'ClickUp Status' })} 
                        />
                      </span>
                    </span>
                    <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="premium-clickup-badge"
                        style={{ 
                          borderColor: getClickupStatusColor(item.clickupStatus), 
                          color: getClickupStatusColor(item.clickupStatus),
                          fontSize: '0.675rem',
                          padding: '3px 8px',
                          width: 'auto',
                          minWidth: '70px',
                          textAlign: 'center',
                          fontWeight: 700,
                          borderRadius: '6px',
                          backgroundColor: 'var(--background)',
                          border: '1px solid',
                          display: 'inline-block'
                        }}
                      >
                        {item.clickupStatus || 'None'}
                      </span>
                      {item.clickupSubtasksCount !== undefined && item.clickupSubtasksCount > 0 && (
                        <span 
                          onClick={() => setActiveSubtasksTaskLink(item.taskLink)}
                          style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '4px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                          title="Click to view subtasks breakdown"
                        >
                          ({item.clickupSubtasksCount} subtasks)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSyncClickup(item.taskLink)}
                        disabled={isSyncing || !clickupApiKey}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: (isSyncing || !clickupApiKey) ? 'not-allowed' : 'pointer',
                          color: 'var(--text-muted)',
                          padding: '1px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: !clickupApiKey ? 0.3 : 1
                        }}
                        title={!clickupApiKey ? "Configure API Key in Settings to sync" : "Sync status with ClickUp"}
                      >
                        <RefreshCw size={11} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                      </button>
                      {syncError && (
                        <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', cursor: 'help' }} title={syncError}>
                          <AlertCircle size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ClickUp Assignee */}
                {item.taskLink && (
                  <div className="property-row-flat">
                    <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={13} /> ClickUp Assignee
                      <span title="View ClickUp Assignee Change History" style={{ display: 'inline-flex', cursor: 'pointer', opacity: 0.6 }}>
                        <History 
                          size={12} 
                          onClick={() => setHistoryField({ name: 'clickupAssignee', label: 'ClickUp Assignee' })} 
                        />
                      </span>
                    </span>
                    <div className="premium-property-value">
                      {item.clickupAssignee ? (
                        <div className="cu-tooltip-container" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            borderBottom: '1px dashed var(--text-muted)',
                            cursor: 'help'
                          }}>
                            {formatClickupAssignee(item.clickupAssignee)}
                          </span>
                          <span className="cu-tooltip-text" style={{ left: 'auto', right: '105%', transform: 'translateY(-50%) translateX(4px)' }}>
                            {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PANEL 2: Governance & Ownership */}
              <div className="properties-panel" style={{ position: 'relative', zIndex: 20 }}>
                <h4 className="properties-panel-title">Governance & Ownership</h4>

                {/* Assignees */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <User size={13} style={{ flexShrink: 0 }} /> assignees
                    <span title="View Change History" style={{ display: 'inline-flex', flexShrink: 0 }}>
                      <History 
                        size={12} 
                        style={{ cursor: 'pointer', opacity: 0.6 }} 
                        onClick={() => setHistoryField({ name: 'poc', label: 'POC Owner' })}
                      />
                    </span>
                  </span>
                  <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, justifyContent: 'flex-end' }}>
                    <div className="premium-select-pill" style={{ paddingLeft: '4px', minWidth: 0, flexShrink: 1 }}>
                      <div 
                        className="clickup-avatar-circle" 
                        style={{ 
                          backgroundColor: getAssigneeColor(item.poc),
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: 'white',
                          flexShrink: 0
                        }}
                      >
                        {getInitials(item.poc)}
                      </div>
                      <select
                        value={item.poc || ''}
                        onChange={(e) => handleFieldUpdate('poc', e.target.value)}
                        style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                      >
                        <option value="">— Select POC —</option>
                        {pocList.map(p => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        {item.poc && !pocList.includes(item.poc) && (
                          <option value={item.poc}>{item.poc}</option>
                        )}
                      </select>
                    </div>
                    {item.poc && (
                      <span 
                        style={{ 
                          fontSize: '0.625rem', 
                          backgroundColor: 'var(--primary-glow)', 
                          border: '1px solid var(--primary-border)', 
                          borderRadius: '10px', 
                          padding: '2px 6px', 
                          color: 'var(--primary)', 
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                        title="Total active tasks managed by this POC"
                      >
                        {pocActiveTaskCounts[item.poc] || 0} active
                      </span>
                    )}
                  </div>
                </div>

                {/* Blockers */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ color: activeBlockers.length > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    <AlertCircle size={13} /> blockers
                  </span>
                  <div className="premium-property-value">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDiscussionTab('local');
                        setTimeout(() => {
                          blockerInputRef.current?.focus();
                        }, 50);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: activeBlockers.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        border: activeBlockers.length > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: activeBlockers.length > 0 ? 'var(--danger, #ef4444)' : blockersList.length > 0 ? '#10b981' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Manage blockers in Discussion Area"
                    >
                      {activeBlockers.length > 0 ? (
                        <>
                          <AlertTriangle size={12} />
                          <span>{activeBlockers.length} active {activeBlockers.length === 1 ? 'blocker' : 'blockers'}</span>
                        </>
                      ) : blockersList.length > 0 ? (
                        <>
                          <Check size={12} />
                          <span>All {blockersList.length} resolved</span>
                        </>
                      ) : (
                        <span>+ Add blocker</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tarun Sir Verified */}
                <div className="property-row-flat">
                  <span className="premium-property-label">
                    <CheckSquare size={13} /> Tarun Sir verified
                  </span>
                  <div className="premium-property-value">
                    <label 
                      className="premium-toggle-wrapper"
                      style={{ opacity: isCurrentUserAdmin ? 1 : 0.6, cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed' }}
                      title={isCurrentUserAdmin ? 'Toggle verification status' : 'Only admins can toggle Tarun Sir verification'}
                    >
                      <input 
                        type="checkbox" 
                        className="premium-toggle-checkbox" 
                        checked={item.tarunSirApproval} 
                        disabled={!isCurrentUserAdmin}
                        onChange={(e) => handleFieldUpdate('tarunSirApproval', e.target.checked)} 
                      />
                      <span className="premium-toggle-slider" />
                    </label>
                  </div>
                </div>

                {/* Raised by Tarun Sir */}
                <div className="property-row-flat">
                  <span className="premium-property-label">
                    <Star size={13} /> raised by Tarun Sir
                  </span>
                  <div className="premium-property-value">
                    <label className="premium-toggle-wrapper">
                      <input 
                        type="checkbox" 
                        className="premium-toggle-checkbox" 
                        checked={item.raisedByTarunSir} 
                        onChange={(e) => handleFieldUpdate('raisedByTarunSir', e.target.checked)} 
                      />
                      <span className="premium-toggle-slider" />
                    </label>
                  </div>
                </div>

                {/* Priority */}
                <div className="property-row-flat">
                  <span className="premium-property-label">
                    <Flag size={13} /> priority
                  </span>
                  <div className="premium-property-value">
                    <div className="premium-select-pill">
                      <Flag size={11} fill={getPriorityFlagColor(item.priority)} color={getPriorityFlagColor(item.priority)} style={{ marginRight: '2px' }} />
                      <select
                        value={item.priority || ''}
                        onChange={(e) => handleFieldUpdate('priority', e.target.value as any)}
                      >
                        <option value="">— Select Priority —</option>
                        <option value="P0">P0 (Critical)</option>
                        <option value="P1">P1 (High)</option>
                        <option value="P2">P2 (Medium)</option>
                        <option value="P3">P3 (Normal)</option>
                        <option value="P4">P4 (Low)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* PANEL 3: Release & Enablement */}
              <div className="properties-panel" style={{ position: 'relative', zIndex: 10 }}>
                <h4 className="properties-panel-title">Release & Enablement</h4>

                {/* Conduct Demo */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Presentation size={13} /> Conduct Demo
                  </span>
                  <div className="premium-property-value">
                    <label className="premium-toggle-wrapper">
                      <input 
                        type="checkbox" 
                        className="premium-toggle-checkbox" 
                        checked={!!item.conductDemo} 
                        onChange={(e) => handleFieldUpdate('conductDemo', e.target.checked)} 
                      />
                      <span className="premium-toggle-slider" />
                    </label>
                  </div>
                </div>

                {/* Required Support Docs */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={13} /> Required Support Docs
                  </span>
                  <div className="premium-property-value">
                    <label className="premium-toggle-wrapper">
                      <input 
                        type="checkbox" 
                        className="premium-toggle-checkbox" 
                        checked={!!item.supportDocsRequired} 
                        onChange={(e) => handleFieldUpdate('supportDocsRequired', e.target.checked)} 
                      />
                      <span className="premium-toggle-slider" />
                    </label>
                  </div>
                </div>

                {/* Support Documentation (visible when supportDocsRequired is ON) */}
                {item.supportDocsRequired && (
                  <div style={{
                    marginTop: '0.25rem',
                    marginBottom: '0.25rem',
                    padding: '0.75rem',
                    background: 'var(--background-alt, rgba(255, 255, 255, 0.02))',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                      <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: 700, minWidth: 0 }}>
                        <FileText size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> Support Documents
                      </span>
                      {getSupportDocs(item).length > 0 && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--primary-glow)',
                          color: 'var(--primary)',
                          border: '1px solid var(--primary-border)',
                          flexShrink: 0
                        }}>
                          {getSupportDocs(item).length}
                        </span>
                      )}
                    </div>

                    {/* List of existing docs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', minWidth: 0, paddingRight: '2px' }}>
                      {getSupportDocs(item).length === 0 ? (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                          No documents added yet. Add one below.
                        </div>
                      ) : (
                        getSupportDocs(item).map((doc) => (
                          <div 
                            key={doc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              padding: '5px 8px',
                              background: 'var(--card-bg, var(--panel-bg))',
                              border: '1px solid var(--border-light)',
                              borderRadius: '6px',
                              minWidth: 0,
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <FileText size={11} style={{ color: 'var(--primary)', flexShrink: 0, opacity: 0.8 }} />
                              <a
                                href={doc.link.startsWith('http') ? doc.link : `https://${doc.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  color: 'var(--primary)',
                                  textDecoration: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: 650,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`${doc.name}: ${doc.link}`}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || 'Document'}</span>
                                <ExternalLink size={10} style={{ opacity: 0.7, flexShrink: 0 }} />
                              </a>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullLink = doc.link.startsWith('http') ? doc.link : `https://${doc.link}`;
                                  navigator.clipboard.writeText(fullLink);
                                  setCopiedDocId(doc.id);
                                  setTimeout(() => setCopiedDocId(null), 2000);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: copiedDocId === doc.id ? '#10b981' : 'var(--text-muted)',
                                  padding: '3px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.15s ease'
                                }}
                                title={copiedDocId === doc.id ? "Copied!" : "Copy link"}
                              >
                                {copiedDocId === doc.id ? <Check size={12} /> : <Copy size={12} />}
                              </button>

                              {canUserEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocFromProduct(doc.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    padding: '3px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.8,
                                    transition: 'opacity 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                                  title="Delete document"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add new doc inline */}
                    {canUserEdit && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border-light)', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <input
                          type="text"
                          placeholder="Document Name (e.g. User Guide)"
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          style={{
                            width: '100%',
                            minWidth: 0,
                            boxSizing: 'border-box',
                            fontSize: '0.725rem',
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: '1px solid var(--border)',
                            background: 'var(--background)',
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px', width: '100%', minWidth: 0 }}>
                          <input
                            type="text"
                            placeholder="Link (https://...)"
                            value={newDocLink}
                            onChange={(e) => setNewDocLink(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDocToProduct();
                              }
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              boxSizing: 'border-box',
                              fontSize: '0.725rem',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              border: '1px solid var(--border)',
                              background: 'var(--background)',
                              color: 'var(--text-primary)',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddDocToProduct}
                            disabled={!newDocLink.trim()}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.7rem',
                              fontWeight: 650,
                              borderRadius: '5px',
                              border: '1px solid var(--primary)',
                              background: 'var(--primary)',
                              color: '#fff',
                              cursor: newDocLink.trim() ? 'pointer' : 'not-allowed',
                              opacity: newDocLink.trim() ? 1 : 0.6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              flexShrink: 0,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Plus size={11} /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notification Sent */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} /> Notification Sent
                  </span>
                  <div className="premium-property-value">
                    <label className="premium-toggle-wrapper">
                      <input 
                        type="checkbox" 
                        className="premium-toggle-checkbox" 
                        checked={!!item.notificationSent} 
                        onChange={(e) => handleFieldUpdate('notificationSent', e.target.checked)} 
                      />
                      <span className="premium-toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>

            </div>



            {/* Description card */}
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>
                Description
              </p>
              <RichTextEditor
                value={item.description || ''}
                itemId={item.id}
                featureName={item.feature || ''}
                onChange={(newValue) => {
                  if (newValue !== item.description) {
                    handleFieldUpdate('description', newValue);
                  }
                }}
                placeholder="Enter feature description..."
                canEdit={canUserEdit}
              />
            </div>

            {isProject && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                <AttendeeFeedbackDetails itemId={realProjectId} category="student-projects" />
              </>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Pinned Chat / Discussion sidebar */}
        <div 
          className={`product-detail-discussion ${isChatCollapsed ? 'is-collapsed' : 'is-open'}`}
          style={{ 
            width: isChatCollapsed ? '0px' : '380px',
            minWidth: isChatCollapsed ? '0px' : '340px',
            flexShrink: 0, 
            height: '100%', 
            minHeight: 0,
            overflow: isChatCollapsed ? 'hidden' : 'visible',
            opacity: isChatCollapsed ? 0 : 1,
            pointerEvents: isChatCollapsed ? 'none' : 'auto',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
            position: 'relative'
          }}
        >
          {/* EXPANDED COLLAPSE TAB HANDLE */}
          {!isChatCollapsed && (
            <button
              type="button"
              onClick={toggleChatCollapse}
              className="drawer-chat-toggle-tab expanded"
              title="Hide Discussion & Comments"
              aria-label="Hide Discussion & Comments"
            >
              <ChevronRight size={13} />
            </button>
          )}

          <div className="premium-discussion-sidebar" style={{ width: '100%', height: '100%' }}>
            <div className="discussion-sidebar-header" style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-light)', width: '100%', paddingBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveDiscussionTab('local')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: activeDiscussionTab === 'local' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 750,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    paddingBottom: '6px',
                    borderBottom: activeDiscussionTab === 'local' ? '2px solid var(--primary)' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    outline: 'none'
                  }}
                >
                  <span>Discussion ({comments.filter((c: any) => c.itemId === item.id).length})</span>
                  {activeBlockers.length > 0 && (
                    <span style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: 'var(--danger, #ef4444)',
                      borderRadius: '10px',
                      padding: '1px 6px',
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <AlertCircle size={10} />
                      {activeBlockers.length} {activeBlockers.length === 1 ? 'blocker' : 'blockers'}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (item.taskLink) {
                      setActiveDiscussionTab('clickup');
                    }
                  }}
                  disabled={!item.taskLink}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: !item.taskLink
                      ? 'var(--text-muted)'
                      : activeDiscussionTab === 'clickup'
                      ? 'var(--primary)'
                      : 'var(--text-secondary)',
                    fontWeight: 750,
                    fontSize: '0.775rem',
                    cursor: item.taskLink ? 'pointer' : 'not-allowed',
                    opacity: !item.taskLink ? 0.4 : 1,
                    paddingBottom: '6px',
                    borderBottom: activeDiscussionTab === 'clickup' ? '2px solid var(--primary)' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    outline: 'none'
                  }}
                  title={!item.taskLink ? "Link a ClickUp task to enable ClickUp Comments" : ""}
                >
                  ClickUp Comments {item.taskLink && `(${clickupComments.length})`}
                </button>

                <button
                  type="button"
                  onClick={toggleChatCollapse}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '3px 5px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: 'auto',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--panel-bg-alt)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Hide chat window"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {activeDiscussionTab === 'local' ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* PREMIUM INLINE BLOCKERS */}
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--panel-bg-alt, rgba(0, 0, 0, 0.02))',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flexShrink: 0
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={13} style={{ color: activeBlockers.length > 0 ? '#ef4444' : 'var(--text-muted)' }} />
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: activeBlockers.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}>
                        Blockers
                      </span>
                      {activeBlockers.length > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                          {activeBlockers.length} active
                        </span>
                      ) : blockersList.length > 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <Check size={10} strokeWidth={3} />
                          All resolved
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Blockers list */}
                  {blockersList.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      paddingRight: '2px'
                    }}>
                      {blockersList.map(b => (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: b.resolved ? 'transparent' : 'rgba(239, 68, 68, 0.04)',
                            border: b.resolved ? '1px dashed var(--border-light)' : '1px solid rgba(239, 68, 68, 0.22)',
                            borderLeft: b.resolved ? '3px solid #10b981' : '3px solid #ef4444',
                            opacity: b.resolved ? 0.72 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                            {/* Custom rounded checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleResolveBlocker(b.id)}
                              title={b.resolved ? 'Mark as active blocker' : 'Mark as resolved'}
                              style={{
                                width: '15px',
                                height: '15px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                marginTop: '1.5px',
                                transition: 'all 0.15s ease',
                                backgroundColor: b.resolved ? '#10b981' : 'var(--background)',
                                border: b.resolved ? '1.5px solid #10b981' : '1.5px solid rgba(239, 68, 68, 0.6)',
                                padding: 0
                              }}
                            >
                              {b.resolved && <Check size={10} strokeWidth={3.5} color="#ffffff" />}
                            </button>

                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span 
                                title={b.text}
                                style={{
                                  fontSize: '0.74rem',
                                  lineHeight: '1.4',
                                  color: b.resolved ? 'var(--text-muted)' : 'var(--text-primary)',
                                  textDecoration: b.resolved ? 'line-through' : 'none',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  whiteSpace: 'pre-wrap',
                                  fontWeight: b.resolved ? 400 : 500
                                }}
                              >
                                {b.text}
                              </span>
                              {b.resolved && b.resolvedBy ? (
                                <span style={{ fontSize: '0.62rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  Resolved by {b.resolvedBy}
                                </span>
                              ) : b.createdBy ? (
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                  by {b.createdBy}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteBlocker(b.id)}
                            title="Delete blocker"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.35,
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                              marginTop: '1px'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.opacity = '0.35';
                              e.currentTarget.style.color = 'var(--text-muted)';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seamless Linear-style input */}
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--input-bg, var(--background))',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocusCapture={e => {
                      e.currentTarget.style.borderColor = '#ef4444';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.12)';
                    }}
                    onBlurCapture={e => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Plus size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      ref={blockerInputRef}
                      type="text"
                      placeholder="Add a blocker... (press Enter)"
                      value={newBlockerText}
                      onChange={(e) => setNewBlockerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBlocker();
                        }
                      }}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.74rem',
                        color: 'var(--text-primary)',
                        padding: '2px 0'
                      }}
                    />
                    {newBlockerText.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddBlocker()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ef4444')}
                      >
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Comments list */}
                <div className="discussion-messages-container" style={{ flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    const taskComments = comments.filter((c: any) => c.itemId === item.id);
                    return taskComments.length === 0 ? (
                      <div style={{
                        padding: '1.5rem',
                        background: 'var(--background-alt)',
                        borderRadius: '8px',
                        border: '1px dashed var(--border-light)',
                        color: 'var(--text-muted)',
                        fontSize: '0.775rem',
                        textAlign: 'center',
                        margin: 'auto 0'
                      }}>
                        No comments yet on this task.
                      </div>
                    ) : (
                      taskComments.map((comment: any) => {
                        const isBlockerComment = comment.isBlocker || (comment.content && comment.content.toLowerCase().includes('blocker'));
                        const isAuthor = currentUser && (currentUser.name === comment.authorName || currentUser.email === comment.authorEmail);
                        return (
                          <div 
                            key={comment.id} 
                            className="discussion-message-card"
                            style={{
                              borderLeft: isBlockerComment ? '3px solid #ef4444' : '3px solid var(--primary)',
                              backgroundColor: isBlockerComment ? 'rgba(239, 68, 68, 0.03)' : 'var(--card-bg, var(--panel-bg))',
                              fontFamily: 'var(--font-family-base)'
                            }}
                          >
                            <div className="discussion-message-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div 
                                  className="clickup-avatar-circle" 
                                  style={{ 
                                    backgroundColor: getAssigneeColor(comment.authorName),
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    flexShrink: 0
                                  }}
                                >
                                  {getInitials(comment.authorName)}
                                </div>
                                <span className="discussion-message-author" style={{ fontFamily: 'var(--font-family-base)', color: 'var(--text-primary)', fontWeight: 650 }}>
                                  {comment.authorName}
                                </span>
                                {isBlockerComment && (
                                  <span style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}>
                                    <AlertCircle size={9} /> Blocker
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="discussion-message-time" style={{ fontFamily: 'var(--font-family-base)', fontSize: '0.675rem' }}>
                                  {new Date(comment.createdAt).toLocaleDateString('default', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {(canUserEdit || isAuthor) && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const ok = await confirm('Delete Comment', 'Are you sure you want to delete this comment?');
                                      if (ok) {
                                        deleteComment(comment.id);
                                      }
                                    }}
                                    title="Delete comment"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--text-muted)',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      opacity: 0.45,
                                      transition: 'opacity 0.15s, color 0.15s'
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.opacity = '1';
                                      e.currentTarget.style.color = '#ef4444';
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.opacity = '0.45';
                                      e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="discussion-message-content" style={{ fontFamily: 'var(--font-family-base)', fontSize: '0.8rem', lineHeight: '1.5' }}>
                              {comment.content}
                            </div>
                          </div>
                        );
                      })
                    );
                  })()}
                </div>

                {/* Add comment textarea */}
                <div className="discussion-input-area">
                  <textarea
                    className="discussion-textarea"
                    placeholder="Post a reply..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    rows={2}
                  />
                  {commentError && (
                    <span style={{ fontSize: '0.725rem', color: 'var(--danger, #ef4444)' }}>
                      {commentError}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', cursor: 'pointer', color: postAsBlocker ? 'var(--danger, #ef4444)' : 'var(--text-muted)', fontWeight: postAsBlocker ? 700 : 500, userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={postAsBlocker}
                        onChange={(e) => setPostAsBlocker(e.target.checked)}
                        style={{ cursor: 'pointer', accentColor: '#ef4444' }}
                      />
                      <AlertCircle size={11} style={{ color: postAsBlocker ? '#ef4444' : 'currentColor' }} />
                      <span>Flag as Blocker</span>
                    </label>
                    <button
                      onClick={handlePostComment}
                      disabled={isPostingComment || !newCommentText.trim()}
                      className="btn btn-primary discussion-submit-btn"
                    >
                      {isPostingComment ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* ClickUp Comments list */}
                <div className="discussion-messages-container">
                  {loadingCuComments ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: 'auto 0' }}>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <div>Loading comments from ClickUp...</div>
                    </div>
                  ) : cuCommentError ? (
                    <div style={{ color: 'var(--danger)', padding: '1rem', textAlign: 'center', fontSize: '0.75rem' }}>
                      {cuCommentError}
                    </div>
                  ) : clickupComments.length === 0 ? (
                    <div style={{
                      padding: '1.5rem',
                      background: 'var(--background-alt)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-light)',
                      color: 'var(--text-muted)',
                      fontSize: '0.775rem',
                      textAlign: 'center',
                      margin: 'auto 0'
                    }}>
                      No ClickUp comments found on this task.
                    </div>
                  ) : (
                    clickupComments.map((comment: any) => {
                      const cuDate = comment.date ? new Date(Number(comment.date)) : new Date();
                      return (
                        <div key={comment.id} className="discussion-message-card" style={{ borderLeft: '3px solid #7b61ff' }}>
                          <div className="discussion-message-header">
                            <span className="discussion-message-author" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '16px', 
                                height: '16px', 
                                borderRadius: '50%', 
                                fontSize: '0.55rem', 
                                fontWeight: 700, 
                                backgroundColor: comment.user?.color || '#7b61ff', 
                                color: '#fff',
                                marginRight: '2px'
                              }}>
                                {comment.user?.initials || 'CU'}
                              </span>
                              {comment.user?.username || 'ClickUp User'}
                            </span>
                            <span className="discussion-message-time">
                              {cuDate.toLocaleDateString('default', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="discussion-message-content" style={{ whiteSpace: 'pre-wrap' }}>
                            {(() => {
                              let text = comment.comment_text || '';
                              if (text.startsWith('undefined')) {
                                text = text.slice(9);
                              }
                              if (!text && comment.comment) {
                                text = comment.comment.map((part: any) => part.text || '').join('');
                                if (text.startsWith('undefined')) {
                                  text = text.slice(9);
                                }
                              }
                              return text;
                            })()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {historyField && (
        <FieldHistoryModal 
          itemId={item.id}
          fieldName={historyField.name}
          fieldLabel={historyField.label}
          onClose={() => setHistoryField(null)}
        />
      )}
      <CreateClickupTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        featureTitle={item.feature || `Task #${item.id}`}
        featureDesc={item.description || item.notes || ''}
        onTaskCreated={(taskUrl, taskStatus, taskAssignee) => {
          onUpdate(item.id, { 
            taskLink: taskUrl, 
            clickupStatus: taskStatus,
            clickupAssignee: taskAssignee,
            clickupSubtasksCount: 0
          });
        }}
      />

      {/* COLLAPSED EXPAND TAB HANDLE (Pinned flush to the very end of the drawer) */}
      {isChatCollapsed && (
        <button
          type="button"
          onClick={toggleChatCollapse}
          className="drawer-chat-toggle-tab collapsed"
          title="Show Discussion & Comments"
          aria-label="Show Discussion & Comments"
        >
          <ChevronLeft size={16} />
          {(comments.filter((c: any) => c.itemId === item.id).length > 0 || (item.taskLink && clickupComments.length > 0)) && (
            <span className="drawer-chat-toggle-badge">
              {comments.filter((c: any) => c.itemId === item.id).length + (item.taskLink ? clickupComments.length : 0)}
            </span>
          )}
        </button>
      )}
    </div>
  );
};