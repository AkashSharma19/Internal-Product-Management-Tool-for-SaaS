/**
 * Barrel re-export file for all modularized table components, shared utilities, and preview modals.
 * Modularized from the original monolithic 24,400+ lines file to improve maintainability and IDE performance.
 */

// Shared table utilities & formatters
export * from './common/tableUtils';

// Shared modals & sub-components
export * from './common/TableShared';

// Common unified task preview & edit drawer
export * from './common/ProductDetailView';

// Individual table modules
export * from './tables/ProductTable';
export * from './tables/PlanTable';
export * from './tables/StudentProjectsTable';
export * from './tables/StudentMeetingsTable';
export * from './tables/AdminCallsTable';
export * from './tables/TarunSirMeetingsTable';
export * from './tables/ContentTable';
export * from './tables/ProductWiseSheet';
export * from './tables/IssuesTable';
export * from './tables/FeatureRequestsTable';
export * from './tables/AdoptionTable';
export * from './tables/ContactsDirectoryTable';
export * from './tables/RepositoryView';
export * from './tables/ChallengesTable';
export * from './tables/SupportDocsTable';