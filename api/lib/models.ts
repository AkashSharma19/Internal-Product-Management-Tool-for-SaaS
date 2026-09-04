import mongoose, { Schema } from 'mongoose';

// 1. ProductItem (Priority Requests)
const ProductItemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  feature: { type: String, required: true },
  description: { type: String, default: "" },
  tarunSirApproval: { type: Boolean, default: false },
  raisedByTarunSir: { type: Boolean, default: false },
  priority: { type: String, default: "" },
  poc: { type: String, default: "" },
  status: { type: String, default: "" },
  clickupStatus: { type: String, default: "" },
  clickupSubtasksCount: { type: Number, default: 0 },
  clickupAssignee: { type: String, default: "" },
  taskLink: { type: String, default: "" },
  blocker: { type: String, default: "" },
  deadline: { type: String, default: "" },
  notes: { type: String, default: "" },
  product: { type: String, default: "" },
  module: { type: String, default: "" },
  type: { type: String, default: "" },
  uiux: { type: String, default: "" },
  finalRelease: { type: String, default: "" },
  productDeadline: { type: String, default: "" },
  productDeadlineCompleted: { type: Boolean, default: false },
  uiuxCompleted: { type: Boolean, default: false },
  deadlineCompleted: { type: Boolean, default: false },
  finalReleaseCompleted: { type: Boolean, default: false },
  committedDate: { type: String, default: "" }
}, { timestamps: true });

// 2. PlanItem (Sprint Planning)
const PlanItemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  month: { type: String, required: true },
  category: { type: String, required: true },
  task: { type: String, required: true },
  link: { type: String, default: "" },
  status: { type: String, default: "" },
  completed: { type: Boolean, default: false },
  clickupStatus: { type: String, default: "" },
  clickupSubtasksCount: { type: Number, default: 0 },
  clickupAssignee: { type: String, default: "" }
}, { timestamps: true });

// 3. StudentProject
const StudentProjectSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  thingsWeBuild: { type: String, default: "" },
  status: { type: String, default: "" },
  assigned: { type: String, default: "" },
  blocker: { type: String, default: "" },
  completeInfoDate: { type: String, default: "" },
  priority: { type: String, default: "" },
  poc: { type: String, default: "" },
  clickupStatus: { type: String, default: "" },
  clickupSubtasksCount: { type: Number, default: 0 },
  clickupAssignee: { type: String, default: "" },
  taskLink: { type: String, default: "" },
  productDeadline: { type: String, default: "" },
  uiux: { type: String, default: "" },
  deadline: { type: String, default: "" },
  finalRelease: { type: String, default: "" },
  raisedByTarunSir: { type: Boolean, default: false },
  tarunSirApproval: { type: Boolean, default: false },
  product: { type: String, default: "" },
  module: { type: String, default: "" },
  type: { type: String, default: "" },
  productDeadlineCompleted: { type: Boolean, default: false },
  uiuxCompleted: { type: Boolean, default: false },
  deadlineCompleted: { type: Boolean, default: false },
  finalReleaseCompleted: { type: Boolean, default: false },
  committedDate: { type: String, default: "" },
  feedbackFormId: { type: String, default: "" }
}, { timestamps: true });

// 4. AMASession
const AMASessionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, default: "" },
  topic: { type: String, default: "" },
  speaker: { type: String, default: "" },
  cohort: { type: String, default: "" },
  link: { type: String, default: "" },
  status: { type: String, default: "Scheduled" },
  program: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  feedbackFormId: { type: String, default: "" }
}, { timestamps: true });

// 5. StudentMeeting
const StudentMeetingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, default: "" },
  cohort: { type: String, default: "" },
  summary: { type: String, default: "" },
  priority: { type: String, default: "" },
  poc: { type: String, default: "" },
  status: { type: String, default: "" },
  clickupStatus: { type: String, default: "" },
  clickupSubtasksCount: { type: Number, default: 0 },
  clickupAssignee: { type: String, default: "" },
  taskLink: { type: String, default: "" },
  blocker: { type: String, default: "" },
  deadline: { type: String, default: "" },
  notes: { type: String, default: "" },
  product: { type: String, default: "" },
  module: { type: String, default: "" },
  type: { type: String, default: "" },
  uiux: { type: String, default: "" },
  finalRelease: { type: String, default: "" },
  productDeadline: { type: String, default: "" },
  raisedByTarunSir: { type: Boolean, default: false },
  tarunSirApproval: { type: Boolean, default: false },
  productDeadlineCompleted: { type: Boolean, default: false },
  uiuxCompleted: { type: Boolean, default: false },
  deadlineCompleted: { type: Boolean, default: false },
  finalReleaseCompleted: { type: Boolean, default: false },
  committedDate: { type: String, default: "" },
  feedbackFormId: { type: String, default: "" }
}, { timestamps: true });

// 6. AdminCall
const AdminCallSchema = new Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, default: "" },
  adminPoc: { type: String, default: "" },
  cohortTopic: { type: String, default: "" },
  discussion: { type: String, default: "" },
  actions: { type: String, default: "" },
  status: { type: String, default: "Scheduled" },
  program: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  feedbackFormId: { type: String, default: "" }
}, { timestamps: true });

// 6b. TarunSirMeeting
const TarunSirMeetingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, default: "" },
  adminPoc: { type: String, default: "" },
  cohortTopic: { type: String, default: "" },
  discussion: { type: String, default: "" },
  actions: { type: String, default: "" },
  status: { type: String, default: "Scheduled" },
  program: { type: String, default: "" },
  pinned: { type: Boolean, default: false },
  feedbackFormId: { type: String, default: "" }
}, { timestamps: true });

// 7. ContentItem
const ContentItemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  module: { type: String, required: true },
  subject: { type: String, default: "" },
  type: { type: String, default: "Video" },
  poc: { type: String, default: "" },
  draftLink: { type: String, default: "" },
  status: { type: String, default: "" },
  publishDate: { type: String, default: "" },
  product: { type: String, default: "" },
  priority: { type: String, default: "" },
  clickupStatus: { type: String, default: "" },
  clickupSubtasksCount: { type: Number, default: 0 },
  clickupAssignee: { type: String, default: "" },
  productDeadline: { type: String, default: "" },
  uiux: { type: String, default: "" },
  deadline: { type: String, default: "" },
  finalRelease: { type: String, default: "" },
  productDeadlineCompleted: { type: Boolean, default: false },
  uiuxCompleted: { type: Boolean, default: false },
  deadlineCompleted: { type: Boolean, default: false },
  finalReleaseCompleted: { type: Boolean, default: false },
  raisedByTarunSir: { type: Boolean, default: false },
  committedDate: { type: String, default: "" }
}, { timestamps: true });

// 8. DailyIssue
const DailyIssueSchema = new Schema({
  id: { type: String, required: true, unique: true },
  cohort: { type: String, default: "" },
  product: { type: String, default: "" },
  module: { type: String, default: "" },
  type: { type: String, default: "Bug/Defect" },
  issues: { type: String, default: "" },
  contact: { type: String, default: "" },
  priority: { type: String, default: "" },
  poc: { type: String, default: "" },
  status: { type: String, default: "" },
  clickupStatus: { type: String, default: "" },
  clickupSubtasksCount: { type: Number, default: 0 },
  clickupAssignee: { type: String, default: "" },
  taskLink: { type: String, default: "" },
  blocker: { type: String, default: "" },
  deadline: { type: String, default: "" },
  notes: { type: String, default: "" },
  uiux: { type: String, default: "" },
  finalRelease: { type: String, default: "" },
  productDeadline: { type: String, default: "" },
  productDeadlineCompleted: { type: Boolean, default: false },
  uiuxCompleted: { type: Boolean, default: false },
  deadlineCompleted: { type: Boolean, default: false },
  finalReleaseCompleted: { type: Boolean, default: false },
  raisedByTarunSir: { type: Boolean, default: false },
  tarunSirApproval: { type: Boolean, default: false },
  committedDate: { type: String, default: "" }
}, { timestamps: true });

// 9. FeatureAdoption
const FeatureAdoptionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  feature: { type: String, required: true },
  product: { type: String, required: true },
  launchDate: { type: String, default: "" },
  targetAudience: { type: String, default: "" },
  adoptionRate: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  sentiment: { type: Number, default: 3 },
  program: { type: String, default: "" },
  cohort: { type: String, default: "" },
  status: { type: String, default: "Not Used" }
}, { timestamps: true });

// ─── Configuration Schemas ───────────────────────────────────────────────────

// Speaker
const ConfigSpeakerSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, default: "" },
  role: { type: String, default: "" },
  password: { type: String, default: "1234" },
  canEdit: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: true }
});

// Product Group
const ConfigProductGroupSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  color: { type: String, default: "#6366f1" },
  modules: { type: [String], default: [] }
});

// Status
const ConfigStatusSchema = new Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  color: { type: String, default: "#6b7280" },
  scope: { type: String, default: "all" }
});

// Program
const ConfigProgramSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  order: { type: Number, default: 0 }
});

// Cohort
const ConfigCohortSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  programId: { type: String, required: true },
  active: { type: Boolean, default: true },
  departments: { type: [String], default: [] },
  departmentEmails: { type: Map, of: String, default: {} },
  order: { type: Number, default: 0 }
});

// Global Settings (ClickUp Key, etc.)
const GlobalSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: "" }
});

const DirectoryContactSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, default: "" },
  mobile: { type: String, default: "" },
  whatsapp: { type: String, default: "" },
  tier: { type: String, default: "L0" }, // 'L0' | 'L1' | 'L2'
  programId: { type: String, required: true },
  cohortId: { type: String, default: "" },
  department: { type: String, default: "" }
}, { timestamps: true });

// StickyNote Schema
const StickyNoteSchema = new Schema({
  id: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  color: { type: String, default: "yellow" },
  userId: { type: String, default: "", index: true },
  createdAt: { type: String, default: "" }
}, { timestamps: true });

// Exports
export const ProductItemModel = mongoose.models.ProductItem || mongoose.model('ProductItem', ProductItemSchema);
export const PlanItemModel = mongoose.models.PlanItem || mongoose.model('PlanItem', PlanItemSchema);
export const StudentProjectModel = mongoose.models.StudentProject || mongoose.model('StudentProject', StudentProjectSchema);
export const AMASessionModel = mongoose.models.AMASession || mongoose.model('AMASession', AMASessionSchema);
export const StudentMeetingModel = mongoose.models.StudentMeeting || mongoose.model('StudentMeeting', StudentMeetingSchema);
export const AdminCallModel = mongoose.models.AdminCall || mongoose.model('AdminCall', AdminCallSchema);
export const TarunSirMeetingModel = mongoose.models.TarunSirMeeting || mongoose.model('TarunSirMeeting', TarunSirMeetingSchema);
export const ContentItemModel = mongoose.models.ContentItem || mongoose.model('ContentItem', ContentItemSchema);
export const DailyIssueModel = mongoose.models.DailyIssue || mongoose.model('DailyIssue', DailyIssueSchema);
export const FeatureAdoptionModel = mongoose.models.FeatureAdoption || mongoose.model('FeatureAdoption', FeatureAdoptionSchema);

export const ConfigSpeakerModel = mongoose.models.ConfigSpeaker || mongoose.model('ConfigSpeaker', ConfigSpeakerSchema);
export const ConfigProductGroupModel = mongoose.models.ConfigProductGroup || mongoose.model('ConfigProductGroup', ConfigProductGroupSchema);
export const ConfigStatusModel = mongoose.models.ConfigStatus || mongoose.model('ConfigStatus', ConfigStatusSchema);
export const ConfigProgramModel = mongoose.models.ConfigProgram || mongoose.model('ConfigProgram', ConfigProgramSchema);
export const ConfigCohortModel = mongoose.models.ConfigCohort || mongoose.model('ConfigCohort', ConfigCohortSchema);

export const GlobalSettingsModel = mongoose.models.GlobalSettings || mongoose.model('GlobalSettings', GlobalSettingsSchema);
export const DirectoryContactModel = mongoose.models.DirectoryContact || mongoose.model('DirectoryContact', DirectoryContactSchema);
export const StickyNoteModel = mongoose.models.StickyNote || mongoose.model('StickyNote', StickyNoteSchema);

// ── Feedback & Form Builder Schemas ──────────────────────────────────────────

const FeedbackFormFieldSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true }, // 'rating', 'text', 'textarea', 'select', 'checkbox'
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },
  order: { type: Number, default: 0 }
});

const FeedbackFormConfigSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  category: { type: String, required: true }, // 'admin-calls', 'ama-meetings', 'student-projects'
  enabled: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  fields: [FeedbackFormFieldSchema]
}, { timestamps: true });

const FeedbackSubmissionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  itemId: { type: String, required: true },
  formId: { type: String, default: "" },
  answers: { type: Schema.Types.Mixed, default: {} }, // map of fieldId -> answer
  submittedBy: { type: String, default: "Anonymous" },
  submittedByEmail: { type: String, default: "" }
}, { timestamps: true });

export const FeedbackFormConfigModel = mongoose.models.FeedbackFormConfig || mongoose.model('FeedbackFormConfig', FeedbackFormConfigSchema);
export const FeedbackSubmissionModel = mongoose.models.FeedbackSubmission || mongoose.model('FeedbackSubmission', FeedbackSubmissionSchema);

const CommentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  itemId: { type: String, required: true }, // refers to productItem ID or dailyIssue ID
  authorName: { type: String, required: true },
  authorEmail: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

export const CommentModel = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);

const ChangeHistorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  itemId: { type: String, required: true, index: true }, // Refers to the product item ID / issue ID (indexed)
  fieldName: { type: String, required: true }, // 'productDeadline' | 'uiux' | 'deadline' | 'finalRelease' | 'poc'
  oldValue: { type: String, default: "" },
  newValue: { type: String, default: "" },
  changedBy: { type: String, required: true }, // User's name or email
  changedById: { type: String, default: "" } // User's ID
}, { timestamps: true });

export const ChangeHistoryModel = mongoose.models.ChangeHistory || mongoose.model('ChangeHistory', ChangeHistorySchema);

// Repository sub-tab schema
const RepoTabSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

// Repository document schema
const RepoDocSchema = new Schema({
  id: { type: String, required: true, unique: true },
  tabId: { type: String, required: true, index: true },
  title: { type: String, required: true, default: "Untitled Link" },
  url: { type: String, default: "" },
  order: { type: Number, default: 0 },
  blocks: { type: [Schema.Types.Mixed], default: [] }
}, { timestamps: true });



export const RepoTabModel = mongoose.models.RepoTab || mongoose.model('RepoTab', RepoTabSchema);
export const RepoDocModel = mongoose.models.RepoDoc || mongoose.model('RepoDoc', RepoDocSchema);

// Challenges schema
const ChallengeSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  departments: { type: [String], default: [] }, // Multi-select
  programs: { type: [String], default: [] }, // Multi-select
  cohorts: { type: [String], default: [] }, // Multi-select
  poc: { type: String, default: "" },
  solution: { type: String, default: "" },
  status: { type: String, default: "Pending" }, // Pending, In Progress, Solved, Unsolved
  priority: { type: String, default: "Medium" }, // High, Medium, Low
  relatedTaskId: { type: String, default: "" }, // Refers to a productItem ID
  isBlocker: { type: Boolean, default: false }, // Is this challenge a blocker?
  loggedDate: { type: String, default: "" }
}, { timestamps: true });

export const ChallengeModel = mongoose.models.Challenge || mongoose.model('Challenge', ChallengeSchema);

// Feedback Analysis Schema
const FeedbackAnalysisSchema = new Schema({
  id: { type: String, required: true, unique: true },
  itemId: { type: String, required: true, index: true },
  category: { type: String, required: true },
  summary: { type: String, required: true },
  sentiment: { type: String, default: "" },
  sentimentJustification: { type: String, default: "" },
  positives: { type: [String], default: [] },
  painPoints: { type: [String], default: [] },
  recommendations: { type: Schema.Types.Mixed, default: [] }, // Array of { recommendation: string, details: string, priority: string }
  generatedBy: { type: String, required: true },
  generatedById: { type: String, required: true }
}, { timestamps: true });

export const FeedbackAnalysisModel = mongoose.models.FeedbackAnalysis || mongoose.model('FeedbackAnalysis', FeedbackAnalysisSchema);

// Release Notes Schema
const ReleaseNoteSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  color: { type: String, default: '#7c3aed' }, // default purple color
  content: { type: String, required: true },
  features: [{
    id: String,
    feature: String,
    description: String,
    product: String,
    finalRelease: String
  }]
}, { timestamps: true });

export const ReleaseNoteModel = mongoose.models.ReleaseNote || mongoose.model('ReleaseNote', ReleaseNoteSchema);
