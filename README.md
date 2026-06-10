# 🚀 Internal Product Management Tool

> A premium, full-featured internal operations dashboard for managing SaaS product development — built for the IIMA Ventures / Coach LMS team.

---

## 📋 Overview

This tool centralises everything the product & operations team tracks day-to-day into a single, beautiful, dark-mode dashboard — replacing scattered spreadsheets and ClickUp exports. All data is persisted to **localStorage** so edits survive page reloads with zero backend setup.

---

## ✨ Features

### 📌 Priority Requests
- Full feature backlog with inline editing for every field
- Priority flags (P0 → P4), Status, POC assignee, product area, ClickUp link
- Premium feature detail drawer (Notion / ClickUp-style) with timeline progress bar, comment thread, and changelog
- Bulk import via structured text paste
- Multi-select status filter + search

### 📅 Sprint Planning
- Month-by-month sprint plan grouped by Development / UI/UX / Product
- Inline status updates with colour-coded badges

### 👩‍💻 Student Projects
- Track student capstone & live projects (Delivered / In-Progress / Cancelled)
- Full metadata: POC, priority, ClickUp link, UI/UX & dev deadlines, blocker

### 🎤 AMA & Student Meetings
- **Schedule subtab** — create and manage AMA sessions with Date, Topic, Speaker, Program, Cohort, Status
- **Feedback subtab** — view related features raised from each session; inline editing of session metadata
- Program ↔ Cohort bidirectional mapping (UG, PGP, YLC, All)
- Speaker dropdown driven by Configuration section

### 📞 Admin Calls
- Log of admin calls with discussion notes, action items, and status
- One-click feature preview for related product items

### 📚 Content Pipeline
- Track content modules by type (Video, Quiz, Worksheet, Notes, Syllabus)
- Status workflow: Drafting → Under Review → Approved → Published

### 🗂️ Product Breakdown
- Pivot view grouping features by Product Group
- Sprint plan task counts per product area

### 🐛 Daily Issues Log
- Raw issue tracker by cohort, product, module, and type

### 📈 Adoption Tracker
- Feature adoption rates, active user counts, and sentiment scores with visual progress bars

### ⚙️ Configuration *(Admin)*
Manage master lists that power dropdowns across the entire portal:
| Tab | What it controls |
|---|---|
| **POC Owners / Speakers** | Speaker dropdown in AMA; POC dropdown in Priority Requests |
| **Product Groups** | Product dropdown in Priority Requests & Product Breakdown |
| **Statuses** | Status dropdown in Priority Requests (scope: product/all) and AMA (scope: ama/all) |

Changes are instant and persisted to `localStorage`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Vanilla CSS (custom design system with dark/light theme) |
| Icons | Lucide React |
| State | React Context + `localStorage` |
| Fonts | Google Fonts — Inter, Outfit, Google Sans |

No external UI library. No backend. No database.

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/AkashSharma19/Internal-Product-Management-Tool-for-SaaS.git
cd Internal-Product-Management-Tool-for-SaaS

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Tables.tsx          # All tab views & inline editors (main component file)
│   ├── ConfigSection.tsx   # Configuration tab (Speakers, Product Groups, Statuses)
│   └── TabContainer.tsx    # Shared tab container shell
├── context/
│   └── DashboardContext.tsx  # Global state, CRUD actions, localStorage persistence
├── types.ts                # All TypeScript interfaces
├── mockData.ts             # Initial seed data for all sections
├── App.tsx                 # Sidebar navigation + layout shell
└── index.css               # Full design system (tokens, components, animations)
```

---

## 💾 Data Persistence

All data is stored in browser `localStorage` under the following keys:

| Key | Contents |
|---|---|
| `data-products` | Priority Requests |
| `data-plans` | Sprint Planning |
| `data-student-projects` | Student Projects |
| `data-ama-sessions` | AMA Sessions |
| `data-student-meetings` | Student Meetings |
| `data-admin-calls` | Admin Calls |
| `data-content-items` | Content Pipeline |
| `data-daily-issues` | Daily Issues Log |
| `data-feature-adoptions` | Adoption Tracker |
| `config-speakers` | Configured Speakers / POC list |
| `config-product-groups` | Configured Product Groups |
| `config-statuses` | Configured Statuses |

Use the **Reset Data** button in the sidebar to restore all data to initial mock values.

---

## 🌗 Theme

Supports **dark** (default) and **light** modes. Toggle with the sun/moon icon in the sidebar footer. Theme preference is persisted to `localStorage`.

---

## 👥 Team

Built for the **IIMA Ventures / Coach LMS** product & operations team.

| Member | Role |
|---|---|
| Akash Sharma | Product & Engineering |
| Anushka | UI/UX Design |
| Nikhil | Content & Engineering |
