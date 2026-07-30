# Project Rules & Architectural Overview

## Repository Summary
This repository is an **Internal Product Management Tool** built for SaaS product operations, sprint planning, feature tracking, student project monitoring, meeting logs, content pipeline management, and ClickUp integration.

- **Frontend**: React 19, TypeScript, Vite, Vanilla CSS design system (`src/index.css`), Lucide icons, Three.js/OGL (`PixelBlast`), jsPDF, canvas-confetti, Web Audio API.
- **Backend / Server**: Node.js HTTP Server (`server/server.ts`), Vercel Serverless Functions (`api/data.ts`, `api/webhook.ts`), MongoDB & Mongoose (`api/lib/models.ts`, `api/lib/db.ts`).
- **Core State Management**: `src/context/DashboardContext.tsx` manages authentication, active tab, filtering, optimistic CRUD updates, and ClickUp sync.

---

## Workspace Navigation & Key Files
1. **Frontend Main Entry**: [App.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/App.tsx)
2. **State Provider**: [DashboardContext.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/context/DashboardContext.tsx)
3. **Data Tables & Unified Preview**: [Tables.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/Tables.tsx) (contains `ProductDetailView`, `ProductTable`, `PlanTable`, `CustomDatePicker`, etc.)
4. **Analytics Overview**: [DashboardOverview.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/DashboardOverview.tsx)
5. **Interactive Calendar**: [CalendarView.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/CalendarView.tsx)
6. **Admin Config**: [ConfigSection.tsx](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/components/ConfigSection.tsx)
7. **Monolithic API Handler**: [data.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/data.ts)
8. **ClickUp Webhook**: [webhook.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/webhook.ts)
9. **Mongoose Models**: [models.ts](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/api/lib/models.ts)
10. **Global CSS & Tokens**: [index.css](file:///c:/Users/AKASH/Documents/Internal%20Product%20Tool/src/index.css)

---

## Critical Development Conventions & Gotchas
- **Database Model Fields**: Every item model uses a unique `id` string (e.g. `prod-123`, `plan-456`, `proj-789`, `issue-101`) rather than Mongo's native `_id`.
- **Authentication**: Requests carry `x-user-id` header matching a `ConfigSpeaker.id`. Localhost requests bypass authentication for dev convenience.
- **Date Picker Popup Z-Index**: `CustomDatePicker` requires parent container stacking contexts (`.premium-timeline-container`, `<td>`) to explicitly manage `z-index` (e.g. `zIndex: 50` or `100` when editing) so absolute dropdowns float above subsequent rows and cards.
- **ClickUp Sync**: Syncing tasks checks `GlobalSettingsModel` for `clickup_api_key`. Single task sync calls `api/data?action=clickup-sync` while webhooks stream into `api/webhook`.
