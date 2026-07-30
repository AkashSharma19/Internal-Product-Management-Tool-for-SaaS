---
name: repository_knowledge
description: Comprehensive codebase documentation, data schemas, API routes, frontend components, and state architecture for the Internal Product Tool.
---

# Repository Knowledge Skill

This skill provides an instant, comprehensive reference of the codebase architecture, schemas, state management, API routes, and styling conventions for **Internal Product Tool**.

## 1. Stack & Runtime
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS design system ([index.css](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/index.css)) using CSS variables, dark/light themes, glassmorphism, custom badges, and responsive CSS Grid/Flexbox layouts.
- **Iconography & Visuals**: `lucide-react`, Three.js / OGL (`PixelBlast` interactive particle canvas background), `jspdf` & `jspdf-autotable` (PDF exports), `canvas-confetti`.
- **Audio Feedback**: Custom Web Audio API synthesizer ([audio.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/utils/audio.ts)).
- **Backend**: Serverless API on Vercel ([api/data.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/data.ts)) + standalone Node.js HTTP/REST server ([server/server.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/server/server.ts)).
- **Database**: MongoDB with Mongoose ([api/lib/models.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/lib/models.ts)).

---

## 2. Core Entities & Mongoose Schemas ([api/lib/models.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/lib/models.ts))

| Entity Model | Collection Name | Purpose & Primary Fields |
| :--- | :--- | :--- |
| `ProductItemModel` | `productitems` | Priority Requests features. Fields: `id`, `feature`, `description`, `priority` (P0-P4), `poc`, `status`, `product`, `module`, `taskLink`, `clickupStatus`, `clickupSubtasksCount`, `clickupAssignee`, `blocker`, `notes`, `productDeadline`, `uiux`, `deadline`, `finalRelease`, `productDeadlineCompleted`, `uiuxCompleted`, `deadlineCompleted`, `finalReleaseCompleted`, `tarunSirApproval`, `raisedByTarunSir`. |
| `PlanItemModel` | `planitems` | Sprint Planning. Fields: `id`, `month`, `category`, `task`, `link`, `status`, `completed`, `clickupStatus`, `clickupSubtasksCount`, `clickupAssignee`. |
| `StudentProjectModel` | `studentprojects` | Student Projects tracking. Includes milestone date flags, ClickUp link, priority, POC, blocker. |
| `AMASessionModel` | `amasessions` | AMA & Meetings Schedule. Fields: `id`, `date`, `topic`, `speaker`, `cohort`, `link`, `status`, `program`. |
| `StudentMeetingModel` | `studentmeetings` | Student Feedback Meetings. Includes milestone date checkpoints and ClickUp fields. |
| `AdminCallModel` | `admincalls` | Admin Calls log. Fields: `id`, `date`, `adminPoc`, `cohortTopic`, `discussion`, `actions`, `status`, `program`. |
| `TarunSirMeetingModel` | `tarunsirmeetings` | High-priority meetings directly with Tarun Sir. |
| `ContentItemModel` | `contentitems` | Content Pipeline tracking. Modules, subjects, draft links, publication dates, milestone checkpoints. |
| `DailyIssueModel` | `dailyissues` | Daily Issues & Improvements Log. Cohort, product, module, type (Bug/Defect, Feature, etc.), issues description, priority, POC, status, ClickUp sync. |
| `FeatureAdoptionModel` | `featureadoptions` | Feature Adoption analytics. Adoption rate (%), active users, sentiment (1-5 scale), target audience. |
| `ConfigSpeakerModel` | `configspeakers` | User accounts / Team members / Speakers. Fields: `id`, `name`, `email`, `role`, `password`, `canEdit`, `isAdmin`. |
| `ConfigProductGroupModel` | `configproductgroups` | Product taxonomy groups & associated modules array. |
| `ConfigStatusModel` | `configstatuses` | System status choices & hex color codes. |
| `ConfigProgramModel` | `configprograms` | Academic / Business programs list. |
| `ConfigCohortModel` | `configcohorts` | Student cohorts linked to programs. |
| `GlobalSettingsModel` | `globalsettings` | System-wide settings (e.g. `clickup_api_key`, `google_client_id`, SMTP config). |
| `FeedbackFormConfigModel` | `feedbackformconfigs` | Dynamic form field definitions for public feedback submission forms. |
| `FeedbackSubmissionModel` | `feedbacksubmissions` | Recorded submissions from external feedback forms. |
| `CommentModel` | `comments` | In-app comments attached to tasks (`itemId`, `authorName`, `authorEmail`, `content`). |
| `ChangeHistoryModel` | `changehistories` | Audit log tracking date and POC changes (`itemId`, `fieldName`, `oldValue`, `newValue`, `changedBy`). |

---

## 3. Frontend Navigation & Tab Structure ([App.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/App.tsx))

- `dashboard` -> [DashboardOverview.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/DashboardOverview.tsx): Executive KPIs, Status breakdown chart, POC workload, date range filtering, PDF & CSV export.
- `calendar` -> [CalendarView.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/CalendarView.tsx): Monthly interactive master calendar aggregating 7 event sources.
- `product` -> `ProductTable` in [Tables.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/Tables.tsx): Core Priority Requests table.
- `plan` -> `PlanTable`: Monthly sprint tasks.
- `projects` -> `StudentProjectsTable`: High-impact student projects table.
- `meetings` -> `StudentMeetingsTable`: AMA sessions & student feedback calls.
- `admin` -> `AdminCallsTable`: Operational admin logs.
- `content` -> `ContentTable`: Content pipeline.
- `product-wise` -> `ProductWiseSheet`: Grouped matrix view by Product Group & Module.
- `issues` -> `IssuesTable`: Daily issue tracker.
- `adoption` -> `AdoptionTable`: Feature adoption metrics.
- `config` -> [ConfigSection.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/ConfigSection.tsx): Admin settings, user roles, ClickUp key, Form Builder, Email SMTP.

---

## 4. Feature Preview Drawer ([ProductDetailView](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/Tables.tsx#L2161))
The unified task details drawer opens when clicking any feature or setting `previewProductId`:
1. **Interactive Milestone Timeline**: Created Date, Specs Date, UI/UX Date, Dev Date, Release Date with progress line and completed checkboxes.
2. **Date Picker Popup (`CustomDatePicker`)**: Absolute position with elevated z-index (`zIndex: 50` on container, `zIndex: 100` on editing node, `zIndex: 10005` on popup) and smart left/right alignment.
3. **Database-Backed Search & Linking**: Suggests similar tasks, allows quick linking by appending cross-reference tags to notes.
4. **Properties Grid**: Product Group, Status, ClickUp Link & Status Sync, ClickUp Assignee & Subtasks, POC Owner, Blocker, Tarun Sir Approval toggle.
5. **Change History Modal**: Audit trail for date/POC modifications.
6. **Comments Section**: Threaded user comments.

---

## 5. API Endpoints Reference ([api/data.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/data.ts))

- `GET /api/data?action=init`: Loads initial bootstrap payload (user config, product groups, statuses, settings).
- `GET /api/data?action=dashboard-counts`: Aggregates KPI statistics, status metrics, and POC workloads filtered by date range.
- `GET /api/data?action=dashboard-list`: Paginated fetch for dashboard list drilldown modals.
- `GET /api/data?action=calendar-events`: Aggregates events across 7 collections for master calendar view.
- `GET /api/data?action=single-task&id=<taskId>`: Retrieves a single item by ID.
- `GET /api/data?action=suggest-similar&query=<q>`: Performs regex search for similar task titles in DB.
- `GET /api/data?action=global-search&query=<q>`: Global command palette search across all entities.
- `POST /api/data?action=clickup-sync`: Syncs ClickUp status, subtasks count, and assignee for a given ClickUp URL.
- `POST /api/data?action=clickup-bulk-sync`: Iterates over product items with ClickUp URLs and syncs them.
- `POST /api/data?action=create&type=<entity>`: Creates a new document.
- `PUT /api/data?action=update&type=<entity>`: Updates document fields and creates a `ChangeHistory` record if dates/POC are modified.
- `DELETE /api/data?action=delete&type=<entity>&id=<id>`: Deletes a document by ID.
- `POST /api/data?action=login`: Validates user credentials or Google OAuth token.
