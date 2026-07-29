import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { triggerReleaseConfetti } from '../utils/confetti';
import type { 
  ProductItem, 
  PlanItem, 
  StudentProject, 
  AMASession, 
  StudentMeeting, 
  AdminCall, 
  TarunSirMeeting,
  ContentItem, 
  DailyIssue, 
  FeatureAdoption,
  ConfigSpeaker,
  ConfigProductGroup,
  ConfigStatus,
  ConfigProgram,
  ConfigCohort,
  FeedbackFormConfig,
  FeedbackSubmission
} from '../types';
import {
  initialSpeakers,
  initialProductGroups,
  initialStatuses,
  initialPrograms,
  initialCohorts
} from '../mockData';

interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  productItems: ProductItem[];
  setProductItems: React.Dispatch<React.SetStateAction<ProductItem[]>>;
  updateProductItem: (id: string, updated: Partial<ProductItem>) => void;
  addProductItem: (item: ProductItem) => void;
  deleteProductItem: (id: string) => void;

  planItems: PlanItem[];
  setPlanItems: React.Dispatch<React.SetStateAction<PlanItem[]>>;
  updatePlanItem: (id: string, updated: Partial<PlanItem>) => void;
  addPlanItem: (item: PlanItem) => void;
  deletePlanItem: (id: string) => void;

  studentProjects: StudentProject[];
  setStudentProjects: React.Dispatch<React.SetStateAction<StudentProject[]>>;
  updateStudentProject: (id: string, updated: Partial<StudentProject>) => void;
  addStudentProject: (item: StudentProject) => void;
  deleteStudentProject: (id: string) => void;

  amaSessions: AMASession[];
  setAMASessions: React.Dispatch<React.SetStateAction<AMASession[]>>;
  updateAMASession: (id: string, updated: Partial<AMASession>) => void;
  addAMASession: (item: AMASession) => void;
  deleteAMASession: (id: string) => void;

  studentMeetings: StudentMeeting[];
  setStudentMeetings: React.Dispatch<React.SetStateAction<StudentMeeting[]>>;
  updateStudentMeeting: (id: string, updated: Partial<StudentMeeting>) => void;
  addStudentMeeting: (item: StudentMeeting) => void;
  deleteStudentMeeting: (id: string) => void;

  adminCalls: AdminCall[];
  setAdminCalls: React.Dispatch<React.SetStateAction<AdminCall[]>>;
  updateAdminCall: (id: string, updated: Partial<AdminCall>) => void;
  addAdminCall: (item: AdminCall) => void;
  deleteAdminCall: (id: string) => void;

  tarunSirMeetings: TarunSirMeeting[];
  setTarunSirMeetings: React.Dispatch<React.SetStateAction<TarunSirMeeting[]>>;
  updateTarunSirMeeting: (id: string, updated: Partial<TarunSirMeeting>) => void;
  addTarunSirMeeting: (item: TarunSirMeeting) => void;
  deleteTarunSirMeeting: (id: string) => void;

  contentItems: ContentItem[];
  setContentItems: React.Dispatch<React.SetStateAction<ContentItem[]>>;
  updateContentItem: (id: string, updated: Partial<ContentItem>) => void;
  addContentItem: (item: ContentItem) => void;
  deleteContentItem: (id: string) => void;

  dailyIssues: DailyIssue[];
  setDailyIssues: React.Dispatch<React.SetStateAction<DailyIssue[]>>;
  updateDailyIssue: (id: string, updated: Partial<DailyIssue>) => void;
  addDailyIssue: (item: DailyIssue) => void;
  deleteDailyIssue: (id: string) => void;

  featureAdoptions: FeatureAdoption[];
  setFeatureAdoptions: React.Dispatch<React.SetStateAction<FeatureAdoption[]>>;
  updateFeatureAdoption: (id: string, updated: Partial<FeatureAdoption>) => void;
  addFeatureAdoption: (item: FeatureAdoption) => void;
  deleteFeatureAdoption: (id: string) => void;


  previewProductId: string | null;
  setPreviewProductId: (id: string | null) => void;
  openPreviewForFeature: (featureName: string, fallbackData?: Partial<ProductItem>) => void;
  activeSubtasksTaskLink: string | null;
  setActiveSubtasksTaskLink: (link: string | null) => void;
  previousTab: string | null;
  setPreviousTab: (tab: string | null) => void;
  tabScrollPositions: Record<string, number>;
  setTabScrollPosition: (tab: string, pos: number) => void;

  // Configuration
  speakers: ConfigSpeaker[];
  addSpeaker: (item: ConfigSpeaker) => void;
  updateSpeaker: (id: string, updated: Partial<ConfigSpeaker>) => void;
  deleteSpeaker: (id: string) => void;

  productGroups: ConfigProductGroup[];
  addProductGroup: (item: ConfigProductGroup) => void;
  updateProductGroup: (id: string, updated: Partial<ConfigProductGroup>) => void;
  deleteProductGroup: (id: string) => void;

  statuses: ConfigStatus[];
  addStatus: (item: ConfigStatus) => void;
  updateStatus: (id: string, updated: Partial<ConfigStatus>) => void;
  deleteStatus: (id: string) => void;

  programs: ConfigProgram[];
  addProgram: (item: ConfigProgram) => void;
  updateProgram: (id: string, updated: Partial<ConfigProgram>) => void;
  deleteProgram: (id: string) => void;

  cohorts: ConfigCohort[];
  addCohort: (item: ConfigCohort) => void;
  updateCohort: (id: string, updated: Partial<ConfigCohort>) => void;
  deleteCohort: (id: string) => void;

  // ClickUp Integration
  clickupApiKey: string;
  setClickupApiKey: (key: string) => void;
  syncClickupTask: (taskIdOrUrl: string) => Promise<{ status: string; subtasksCount: number; assignee: string; name?: string } | null>;
  refreshAllClickupStatuses: () => Promise<{ success: boolean; totalScanned: number; updatedCount: number; error?: string }>;
  registerClickupWebhook: () => Promise<{ success: boolean; error?: string }>;
  checkClickupWebhookStatus: () => Promise<{ success: boolean; registered: boolean; error?: string }>;
  refreshAllData: () => Promise<{ success: boolean; updatedSheets: number; error?: string }>;
  sendEmailDigest: (testRecipient?: string) => Promise<{ success: boolean; message: string; testLink?: string; error?: string }>;

  // Google OAuth Settings
  googleClientId: string;
  setGoogleClientId: (val: string) => void;
  requireGoogleLogin: boolean;
  setRequireGoogleLogin: (val: boolean) => void;
  googleAllowedDomains: string;
  setGoogleAllowedDomains: (val: string) => void;
  sharableCalendarSources: string;
  updateSharableCalendarSources: (val: string) => void;

  // Email Digest Settings
  digestRecipient: string;
  updateDigestRecipient: (val: string) => void;
  digestAppUrl: string;
  updateDigestAppUrl: (val: string) => void;
  digestSMTPHost: string;
  updateDigestSMTPHost: (val: string) => void;
  digestSMTPPort: string;
  updateDigestSMTPPort: (val: string) => void;
  digestSMTPUser: string;
  updateDigestSMTPUser: (val: string) => void;
  digestSMTPPass: string;
  updateDigestSMTPPass: (val: string) => void;
  digestFrequency: string;
  updateDigestFrequency: (val: string) => void;
  digestTime: string;
  updateDigestTime: (val: string) => void;
  digestDayOfWeek: string;
  updateDigestDayOfWeek: (val: string) => void;

  // User Authentication
  currentUser: ConfigSpeaker | null;
  canUserEdit: boolean;
  loginUser: (speakerId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginUserByEmail: (credential: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;

  isLoading: boolean;
  syncStatus: 'syncing' | 'synced' | 'error';
  confirm: (
    message: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    variant?: 'danger' | 'warning' | 'primary' | 'success'
  ) => Promise<boolean>;
  alert: (
    message: string,
    title?: string,
    confirmText?: string,
    variant?: 'danger' | 'warning' | 'primary' | 'success'
  ) => Promise<void>;

  // Form Configurations & Feedback Submissions
  formConfigs: FeedbackFormConfig[];
  setFormConfigs: React.Dispatch<React.SetStateAction<FeedbackFormConfig[]>>;
  saveFormConfig: (config: FeedbackFormConfig) => Promise<void>;
  
  feedbackSubmissions: FeedbackSubmission[];
  setFeedbackSubmissions: React.Dispatch<React.SetStateAction<FeedbackSubmission[]>>;
  addFeedbackSubmission: (submission: Omit<FeedbackSubmission, 'id'>) => Promise<FeedbackSubmission>;
  deleteFeedbackSubmission: (id: string) => Promise<void>;

  // Comments
  comments: any[];
  addComment: (itemId: string, content: string) => Promise<{ success: boolean; comment?: any; error?: string }>;
  lastOpenedMap: Record<string, number>;
  markTaskAsRead: (itemId: string) => void;

  // Scalable additions
  dashboardCounts: any;
  isLoadingCounts: boolean;
  fetchDashboardCounts: (
    dateRangeType: string, 
    customStartDate?: string, 
    customEndDate?: string, 
    statusType?: string,
    hideReleased?: boolean
  ) => Promise<void>;
  fetchDashboardList: (
    source: string, 
    poc: string, 
    status: string, 
    statusType: string, 
    productGroup: string, 
    meetingCategory: string, 
    dateRangeType: string, 
    customStartDate?: string, 
    customEndDate?: string, 
    extraParams?: Record<string, string>,
    page?: number,
    limit?: number
  ) => Promise<{ tasks: any[]; total: number }>;
  calendarEvents: any[];
  isLoadingCalendar: boolean;
  loadCalendarMonth: (year: number, month: number) => Promise<void>;
  loadCommentsForTask: (itemId: string) => Promise<void>;
  loadTabData: (type: string) => Promise<void>;
  isLoadingSprint: boolean;
  fetchSprintData: (monthLabel: string) => Promise<void>;
  fetchProductBreakdownData: (options: {
    product: string;
    page: number;
    limit: number;
    search?: string;
    superPriority?: boolean;
    statuses?: string[];
    pocs?: string[];
    sortField?: string;
    sortAsc?: boolean;
  }) => Promise<{ success: boolean; data: any[]; totalItems: number; totalPages: number; productCounts?: Record<string, { total: number; completed: number }>; completedItems?: number }>;
  fetchPaginatedMeetingsData: (options: {
    type: 'amaSessions' | 'adminCalls' | 'tarunSirMeetings' | 'amaFeedback' | 'adminFeedback' | 'tarunFeedback' | 'dailyIssues' | 'featureRequests';
    page: number;
    limit: number;
    search?: string;
    superPriority?: boolean;
    priority?: string;
    product?: string;
    statuses?: string[];
    programs?: string[];
    pocs?: string[];
    sortField?: string;
    sortAsc?: boolean;
  }) => Promise<{ success: boolean; data: any[]; totalItems: number; totalPages: number; completedItems?: number }>;
  searchGlobalTasks: (query: string) => Promise<{ success: boolean; data: any[] }>;
  highlightedCallId: string | null;
  setHighlightedCallId: (id: string | null) => void;
  meetingSearchQuery: string;
  setMeetingSearchQuery: (query: string) => void;
  loadedTabs: string[];
  calendarMonth: Date;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
}


const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Data version reset ──────────────────────────────────────────────────────
  // Bump this version string whenever a clean-slate wipe is needed.
  // Any browser that has an older (or missing) version key will have all
  // its cached data cleared before the state initialisers run below.
  const DATA_VERSION = 'v2-clean';
  if (localStorage.getItem('data-version') !== DATA_VERSION) {
    const keysToRemove = [
      'data-products', 'data-plans', 'data-student-projects',
      'data-ama-sessions', 'data-student-meetings', 'data-admin-calls',
      'data-content-items', 'data-daily-issues', 'data-feature-adoptions',
      'config-speakers', 'config-product-groups', 'config-statuses',
      'config-programs', 'config-cohorts',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('data-version', DATA_VERSION);
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Set static light theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  // StrictMode & double-mount prevention refs
  const hasInitializedRef = useRef(false);
  const activeFetchesRef = useRef<Record<string, Promise<Response> | undefined>>({});
  const pendingWritesRef = useRef<Promise<any>>(Promise.resolve());

  // Deduplicate concurrent GET requests
  const dedupedFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
    if (!isGet) {
      return fetch(url, options);
    }

    // Wait for all pending database writes to complete BEFORE sending any GET requests
    await pendingWritesRef.current;

    // Add a 1-second rounded cache-buster to prevent browser caching while preserving concurrent deduplication
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}_b=${Math.floor(Date.now() / 1000)}`;

    const headersKey = options?.headers ? JSON.stringify(options.headers) : '';
    const key = `${finalUrl}::${headersKey}`;

    if (activeFetchesRef.current[key]) {
      const res = await activeFetchesRef.current[key];
      return res.clone();
    }

    const promise = fetch(finalUrl, options);
    activeFetchesRef.current[key] = promise;

    try {
      const res = await promise;
      return res.clone();
    } finally {
      delete activeFetchesRef.current[key];
    }
  }, []);

  // Active Tab state
  const [activeTab, rawSetActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const validTabs = ['dashboard', 'product', 'plan', 'projects', 'meetings', 'admin', 'content', 'product-wise', 'issues', 'adoption', 'config'];
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }
    return localStorage.getItem('active-tab') || 'dashboard';
  });

  const [previewProductId, setPreviewProductId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('task');
  });
  const [activeSubtasksTaskLink, setActiveSubtasksTaskLink] = useState<string | null>(null);

  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [tabScrollPositions, setTabScrollPositions] = useState<Record<string, number>>({});

  const setTabScrollPosition = (tab: string, pos: number) => {
    setTabScrollPositions(prev => ({ ...prev, [tab]: pos }));
  };

  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  const confirm = (
    message: string,
    title = 'Confirm Action',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant: 'danger' | 'warning' | 'primary' | 'success' = 'danger'
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'confirm',
        message,
        title,
        confirmText,
        cancelText,
        variant,
        resolve,
      });
    });
  };

  const alert = (
    message: string,
    title = 'Information',
    confirmText = 'OK',
    variant: 'danger' | 'warning' | 'primary' | 'success' = 'primary'
  ): Promise<void> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        type: 'alert',
        message,
        title,
        confirmText,
        cancelText: '',
        variant,
        resolve: () => resolve(),
      });
    });
  };

  const handleDialogClose = (result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result);
      setDialogState(null);
    }
  };

  useEffect(() => {
    if (!previewProductId) {
      setPreviousTab(null);
    }
  }, [previewProductId]);

  const setActiveTab = (tab: string) => {
    rawSetActiveTab(tab);
    setPreviewProductId(null);
  };

  // Sync state changes to browser URL search parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    const currentTab = url.searchParams.get('tab');
    const currentTask = url.searchParams.get('task');

    if (currentTab !== activeTab || currentTask !== previewProductId) {
      url.searchParams.set('tab', activeTab);
      if (previewProductId) {
        url.searchParams.set('task', previewProductId);
      } else {
        url.searchParams.delete('task');
      }
      window.history.pushState({}, '', url.pathname + url.search + url.hash);
      localStorage.setItem('active-tab', activeTab);
    }
  }, [activeTab, previewProductId]);

  // Handle browser back/forward history navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const taskParam = params.get('task');

      const validTabs = ['dashboard', 'calendar', 'product', 'plan', 'projects', 'meetings', 'admin', 'content', 'product-wise', 'issues', 'adoption', 'config'];
      if (tabParam && validTabs.includes(tabParam)) {
        rawSetActiveTab(tabParam);
      }
      setPreviewProductId(taskParam);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openPreviewForFeature = (featureName: string, fallbackData?: Partial<ProductItem>) => {
    if (!featureName && !fallbackData?.feature) return;
    const name = featureName || fallbackData?.feature || '';
    
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = clean(name);
    
    // 1. Check exact ID match if fallbackData.id is provided
    let match = fallbackData?.id ? productItems.find(item => item.id === fallbackData.id) : undefined;

    // 2. Check exact or substring match in productItems
    if (!match && cleanName) {
      match = productItems.find(item => {
        const cleanFeature = clean(item.feature);
        return cleanFeature && (cleanName.includes(cleanFeature) || cleanFeature.includes(cleanName));
      });
    }

    // 3. Token overlap match (2+ common words with length > 3)
    if (!match && name) {
      const nameWords = name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      match = productItems.find(item => {
        const featureWords = item.feature.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const common = nameWords.filter(w => featureWords.includes(w));
        return common.length >= 2;
      });
    }

    if (match) {
      if (fallbackData) {
        // Synchronize the existing match with the latest fallback data
        let productStatus = fallbackData.status || '';
        const statusLower = productStatus.toLowerCase();
        if (statusLower === 'delivered' || statusLower === 'completed') {
          productStatus = 'Completed';
        } else if (statusLower === 'cancelled' || statusLower === 'on hold') {
          productStatus = 'On Hold';
        } else if (statusLower === 'in-progress' || statusLower === 'in progress') {
          productStatus = 'In Progress';
        }

        setProductItems(prev => prev.map(item => {
          if (item.id === match.id) {
            return {
              ...item,
              description: fallbackData.description !== undefined ? fallbackData.description : item.description,
              tarunSirApproval: fallbackData.tarunSirApproval !== undefined ? fallbackData.tarunSirApproval : item.tarunSirApproval,
              raisedByTarunSir: fallbackData.raisedByTarunSir !== undefined ? fallbackData.raisedByTarunSir : item.raisedByTarunSir,
              priority: (fallbackData.priority as any) !== undefined ? fallbackData.priority : item.priority,
              poc: fallbackData.poc !== undefined ? fallbackData.poc : item.poc,
              status: (productStatus || item.status) as any,
              clickupStatus: fallbackData.clickupStatus !== undefined ? fallbackData.clickupStatus : item.clickupStatus,
              taskLink: fallbackData.taskLink !== undefined ? fallbackData.taskLink : item.taskLink,
              blocker: fallbackData.blocker !== undefined ? fallbackData.blocker : item.blocker,
              deadline: fallbackData.deadline !== undefined ? fallbackData.deadline : item.deadline,
              notes: fallbackData.notes !== undefined ? fallbackData.notes : item.notes,
              product: fallbackData.product !== undefined ? fallbackData.product : item.product,
              module: fallbackData.module !== undefined ? fallbackData.module : item.module,
              type: fallbackData.type !== undefined ? fallbackData.type : item.type,
              uiux: fallbackData.uiux !== undefined ? fallbackData.uiux : item.uiux,
              finalRelease: fallbackData.finalRelease !== undefined ? fallbackData.finalRelease : item.finalRelease,
              productDeadline: fallbackData.productDeadline !== undefined ? fallbackData.productDeadline : item.productDeadline,
              productDeadlineCompleted: fallbackData.productDeadlineCompleted !== undefined ? fallbackData.productDeadlineCompleted : item.productDeadlineCompleted,
              uiuxCompleted: fallbackData.uiuxCompleted !== undefined ? fallbackData.uiuxCompleted : item.uiuxCompleted,
              deadlineCompleted: fallbackData.deadlineCompleted !== undefined ? fallbackData.deadlineCompleted : item.deadlineCompleted,
              finalReleaseCompleted: fallbackData.finalReleaseCompleted !== undefined ? fallbackData.finalReleaseCompleted : item.finalReleaseCompleted,
              createdAt: fallbackData.createdAt !== undefined ? fallbackData.createdAt : item.createdAt,
              clickupSubtasksCount: fallbackData.clickupSubtasksCount !== undefined ? fallbackData.clickupSubtasksCount : item.clickupSubtasksCount,
              clickupAssignee: fallbackData.clickupAssignee !== undefined ? fallbackData.clickupAssignee : item.clickupAssignee,
            } as ProductItem;
          }
          return item;
        }));
      }
      setPreviewProductId(match.id);
    } else {
      // Map statuses from other task types to ProductItem statuses
      let productStatus = fallbackData?.status || '';
      const statusLower = productStatus.toLowerCase();
      if (statusLower === 'delivered' || statusLower === 'completed') {
        productStatus = 'Completed';
      } else if (statusLower === 'cancelled' || statusLower === 'on hold') {
        productStatus = 'On Hold';
      } else if (statusLower === 'in-progress' || statusLower === 'in progress') {
        productStatus = 'In Progress';
      }

      const tempId = fallbackData?.id ? `prod-temp-${fallbackData.id}` : `prod-temp-${Date.now()}`;
      // Create a temporary mock product item using the fallbackData or title so they still see it in the premium feature layout!
      const newTempProduct: ProductItem = {
        id: tempId,
        feature: featureName,
        description: fallbackData?.description || '',
        tarunSirApproval: fallbackData?.tarunSirApproval || false,
        raisedByTarunSir: fallbackData?.raisedByTarunSir || false,
        priority: (fallbackData?.priority as any) || '',
        poc: fallbackData?.poc || currentUser?.name || 'Akash Sharma',
        status: productStatus as any,
        clickupStatus: fallbackData?.clickupStatus || '',
        taskLink: fallbackData?.taskLink || '',
        blocker: fallbackData?.blocker || '',
        deadline: fallbackData?.deadline || '',
        notes: fallbackData?.notes || '',
        product: fallbackData?.product || '',
        module: fallbackData?.module || '',
        type: fallbackData?.type || '',
        uiux: fallbackData?.uiux || '',
        finalRelease: fallbackData?.finalRelease || '',
        productDeadline: fallbackData?.productDeadline || '',
        productDeadlineCompleted: fallbackData?.productDeadlineCompleted || false,
        uiuxCompleted: fallbackData?.uiuxCompleted || false,
        deadlineCompleted: fallbackData?.deadlineCompleted || false,
        finalReleaseCompleted: fallbackData?.finalReleaseCompleted || false,
        createdAt: fallbackData?.createdAt || new Date().toISOString(),
        clickupSubtasksCount: fallbackData?.clickupSubtasksCount,
        clickupAssignee: fallbackData?.clickupAssignee || ''
      };
      
      setProductItems(prev => [...prev, newTempProduct]);
      setPreviewProductId(newTempProduct.id);
    }
  };

  // Data states loaded dynamically
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [studentProjects, setStudentProjects] = useState<StudentProject[]>([]);
  const [amaSessions, setAMASessions] = useState<AMASession[]>([]);
  const [studentMeetings, setStudentMeetings] = useState<StudentMeeting[]>([]);
  const [adminCalls, setAdminCalls] = useState<AdminCall[]>([]);
  const [tarunSirMeetings, setTarunSirMeetings] = useState<TarunSirMeeting[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [dailyIssues, setDailyIssues] = useState<DailyIssue[]>([]);
  const [featureAdoptions, setFeatureAdoptions] = useState<FeatureAdoption[]>([]);



  // Config state
  const [speakers, setSpeakers] = useState<ConfigSpeaker[]>(() => {
    const data = localStorage.getItem('config-speakers');
    return data ? JSON.parse(data) : initialSpeakers;
  });

  const [productGroups, setProductGroups] = useState<ConfigProductGroup[]>(() => {
    const data = localStorage.getItem('config-product-groups');
    return data ? JSON.parse(data) : initialProductGroups;
  });

  const [statuses, setStatuses] = useState<ConfigStatus[]>(() => {
    const data = localStorage.getItem('config-statuses');
    return data ? JSON.parse(data) : initialStatuses;
  });

  const [programs, setPrograms] = useState<ConfigProgram[]>(() => {
    const data = localStorage.getItem('config-programs');
    return data ? JSON.parse(data) : initialPrograms;
  });

  const [cohorts, setCohorts] = useState<ConfigCohort[]>(() => {
    const data = localStorage.getItem('config-cohorts');
    return data ? JSON.parse(data) : initialCohorts;
  });

  const [clickupApiKey, setClickupApiKey] = useState<string>(() => {
    return localStorage.getItem('config-clickup-api-key') || '';
  });

  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem('config-google-client-id') || '';
  });

  const [requireGoogleLogin, setRequireGoogleLogin] = useState<boolean>(() => {
    return localStorage.getItem('config-require-google-login') === 'true';
  });

  const [googleAllowedDomains, setGoogleAllowedDomains] = useState<string>(() => {
    return localStorage.getItem('config-google-allowed-domains') || '';
  });

  const [sharableCalendarSources, setSharableCalendarSources] = useState<string>(() => {
    return localStorage.getItem('config-sharable-calendar-sources') || 'product,projects,meetings,admin,tarun-meetings,content,issues';
  });

  const [digestRecipient, setDigestRecipient] = useState<string>(() => {
    return localStorage.getItem('config-digest-recipient') || '';
  });
  const [digestAppUrl, setDigestAppUrl] = useState<string>(() => {
    return localStorage.getItem('config-digest-app-url') || '';
  });
  const [digestSMTPHost, setDigestSMTPHost] = useState<string>(() => {
    return localStorage.getItem('config-digest-smtp-host') || '';
  });
  const [digestSMTPPort, setDigestSMTPPort] = useState<string>(() => {
    return localStorage.getItem('config-digest-smtp-port') || '';
  });
  const [digestSMTPUser, setDigestSMTPUser] = useState<string>(() => {
    return localStorage.getItem('config-digest-smtp-user') || '';
  });
  const [digestSMTPPass, setDigestSMTPPass] = useState<string>(() => {
    return localStorage.getItem('config-digest-smtp-pass') || '';
  });
  const [digestFrequency, setDigestFrequency] = useState<string>(() => {
    return localStorage.getItem('config-digest-frequency') || 'weekly';
  });
  const [digestTime, setDigestTime] = useState<string>(() => {
    return localStorage.getItem('config-digest-time') || '09:00';
  });
  const [digestDayOfWeek, setDigestDayOfWeek] = useState<string>(() => {
    return localStorage.getItem('config-digest-day-of-week') || 'Monday';
  });

  useEffect(() => {
    localStorage.setItem('config-digest-frequency', digestFrequency);
  }, [digestFrequency]);
  useEffect(() => {
    localStorage.setItem('config-digest-time', digestTime);
  }, [digestTime]);
  useEffect(() => {
    localStorage.setItem('config-digest-day-of-week', digestDayOfWeek);
  }, [digestDayOfWeek]);

  const [formConfigs, setFormConfigs] = useState<FeedbackFormConfig[]>(() => {
    const data = localStorage.getItem('config-form-configs');
    return data ? JSON.parse(data) : [];
  });

  const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>(() => {
    const data = localStorage.getItem('data-feedback-submissions');
    return data ? JSON.parse(data) : [];
  });

  useEffect(() => {
    localStorage.setItem('config-form-configs', JSON.stringify(formConfigs));
  }, [formConfigs]);

  useEffect(() => {
    localStorage.setItem('data-feedback-submissions', JSON.stringify(feedbackSubmissions));
  }, [feedbackSubmissions]);

  const [comments, setComments] = useState<any[]>(() => {
    const data = localStorage.getItem('data-comments');
    return data ? JSON.parse(data) : [];
  });

  useEffect(() => {
    localStorage.setItem('data-comments', JSON.stringify(comments));
  }, [comments]);

  const [lastOpenedMap, setLastOpenedMap] = useState<Record<string, number>>(() => {
    try {
      const data = localStorage.getItem('task-last-opened-times');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  });

  const markTaskAsRead = useCallback((itemId: string) => {
    setLastOpenedMap(prev => {
      const updated = { ...prev, [itemId]: Date.now() };
      localStorage.setItem('task-last-opened-times', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    if (previewProductId) {
      const baseId = previewProductId.replace('prod-temp-', '');
      markTaskAsRead(baseId);
      markTaskAsRead(previewProductId);
      loadCommentsForTask(baseId);
    }
  }, [previewProductId, markTaskAsRead]);

  // Load single product task details on-demand if missing from local memory (since lazy load is disabled)
  useEffect(() => {
    if (previewProductId && previewProductId.startsWith('prod-') && !previewProductId.startsWith('prod-temp-')) {
      const exists = productItems.some(i => i.id === previewProductId);
      if (!exists) {
        const fetchSingleProduct = async () => {
          try {
            const headers: Record<string, string> = {};
            const savedUserId = localStorage.getItem('logged-in-user-id');
            if (savedUserId) {
              headers['x-user-id'] = savedUserId;
            }
            const response = await dedupedFetch(`/api/data?action=single-task&id=${encodeURIComponent(previewProductId)}`, { headers });
            if (response.ok) {
              const resData = await response.json();
              if (resData.success && resData.data) {
                setProductItems(prev => {
                  const alreadyPresent = prev.some(i => i.id === resData.data.id);
                  if (alreadyPresent) return prev;
                  return [...prev, resData.data];
                });
              }
            }
          } catch (e) {
            console.error('Failed to fetch single product:', e);
          }
        };
        fetchSingleProduct();
      }
    }
  }, [previewProductId, productItems]);

  const [currentUser, setCurrentUser] = useState<ConfigSpeaker | null>(() => {
    const savedUserData = localStorage.getItem('logged-in-user-data');
    if (savedUserData) {
      try {
        return JSON.parse(savedUserData);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const canUserEdit = currentUser ? (currentUser.canEdit !== false) : true;

  const loginUser = async (speakerId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const speaker = speakers.find(s => s.id === speakerId);
    if (!speaker) {
      return { success: false, error: 'User not found' };
    }
    const dbPassword = speaker.password || '1234';
    if (dbPassword !== password) {
      return { success: false, error: 'Incorrect password' };
    }
    setCurrentUser(speaker);
    localStorage.setItem('logged-in-user-id', speakerId);
    localStorage.setItem('logged-in-user-data', JSON.stringify(speaker));
    return { success: true };
  };

  const loginUserByEmail = async (credential: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'login',
          type: 'speakers',
          id: null,
          data: { credential }
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        return { success: false, error: resData.error || 'Authentication failed' };
      }

      const speaker = resData.user;
      setCurrentUser(speaker);
      localStorage.setItem('logged-in-user-id', speaker.id);
      localStorage.setItem('logged-in-user-data', JSON.stringify(speaker));

      // Fetch the full authenticated dataset now that logged-in-user-id is saved
      await refreshAllData();

      return { success: true };
    } catch (err: any) {
      console.error('loginUserByEmail error:', err);
      return { success: false, error: err.message || 'Network error during Google Sign-in verification.' };
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('logged-in-user-id');
    localStorage.removeItem('logged-in-user-data');
  };


  useEffect(() => {
    localStorage.setItem('active-tab', activeTab);
  }, [activeTab]);

  // Persist datasets (config lists only)

  useEffect(() => {
    localStorage.setItem('config-speakers', JSON.stringify(speakers));
  }, [speakers]);

  useEffect(() => {
    localStorage.setItem('config-product-groups', JSON.stringify(productGroups));
  }, [productGroups]);

  useEffect(() => {
    localStorage.setItem('config-statuses', JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem('config-programs', JSON.stringify(programs));
  }, [programs]);

  useEffect(() => {
    localStorage.setItem('config-cohorts', JSON.stringify(cohorts));
  }, [cohorts]);

  useEffect(() => {
    localStorage.setItem('config-clickup-api-key', clickupApiKey);
  }, [clickupApiKey]);

  useEffect(() => {
    localStorage.setItem('config-google-client-id', googleClientId);
  }, [googleClientId]);

  useEffect(() => {
    localStorage.setItem('config-require-google-login', String(requireGoogleLogin));
  }, [requireGoogleLogin]);

  useEffect(() => {
    localStorage.setItem('config-google-allowed-domains', googleAllowedDomains);
  }, [googleAllowedDomains]);

  useEffect(() => {
    localStorage.setItem('config-sharable-calendar-sources', sharableCalendarSources);
  }, [sharableCalendarSources]);

  useEffect(() => {
    localStorage.setItem('config-digest-recipient', digestRecipient);
  }, [digestRecipient]);

  useEffect(() => {
    localStorage.setItem('config-digest-app-url', digestAppUrl);
  }, [digestAppUrl]);

  useEffect(() => {
    localStorage.setItem('config-digest-smtp-host', digestSMTPHost);
  }, [digestSMTPHost]);

  useEffect(() => {
    localStorage.setItem('config-digest-smtp-port', digestSMTPPort);
  }, [digestSMTPPort]);

  useEffect(() => {
    localStorage.setItem('config-digest-smtp-user', digestSMTPUser);
  }, [digestSMTPUser]);

  useEffect(() => {
    localStorage.setItem('config-digest-smtp-pass', digestSMTPPass);
  }, [digestSMTPPass]);


  // Helper to persist to API
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('synced');

  const persistChange = async (action: 'create' | 'update' | 'delete' | 'batch-import', type: string, id: string | null, data: any) => {
    setSyncStatus('syncing');
    const writePromise = (async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        const savedUserId = localStorage.getItem('logged-in-user-id');
        if (savedUserId) {
          headers['x-user-id'] = savedUserId;
        }

        const response = await fetch('/api/data', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action, type, id, data })
        });
        if (response.ok) {
          setSyncStatus('synced');
        } else {
          console.error(`Persist failed for ${type} ${action}:`, await response.text());
          setSyncStatus('error');
        }
      } catch (err) {
        console.error(`Failed to connect to API for ${type} ${action}:`, err);
        setSyncStatus('error');
      }
    })();

    pendingWritesRef.current = pendingWritesRef.current.then(() => writePromise).catch(() => {});
    return writePromise;
  };

  // Mounting effect to fetch all data from MongoDB
  const [isLoading, setIsLoading] = useState(true);

  const [dashboardCounts, setDashboardCounts] = useState<any>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingSprint, setIsLoadingSprint] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<string[]>([]);
  const [highlightedCallId, setHighlightedCallId] = useState<string | null>(null);
  const [meetingSearchQuery, setMeetingSearchQuery] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Helper to load tab dataset on-demand
  const loadTabData = useCallback(async (tabName: string) => {
    const tabToType: Record<string, string[]> = {
      'product': ['products'],
      'plan': ['plans', 'products', 'projects', 'contentItems', 'dailyIssues'],
      'projects': ['projects'],
      'meetings': ['studentMeetings', 'amaSessions', 'products'],
      'admin': ['adminCalls', 'products'],
      'tarun-meetings': ['tarunSirMeetings', 'products'],
      'content': ['contentItems'],
      'product-wise': [],
      'issues': ['dailyIssues'],
      'feature-requests': ['dailyIssues'],
      'adoption': ['featureAdoptions']
    };

    const typesToLoad = tabToType[tabName] || [];
    if (typesToLoad.length === 0) return;

    const allAlreadyLoaded = typesToLoad.every(type => loadedTabs.includes(type));
    if (allAlreadyLoaded) return;

    setSyncStatus('syncing');
    try {
      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      await Promise.all(typesToLoad.map(async (type) => {
        if (loadedTabs.includes(type)) return;

        const response = await dedupedFetch(`/api/data?action=tab-data&type=${type}`, { headers });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            const dataList = resData.data;
            if (type === 'products') setProductItems(dataList);
            if (type === 'plans') setPlanItems(dataList);
            if (type === 'projects') setStudentProjects(dataList);
            if (type === 'amaSessions') setAMASessions(dataList);
            if (type === 'studentMeetings') setStudentMeetings(dataList);
            if (type === 'adminCalls') setAdminCalls(dataList);
            if (type === 'tarunSirMeetings') setTarunSirMeetings(dataList);
            if (type === 'contentItems') setContentItems(dataList);
            if (type === 'dailyIssues') setDailyIssues(dataList);
            if (type === 'featureAdoptions') setFeatureAdoptions(dataList);
            
            setLoadedTabs(prev => [...prev, type]);
          }
        }
      }));
      setSyncStatus('synced');
    } catch (err) {
      console.error(`Failed to lazy load tab data for ${tabName}:`, err);
      setSyncStatus('error');
    }
  }, [loadedTabs]);

  // Effect to lazy-load tab datasets when activeTab changes
  useEffect(() => {
    if (activeTab && activeTab !== 'dashboard' && activeTab !== 'calendar' && activeTab !== 'config' && activeTab !== 'plan') {
      loadTabData(activeTab);
    }
  }, [activeTab]);


  const fetchDashboardCounts = useCallback(async (
    dateRangeType: string, 
    customStartDate?: string, 
    customEndDate?: string, 
    statusType?: string,
    hideReleased?: boolean
  ) => {
    setIsLoadingCounts(true);
    setSyncStatus('syncing');
    try {
      const params = new URLSearchParams();
      params.append('action', 'dashboard-counts');
      if (dateRangeType) params.append('dateRangeType', dateRangeType);
      if (statusType) params.append('statusType', statusType);
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);
      if (hideReleased) params.append('hideReleased', 'true');

      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(`/api/data?${params.toString().replace(/\+/g, '%20')}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          setDashboardCounts(resData.data);
          setSyncStatus('synced');
        }
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard counts:', err);
      setSyncStatus('error');
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  // Refresh dashboard counts when user navigates to the dashboard tab
  useEffect(() => {
    if (activeTab === 'dashboard' && !isLoading) {
      fetchDashboardCounts('all', '', '', 'clickup', true);
    }
  }, [activeTab, isLoading, fetchDashboardCounts]);

  const fetchDashboardList = useCallback(async (
    source: string,
    poc: string,
    status: string,
    statusType: string,
    productGroup: string,
    meetingCategory: string,
    dateRangeType: string,
    customStartDate?: string,
    customEndDate?: string,
    extraParams?: Record<string, string>,
    page = 1,
    limit = 10
  ): Promise<{ tasks: any[]; total: number }> => {
    setSyncStatus('syncing');
    try {
      const params = new URLSearchParams();
      params.append('action', 'dashboard-list');
      if (source) params.append('source', source);
      if (poc) params.append('poc', poc);
      if (status) params.append('status', status);
      if (statusType) params.append('statusType', statusType);
      if (productGroup) params.append('productGroup', productGroup);
      if (meetingCategory) params.append('meetingCategory', meetingCategory);
      if (dateRangeType) params.append('dateRangeType', dateRangeType);
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => {
          if (v) params.append(k, v);
        });
      }

      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(`/api/data?${params.toString().replace(/\+/g, '%20')}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        setSyncStatus('synced');
        if (resData.success && resData.data) {
          return { tasks: resData.data, total: resData.total || 0 };
        }
      }
      setSyncStatus('error');
      return { tasks: [], total: 0 };
    } catch (err) {
      console.error('Failed to fetch dashboard list:', err);
      setSyncStatus('error');
      return { tasks: [], total: 0 };
    }
  }, []);

  const fetchProductBreakdownData = useCallback(async (options: {
    product: string;
    page: number;
    limit: number;
    search?: string;
    superPriority?: boolean;
    statuses?: string[];
    pocs?: string[];
    sortField?: string;
    sortAsc?: boolean;
  }) => {
    setSyncStatus('syncing');
    try {
      const params = new URLSearchParams();
      params.append('action', 'product-breakdown-data');
      params.append('product', options.product);
      params.append('page', String(options.page));
      params.append('limit', String(options.limit));
      if (options.search) params.append('search', options.search);
      if (options.superPriority) params.append('superPriority', 'true');
      if (options.statuses && options.statuses.length > 0) {
        params.append('statuses', options.statuses.join(','));
      }
      if (options.pocs && options.pocs.length > 0) {
        params.append('pocs', options.pocs.join(','));
      }
      if (options.sortField) params.append('sortField', options.sortField);
      if (options.sortAsc !== undefined) params.append('sortAsc', String(options.sortAsc));

      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(`/api/data?${params.toString().replace(/\+/g, '%20')}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        setSyncStatus('synced');
        return resData;
      }
      setSyncStatus('error');
      return { success: false, data: [], totalItems: 0, totalPages: 1 };
    } catch (err) {
      console.error('Failed to fetch product breakdown data:', err);
      setSyncStatus('error');
      return { success: false, data: [], totalItems: 0, totalPages: 1 };
    }
  }, []);

  const fetchPaginatedMeetingsData = useCallback(async (options: {
    type: 'amaSessions' | 'adminCalls' | 'tarunSirMeetings' | 'amaFeedback' | 'adminFeedback' | 'tarunFeedback' | 'dailyIssues' | 'featureRequests';
    page: number;
    limit: number;
    search?: string;
    superPriority?: boolean;
    priority?: string;
    product?: string;
    statuses?: string[];
    programs?: string[];
    pocs?: string[];
    sortField?: string;
    sortAsc?: boolean;
  }) => {
    setSyncStatus('syncing');
    try {
      const params = new URLSearchParams();
      params.append('action', 'paginated-meetings-data');
      params.append('type', options.type);
      params.append('page', String(options.page));
      params.append('limit', String(options.limit));
      if (options.search) params.append('search', options.search);
      if (options.superPriority) params.append('superPriority', 'true');
      if (options.priority) params.append('priority', options.priority);
      if (options.product) params.append('product', options.product);
      if (options.statuses && options.statuses.length > 0) {
        params.append('statuses', options.statuses.join(','));
      }
      if (options.programs && options.programs.length > 0) {
        params.append('programs', options.programs.join(','));
      }
      if (options.pocs && options.pocs.length > 0) {
        params.append('pocs', options.pocs.join(','));
      }
      if (options.sortField) params.append('sortField', options.sortField);
      if (options.sortAsc !== undefined) params.append('sortAsc', String(options.sortAsc));

      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(`/api/data?${params.toString().replace(/\+/g, '%20')}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        setSyncStatus('synced');
        return resData;
      }
      setSyncStatus('error');
      return { success: false, data: [], totalItems: 0, totalPages: 1 };
    } catch (err) {
      console.error('Failed to fetch paginated meetings data:', err);
      setSyncStatus('error');
      return { success: false, data: [], totalItems: 0, totalPages: 1 };
    }
  }, []);

  const searchGlobalTasks = useCallback(async (query: string) => {
    try {
      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }
      const response = await dedupedFetch(`/api/data?action=global-search&q=${encodeURIComponent(query)}`, { headers });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error('Failed to perform global search:', err);
    }
    return { success: false, data: [] };
  }, []);

  const loadCalendarMonth = useCallback(async (year: number, month: number) => {
    setIsLoadingCalendar(true);
    setSyncStatus('syncing');
    try {
      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const isPublicCalendar = searchParams.get('public-calendar') === 'true';
      let url = `/api/data?action=calendar-events&year=${year}&month=${month}`;
      if (isPublicCalendar) {
        url += '&public-calendar=true';
      }

      const response = await dedupedFetch(url, { headers });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          setCalendarEvents(resData.data);
          setSyncStatus('synced');
        }
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setSyncStatus('error');
    } finally {
      setIsLoadingCalendar(false);
    }
  }, []);

  // PWA App Badge Overdue Count Calculator
  const totalOverdueCount = useMemo(() => {
    const seen = new Set<string>();
    const allEvts = (calendarEvents || [])
      .filter((evt: any) => {
        if (seen.has(evt.id)) return false;
        seen.add(evt.id);
        return true;
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEvts.filter(evt => {
      if (evt.isCompleted) return false;
      const evtDate = new Date(evt.dateStr);
      evtDate.setHours(0, 0, 0, 0);
      return evtDate < today;
    }).length;
  }, [calendarEvents]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (totalOverdueCount > 0) {
        navigator.setAppBadge(totalOverdueCount).catch(err => {
          console.error('Failed to set app badge:', err);
        });
      } else {
        navigator.clearAppBadge().catch(err => {
          console.error('Failed to clear app badge:', err);
        });
      }
    }
  }, [totalOverdueCount]);



  const loadCommentsForTask = useCallback(async (itemId: string) => {
    setSyncStatus('syncing');
    try {
      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(`/api/data?action=comments&itemId=${itemId}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          setComments(prev => {
            const filtered = prev.filter(c => c.itemId !== itemId);
            return [...filtered, ...resData.data];
          });
          setSyncStatus('synced');
        }
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Failed to load comments for task:', err);
      setSyncStatus('error');
    }
  }, []);

  const fetchSprintData = useCallback(async (monthLabel: string) => {
    setIsLoadingSprint(true);
    setSyncStatus('syncing');
    try {
      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(`/api/data?action=sprint-planning-data&monthLabel=${encodeURIComponent(monthLabel)}`, { headers });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          const { plans, products, projects, contentItems, dailyIssues } = resData.data;
          setPlanItems(plans);
          setProductItems(products);
          setStudentProjects(projects);
          setContentItems(contentItems);
          setDailyIssues(dailyIssues);
          
          // Clear loaded status for lists so they fetch full content if switched back
          setLoadedTabs(prev => prev.filter(t => !['products', 'projects', 'contentItems', 'dailyIssues'].includes(t)));
          setSyncStatus('synced');
        }
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Failed to fetch sprint data:', err);
      setSyncStatus('error');
    } finally {
      setIsLoadingSprint(false);
    }
  }, []);

  // Reusable data fetch — used on mount AND by the "Refresh Data" button
  const refreshAllData = async (): Promise<{ success: boolean; updatedSheets: number; error?: string }> => {
    setSyncStatus('syncing');
    let updatedSheets = 0;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const feedbackId = searchParams.get('feedback');
      const feedbackCategory = searchParams.get('category');
      const isPublicCalendar = searchParams.get('public-calendar') === 'true';
      
      let url = '/api/data';
      const params = new URLSearchParams();
      if (feedbackId) {
        params.append('feedback', feedbackId);
        if (feedbackCategory) {
          params.append('category', feedbackCategory);
        }
      } else if (isPublicCalendar) {
        params.append('public-calendar', 'true');
      } else {
        params.append('action', 'init');
      }
      params.append('_t', Date.now().toString());
      const queryString = params.toString().replace(/\+/g, '%20');
      if (queryString) {
        url += `?${queryString}`;
      }

      const headers: Record<string, string> = {};
      const savedUserId = localStorage.getItem('logged-in-user-id');
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const response = await dedupedFetch(url, { headers });
      if (!response.ok) {
        setSyncStatus('error');
        return { success: false, updatedSheets: 0, error: 'Server returned an error' };
      }
      const resData = await response.json();
      if (resData.success && resData.data) {
        const db = resData.data;
        if (db.products !== undefined)                       { setProductItems(db.products);       updatedSheets++; }
        if (db.plans !== undefined)                          { setPlanItems(db.plans);             updatedSheets++; }
        if (db.projects !== undefined)                       { setStudentProjects(db.projects);    updatedSheets++; }
        if (db.amaSessions !== undefined)                    { setAMASessions(db.amaSessions);     updatedSheets++; }
        if (db.studentMeetings !== undefined)                { setStudentMeetings(db.studentMeetings); updatedSheets++; }
        if (db.adminCalls !== undefined)                     { setAdminCalls(db.adminCalls);       updatedSheets++; }
        if (db.tarunSirMeetings !== undefined)               { setTarunSirMeetings(db.tarunSirMeetings); updatedSheets++; }
        if (db.contentItems !== undefined)                   { setContentItems(db.contentItems);   updatedSheets++; }
        if (db.dailyIssues !== undefined)                    { setDailyIssues(db.dailyIssues);     updatedSheets++; }
        if (db.featureAdoptions !== undefined)               { setFeatureAdoptions(db.featureAdoptions); updatedSheets++; }

        if (db.speakers !== undefined) {
          setSpeakers(db.speakers);
          const savedUserId = localStorage.getItem('logged-in-user-id');
          if (savedUserId) {
            if (savedUserId.startsWith('guest-')) {
              const savedUserData = localStorage.getItem('logged-in-user-data');
              if (savedUserData) {
                try {
                  setCurrentUser(JSON.parse(savedUserData));
                } catch (e) {
                  const email = savedUserId.replace('guest-', '');
                  setCurrentUser({
                    id: savedUserId,
                    name: email.split('@')[0],
                    email,
                    role: 'Guest',
                    isGuest: true
                  } as any);
                }
              }
            } else {
              const matchedUser = db.speakers.find((s: any) => s.id === savedUserId);
              if (matchedUser) {
                setCurrentUser(matchedUser);
                localStorage.setItem('logged-in-user-data', JSON.stringify(matchedUser));
              }
            }
          }
          updatedSheets++;
        }
        if (db.productGroups !== undefined)                  { setProductGroups(db.productGroups); updatedSheets++; }
        if (db.statuses !== undefined)                       { setStatuses(db.statuses);           updatedSheets++; }
        if (db.programs !== undefined)                       { setPrograms(db.programs);           updatedSheets++; }
        if (db.cohorts !== undefined)                         { setCohorts(db.cohorts);             updatedSheets++; }
        if (db.comments !== undefined)                        { setComments(db.comments);           updatedSheets++; }

        if (db.formConfigs) { setFormConfigs(db.formConfigs); }
        if (db.feedbackSubmissions) { setFeedbackSubmissions(db.feedbackSubmissions); }

        if (db.settings) {
          const clickupSetting = db.settings.find((s: any) => s.key === 'clickupApiKey');
          if (clickupSetting) setClickupApiKey(clickupSetting.value || '');

          const gClientIdSetting = db.settings.find((s: any) => s.key === 'googleClientId');
          if (gClientIdSetting) setGoogleClientId(gClientIdSetting.value || '');

          const gReqLoginSetting = db.settings.find((s: any) => s.key === 'requireGoogleLogin');
          if (gReqLoginSetting) setRequireGoogleLogin(gReqLoginSetting.value === 'true');

          const gAllowedDomainsSetting = db.settings.find((s: any) => s.key === 'googleAllowedDomains');
          if (gAllowedDomainsSetting) setGoogleAllowedDomains(gAllowedDomainsSetting.value || '');

          const calSourcesSetting = db.settings.find((s: any) => s.key === 'sharableCalendarSources');
          if (calSourcesSetting) setSharableCalendarSources(calSourcesSetting.value || '');

          const recipientSetting = db.settings.find((s: any) => s.key === 'digestRecipient');
          if (recipientSetting) setDigestRecipient(recipientSetting.value || '');

          const appUrlSetting = db.settings.find((s: any) => s.key === 'digestAppUrl');
          if (appUrlSetting) setDigestAppUrl(appUrlSetting.value || '');

          const smtpHostSetting = db.settings.find((s: any) => s.key === 'digestSMTPHost');
          if (smtpHostSetting) setDigestSMTPHost(smtpHostSetting.value || '');

          const smtpPortSetting = db.settings.find((s: any) => s.key === 'digestSMTPPort');
          if (smtpPortSetting) setDigestSMTPPort(smtpPortSetting.value || '');

          const smtpUserSetting = db.settings.find((s: any) => s.key === 'digestSMTPUser');
          if (smtpUserSetting) setDigestSMTPUser(smtpUserSetting.value || '');

          const smtpPassSetting = db.settings.find((s: any) => s.key === 'digestSMTPPass');
          if (smtpPassSetting) setDigestSMTPPass(smtpPassSetting.value || '');

          const freqSetting = db.settings.find((s: any) => s.key === 'digestFrequency');
          if (freqSetting) setDigestFrequency(freqSetting.value || 'weekly');

          const timeSetting = db.settings.find((s: any) => s.key === 'digestTime');
          if (timeSetting) setDigestTime(timeSetting.value || '09:00');

          const daySetting = db.settings.find((s: any) => s.key === 'digestDayOfWeek');
          if (daySetting) setDigestDayOfWeek(daySetting.value || 'Monday');
        }
        setSyncStatus('synced');

        // Also fetch active tab data or dashboard data initially if authenticated
        const host = window.location.host || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000') || host.includes('5173');
        if (savedUserId || isLocalhost) {
          // Always preload calendar events for overdue badge accuracy
          const today = new Date();
          loadCalendarMonth(today.getFullYear(), today.getMonth());

          if (activeTab === 'dashboard') {
            // DashboardOverview component handles fetching counts via its useEffect
          } else if (activeTab === 'calendar') {
            // Handled by preloading above
          } else {
            loadTabData(activeTab);
          }
        }

        return { success: true, updatedSheets };
      }
      setSyncStatus('error');
      return { success: false, updatedSheets: 0, error: 'No data returned from server' };
    } catch (err: any) {
      console.error('Failed to load database data:', err);
      setSyncStatus('error');
      return { success: false, updatedSheets: 0, error: err.message || 'Network error' };
    }
  };

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    refreshAllData().finally(() => setIsLoading(false));
  }, []);

  // Auto-sync Admin Call status based on related tasks
  useEffect(() => {
    if (isLoading) return;

    let changed = false;
    const updatedCalls = adminCalls.map(call => {
      const relatedTasks = productItems.filter(item => 
        !item.id.startsWith('prod-temp-') && 
        item.notes && 
        item.notes.includes(`Admin Call ID: ${call.id}`)
      );

      if (relatedTasks.length > 0) {
        const allDone = relatedTasks.every(task => {
          if (task.finalReleaseCompleted) return true;
          if (!task.status) return false;
          const s = task.status.toLowerCase();
          return s === 'delivered' || s === 'completed' || s === 'done' || s === 'closed';
        });
        const targetStatus = allDone ? 'Completed' : 'Pending Actions';

        if (call.status !== targetStatus) {
          changed = true;
          const updatedCall = { ...call, status: targetStatus as any };
          persistChange('update', 'adminCalls', call.id, updatedCall);
          return updatedCall;
        }
      }
      return call;
    });

    if (changed) {
      setAdminCalls(updatedCalls);
    }
  }, [productItems, adminCalls, isLoading]);

  // Auto-sync AMA Session status based on related tasks
  useEffect(() => {
    if (isLoading) return;

    let changed = false;
    const updatedSessions = amaSessions.map(session => {
      const relatedTasks = productItems.filter(item => 
        !item.id.startsWith('prod-temp-') && 
        item.notes && 
        item.notes.includes(`AMA Session ID: ${session.id}`)
      );

      if (relatedTasks.length > 0) {
        const allDone = relatedTasks.every(task => {
          if (task.finalReleaseCompleted) return true;
          if (!task.status) return false;
          const s = task.status.toLowerCase();
          return s === 'delivered' || s === 'completed' || s === 'done' || s === 'closed';
        });
        const targetStatus = allDone ? 'Completed' : 'Pending Actions';

        if (session.status !== targetStatus) {
          changed = true;
          const updatedSession = { ...session, status: targetStatus as any };
          persistChange('update', 'amaSessions', session.id, updatedSession);
          return updatedSession;
        }
      }
      return session;
    });

    if (changed) {
      setAMASessions(updatedSessions);
    }
  }, [productItems, amaSessions, isLoading]);

  // Auto-sync Tarun Sir Meeting status based on related tasks
  useEffect(() => {
    if (isLoading) return;

    let changed = false;
    const updatedMeetings = tarunSirMeetings.map(meeting => {
      const relatedTasks = productItems.filter(item => 
        !item.id.startsWith('prod-temp-') && 
        item.notes && 
        item.notes.includes(`Tarun Sir Meeting ID: ${meeting.id}`)
      );

      if (relatedTasks.length > 0) {
        const allDone = relatedTasks.every(task => {
          if (task.finalReleaseCompleted) return true;
          if (!task.status) return false;
          const s = task.status.toLowerCase();
          return s === 'delivered' || s === 'completed' || s === 'done' || s === 'closed';
        });
        const targetStatus = allDone ? 'Completed' : 'Pending Actions';

        if (meeting.status !== targetStatus) {
          changed = true;
          const updatedMeeting = { ...meeting, status: targetStatus as any };
          persistChange('update', 'tarunSirMeetings', meeting.id, updatedMeeting);
          return updatedMeeting;
        }
      }
      return meeting;
    });

    if (changed) {
      setTarunSirMeetings(updatedMeetings);
    }
  }, [productItems, tarunSirMeetings, isLoading]);



  const updateClickupApiKey = (key: string) => {
    setClickupApiKey(key);
    persistChange('update', 'settings', 'clickupApiKey', { id: 'clickupApiKey', key: 'clickupApiKey', value: key });
  };

  const updateGoogleClientId = (val: string) => {
    setGoogleClientId(val);
    persistChange('update', 'settings', 'googleClientId', { id: 'googleClientId', key: 'googleClientId', value: val });
  };

  const updateRequireGoogleLogin = (val: boolean) => {
    setRequireGoogleLogin(val);
    persistChange('update', 'settings', 'requireGoogleLogin', { id: 'requireGoogleLogin', key: 'requireGoogleLogin', value: String(val) });
  };

  const updateGoogleAllowedDomains = (val: string) => {
    setGoogleAllowedDomains(val);
    persistChange('update', 'settings', 'googleAllowedDomains', { id: 'googleAllowedDomains', key: 'googleAllowedDomains', value: val });
  };

  const updateSharableCalendarSources = (val: string) => {
    setSharableCalendarSources(val);
    persistChange('update', 'settings', 'sharableCalendarSources', { id: 'sharableCalendarSources', key: 'sharableCalendarSources', value: val });
  };

  const updateDigestRecipient = (val: string) => {
    setDigestRecipient(val);
    persistChange('update', 'settings', 'digestRecipient', { id: 'digestRecipient', key: 'digestRecipient', value: val });
  };
  const updateDigestAppUrl = (val: string) => {
    setDigestAppUrl(val);
    persistChange('update', 'settings', 'digestAppUrl', { id: 'digestAppUrl', key: 'digestAppUrl', value: val });
  };
  const updateDigestSMTPHost = (val: string) => {
    setDigestSMTPHost(val);
    persistChange('update', 'settings', 'digestSMTPHost', { id: 'digestSMTPHost', key: 'digestSMTPHost', value: val });
  };
  const updateDigestSMTPPort = (val: string) => {
    setDigestSMTPPort(val);
    persistChange('update', 'settings', 'digestSMTPPort', { id: 'digestSMTPPort', key: 'digestSMTPPort', value: val });
  };
  const updateDigestSMTPUser = (val: string) => {
    setDigestSMTPUser(val);
    persistChange('update', 'settings', 'digestSMTPUser', { id: 'digestSMTPUser', key: 'digestSMTPUser', value: val });
  };
  const updateDigestSMTPPass = (val: string) => {
    setDigestSMTPPass(val);
    persistChange('update', 'settings', 'digestSMTPPass', { id: 'digestSMTPPass', key: 'digestSMTPPass', value: val });
  };
  const updateDigestFrequency = (val: string) => {
    setDigestFrequency(val);
    persistChange('update', 'settings', 'digestFrequency', { id: 'digestFrequency', key: 'digestFrequency', value: val });
  };
  const updateDigestTime = (val: string) => {
    setDigestTime(val);
    persistChange('update', 'settings', 'digestTime', { id: 'digestTime', key: 'digestTime', value: val });
  };
  const updateDigestDayOfWeek = (val: string) => {
    setDigestDayOfWeek(val);
    persistChange('update', 'settings', 'digestDayOfWeek', { id: 'digestDayOfWeek', key: 'digestDayOfWeek', value: val });
  };

  // Helper Updaters
  const updateProductItem = (id: string, updated: Partial<ProductItem>) => {
    setProductItems(prev => {
      const oldItem = prev.find(item => item.id === id);
      if (
        (updated.finalReleaseCompleted === true && !oldItem?.finalReleaseCompleted) ||
        (updated.status && ['Released', 'Completed', 'Done', 'released'].includes(updated.status) && oldItem?.status !== updated.status)
      ) {
        triggerReleaseConfetti();
      }
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) {
        persistChange('update', 'products', id, updatedItem);
        setStudentProjects(sp => sp.map(p => {
          const oldFeatureName = (oldItem?.feature || '').trim();
          const featureName = (updatedItem.feature || '').trim();
          const projectTitle = (p.title || '').trim();
          if (
            (featureName && projectTitle && projectTitle.toLowerCase() === featureName.toLowerCase()) || 
            (oldFeatureName && projectTitle && projectTitle.toLowerCase() === oldFeatureName.toLowerCase()) || 
            id === `prod-temp-${p.id}`
          ) {
            const updatedP = {
              ...p,
              title: updatedItem.feature !== undefined ? updatedItem.feature : p.title,
              description: updatedItem.description !== undefined ? updatedItem.description : p.description,
              status: (
                updatedItem.status === 'Completed' ? 'Delivered' :
                updatedItem.status === 'On Hold' ? 'Cancelled' :
                updatedItem.status === 'In Progress' ? 'In-Progress' :
                updatedItem.status !== undefined ? updatedItem.status : p.status
              ) as any,
              blocker: updatedItem.blocker !== undefined ? updatedItem.blocker : p.blocker,
              completeInfoDate: updatedItem.deadline !== undefined ? updatedItem.deadline : p.completeInfoDate,
              priority: updatedItem.priority !== undefined ? (updatedItem.priority || undefined) : p.priority,
              poc: updatedItem.poc !== undefined ? updatedItem.poc : p.poc,
              clickupStatus: updatedItem.clickupStatus !== undefined ? updatedItem.clickupStatus : p.clickupStatus,
              taskLink: updatedItem.taskLink !== undefined ? updatedItem.taskLink : p.taskLink,
              productDeadline: updatedItem.productDeadline !== undefined ? updatedItem.productDeadline : p.productDeadline,
              uiux: updatedItem.uiux !== undefined ? updatedItem.uiux : p.uiux,
              deadline: updatedItem.deadline !== undefined ? updatedItem.deadline : p.deadline,
              finalRelease: updatedItem.finalRelease !== undefined ? updatedItem.finalRelease : p.finalRelease,
              raisedByTarunSir: updatedItem.raisedByTarunSir !== undefined ? updatedItem.raisedByTarunSir : p.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval !== undefined ? updatedItem.tarunSirApproval : p.tarunSirApproval,
              product: updatedItem.product !== undefined ? updatedItem.product : p.product,
              module: updatedItem.module !== undefined ? updatedItem.module : p.module,
              type: updatedItem.type !== undefined ? updatedItem.type : p.type,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : p.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : p.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : p.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted
            };
            persistChange('update', 'projects', p.id, updatedP);
            return updatedP;
          }
          return p;
        }));
        setStudentMeetings(sm => sm.map(m => {
          const featureName = (updatedItem.feature || '').trim();
          const meetingCohort = (m.cohort || '').trim();
          if ((featureName && meetingCohort && meetingCohort.toLowerCase() === featureName.toLowerCase()) || id === `prod-temp-${m.id}`) {
            const updatedM = {
              ...m,
              cohort: updatedItem.feature !== undefined ? updatedItem.feature : m.cohort,
              summary: updatedItem.description !== undefined ? updatedItem.description : m.summary,
              status: updatedItem.status !== undefined ? updatedItem.status : m.status,
              blocker: updatedItem.blocker !== undefined ? updatedItem.blocker : m.blocker,
              priority: updatedItem.priority !== undefined ? (updatedItem.priority || undefined) : m.priority,
              poc: updatedItem.poc !== undefined ? updatedItem.poc : m.poc,
              clickupStatus: updatedItem.clickupStatus !== undefined ? updatedItem.clickupStatus : m.clickupStatus,
              taskLink: updatedItem.taskLink !== undefined ? updatedItem.taskLink : m.taskLink,
              productDeadline: updatedItem.productDeadline !== undefined ? updatedItem.productDeadline : m.productDeadline,
              uiux: updatedItem.uiux !== undefined ? updatedItem.uiux : m.uiux,
              deadline: updatedItem.deadline !== undefined ? updatedItem.deadline : m.deadline,
              finalRelease: updatedItem.finalRelease !== undefined ? updatedItem.finalRelease : m.finalRelease,
              raisedByTarunSir: updatedItem.raisedByTarunSir !== undefined ? updatedItem.raisedByTarunSir : m.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval !== undefined ? updatedItem.tarunSirApproval : m.tarunSirApproval,
              product: updatedItem.product !== undefined ? updatedItem.product : m.product,
              module: updatedItem.module !== undefined ? updatedItem.module : m.module,
              type: updatedItem.type !== undefined ? updatedItem.type : m.type,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : m.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : m.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : m.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : m.finalReleaseCompleted
            };
            persistChange('update', 'studentMeetings', m.id, updatedM);
            return updatedM;
          }
          return m;
        }));
        setContentItems(ci => ci.map(p => {
          const featureName = (updatedItem.feature || '').trim();
          const contentModule = (p.module || '').trim();
          if ((featureName && contentModule && contentModule.toLowerCase() === featureName.toLowerCase()) || id === `prod-temp-${p.id}`) {
            const updatedCI = {
              ...p,
              module: updatedItem.feature !== undefined ? updatedItem.feature : p.module,
              product: updatedItem.product !== undefined ? updatedItem.product : p.product,
              priority: updatedItem.priority !== undefined ? updatedItem.priority : p.priority,
              poc: updatedItem.poc !== undefined ? updatedItem.poc : p.poc,
              clickupStatus: updatedItem.clickupStatus !== undefined ? updatedItem.clickupStatus : p.clickupStatus,
              productDeadline: updatedItem.productDeadline !== undefined ? updatedItem.productDeadline : p.productDeadline,
              uiux: updatedItem.uiux !== undefined ? updatedItem.uiux : p.uiux,
              deadline: updatedItem.deadline !== undefined ? updatedItem.deadline : p.deadline,
              finalRelease: updatedItem.finalRelease !== undefined ? updatedItem.finalRelease : p.finalRelease,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : p.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : p.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : p.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted,
              status: updatedItem.status !== undefined ? updatedItem.status : p.status,
              raisedByTarunSir: updatedItem.raisedByTarunSir !== undefined ? updatedItem.raisedByTarunSir : p.raisedByTarunSir
            };
            persistChange('update', 'contentItems', p.id, updatedCI);
            return updatedCI;
          }
          return p;
        }));
        setDailyIssues(di => di.map(issue => {
          const featureName = (updatedItem.feature || '').trim();
          const issueModule = (issue.module || '').trim();
          if ((featureName && issueModule && issueModule.toLowerCase() === featureName.toLowerCase()) || id === `prod-temp-${issue.id}`) {
            const updatedIssue = {
              ...issue,
              module: updatedItem.feature !== undefined ? updatedItem.feature : issue.module,
              product: updatedItem.product !== undefined ? updatedItem.product : issue.product,
              priority: updatedItem.priority !== undefined ? updatedItem.priority : issue.priority,
              poc: updatedItem.poc !== undefined ? updatedItem.poc : issue.poc,
              clickupStatus: updatedItem.clickupStatus !== undefined ? updatedItem.clickupStatus : issue.clickupStatus,
              productDeadline: updatedItem.productDeadline !== undefined ? updatedItem.productDeadline : issue.productDeadline,
              uiux: updatedItem.uiux !== undefined ? updatedItem.uiux : issue.uiux,
              deadline: updatedItem.deadline !== undefined ? updatedItem.deadline : issue.deadline,
              finalRelease: updatedItem.finalRelease !== undefined ? updatedItem.finalRelease : issue.finalRelease,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : issue.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : issue.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : issue.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : issue.finalReleaseCompleted,
              status: updatedItem.status !== undefined ? updatedItem.status : issue.status,
              raisedByTarunSir: updatedItem.raisedByTarunSir !== undefined ? updatedItem.raisedByTarunSir : issue.raisedByTarunSir
            };
            persistChange('update', 'dailyIssues', issue.id, updatedIssue);
            return updatedIssue;
          }
          return issue;
        }));
      }
      return next;
    });
  };
  const addProductItem = (item: ProductItem) => {
    const itemWithDate = {
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    };
    setProductItems(prev => [itemWithDate, ...prev]);
    persistChange('create', 'products', null, itemWithDate);
  };
  const deleteProductItem = (id: string) => {
    setProductItems(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'products', id, null);
  };

  const updatePlanItem = (id: string, updated: Partial<PlanItem>) => {
    setPlanItems(prev => {
      const oldItem = prev.find(item => item.id === id);
      if (
        (updated.completed === true && !oldItem?.completed) ||
        (updated.status && ['Released', 'Completed', 'Done', 'released'].includes(updated.status) && oldItem?.status !== updated.status)
      ) {
        triggerReleaseConfetti();
      }
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) persistChange('update', 'plans', id, updatedItem);
      return next;
    });
  };
  const addPlanItem = (item: PlanItem) => {
    setPlanItems(prev => [item, ...prev]);
    persistChange('create', 'plans', null, item);
  };
  const deletePlanItem = (id: string) => {
    setPlanItems(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'plans', id, null);
  };

  const updateStudentProject = (id: string, updated: Partial<StudentProject>) => {
    setStudentProjects(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) {
        persistChange('update', 'projects', id, updatedItem);
        setProductItems(prod => prod.map(p => {
          if ((p.feature && updatedItem.title && p.feature.toLowerCase() === updatedItem.title.toLowerCase()) || p.id === `prod-temp-${updatedItem.id}`) {
            const updatedP = {
              ...p,
              feature: updatedItem.title,
              description: updatedItem.description !== undefined ? updatedItem.description : p.description,
              priority: (updatedItem.priority as any) !== undefined ? (updatedItem.priority || '') : p.priority,
              poc: updatedItem.poc !== undefined ? updatedItem.poc : p.poc,
              status: (
                updatedItem.status === 'Delivered' || (updatedItem.status as string) === 'Completed' ? 'Completed' :
                updatedItem.status === 'Cancelled' || (updatedItem.status as string) === 'On Hold' ? 'On Hold' :
                updatedItem.status === 'In-Progress' || (updatedItem.status as string) === 'In Progress' ? 'In Progress' :
                updatedItem.status !== undefined ? (updatedItem.status || '') : (p.status || '')
              ) as any,
              clickupStatus: updatedItem.clickupStatus !== undefined ? updatedItem.clickupStatus : p.clickupStatus,
              productDeadline: updatedItem.productDeadline !== undefined ? updatedItem.productDeadline : p.productDeadline,
              uiux: updatedItem.uiux !== undefined ? updatedItem.uiux : p.uiux,
              deadline: updatedItem.deadline !== undefined ? updatedItem.deadline : p.deadline,
              finalRelease: updatedItem.finalRelease !== undefined ? updatedItem.finalRelease : p.finalRelease,
              raisedByTarunSir: updatedItem.raisedByTarunSir !== undefined ? updatedItem.raisedByTarunSir : p.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval !== undefined ? updatedItem.tarunSirApproval : p.tarunSirApproval,
              product: updatedItem.product !== undefined ? updatedItem.product : p.product,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : p.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : p.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : p.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted,
              createdAt: updatedItem.createdAt !== undefined ? updatedItem.createdAt : p.createdAt,
              clickupSubtasksCount: updatedItem.clickupSubtasksCount !== undefined ? updatedItem.clickupSubtasksCount : p.clickupSubtasksCount,
              clickupAssignee: updatedItem.clickupAssignee !== undefined ? updatedItem.clickupAssignee : p.clickupAssignee,
              taskLink: updatedItem.taskLink !== undefined ? updatedItem.taskLink : p.taskLink
            };
            persistChange('update', 'products', p.id, updatedP);
            return updatedP;
          }
          return p;
        }));
      }
      return next;
    });
  };
  const addStudentProject = (item: StudentProject) => {
    setStudentProjects(prev => [item, ...prev]);
    persistChange('create', 'projects', null, item);
  };
  const deleteStudentProject = (id: string) => {
    setStudentProjects(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'projects', id, null);
  };

  const updateAMASession = (id: string, updated: Partial<AMASession>) => {
    setAMASessions(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) persistChange('update', 'amaSessions', id, updatedItem);
      return next;
    });
  };
  const addAMASession = (item: AMASession) => {
    setAMASessions(prev => [item, ...prev]);
    persistChange('create', 'amaSessions', null, item);
  };
  const deleteAMASession = (id: string) => {
    setAMASessions(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'amaSessions', id, null);

    setProductItems(prev => {
      const itemsToDelete = prev.filter(item => 
        item.id.startsWith('prod-ama-') && 
        item.notes && 
        item.notes.includes(`AMA Session ID: ${id}`)
      );
      itemsToDelete.forEach(item => {
        persistChange('delete', 'products', item.id, null);
      });
      return prev.filter(item => !itemsToDelete.some(d => d.id === item.id));
    });
  };

  const updateStudentMeeting = (id: string, updated: Partial<StudentMeeting>) => {
    setStudentMeetings(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) {
        persistChange('update', 'studentMeetings', id, updatedItem);
        setProductItems(prod => prod.map(p => {
          if ((p.feature && updatedItem.cohort && p.feature.toLowerCase() === updatedItem.cohort.toLowerCase()) || p.id === `prod-temp-${updatedItem.id}`) {
            const updatedP = {
              ...p,
              feature: updatedItem.cohort,
              description: updatedItem.summary || p.description,
              priority: (updatedItem.priority as any) || p.priority,
              poc: updatedItem.poc || p.poc,
              status: updatedItem.status || p.status,
              clickupStatus: updatedItem.clickupStatus || p.clickupStatus,
              productDeadline: updatedItem.productDeadline || p.productDeadline,
              uiux: updatedItem.uiux || p.uiux,
              deadline: updatedItem.deadline || p.deadline,
              finalRelease: updatedItem.finalRelease || p.finalRelease,
              raisedByTarunSir: updatedItem.raisedByTarunSir !== undefined ? updatedItem.raisedByTarunSir : p.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval !== undefined ? updatedItem.tarunSirApproval : p.tarunSirApproval,
              product: updatedItem.product || p.product,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : p.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : p.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : p.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted,
              createdAt: updatedItem.createdAt || p.createdAt,
              clickupSubtasksCount: updatedItem.clickupSubtasksCount !== undefined ? updatedItem.clickupSubtasksCount : p.clickupSubtasksCount,
              clickupAssignee: updatedItem.clickupAssignee || p.clickupAssignee
            };
            persistChange('update', 'products', p.id, updatedP);
            return updatedP;
          }
          return p;
        }));
      }
      return next;
    });
  };
  const addStudentMeeting = (item: StudentMeeting) => {
    setStudentMeetings(prev => [item, ...prev]);
    persistChange('create', 'studentMeetings', null, item);
  };
  const deleteStudentMeeting = (id: string) => {
    setStudentMeetings(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'studentMeetings', id, null);
  };

  const updateAdminCall = (id: string, updated: Partial<AdminCall>) => {
    setAdminCalls(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) persistChange('update', 'adminCalls', id, updatedItem);
      return next;
    });
  };
  const addAdminCall = (item: AdminCall) => {
    setAdminCalls(prev => [item, ...prev]);
    persistChange('create', 'adminCalls', null, item);
  };
  const deleteAdminCall = (id: string) => {
    setAdminCalls(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'adminCalls', id, null);

    setProductItems(prev => {
      const itemsToDelete = prev.filter(item => 
        item.id.startsWith('prod-call-') && 
        item.notes && 
        item.notes.includes(`Admin Call ID: ${id}`)
      );
      itemsToDelete.forEach(item => {
        persistChange('delete', 'products', item.id, null);
      });
      return prev.filter(item => !itemsToDelete.some(d => d.id === item.id));
    });
  };

  const updateTarunSirMeeting = (id: string, updated: Partial<TarunSirMeeting>) => {
    setTarunSirMeetings(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) persistChange('update', 'tarunSirMeetings', id, updatedItem);
      return next;
    });
  };
  const addTarunSirMeeting = (item: TarunSirMeeting) => {
    setTarunSirMeetings(prev => [item, ...prev]);
    persistChange('create', 'tarunSirMeetings', null, item);
  };
  const deleteTarunSirMeeting = (id: string) => {
    setTarunSirMeetings(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'tarunSirMeetings', id, null);

    setProductItems(prev => {
      const itemsToDelete = prev.filter(item => 
        item.id.startsWith('prod-tarun-') && 
        item.notes && 
        item.notes.includes(`Tarun Sir Meeting ID: ${id}`)
      );
      itemsToDelete.forEach(item => {
        persistChange('delete', 'products', item.id, null);
      });
      return prev.filter(item => !itemsToDelete.some(d => d.id === item.id));
    });
  };

  const updateContentItem = (id: string, updated: Partial<ContentItem>) => {
    setContentItems(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) {
        persistChange('update', 'contentItems', id, updatedItem);
        setProductItems(prod => prod.map(p => {
          if (p.feature.toLowerCase() === updatedItem.module.toLowerCase() || p.id === `prod-temp-${updatedItem.id}`) {
            const updatedP = {
              ...p,
              feature: updatedItem.module,
              product: updatedItem.product || p.product,
              priority: updatedItem.priority || p.priority,
              poc: updatedItem.poc || p.poc,
              clickupStatus: updatedItem.clickupStatus || p.clickupStatus,
              productDeadline: updatedItem.productDeadline || p.productDeadline,
              uiux: updatedItem.uiux || p.uiux,
              deadline: updatedItem.deadline || p.deadline,
              finalRelease: updatedItem.finalRelease || p.finalRelease,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : p.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : p.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : p.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted,
              status: updatedItem.status as ProductItem['status'],
              raisedByTarunSir: !!updatedItem.raisedByTarunSir,
              createdAt: updatedItem.createdAt || p.createdAt,
              clickupSubtasksCount: updatedItem.clickupSubtasksCount !== undefined ? updatedItem.clickupSubtasksCount : p.clickupSubtasksCount,
              clickupAssignee: updatedItem.clickupAssignee || p.clickupAssignee
            };
            persistChange('update', 'products', p.id, updatedP);
            return updatedP;
          }
          return p;
        }));
      }
      return next;
    });
  };
  const addContentItem = (item: ContentItem) => {
    setContentItems(prev => [item, ...prev]);
    persistChange('create', 'contentItems', null, item);
  };
  const deleteContentItem = (id: string) => {
    setContentItems(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'contentItems', id, null);
  };

  const updateDailyIssue = (id: string, updated: Partial<DailyIssue>) => {
    setDailyIssues(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) {
        persistChange('update', 'dailyIssues', id, updatedItem);
        setProductItems(prod => prod.map(p => {
          if (p.feature.toLowerCase() === updatedItem.module.toLowerCase() || p.id === `prod-temp-${updatedItem.id}`) {
            const updatedP = {
              ...p,
              feature: updatedItem.module,
              product: updatedItem.product || p.product,
              priority: updatedItem.priority || p.priority,
              poc: updatedItem.poc || p.poc,
              clickupStatus: updatedItem.clickupStatus || p.clickupStatus,
              productDeadline: updatedItem.productDeadline || p.productDeadline,
              uiux: updatedItem.uiux || p.uiux,
              deadline: updatedItem.deadline || p.deadline,
              finalRelease: updatedItem.finalRelease || p.finalRelease,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted !== undefined ? updatedItem.productDeadlineCompleted : p.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted !== undefined ? updatedItem.uiuxCompleted : p.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted !== undefined ? updatedItem.deadlineCompleted : p.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted,
              status: updatedItem.status as ProductItem['status'],
              raisedByTarunSir: !!updatedItem.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval !== undefined ? updatedItem.tarunSirApproval : p.tarunSirApproval,
              createdAt: updatedItem.createdAt || p.createdAt,
              clickupSubtasksCount: updatedItem.clickupSubtasksCount !== undefined ? updatedItem.clickupSubtasksCount : p.clickupSubtasksCount,
              clickupAssignee: updatedItem.clickupAssignee || p.clickupAssignee
            };
            persistChange('update', 'products', p.id, updatedP);
            return updatedP;
          }
          return p;
        }));
      }
      return next;
    });
  };
  const addDailyIssue = (item: DailyIssue) => {
    setDailyIssues(prev => [item, ...prev]);
    persistChange('create', 'dailyIssues', null, item);
  };
  const deleteDailyIssue = (id: string) => {
    setDailyIssues(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'dailyIssues', id, null);
  };

  const updateFeatureAdoption = (id: string, updated: Partial<FeatureAdoption>) => {
    setFeatureAdoptions(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) persistChange('update', 'featureAdoptions', id, updatedItem);
      return next;
    });
  };
  const addFeatureAdoption = (item: FeatureAdoption) => {
    setFeatureAdoptions(prev => [item, ...prev]);
    persistChange('create', 'featureAdoptions', null, item);
  };
  const deleteFeatureAdoption = (id: string) => {
    setFeatureAdoptions(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'featureAdoptions', id, null);
  };

  // Config CRUD helpers
  const addSpeaker = (item: ConfigSpeaker) => {
    const newItem = { ...item, canEdit: item.canEdit !== false };
    setSpeakers(prev => [...prev, newItem]);
    persistChange('create', 'speakers', null, newItem);
  };
  const updateSpeaker = (id: string, updated: Partial<ConfigSpeaker>) => {
    setSpeakers(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updated } : s);
      const item = next.find(s => s.id === id);
      if (item) {
        persistChange('update', 'speakers', id, item);
        if (currentUser && currentUser.id === id) {
          setCurrentUser(item);
        }
      }
      return next;
    });
  };
  const deleteSpeaker = (id: string) => {
    setSpeakers(prev => prev.filter(s => s.id !== id));
    persistChange('delete', 'speakers', id, null);
  };

  const addProductGroup = (item: ConfigProductGroup) => {
    setProductGroups(prev => [...prev, item]);
    persistChange('create', 'productGroups', null, item);
  };
  const updateProductGroup = (id: string, updated: Partial<ConfigProductGroup>) => {
    setProductGroups(prev => {
      const next = prev.map(g => g.id === id ? { ...g, ...updated } : g);
      const item = next.find(g => g.id === id);
      if (item) persistChange('update', 'productGroups', id, item);
      return next;
    });
  };
  const deleteProductGroup = (id: string) => {
    setProductGroups(prev => prev.filter(g => g.id !== id));
    persistChange('delete', 'productGroups', id, null);
  };

  const addStatus = (item: ConfigStatus) => {
    setStatuses(prev => [...prev, item]);
    persistChange('create', 'statuses', null, item);
  };
  const updateStatus = (id: string, updated: Partial<ConfigStatus>) => {
    setStatuses(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updated } : s);
      const item = next.find(s => s.id === id);
      if (item) persistChange('update', 'statuses', id, item);
      return next;
    });
  };
  const deleteStatus = (id: string) => {
    setStatuses(prev => prev.filter(s => s.id !== id));
    persistChange('delete', 'statuses', id, null);
  };

  const addProgram = (item: ConfigProgram) => {
    setPrograms(prev => [...prev, item]);
    persistChange('create', 'programs', null, item);
  };
  const updateProgram = (id: string, updated: Partial<ConfigProgram>) => {
    setPrograms(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updated } : p);
      const item = next.find(p => p.id === id);
      if (item) persistChange('update', 'programs', id, item);
      return next;
    });
  };
  const deleteProgram = (id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id));
    persistChange('delete', 'programs', id, null);
  };

  const addCohort = (item: ConfigCohort) => {
    setCohorts(prev => [...prev, item]);
    persistChange('create', 'cohorts', null, item);
  };
  const updateCohort = (id: string, updated: Partial<ConfigCohort>) => {
    setCohorts(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updated } : c);
      const item = next.find(c => c.id === id);
      if (item) persistChange('update', 'cohorts', id, item);
      return next;
    });
  };
  const deleteCohort = (id: string) => {
    setCohorts(prev => prev.filter(c => c.id !== id));
    persistChange('delete', 'cohorts', id, null);
  };

  const saveFormConfig = async (config: FeedbackFormConfig) => {
    setFormConfigs(prev => {
      const exists = prev.some(c => c.id === config.id);
      if (exists) {
        return prev.map(c => c.id === config.id ? config : c);
      } else {
        return [...prev, config];
      }
    });
    await persistChange('update', 'formConfigs', config.id, config);
  };

  const addFeedbackSubmission = async (submission: Omit<FeedbackSubmission, 'id'>) => {
    const id = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newSubmission: FeedbackSubmission = {
      ...submission,
      id,
      createdAt: new Date().toISOString()
    };
    setFeedbackSubmissions(prev => [newSubmission, ...prev]);
    await persistChange('create', 'feedbackSubmissions', null, newSubmission);
    return newSubmission;
  };

  const deleteFeedbackSubmission = async (id: string) => {
    setFeedbackSubmissions(prev => prev.filter(sub => sub.id !== id));
    await persistChange('delete', 'feedbackSubmissions', id, null);
  };

  const extractClickupTaskId = (url: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9\-_]{7,12}$/.test(trimmed)) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.hostname.includes('clickup.com')) {
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const tIndex = pathParts.indexOf('t');
        if (tIndex !== -1 && tIndex < pathParts.length - 1) {
          const nextPart = pathParts[tIndex + 1];
          if (nextPart === 'h' && tIndex < pathParts.length - 2) {
            return pathParts[tIndex + 2];
          }
          const lastPart = pathParts[pathParts.length - 1];
          if (/^[a-zA-Z0-9\-_]{7,12}$/.test(lastPart)) {
            return lastPart;
          }
        }
      }
    } catch (e) {}
    const match = trimmed.match(/\/t\/(?:h\/)?(?:[a-zA-Z0-9\-]+\/)?([a-zA-Z0-9\-_]{7,12})/);
    if (match) return match[1];
    const endMatch = trimmed.match(/\/([a-zA-Z0-9\-_]{7,12})(?:\?|$)/);
    if (endMatch) return endMatch[1];
    return null;
  };

  const syncClickupTask = async (taskIdOrUrl: string): Promise<{ status: string; subtasksCount: number; assignee: string; name?: string } | null> => {
    const taskId = extractClickupTaskId(taskIdOrUrl);
    if (!taskId) return null;
    if (!clickupApiKey.trim()) return null;

    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'clickup-sync',
          type: 'settings',
          id: null,
          data: { taskId }
        })
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          return resData.data;
        }
      }
    } catch (err) {
      console.warn('ClickUp API proxy call failed:', err);
    }
    return null;
  };

  const sendEmailDigest = async (testRecipient?: string): Promise<{ success: boolean; message: string; testLink?: string; error?: string }> => {
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'send-product-ship-digest',
          testRecipient
        })
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      return { success: false, message: 'Failed to send digest email.', error: err.message };
    }
  };

  const refreshAllClickupStatuses = async (): Promise<{ success: boolean; totalScanned: number; updatedCount: number; error?: string }> => {
    if (!clickupApiKey.trim()) {
      return { success: false, totalScanned: 0, updatedCount: 0, error: 'ClickUp API key is not configured' };
    }

    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'clickup-bulk-sync',
          type: 'settings',
          id: null,
          data: {}
        })
      });

      if (!response.ok) {
        return { success: false, totalScanned: 0, updatedCount: 0, error: 'Bulk sync failed on server' };
      }

      const resData = await response.json();
      if (resData.success) {
        await refreshAllData();
        return { 
          success: true, 
          totalScanned: resData.totalScanned, 
          updatedCount: resData.updatedCount 
        };
      }
      return { success: false, totalScanned: 0, updatedCount: 0, error: resData.error || 'Sync failed' };
    } catch (error: any) {
      console.error('Refresh all ClickUp statuses failed:', error);
      return { success: false, totalScanned: 0, updatedCount: 0, error: error.message || 'Unknown error' };
    }
  };

  const registerClickupWebhook = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'clickup-register-webhook',
          type: 'settings',
          id: null,
          data: {}
        })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        return { success: true };
      }
      return { success: false, error: resData.error || 'Webhook registration failed.' };
    } catch (err: any) {
      console.warn('ClickUp Webhook registration failed:', err);
      return { success: false, error: err.message };
    }
  };

  const checkClickupWebhookStatus = async (): Promise<{ success: boolean; registered: boolean; error?: string }> => {
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'clickup-check-webhook',
          type: 'settings',
          id: null,
          data: {}
        })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        return { success: true, registered: resData.registered };
      }
      return { success: false, registered: false, error: resData.error || 'Check failed.' };
    } catch (err: any) {
      console.warn('ClickUp Webhook check failed:', err);
      return { success: false, registered: false, error: err.message };
    }
  };

  const addComment = async (itemId: string, content: string) => {
    if (!currentUser) return { success: false, error: 'User must be signed in to comment' };
    
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemId,
      authorName: currentUser.name || currentUser.email || 'Guest',
      authorEmail: currentUser.email || '',
      content: content.trim()
    };
    
    // Save to server
    await persistChange('create', 'comments', newComment.id, newComment);
    
    // Update local state immediately
    setComments(prev => [...prev, newComment]);
    
    return { success: true, comment: newComment };
  };

  return (
    <DashboardContext.Provider value={{
      comments, addComment, lastOpenedMap, markTaskAsRead,
      activeTab, setActiveTab,
      productItems, setProductItems, updateProductItem, addProductItem, deleteProductItem,
      planItems, setPlanItems, updatePlanItem, addPlanItem, deletePlanItem,
      studentProjects, setStudentProjects, updateStudentProject, addStudentProject, deleteStudentProject,
      amaSessions, setAMASessions, updateAMASession, addAMASession, deleteAMASession,
      studentMeetings, setStudentMeetings, updateStudentMeeting, addStudentMeeting, deleteStudentMeeting,
      adminCalls, setAdminCalls, updateAdminCall, addAdminCall, deleteAdminCall,
      tarunSirMeetings, setTarunSirMeetings, updateTarunSirMeeting, addTarunSirMeeting, deleteTarunSirMeeting,
      contentItems, setContentItems, updateContentItem, addContentItem, deleteContentItem,
      dailyIssues, setDailyIssues, updateDailyIssue, addDailyIssue, deleteDailyIssue,
      featureAdoptions, setFeatureAdoptions, updateFeatureAdoption, addFeatureAdoption, deleteFeatureAdoption,
      previewProductId, setPreviewProductId, openPreviewForFeature,
      activeSubtasksTaskLink, setActiveSubtasksTaskLink,
      previousTab, setPreviousTab,
      tabScrollPositions, setTabScrollPosition,
      speakers, addSpeaker, updateSpeaker, deleteSpeaker,
      productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
      statuses, addStatus, updateStatus, deleteStatus,
      programs, addProgram, updateProgram, deleteProgram,
      cohorts, addCohort, updateCohort, deleteCohort,
      clickupApiKey, setClickupApiKey: updateClickupApiKey, syncClickupTask,
      refreshAllClickupStatuses,
      sendEmailDigest,
      registerClickupWebhook,
      checkClickupWebhookStatus,
      refreshAllData,
      googleClientId, setGoogleClientId: updateGoogleClientId,
      requireGoogleLogin, setRequireGoogleLogin: updateRequireGoogleLogin,
      googleAllowedDomains, setGoogleAllowedDomains: updateGoogleAllowedDomains,
      sharableCalendarSources, updateSharableCalendarSources,
      currentUser, canUserEdit, loginUser, loginUserByEmail, logoutUser,
      isLoading, syncStatus,
      confirm,
      alert,
      formConfigs, setFormConfigs, saveFormConfig,
      feedbackSubmissions, setFeedbackSubmissions, addFeedbackSubmission, deleteFeedbackSubmission,
      
      // Scalable additions
      dashboardCounts,
      isLoadingCounts,
      fetchDashboardCounts,
      fetchDashboardList,
      calendarEvents,
      isLoadingCalendar,
      loadCalendarMonth,
      loadCommentsForTask,
      loadTabData,
      loadedTabs,
      isLoadingSprint,
      fetchSprintData,
      fetchProductBreakdownData,
      fetchPaginatedMeetingsData,
      searchGlobalTasks,
      highlightedCallId,
      setHighlightedCallId,
      meetingSearchQuery,
      setMeetingSearchQuery,
      calendarMonth,
      setCalendarMonth,
      digestRecipient,
      updateDigestRecipient,
      digestAppUrl,
      updateDigestAppUrl,
      digestSMTPHost,
      updateDigestSMTPHost,
      digestSMTPPort,
      updateDigestSMTPPort,
      digestSMTPUser,
      updateDigestSMTPUser,
      digestSMTPPass,
      updateDigestSMTPPass,
      digestFrequency,
      updateDigestFrequency,
      digestTime,
      updateDigestTime,
      digestDayOfWeek,
      updateDigestDayOfWeek
    }}>
      {children}
      {dialogState && (
        <UnifiedDialogModal
          isOpen={dialogState.isOpen}
          type={dialogState.type}
          title={dialogState.title}
          message={dialogState.message}
          confirmText={dialogState.confirmText}
          cancelText={dialogState.cancelText}
          variant={dialogState.variant}
          onConfirm={() => handleDialogClose(true)}
          onCancel={() => handleDialogClose(false)}
        />
      )}
    </DashboardContext.Provider>
  );
};


export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

interface DialogState {
  isOpen: boolean;
  type: 'confirm' | 'alert';
  message: string;
  title: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'primary' | 'success';
  resolve: (value: boolean) => void;
}

const UnifiedDialogModal: React.FC<{
  isOpen: boolean;
  type: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, type, title, message, confirmText, cancelText, variant, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  // Variant styling
  const variantStyles = {
    danger: {
      icon: <AlertCircle size={28} />,
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      confirmBg: '#ef4444',
    },
    warning: {
      icon: <AlertCircle size={28} />,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.1)',
      confirmBg: '#f59e0b',
    },
    success: {
      icon: <CheckCircle size={28} />,
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      confirmBg: '#10b981',
    },
    primary: {
      icon: <Info size={28} />,
      iconColor: '#7c3aed',
      iconBg: 'rgba(124, 58, 237, 0.1)',
      confirmBg: '#7c3aed',
    },
  }[variant];

  return (
    <div className="modal-overlay" onClick={type === 'confirm' ? onCancel : onConfirm} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: variantStyles.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: variantStyles.iconColor,
            marginBottom: '0.25rem'
          }}>
            {variantStyles.icon}
          </div>
          
          <h3 style={{ margin: 0, fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            {title}
          </h3>
          
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {message}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
          {type === 'confirm' && (
            <button 
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'background-color 0.2s, color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {cancelText || 'Cancel'}
            </button>
          )}
          <button 
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: variantStyles.confirmBg,
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              transition: 'opacity 0.2s, transform 0.1s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {confirmText || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
