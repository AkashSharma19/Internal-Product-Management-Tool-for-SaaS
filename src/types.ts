
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
}

export interface PlanItem {
  id: string;
  month: string; // e.g. 'May 2026'
  category: 'Development' | 'UI/UX' | 'Product';
  task: string;
  link: string;
  status: 'testing' | 'development' | 'closed' | 'tested' | 'open' | 'in design' | 'Done';
  completed?: boolean;
  clickupStatus?: string;
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
}

export interface AdminCall {
  id: string;
  date: string;
  adminPoc: string;
  cohortTopic: string;
  discussion: string;
  actions: string;
  status: 'Completed' | 'Pending Actions' | 'Scheduled';
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
  productDeadline?: string;
  uiux?: string;
  deadline?: string;
  finalRelease?: string;
  productDeadlineCompleted?: boolean;
  uiuxCompleted?: boolean;
  deadlineCompleted?: boolean;
  finalReleaseCompleted?: boolean;
  raisedByTarunSir?: boolean;
}

export interface DailyIssue {
  id: string; // represented as ID numbers like 4, 7, 8 in sheet
  cohort: string; // Class/Cohort/Section
  product: string;
  module: string;
  type: 'Bug/Defect' | 'Performance' | 'Information Lack' | 'Enhancement' | 'Feature Gap' | 'UX';
  issues: string;
  contact: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | '';
  poc?: string;
  status?: 'On Hold' | 'In Progress' | 'Ongoing' | 'Completed' | '';
  clickupStatus?: string;
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
}

export interface ConfigCohort {
  id: string;
  name: string;
  programId: string;
  active?: boolean; // true = Active, false = Inactive
}

