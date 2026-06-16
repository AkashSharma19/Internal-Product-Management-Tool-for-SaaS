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
  finalReleaseCompleted: { type: Boolean, default: false }
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
  clickupStatus: { type: String, default: "" }
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
  finalReleaseCompleted: { type: Boolean, default: false }
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
  program: { type: String, default: "" }
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
  finalReleaseCompleted: { type: Boolean, default: false }
}, { timestamps: true });

// 6. AdminCall
const AdminCallSchema = new Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, default: "" },
  adminPoc: { type: String, default: "" },
  cohortTopic: { type: String, default: "" },
  discussion: { type: String, default: "" },
  actions: { type: String, default: "" },
  status: { type: String, default: "Scheduled" }
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
  productDeadline: { type: String, default: "" },
  uiux: { type: String, default: "" },
  deadline: { type: String, default: "" },
  finalRelease: { type: String, default: "" },
  productDeadlineCompleted: { type: Boolean, default: false },
  uiuxCompleted: { type: Boolean, default: false },
  deadlineCompleted: { type: Boolean, default: false },
  finalReleaseCompleted: { type: Boolean, default: false },
  raisedByTarunSir: { type: Boolean, default: false }
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
  raisedByTarunSir: { type: Boolean, default: false }
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
  password: { type: String, default: "1234" }
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
  name: { type: String, required: true }
});

// Cohort
const ConfigCohortSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  programId: { type: String, required: true },
  active: { type: Boolean, default: true }
});

// Global Settings (ClickUp Key, etc.)
const GlobalSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: "" }
});

// Exports
export const ProductItemModel = mongoose.models.ProductItem || mongoose.model('ProductItem', ProductItemSchema);
export const PlanItemModel = mongoose.models.PlanItem || mongoose.model('PlanItem', PlanItemSchema);
export const StudentProjectModel = mongoose.models.StudentProject || mongoose.model('StudentProject', StudentProjectSchema);
export const AMASessionModel = mongoose.models.AMASession || mongoose.model('AMASession', AMASessionSchema);
export const StudentMeetingModel = mongoose.models.StudentMeeting || mongoose.model('StudentMeeting', StudentMeetingSchema);
export const AdminCallModel = mongoose.models.AdminCall || mongoose.model('AdminCall', AdminCallSchema);
export const ContentItemModel = mongoose.models.ContentItem || mongoose.model('ContentItem', ContentItemSchema);
export const DailyIssueModel = mongoose.models.DailyIssue || mongoose.model('DailyIssue', DailyIssueSchema);
export const FeatureAdoptionModel = mongoose.models.FeatureAdoption || mongoose.model('FeatureAdoption', FeatureAdoptionSchema);

export const ConfigSpeakerModel = mongoose.models.ConfigSpeaker || mongoose.model('ConfigSpeaker', ConfigSpeakerSchema);
export const ConfigProductGroupModel = mongoose.models.ConfigProductGroup || mongoose.model('ConfigProductGroup', ConfigProductGroupSchema);
export const ConfigStatusModel = mongoose.models.ConfigStatus || mongoose.model('ConfigStatus', ConfigStatusSchema);
export const ConfigProgramModel = mongoose.models.ConfigProgram || mongoose.model('ConfigProgram', ConfigProgramSchema);
export const ConfigCohortModel = mongoose.models.ConfigCohort || mongoose.model('ConfigCohort', ConfigCohortSchema);

export const GlobalSettingsModel = mongoose.models.GlobalSettings || mongoose.model('GlobalSettings', GlobalSettingsSchema);
