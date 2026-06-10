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
  ConfigStatus
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
  initialStatuses
} from '../mockData';

interface DashboardContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
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

  resetAllData: () => void;

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
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return (savedTheme as 'light' | 'dark') || 'dark';
  });

  // Active Tab state
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('active-tab') || 'product';
  });

  const [previewProductId, setPreviewProductId] = useState<string | null>(null);

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
      setPreviewProductId(match.id);
    } else {
      // Map statuses from other task types to ProductItem statuses
      let productStatus: 'On Hold' | 'In Progress' | 'Ongoing' | 'Completed' = 'In Progress';
      const statusLower = String(fallbackData?.status || '').toLowerCase();
      if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'tested' || statusLower === 'completed' || statusLower === 'delivered') {
        productStatus = 'Completed';
      } else if (statusLower === 'on hold' || statusLower === 'cancelled') {
        productStatus = 'On Hold';
      }

      const tempId = fallbackData?.id ? `prod-temp-${fallbackData.id}` : `prod-temp-${Date.now()}`;
      // Create a temporary mock product item using the fallbackData or title so they still see it in the premium feature layout!
      const newTempProduct: ProductItem = {
        id: tempId,
        feature: featureName,
        description: fallbackData?.description || `Operations task details.`,
        tarunSirApproval: fallbackData?.tarunSirApproval || false,
        raisedByTarunSir: fallbackData?.raisedByTarunSir || false,
        priority: fallbackData?.priority || 'P2',
        poc: fallbackData?.poc || 'Akash',
        status: productStatus,
        clickupStatus: fallbackData?.clickupStatus || fallbackData?.status || 'open',
        taskLink: fallbackData?.taskLink || '',
        blocker: fallbackData?.blocker || '',
        deadline: fallbackData?.deadline || '',
        notes: fallbackData?.notes || '',
        product: fallbackData?.product || 'Coach LMS Web',
        module: fallbackData?.module || '',
        type: fallbackData?.type || '',
        uiux: fallbackData?.uiux || '',
        finalRelease: fallbackData?.finalRelease || '',
        productDeadline: fallbackData?.productDeadline || ''
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
    return data ? JSON.parse(data) : initialPlanItems;
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

  // Persist settings
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Helper Updaters
  const updateProductItem = (id: string, updated: Partial<ProductItem>) => {
    setProductItems(prev => {
      const next = prev.map(item => item.id === id ? { ...item, ...updated } : item);
      const updatedItem = next.find(item => item.id === id);
      if (updatedItem) {
        setStudentProjects(sp => sp.map(p => {
          if (p.title.toLowerCase() === updatedItem.feature.toLowerCase() || id === `prod-temp-${p.id}`) {
            return {
              ...p,
              title: updatedItem.feature,
              description: updatedItem.description,
              status: (updatedItem.status === 'Completed' ? 'Delivered' : updatedItem.status === 'On Hold' ? 'Cancelled' : 'In-Progress') as any,
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
              type: updatedItem.type
            };
          }
          return p;
        }));
        setStudentMeetings(sm => sm.map(m => {
          if (m.cohort.toLowerCase() === updatedItem.feature.toLowerCase() || id === `prod-temp-${m.id}`) {
            return {
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
              type: updatedItem.type
            };
          }
          return m;
        }));
      }
      return next;
    });
  };
  const addProductItem = (item: ProductItem) => {
    setProductItems(prev => [item, ...prev]);
  };
  const deleteProductItem = (id: string) => {
    setProductItems(prev => prev.filter(item => item.id !== id));
  };

  const updatePlanItem = (id: string, updated: Partial<PlanItem>) => {
    setPlanItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addPlanItem = (item: PlanItem) => {
    setPlanItems(prev => [item, ...prev]);
  };
  const deletePlanItem = (id: string) => {
    setPlanItems(prev => prev.filter(item => item.id !== id));
  };

  const updateStudentProject = (id: string, updated: Partial<StudentProject>) => {
    setStudentProjects(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addStudentProject = (item: StudentProject) => {
    setStudentProjects(prev => [item, ...prev]);
  };
  const deleteStudentProject = (id: string) => {
    setStudentProjects(prev => prev.filter(item => item.id !== id));
  };

  const updateAMASession = (id: string, updated: Partial<AMASession>) => {
    setAMASessions(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addAMASession = (item: AMASession) => {
    setAMASessions(prev => [item, ...prev]);
  };
  const deleteAMASession = (id: string) => {
    setAMASessions(prev => prev.filter(item => item.id !== id));
  };

  const updateStudentMeeting = (id: string, updated: Partial<StudentMeeting>) => {
    setStudentMeetings(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addStudentMeeting = (item: StudentMeeting) => {
    setStudentMeetings(prev => [item, ...prev]);
  };
  const deleteStudentMeeting = (id: string) => {
    setStudentMeetings(prev => prev.filter(item => item.id !== id));
  };

  const updateAdminCall = (id: string, updated: Partial<AdminCall>) => {
    setAdminCalls(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addAdminCall = (item: AdminCall) => {
    setAdminCalls(prev => [item, ...prev]);
  };
  const deleteAdminCall = (id: string) => {
    setAdminCalls(prev => prev.filter(item => item.id !== id));
  };

  const updateContentItem = (id: string, updated: Partial<ContentItem>) => {
    setContentItems(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addContentItem = (item: ContentItem) => {
    setContentItems(prev => [item, ...prev]);
  };
  const deleteContentItem = (id: string) => {
    setContentItems(prev => prev.filter(item => item.id !== id));
  };

  const updateDailyIssue = (id: string, updated: Partial<DailyIssue>) => {
    setDailyIssues(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addDailyIssue = (item: DailyIssue) => {
    setDailyIssues(prev => [item, ...prev]);
  };
  const deleteDailyIssue = (id: string) => {
    setDailyIssues(prev => prev.filter(item => item.id !== id));
  };

  const updateFeatureAdoption = (id: string, updated: Partial<FeatureAdoption>) => {
    setFeatureAdoptions(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
  };
  const addFeatureAdoption = (item: FeatureAdoption) => {
    setFeatureAdoptions(prev => [item, ...prev]);
  };
  const deleteFeatureAdoption = (id: string) => {
    setFeatureAdoptions(prev => prev.filter(item => item.id !== id));
  };

  // Config CRUD helpers
  const addSpeaker = (item: ConfigSpeaker) => setSpeakers(prev => [...prev, item]);
  const updateSpeaker = (id: string, updated: Partial<ConfigSpeaker>) =>
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  const deleteSpeaker = (id: string) => setSpeakers(prev => prev.filter(s => s.id !== id));

  const addProductGroup = (item: ConfigProductGroup) => setProductGroups(prev => [...prev, item]);
  const updateProductGroup = (id: string, updated: Partial<ConfigProductGroup>) =>
    setProductGroups(prev => prev.map(g => g.id === id ? { ...g, ...updated } : g));
  const deleteProductGroup = (id: string) => setProductGroups(prev => prev.filter(g => g.id !== id));

  const addStatus = (item: ConfigStatus) => setStatuses(prev => [...prev, item]);
  const updateStatus = (id: string, updated: Partial<ConfigStatus>) =>
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  const deleteStatus = (id: string) => setStatuses(prev => prev.filter(s => s.id !== id));

  const resetAllData = () => {
    if (window.confirm("Are you sure you want to reset all dashboard data back to initial spreadsheets? Your edits will be lost.")) {
      setProductItems(initialProductItems);
      setPlanItems(initialPlanItems);
      setStudentProjects(initialStudentProjects);
      setAMASessions(initialAMASessions);
      setStudentMeetings(initialStudentMeetings);
      setAdminCalls(initialAdminCalls);
      setContentItems(initialContentItems);
      setDailyIssues(initialDailyIssues);
      setFeatureAdoptions(initialFeatureAdoptions);
      setSpeakers(initialSpeakers);
      setProductGroups(initialProductGroups);
      setStatuses(initialStatuses);
    }
  };

  return (
    <DashboardContext.Provider value={{
      theme, toggleTheme,
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
      resetAllData,
      previewProductId, setPreviewProductId, openPreviewForFeature,
      speakers, addSpeaker, updateSpeaker, deleteSpeaker,
      productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
      statuses, addStatus, updateStatus, deleteStatus,
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
