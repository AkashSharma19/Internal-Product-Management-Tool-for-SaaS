import React, { createContext, useContext, useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
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
  initialProductItems,
  initialPlanItems,
  initialStudentProjects,
  initialAMASessions,
  initialStudentMeetings,
  initialAdminCalls,
  initialTarunSirMeetings,
  initialContentItems,
  initialDailyIssues,
  initialFeatureAdoptions,
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
  syncClickupTask: (taskIdOrUrl: string) => Promise<{ status: string; subtasksCount: number; assignee: string } | null>;
  refreshAllClickupStatuses: () => Promise<{ success: boolean; totalScanned: number; updatedCount: number; error?: string }>;
  refreshAllData: () => Promise<{ success: boolean; updatedSheets: number; error?: string }>;

  // Google OAuth Settings
  googleClientId: string;
  setGoogleClientId: (val: string) => void;
  requireGoogleLogin: boolean;
  setRequireGoogleLogin: (val: boolean) => void;
  googleAllowedDomains: string;
  setGoogleAllowedDomains: (val: string) => void;

  // User Authentication
  currentUser: ConfigSpeaker | null;
  canUserEdit: boolean;
  loginUser: (speakerId: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
    if (!featureName) return;
    
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = clean(featureName);
    
    // 1. Check exact or substring match in productItems
    let match = productItems.find(item => {
      const cleanFeature = clean(item.feature);
      return cleanName.includes(cleanFeature) || cleanFeature.includes(cleanName);
    });

    // 2. Token overlap match (2+ common words with length > 3)
    if (!match) {
      const nameWords = featureName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
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
        finalReleaseCompleted: fallbackData?.finalReleaseCompleted || false
      };
      
      setProductItems(prev => [...prev, newTempProduct]);
      setPreviewProductId(newTempProduct.id);
    }
  };

  // Data states loaded from localStorage or mockData
  const [productItems, setProductItems] = useState<ProductItem[]>(() => {
    const data = localStorage.getItem('data-products');
    return data ? JSON.parse(data) : initialProductItems;
  });

  const [planItems, setPlanItems] = useState<PlanItem[]>(() => {
    const data = localStorage.getItem('data-plans');
    if (!data) return initialPlanItems;
    try {
      const items = JSON.parse(data) as PlanItem[];
      return items.map(item => {
        let updatedStatus = item.status;
        let completed = item.completed;
        if (item.status === 'testing' || item.status === 'tested') {
          updatedStatus = 'development';
        } else if (item.status === 'Done' || item.status === 'closed') {
          completed = true;
          if (item.category === 'Product') {
            updatedStatus = 'open';
          } else if (item.category === 'UI/UX') {
            updatedStatus = 'in design';
          } else {
            updatedStatus = 'development';
          }
        }
        return {
          ...item,
          status: updatedStatus,
          completed: !!completed
        };
      });
    } catch (e) {
      return initialPlanItems;
    }
  });

  const [studentProjects, setStudentProjects] = useState<StudentProject[]>(() => {
    const data = localStorage.getItem('data-student-projects');
    return data ? JSON.parse(data) : initialStudentProjects;
  });

  const [amaSessions, setAMASessions] = useState<AMASession[]>(() => {
    const data = localStorage.getItem('data-ama-sessions');
    return data ? JSON.parse(data) : initialAMASessions;
  });

  const [studentMeetings, setStudentMeetings] = useState<StudentMeeting[]>(() => {
    const data = localStorage.getItem('data-student-meetings');
    return data ? JSON.parse(data) : initialStudentMeetings;
  });

  const [adminCalls, setAdminCalls] = useState<AdminCall[]>(() => {
    const data = localStorage.getItem('data-admin-calls');
    return data ? JSON.parse(data) : initialAdminCalls;
  });

  const [tarunSirMeetings, setTarunSirMeetings] = useState<TarunSirMeeting[]>(() => {
    const data = localStorage.getItem('data-tarun-meetings');
    return data ? JSON.parse(data) : initialTarunSirMeetings;
  });

  const [contentItems, setContentItems] = useState<ContentItem[]>(() => {
    const data = localStorage.getItem('data-content-items');
    return data ? JSON.parse(data) : initialContentItems;
  });

  const [dailyIssues, setDailyIssues] = useState<DailyIssue[]>(() => {
    const data = localStorage.getItem('data-daily-issues');
    return data ? JSON.parse(data) : initialDailyIssues;
  });

  const [featureAdoptions, setFeatureAdoptions] = useState<FeatureAdoption[]>(() => {
    const data = localStorage.getItem('data-feature-adoptions');
    return data ? JSON.parse(data) : initialFeatureAdoptions;
  });

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

  const [currentUser, setCurrentUser] = useState<ConfigSpeaker | null>(null);
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
    return { success: true };
  };

  const logoutUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('logged-in-user-id');
  };


  useEffect(() => {
    localStorage.setItem('active-tab', activeTab);
  }, [activeTab]);

  // Persist datasets
  useEffect(() => {
    localStorage.setItem('data-products', JSON.stringify(productItems));
  }, [productItems]);

  useEffect(() => {
    localStorage.setItem('data-plans', JSON.stringify(planItems));
  }, [planItems]);

  useEffect(() => {
    localStorage.setItem('data-student-projects', JSON.stringify(studentProjects));
  }, [studentProjects]);

  useEffect(() => {
    localStorage.setItem('data-ama-sessions', JSON.stringify(amaSessions));
  }, [amaSessions]);

  useEffect(() => {
    localStorage.setItem('data-student-meetings', JSON.stringify(studentMeetings));
  }, [studentMeetings]);

  useEffect(() => {
    localStorage.setItem('data-admin-calls', JSON.stringify(adminCalls));
  }, [adminCalls]);

  useEffect(() => {
    localStorage.setItem('data-tarun-meetings', JSON.stringify(tarunSirMeetings));
  }, [tarunSirMeetings]);

  useEffect(() => {
    localStorage.setItem('data-content-items', JSON.stringify(contentItems));
  }, [contentItems]);

  useEffect(() => {
    localStorage.setItem('data-daily-issues', JSON.stringify(dailyIssues));
  }, [dailyIssues]);

  useEffect(() => {
    localStorage.setItem('data-feature-adoptions', JSON.stringify(featureAdoptions));
  }, [featureAdoptions]);

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


  // Helper to persist to API
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced' | 'error'>('synced');

  const persistChange = async (action: 'create' | 'update' | 'delete' | 'batch-import', type: string, id: string | null, data: any) => {
    setSyncStatus('syncing');
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
  };

  // Mounting effect to fetch all data from MongoDB
  const [isLoading, setIsLoading] = useState(true);

  // Reusable data fetch — used on mount AND by the "Refresh Data" button
  const refreshAllData = async (): Promise<{ success: boolean; updatedSheets: number; error?: string }> => {
    setSyncStatus('syncing');
    let updatedSheets = 0;
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        setSyncStatus('error');
        return { success: false, updatedSheets: 0, error: 'Server returned an error' };
      }
      const resData = await response.json();
      if (resData.success && resData.data) {
        const db = resData.data;
        if (db.products && db.products.length > 0)           { setProductItems(db.products);       updatedSheets++; }
        if (db.plans && db.plans.length > 0)                 { setPlanItems(db.plans);             updatedSheets++; }
        if (db.projects && db.projects.length > 0)           { setStudentProjects(db.projects);    updatedSheets++; }
        if (db.amaSessions && db.amaSessions.length > 0)     { setAMASessions(db.amaSessions);     updatedSheets++; }
        if (db.studentMeetings && db.studentMeetings.length > 0) { setStudentMeetings(db.studentMeetings); updatedSheets++; }
        if (db.adminCalls && db.adminCalls.length > 0)       { setAdminCalls(db.adminCalls);       updatedSheets++; }
        if (db.tarunSirMeetings && db.tarunSirMeetings.length > 0) { setTarunSirMeetings(db.tarunSirMeetings); updatedSheets++; }
        if (db.contentItems && db.contentItems.length > 0)   { setContentItems(db.contentItems);   updatedSheets++; }
        if (db.dailyIssues && db.dailyIssues.length > 0)     { setDailyIssues(db.dailyIssues);     updatedSheets++; }
        if (db.featureAdoptions && db.featureAdoptions.length > 0) { setFeatureAdoptions(db.featureAdoptions); updatedSheets++; }

        if (db.speakers && db.speakers.length > 0) {
          setSpeakers(db.speakers);
          const savedUserId = localStorage.getItem('logged-in-user-id');
          if (savedUserId) {
            const matchedUser = db.speakers.find((s: any) => s.id === savedUserId);
            if (matchedUser) setCurrentUser(matchedUser);
          }
          updatedSheets++;
        }
        if (db.productGroups && db.productGroups.length > 0) { setProductGroups(db.productGroups); updatedSheets++; }
        if (db.statuses && db.statuses.length > 0)           { setStatuses(db.statuses);           updatedSheets++; }
        if (db.programs && db.programs.length > 0)           { setPrograms(db.programs);           updatedSheets++; }
        if (db.cohorts && db.cohorts.length > 0)             { setCohorts(db.cohorts);             updatedSheets++; }

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
        }
        setSyncStatus('synced');
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
        const allReleased = relatedTasks.every(task => !!task.finalReleaseCompleted);
        const targetStatus = allReleased ? 'Completed' : 'Pending Actions';

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

  // Helper Updaters
  const updateProductItem = (id: string, updated: Partial<ProductItem>) => {
    setProductItems(prev => {
      const oldItem = prev.find(item => item.id === id);
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
              title: updatedItem.feature,
              description: updatedItem.description,
              status: (
                updatedItem.status === 'Completed' ? 'Delivered' :
                updatedItem.status === 'On Hold' ? 'Cancelled' :
                updatedItem.status === 'In Progress' ? 'In-Progress' :
                updatedItem.status || ''
              ) as any,
              blocker: updatedItem.blocker,
              completeInfoDate: updatedItem.deadline,
              priority: updatedItem.priority || undefined,
              poc: updatedItem.poc,
              clickupStatus: updatedItem.clickupStatus,
              taskLink: updatedItem.taskLink,
              productDeadline: updatedItem.productDeadline,
              uiux: updatedItem.uiux,
              deadline: updatedItem.deadline,
              finalRelease: updatedItem.finalRelease,
              raisedByTarunSir: updatedItem.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval,
              product: updatedItem.product,
              module: updatedItem.module,
              type: updatedItem.type,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted
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
              cohort: updatedItem.feature,
              summary: updatedItem.description,
              status: updatedItem.status,
              blocker: updatedItem.blocker,
              priority: updatedItem.priority || undefined,
              poc: updatedItem.poc,
              clickupStatus: updatedItem.clickupStatus,
              taskLink: updatedItem.taskLink,
              productDeadline: updatedItem.productDeadline,
              uiux: updatedItem.uiux,
              deadline: updatedItem.deadline,
              finalRelease: updatedItem.finalRelease,
              raisedByTarunSir: updatedItem.raisedByTarunSir,
              tarunSirApproval: updatedItem.tarunSirApproval,
              product: updatedItem.product,
              module: updatedItem.module,
              type: updatedItem.type,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted
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
              module: updatedItem.feature,
              product: updatedItem.product,
              priority: updatedItem.priority,
              poc: updatedItem.poc,
              clickupStatus: updatedItem.clickupStatus,
              productDeadline: updatedItem.productDeadline,
              uiux: updatedItem.uiux,
              deadline: updatedItem.deadline,
              finalRelease: updatedItem.finalRelease,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted,
              status: updatedItem.status,
              raisedByTarunSir: updatedItem.raisedByTarunSir
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
              module: updatedItem.feature,
              product: updatedItem.product || issue.product,
              priority: updatedItem.priority || issue.priority,
              poc: updatedItem.poc || issue.poc,
              clickupStatus: updatedItem.clickupStatus || issue.clickupStatus,
              productDeadline: updatedItem.productDeadline || issue.productDeadline,
              uiux: updatedItem.uiux || issue.uiux,
              deadline: updatedItem.deadline || issue.deadline,
              finalRelease: updatedItem.finalRelease || issue.finalRelease,
              productDeadlineCompleted: updatedItem.productDeadlineCompleted,
              uiuxCompleted: updatedItem.uiuxCompleted,
              deadlineCompleted: updatedItem.deadlineCompleted,
              finalReleaseCompleted: updatedItem.finalReleaseCompleted,
              status: updatedItem.status as any,
              raisedByTarunSir: updatedItem.raisedByTarunSir
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
    setProductItems(prev => [item, ...prev]);
    persistChange('create', 'products', null, item);
  };
  const deleteProductItem = (id: string) => {
    setProductItems(prev => prev.filter(item => item.id !== id));
    persistChange('delete', 'products', id, null);
  };

  const updatePlanItem = (id: string, updated: Partial<PlanItem>) => {
    setPlanItems(prev => {
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
              description: updatedItem.description || p.description,
              priority: (updatedItem.priority as any) || p.priority,
              poc: updatedItem.poc || p.poc,
              status: (
                updatedItem.status === 'Delivered' || (updatedItem.status as string) === 'Completed' ? 'Completed' :
                updatedItem.status === 'Cancelled' || (updatedItem.status as string) === 'On Hold' ? 'On Hold' :
                updatedItem.status === 'In-Progress' || (updatedItem.status as string) === 'In Progress' ? 'In Progress' :
                updatedItem.status || ''
              ) as any,
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
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted
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
              finalReleaseCompleted: updatedItem.finalReleaseCompleted !== undefined ? updatedItem.finalReleaseCompleted : p.finalReleaseCompleted
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
              raisedByTarunSir: !!updatedItem.raisedByTarunSir
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
              raisedByTarunSir: !!updatedItem.raisedByTarunSir
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

  const syncClickupTask = async (taskIdOrUrl: string): Promise<{ status: string; subtasksCount: number; assignee: string } | null> => {
    const taskId = extractClickupTaskId(taskIdOrUrl);
    if (!taskId) return null;
    if (!clickupApiKey.trim()) return null;

    try {
      const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`, {
        method: 'GET',
        headers: {
          'Authorization': clickupApiKey.trim(),
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status && data.status.status) {
          const assigneeName = data.assignees && Array.isArray(data.assignees)
            ? data.assignees.map((a: any) => a.username).join(', ')
            : '';
          return {
            status: data.status.status,
            subtasksCount: data.subtasks ? data.subtasks.length : 0,
            assignee: assigneeName
          };
        }
      }
    } catch (err) {
      console.warn('ClickUp API call failed:', err);
    }
    return null;
  };

  const refreshAllClickupStatuses = async (): Promise<{ success: boolean; totalScanned: number; updatedCount: number; error?: string }> => {
    if (!clickupApiKey.trim()) {
      return { success: false, totalScanned: 0, updatedCount: 0, error: 'ClickUp API key is not configured' };
    }

    let updatedCount = 0;
    let totalScanned = 0;

    try {
      const itemsToSync = [
        ...productItems.map(item => ({ id: item.id, type: 'product', link: item.taskLink || '' })),
        ...studentProjects.map(item => ({ id: item.id, type: 'project', link: item.taskLink || '' })),
        ...studentMeetings.map(item => ({ id: item.id, type: 'meeting', link: item.taskLink || '' })),
        ...dailyIssues.map(item => ({ id: item.id, type: 'issue', link: item.taskLink || '' })),
        ...planItems.map(item => ({ id: item.id, type: 'plan', link: item.link || '' })),
      ].filter(x => x.link && extractClickupTaskId(x.link));

      const uniqueTaskIds = Array.from(new Set(itemsToSync.map(x => extractClickupTaskId(x.link) as string)));
      totalScanned = uniqueTaskIds.length;

      if (uniqueTaskIds.length === 0) {
        return { success: true, totalScanned: 0, updatedCount: 0 };
      }

      const fetchPromises = uniqueTaskIds.map(async (taskId) => {
        try {
          const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`, {
            method: 'GET',
            headers: {
              'Authorization': clickupApiKey.trim(),
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.status && data.status.status) {
              const assigneeName = data.assignees && Array.isArray(data.assignees)
                ? data.assignees.map((a: any) => a.username).join(', ')
                : '';
              return { 
                taskId, 
                status: data.status.status,
                subtasksCount: data.subtasks ? data.subtasks.length : 0,
                assignee: assigneeName
              };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ClickUp status for task ${taskId}:`, e);
        }
        return null;
      });

      const results = await Promise.all(fetchPromises);
      const statusMap: Record<string, { status: string; subtasksCount: number; assignee: string }> = {};
      results.forEach(res => {
        if (res) {
          statusMap[res.taskId] = { 
            status: res.status, 
            subtasksCount: res.subtasksCount,
            assignee: res.assignee
          };
        }
      });

      // Compute updated count accurately
      productItems.forEach(item => {
        const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
        if (tId && statusMap[tId] && (
          item.clickupStatus !== statusMap[tId].status || 
          item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
          item.clickupAssignee !== statusMap[tId].assignee
        )) {
          updatedCount++;
        }
      });
      studentProjects.forEach(item => {
        const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
        if (tId && statusMap[tId] && (
          item.clickupStatus !== statusMap[tId].status || 
          item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
          item.clickupAssignee !== statusMap[tId].assignee
        )) {
          updatedCount++;
        }
      });
      studentMeetings.forEach(item => {
        const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
        if (tId && statusMap[tId] && (
          item.clickupStatus !== statusMap[tId].status || 
          item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
          item.clickupAssignee !== statusMap[tId].assignee
        )) {
          updatedCount++;
        }
      });
      dailyIssues.forEach(item => {
        const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
        if (tId && statusMap[tId] && (
          item.clickupStatus !== statusMap[tId].status || 
          item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
          item.clickupAssignee !== statusMap[tId].assignee
        )) {
          updatedCount++;
        }
      });
      planItems.forEach(item => {
        const tId = item.link ? extractClickupTaskId(item.link) : null;
        if (tId && statusMap[tId] && (
          item.clickupStatus !== statusMap[tId].status || 
          item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
          item.clickupAssignee !== statusMap[tId].assignee
        )) {
          updatedCount++;
        }
      });

      setProductItems(prev => {
        return prev.map(item => {
          const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
          if (tId && statusMap[tId] && (
            item.clickupStatus !== statusMap[tId].status || 
            item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
            item.clickupAssignee !== statusMap[tId].assignee
          )) {
            const updatedItem = { 
              ...item, 
              clickupStatus: statusMap[tId].status,
              clickupSubtasksCount: statusMap[tId].subtasksCount,
              clickupAssignee: statusMap[tId].assignee
            };
            persistChange('update', 'products', item.id, updatedItem);
            return updatedItem;
          }
          return item;
        });
      });

      setStudentProjects(prev => {
        return prev.map(item => {
          const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
          if (tId && statusMap[tId] && (
            item.clickupStatus !== statusMap[tId].status || 
            item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
            item.clickupAssignee !== statusMap[tId].assignee
          )) {
            const updatedItem = { 
              ...item, 
              clickupStatus: statusMap[tId].status,
              clickupSubtasksCount: statusMap[tId].subtasksCount,
              clickupAssignee: statusMap[tId].assignee
            };
            persistChange('update', 'projects', item.id, updatedItem);
            return updatedItem;
          }
          return item;
        });
      });

      setStudentMeetings(prev => {
        return prev.map(item => {
          const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
          if (tId && statusMap[tId] && (
            item.clickupStatus !== statusMap[tId].status || 
            item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
            item.clickupAssignee !== statusMap[tId].assignee
          )) {
            const updatedItem = { 
              ...item, 
              clickupStatus: statusMap[tId].status,
              clickupSubtasksCount: statusMap[tId].subtasksCount,
              clickupAssignee: statusMap[tId].assignee
            };
            persistChange('update', 'studentMeetings', item.id, updatedItem);
            return updatedItem;
          }
          return item;
        });
      });

      setDailyIssues(prev => {
        return prev.map(item => {
          const tId = item.taskLink ? extractClickupTaskId(item.taskLink) : null;
          if (tId && statusMap[tId] && (
            item.clickupStatus !== statusMap[tId].status || 
            item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
            item.clickupAssignee !== statusMap[tId].assignee
          )) {
            const updatedItem = { 
              ...item, 
              clickupStatus: statusMap[tId].status,
              clickupSubtasksCount: statusMap[tId].subtasksCount,
              clickupAssignee: statusMap[tId].assignee
            };
            persistChange('update', 'dailyIssues', item.id, updatedItem);
            return updatedItem;
          }
          return item;
        });
      });

      setPlanItems(prev => {
        return prev.map(item => {
          const tId = item.link ? extractClickupTaskId(item.link) : null;
          if (tId && statusMap[tId] && (
            item.clickupStatus !== statusMap[tId].status || 
            item.clickupSubtasksCount !== statusMap[tId].subtasksCount ||
            item.clickupAssignee !== statusMap[tId].assignee
          )) {
            const updatedItem = { 
              ...item, 
              clickupStatus: statusMap[tId].status,
              clickupSubtasksCount: statusMap[tId].subtasksCount,
              clickupAssignee: statusMap[tId].assignee
            };
            persistChange('update', 'plans', item.id, updatedItem);
            return updatedItem;
          }
          return item;
        });
      });

      return { success: true, totalScanned, updatedCount };
    } catch (error: any) {
      console.error('Refresh all ClickUp statuses failed:', error);
      return { success: false, totalScanned, updatedCount, error: error.message || 'Unknown error' };
    }
  };

  return (
    <DashboardContext.Provider value={{
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
      previousTab, setPreviousTab,
      tabScrollPositions, setTabScrollPosition,
      speakers, addSpeaker, updateSpeaker, deleteSpeaker,
      productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
      statuses, addStatus, updateStatus, deleteStatus,
      programs, addProgram, updateProgram, deleteProgram,
      cohorts, addCohort, updateCohort, deleteCohort,
      clickupApiKey, setClickupApiKey: updateClickupApiKey, syncClickupTask,
      refreshAllClickupStatuses,
      refreshAllData,
      googleClientId, setGoogleClientId: updateGoogleClientId,
      requireGoogleLogin, setRequireGoogleLogin: updateRequireGoogleLogin,
      googleAllowedDomains, setGoogleAllowedDomains: updateGoogleAllowedDomains,
      currentUser, canUserEdit, loginUser, logoutUser,
      isLoading, syncStatus,
      confirm,
      alert,
      formConfigs, setFormConfigs, saveFormConfig,
      feedbackSubmissions, setFeedbackSubmissions, addFeedbackSubmission, deleteFeedbackSubmission,
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
          
          <h3 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 600 }}>
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
