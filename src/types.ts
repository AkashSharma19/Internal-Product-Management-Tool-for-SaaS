
export interface ProductItem {
  id: string;
  feature: string;
  description: string; // Feature description and specs overview
  tarunSirApproval: boolean; // Verified by Tarun Sir
  raisedByTarunSir: boolean; // Raised by Tarun Sir (Super Priority)
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | '';
  poc: string; // e.g. Akash, Anushka, Nikhil
  status: 'On Hold' | 'In Progress' | 'Ongoing' | 'Completed' | '';
  clickupStatus: string; // testing, development, etc.
  taskLink: string;
  blocker: string;
  deadline: string;
  notes: string;
  product: string; // Coach LMS Web, Coach LMS App, etc.
  module?: string;
  type?: string;
  uiux: string; // date or notes
  finalRelease: string; // date or notes
  productDeadline: string; // date or notes
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  committedDate?: string;
  clickupSubtasksCount?: number;
  clickupAssignee?: string;
  createdAt?: string;
  supportDocsRequired?: boolean;
  supportDocLink?: string;
}

export interface PlanItem {
  id: string;
  month: string; // e.g. 'May 2026'
  category: 'Development' | 'UI/UX' | 'Product' | 'Release';
  task: string;
  link: string;
  status: 'testing' | 'development' | 'closed' | 'tested' | 'open' | 'in design' | 'Done' | 'released';
  completed?: boolean;
  clickupStatus?: string;
  clickupSubtasksCount?: number;
  clickupAssignee?: string;
  createdAt?: string;
}

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  thingsWeBuild: string;
  status: string;
  assigned: string; // date or name
  blocker: string;
  completeInfoDate: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  poc?: string;
  clickupStatus?: string;
  clickupSubtasksCount?: number;
  clickupAssignee?: string;
  createdAt?: string;
  taskLink?: string;
  productDeadline?: string;
  uiux?: string;
  deadline?: string;
  finalRelease?: string;
  raisedByTarunSir?: boolean;
  tarunSirApproval?: boolean;
  product?: string;
  module?: string;
  type?: string;
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  committedDate?: string;
  feedbackFormId?: string;
}

export interface AMASession {
  id: string;
  date: string;
  topic: string;
  speaker: string;
  cohort: string;
  link: string;
  status: 'Scheduled' | 'Completed' | 'Postponed';
  program?: string;
  pinned?: boolean;
  feedbackFormId?: string;
}

export interface StudentMeeting {
  id: string;
  date: string;
  cohort: string; // Section/Cohort/Programme
  summary: string; // Bulleted details of feedback/issues
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | '';
  poc?: string;
  status?: 'On Hold' | 'In Progress' | 'Ongoing' | 'Completed' | '';
  clickupStatus?: string;
  clickupSubtasksCount?: number;
  clickupAssignee?: string;
  createdAt?: string;
  taskLink?: string;
  blocker?: string;
  deadline?: string;
  notes?: string;
  product?: string;
  module?: string;
  type?: string;
  uiux?: string;
  finalRelease?: string;
  productDeadline?: string;
  raisedByTarunSir?: boolean;
  tarunSirApproval?: boolean;
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  committedDate?: string;
  feedbackFormId?: string;
}

export interface AdminCall {
  id: string;
  date: string;
  adminPoc: string;
  cohortTopic: string;
  discussion: string;
  actions: string;
  status: 'Completed' | 'Pending Actions' | 'Scheduled';
  program?: string;
  pinned?: boolean;
  feedbackFormId?: string;
}

export interface TarunSirMeeting {
  id: string;
  date: string;
  adminPoc: string;
  cohortTopic: string;
  discussion: string;
  actions: string;
  status: 'Completed' | 'Pending Actions' | 'Scheduled';
  program?: string;
  pinned?: boolean;
  feedbackFormId?: string;
}

export interface ContentItem {
  id: string;
  module: string;
  subject: string;
  type: 'Video' | 'Quiz' | 'Worksheet' | 'Notes' | 'Syllabus';
  poc: string;
  draftLink: string;
  status: string;
  publishDate: string;
  product?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | '';
  clickupStatus?: string;
  clickupSubtasksCount?: number;
  clickupAssignee?: string;
  createdAt?: string;
  productDeadline?: string;
  uiux?: string;
  deadline?: string;
  finalRelease?: string;
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  raisedByTarunSir?: boolean;
  committedDate?: string;
}

export interface DailyIssue {
  id: string; // represented as ID numbers like 4, 7, 8 in sheet
  cohort: string; // Class/Cohort/Section
  product: string;
  module: string;
  type: string;
  issues: string;
  contact: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | '';
  poc?: string;
  status?: 'On Hold' | 'In Progress' | 'Ongoing' | 'Completed' | '';
  clickupStatus?: string;
  clickupSubtasksCount?: number;
  clickupAssignee?: string;
  createdAt?: string;
  taskLink?: string;
  blocker?: string;
  deadline?: string;
  notes?: string;
  uiux?: string;
  finalRelease?: string;
  productDeadline?: string;
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  raisedByTarunSir?: boolean;
  tarunSirApproval?: boolean;
  committedDate?: string;
}

export interface FeatureAdoption {
  id: string;
  feature: string;
  product: string;
  launchDate: string;
  targetAudience: string;
  adoptionRate: number; // percentage 0-100
  activeUsers: number;
  sentiment: number; // 1-5 rating
  program?: string;
  cohort?: string;
  status?: 'Used' | 'Not Used';
}

// ── Configuration Types ──────────────────────────────────────────────────────

export interface ConfigSpeaker {
  id: string;
  name: string;
  email?: string;
  role?: string; // e.g. "Lead Research Engineer", "Alumni", "Industry Expert"
  password?: string;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export interface ConfigProductGroup {
  id: string;
  name: string;
  color: string; // hex colour for tag badge, e.g. '#6366f1'
  modules?: string[];
}

export interface ConfigStatus {
  id: string;
  label: string;
  color: string; // hex colour for status badge
  scope: 'product' | 'ama' | 'student' | 'content' | 'all'; // which dropdowns this applies to
}

export interface ConfigProgram {
  id: string;
  name: string;
  order?: number;
}

export interface ConfigCohort {
  id: string;
  name: string;
  programId: string;
  active?: boolean; // true = Active, false = Inactive
  departments?: string[];
  departmentEmails?: Record<string, string>;
  order?: number;
}

export interface DirectoryContact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  whatsapp: string;
  tier: 'L0' | 'L1' | 'L2';
  programId: string;
  cohortId: string;
  department: string;
}

// ── Feedback & Form Builder Types ──────────────────────────────────────────

export interface FeedbackFormField {
  id: string;
  label: string;
  type: 'rating' | 'text' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

export interface FeedbackFormConfig {
  id: string; // e.g. "form-admin-calls", "form-ama-meetings", "form-student-projects", "form-123"
  title?: string;
  description?: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
  enabled: boolean;
  isDefault?: boolean;
  fields: FeedbackFormField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackSubmission {
  id: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
  itemId: string; // matches the admin call id, meeting id, or project id
  formId?: string;
  answers: Record<string, any>; // fieldId -> value
  submittedBy?: string;
  submittedByEmail?: string;
  createdAt?: string; // ISO string
}

export interface TeamContact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  whatsappUrl?: string;
  programs: string[];
  cohorts: string[];
  role?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatrixContact {
  id: string;
  name: string;
  email: string;
  mobile: string;
  whatsappUrl?: string;
}

export interface ProgramCohortRow {
  id: string;
  program: string;
  cohort: string;
  department: string;
  l0: MatrixContact[];
  l1: MatrixContact[];
  l2: MatrixContact[];
  groupEmail: string;
  createdAt?: string;
}

export interface RepoTab {
  id: string;
  name: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface JourneyStep {
  id: string;
  title: string;
  desc: string;
  status: string;
  poc: string;
}

export interface TableBlockData {
  headers: string[];
  rows: string[][];
}

export interface RepoDocBlock {
  id: string;
  type: 'heading' | 'text' | 'journey' | 'table' | 'callout';
  headingLevel?: 1 | 2 | 3;
  text?: string;
  calloutType?: 'info' | 'warning' | 'success' | 'note';
  journeySteps?: JourneyStep[];
  tableData?: TableBlockData;
}

export interface RepoDoc {
  id: string;
  tabId: string;
  title: string;
  url?: string;
  order: number;
  blocks?: RepoDocBlock[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description?: string;
  departments: string[];
  programs: string[];
  cohorts: string[];
  poc?: string;
  solution?: string;
  status: 'Pending' | 'In Progress' | 'Solved' | 'Unsolved';
  priority: 'High' | 'Medium' | 'Low';
  relatedTaskId?: string;
  isBlocker?: boolean;
  loggedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StickyNote {
  id: string;
  text: string;
  completed: boolean;
  color: 'yellow' | 'blue' | 'pink' | 'green' | 'purple';
  userId: string;
  createdAt: string;
}





