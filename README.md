# 🚀 Internal Product Management Tool

> A premium, full-featured internal operations dashboard for managing SaaS product development — built for the IIMA Ventures / Coach LMS team.

---

## 📋 Overview

This tool centralises everything the product & operations team tracks day-to-day into a single, dark-mode dashboard — replacing scattered spreadsheets and ClickUp exports. Data is persisted via a **Vercel Serverless API** backed by **MongoDB & Mongoose ORM**, with real-time ClickUp sync and Google OAuth authentication.

---

## ✨ Features

### 🏠 Dashboard
- At-a-glance KPI cards: total features, sprint tasks, issues, content modules
- Skeletal loading animation on first fetch
- Date-range and status filters for product metrics
- Scrollable product-group breakdown lists

### 📌 Priority Requests (Feature Backlog)
- Full feature backlog with inline editing for every field
- Priority inline badges (P0 → P4), Status, POC assignee, product area, ClickUp link
- Premium **Feature Detail Drawer** (Notion / Linear-style) with:
  - Timeline progress bar (UIUX → Product Deadline → Dev → Final Release)
  - Comment thread with real-time persistence
  - Full changelog / audit trail
  - ClickUp subtask count badge with live sync
- Bulk import via structured text paste (CSV modal)
- Multi-select status filter + full-text search
- One-click navigation to any feature from Sprint Planning, Admin Calls, AMA sessions

### 📅 Sprint Planning
- Month-by-month sprint plan grouped by **Development / UI·UX / Product**
- Inline status updates with colour-coded badges
- Super-priority filter to surface P0 tasks
- Lazy-loads sprint data per-month from the API (no full-table re-fetch)
- Links directly to ClickUp tasks; opens feature preview on click

### 👩‍💻 Student Projects
- Track student capstone & live projects
- Metadata: POC, priority, ClickUp link, UI/UX & dev deadlines, blocker, status
- Inline date pickers and status dropdowns

### 🎤 AMA & Student Meetings
- **Schedule subtab** — manage AMA sessions with Date, Topic, Speaker, Program, Cohort, Status
- **Feedback subtab** — view & edit product features raised from each AMA session
- Accordion expand per session to see associated feature requests inline
- Paginated server-side fetch with sorting and filtering
- Program ↔ Cohort bidirectional mapping (UG, PGP, YLC, All)
- Speaker dropdown driven by the Configuration section
- One-click feedback form link copy per session

### 📞 Admin Calls
- Log admin calls with discussion notes, action items, and status
- Inline feature linking — click any related feature to open its detail drawer

### 📅 Calendar
- Google Calendar integration — shows upcoming sessions, calls, and deadlines
- Public calendar view available without login (read-only)

### 📚 Content Pipeline
- Track content modules by type: Video, Quiz, Worksheet, Notes, Syllabus
- Status workflow: Drafting → Under Review → Approved → Published

### 🗂️ Product Breakdown
- Pivot view grouping features by Product Group
- Sprint plan task counts and status distribution per product area

### 🐛 Daily Issues Log
- Raw issue tracker by cohort, product, module, and type
- Paginated table with sorting and search

### 🔢 Feature Requests
- Standalone view of all feature requests with priority inline badges
- Filterable by program, cohort, status

### 📈 Adoption Tracker
- Feature adoption rates, active user counts, and sentiment scores
- Visual progress bars per feature

### 🔗 ClickUp Integration
- Live status sync from ClickUp tasks via API proxy
- Bulk refresh all ClickUp statuses with one click
- Webhook registration & verification for real-time push updates
- Subtask count display per feature

### ⚙️ Configuration *(Admin only)*
Manage master lists that power dropdowns across the entire portal:

| Tab | What it controls |
|---|---|
| **POC Owners / Speakers** | Speaker dropdown in AMA; POC dropdown in Priority Requests |
| **Product Groups** | Product dropdown in Priority Requests & Product Breakdown |
| **Statuses** | Status badges in Priority Requests and AMA sessions |
| **Programs** | Program dropdown across meetings and feature requests |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Vanilla CSS (custom design system, dark/light theme) |
| Icons | Lucide React |
| State | React Context API |
| Fonts | Google Fonts — Inter, Outfit, Google Sans |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | MongoDB (via Mongoose ORM) |
| Auth | Google OAuth 2.0 (login via email) |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm
- A Vercel account (for production / serverless API)
- MongoDB Connection URI (stored in MONGODB_URI environment variable)

### Install & Run (Local)

```bash
# Clone the repo
git clone https://github.com/AkashSharma19/Internal-Product-Management-Tool-for-SaaS.git
cd Internal-Product-Management-Tool-for-SaaS

# Install dependencies
npm install

# Start dev server (with Vercel Functions support)
npx vercel dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** Use `npx vercel dev` (not `npm run dev`) to ensure the serverless API functions in `/api` are available locally.

### Build for Production

```bash
npm run build
```

Deployed automatically to Vercel on every push to `main`.

---

## 📁 Project Structure

```
├── api/
│   ├── data.ts           # Main Vercel serverless API (all CRUD, auth, ClickUp, calendar)
│   ├── webhook.ts        # ClickUp webhook handler
│   └── lib/              # Mongoose DB connection & Mongoose Schemas
├── src/
│   ├── App.tsx           # Sidebar navigation, layout shell, command palette
│   ├── App.css           # Layout-level styles
│   ├── index.css         # Full design system (tokens, components, animations)
│   ├── main.tsx          # React entry point
│   ├── types.ts          # All TypeScript interfaces & types
│   ├── mockData.ts       # Seed / fallback data
│   ├── components/
│   │   ├── Tables.tsx          # All tab views & inline editors (~13,000 lines)
│   │   ├── DashboardOverview.tsx  # Dashboard KPI view
│   │   ├── CalendarView.tsx    # Google Calendar view
│   │   ├── ConfigSection.tsx   # Configuration tab
│   │   ├── PublicFeedbackForm.tsx # Public-facing AMA feedback form
│   │   └── TabContainer.tsx    # Shared tab shell
│   └── context/
│       └── DashboardContext.tsx  # Global state, API calls, auth, ClickUp sync
```

---

## 🌐 API Endpoints (`/api/data`)

All requests go through a single serverless function. The `action` query parameter routes the request:

| Method | Action | Description |
|---|---|---|
| `GET` | `init` | Load all tab data on first login |
| `GET` | `tab-data` | Lazy-load a single tab's dataset |
| `GET` | `dashboard-counts` | KPI counts with date-range filter |
| `GET` | `dashboard-list` | Scrollable product list for dashboard |
| `GET` | `sprint-planning-data` | Sprint tasks for a given month |
| `GET` | `paginated-meetings-data` | AMA sessions or feedback with pagination |
| `GET` | `product-breakdown-data` | Product group pivot data |
| `GET` | `calendar-events` | Google Calendar events (public or authed) |
| `GET` | `single-task` | Fetch one product task by ID |
| `GET` | `comments` | Comments thread for a task |
| `POST` | `login` | Authenticate user by email |
| `POST` | `clickup-sync` | Sync a single ClickUp task status |
| `POST` | `clickup-bulk-sync` | Bulk sync all ClickUp task statuses |
| `POST` | `clickup-register-webhook` | Register ClickUp push webhook |
| `POST` | `clickup-check-webhook` | Verify webhook registration |
| `POST/PUT/DELETE` | `create / update / delete` | Generic CRUD for any data type |
| `POST` | `batch-import` | Bulk import rows into any table |

---

## 🔐 Authentication

- Users log in via **email** — matched against the configured POC/Speakers list
- Admin users get full edit access; non-admin users get read-only access
- Session is stored in `localStorage` and re-validated on each API call
- Google OAuth (`googleClientId`) can optionally be configured for SSO

---

## 🌗 Theme

Supports **dark** (default) and **light** modes. Toggle with the sun/moon icon in the sidebar footer. Preference is persisted to `localStorage`.

---

## ⌨️ Command Palette

Press `Cmd+K` (or `Ctrl+K`) to open the universal search / command palette. Instantly navigate to any feature, sprint task, meeting, or content module across all tabs.
