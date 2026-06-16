import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  ProductItem, 
  PlanItem, 
  StudentProject, 
  AMASession, 
  StudentMeeting, 
  AdminCall, 
  ContentItem, 
  DailyIssue, 
  FeatureAdoption,
  ConfigSpeaker,
  ConfigProductGroup,
  ConfigStatus,
  ConfigProgram,
  ConfigCohort
} from '../types';
import {
  initialProductItems,
  initialPlanItems,
  initialStudentProjects,
  initialAMASessions,
  initialStudentMeetings,
  initialAdminCalls,
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
  syncClickupTask: (taskIdOrUrl: string) => Promise<string | null>;

  // User Authentication
  currentUser: ConfigSpeaker | null;
  loginUser: (speakerId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;

  isLoading: boolean;
  syncStatus: 'syncing' | 'synced' | 'error';
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

      const validTabs = ['dashboard', 'product', 'plan', 'projects', 'meetings', 'admin', 'content', 'product-wise', 'issues', 'adoption', 'config'];
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
        poc: fallbackData?.poc || '',
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

  const [currentUser, setCurrentUser] = useState<ConfigSpeaker | null>(null);

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

  useEffect(() => {
    const fetchAllData = async () => {
      setSyncStatus('syncing');
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            const db = resData.data;
            if (db.products && db.products.length > 0) setProductItems(db.products);
            if (db.plans && db.plans.length > 0) setPlanItems(db.plans);
            if (db.projects && db.projects.length > 0) setStudentProjects(db.projects);
            if (db.amaSessions && db.amaSessions.length > 0) setAMASessions(db.amaSessions);
            if (db.studentMeetings && db.studentMeetings.length > 0) setStudentMeetings(db.studentMeetings);
            if (db.adminCalls && db.adminCalls.length > 0) setAdminCalls(db.adminCalls);
            if (db.contentItems && db.contentItems.length > 0) setContentItems(db.contentItems);
            if (db.dailyIssues && db.dailyIssues.length > 0) setDailyIssues(db.dailyIssues);
            if (db.featureAdoptions && db.featureAdoptions.length > 0) setFeatureAdoptions(db.featureAdoptions);
            
            if (db.speakers && db.speakers.length > 0) {
              setSpeakers(db.speakers);
              const savedUserId = localStorage.getItem('logged-in-user-id');
              if (savedUserId) {
                const matchedUser = db.speakers.find((s: any) => s.id === savedUserId);
                if (matchedUser) {
                  setCurrentUser(matchedUser);
                }
              }
            }
            if (db.productGroups && db.productGroups.length > 0) setProductGroups(db.productGroups);
            if (db.statuses && db.statuses.length > 0) setStatuses(db.statuses);
            if (db.programs && db.programs.length > 0) setPrograms(db.programs);
            if (db.cohorts && db.cohorts.length > 0) setCohorts(db.cohorts);
            
            if (db.settings) {
              const clickupSetting = db.settings.find((s: any) => s.key === 'clickupApiKey');
              if (clickupSetting) {
                setClickupApiKey(clickupSetting.value || '');
              }
            }
            setSyncStatus('synced');
          }
        } else {
          setSyncStatus('error');
        }
      } catch (err) {
        console.error('Failed to load database data:', err);
        setSyncStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const updateClickupApiKey = (key: string) => {
    setClickupApiKey(key);
    persistChange('update', 'settings', 'clickupApiKey', { id: 'clickupApiKey', key: 'clickupApiKey', value: key });
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
    setSpeakers(prev => [...prev, item]);
    persistChange('create', 'speakers', null, item);
  };
  const updateSpeaker = (id: string, updated: Partial<ConfigSpeaker>) => {
    setSpeakers(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updated } : s);
      const item = next.find(s => s.id === id);
      if (item) persistChange('update', 'speakers', id, item);
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

  const syncClickupTask = async (taskIdOrUrl: string): Promise<string | null> => {
    const taskId = extractClickupTaskId(taskIdOrUrl);
    if (!taskId) return null;
    if (!clickupApiKey.trim()) return null;

    try {
      const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': clickupApiKey.trim(),
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status && data.status.status) {
          return data.status.status;
        }
      }
    } catch (err) {
      console.warn('ClickUp API call failed:', err);
    }
    return null;
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
      contentItems, setContentItems, updateContentItem, addContentItem, deleteContentItem,
      dailyIssues, setDailyIssues, updateDailyIssue, addDailyIssue, deleteDailyIssue,
      featureAdoptions, setFeatureAdoptions, updateFeatureAdoption, addFeatureAdoption, deleteFeatureAdoption,
      previewProductId, setPreviewProductId, openPreviewForFeature,
      speakers, addSpeaker, updateSpeaker, deleteSpeaker,
      productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
      statuses, addStatus, updateStatus, deleteStatus,
      programs, addProgram, updateProgram, deleteProgram,
      cohorts, addCohort, updateCohort, deleteCohort,
      clickupApiKey, setClickupApiKey: updateClickupApiKey, syncClickupTask,
      currentUser, loginUser, logoutUser,
      isLoading, syncStatus,
    }}>
      {children}
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
