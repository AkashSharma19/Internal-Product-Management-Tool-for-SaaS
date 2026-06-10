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
}

export interface PlanItem {
  id: string;
  month: string; // e.g. 'May 2026'
  category: 'Development' | 'UI/UX' | 'Product';
  task: string;
  link: string;
  status: 'testing' | 'development' | 'closed' | 'tested' | 'open' | 'in design' | 'Done';
}

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  thingsWeBuild: string;
  status: 'Delivered' | 'Cancelled' | 'In-Progress';
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
  status: 'Drafting' | 'Under Review' | 'Approved' | 'Published';
  publishDate: string;
}

export interface DailyIssue {
  id: string; // represented as ID numbers like 4, 7, 8 in sheet
  cohort: string; // Class/Cohort/Section
  product: string;
  module: string;
  type: 'Bug/Defect' | 'Performance' | 'Information Lack' | 'Enhancement' | 'Feature Gap' | 'UX';
  issues: string;
  contact: string;
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
}

// ── Configuration Types ──────────────────────────────────────────────────────

export interface ConfigSpeaker {
  id: string;
  name: string;
  role?: string; // e.g. "Lead Research Engineer", "Alumni", "Industry Expert"
}

export interface ConfigProductGroup {
  id: string;
  name: string;
  color: string; // hex colour for tag badge, e.g. '#6366f1'
}

export interface ConfigStatus {
  id: string;
  label: string;
  color: string; // hex colour for status badge
  scope: 'product' | 'ama' | 'all'; // which dropdowns this applies to
}

