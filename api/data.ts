import https from 'https';
import nodemailer from 'nodemailer';
import { connectToDatabase } from './lib/db.js';
import {
  ProductItemModel,
  PlanItemModel,
  StudentProjectModel,
  AMASessionModel,
  StudentMeetingModel,
  AdminCallModel,
  TarunSirMeetingModel,
  ContentItemModel,
  DailyIssueModel,
  FeatureAdoptionModel,
  ConfigSpeakerModel,
  ConfigProductGroupModel,
  ConfigStatusModel,
  ConfigProgramModel,
  ConfigCohortModel,
  GlobalSettingsModel,
  FeedbackFormConfigModel,
  FeedbackSubmissionModel,
  CommentModel,
  ChangeHistoryModel,
  DirectoryContactModel,
  RepoTabModel,
  RepoDocModel,
  ChallengeModel,
  StickyNoteModel,
  FeedbackAnalysisModel
} from './lib/models.js';

const modelsMap: Record<string, any> = {
  products: ProductItemModel,
  plans: PlanItemModel,
  projects: StudentProjectModel,
  amaSessions: AMASessionModel,
  studentMeetings: StudentMeetingModel,
  adminCalls: AdminCallModel,
  tarunSirMeetings: TarunSirMeetingModel,
  contentItems: ContentItemModel,
  dailyIssues: DailyIssueModel,
  featureAdoptions: FeatureAdoptionModel,
  speakers: ConfigSpeakerModel,
  productGroups: ConfigProductGroupModel,
  statuses: ConfigStatusModel,
  programs: ConfigProgramModel,
  cohorts: ConfigCohortModel,
  settings: GlobalSettingsModel,
  formConfigs: FeedbackFormConfigModel,
  feedbackSubmissions: FeedbackSubmissionModel,
  comments: CommentModel,
  changeHistories: ChangeHistoryModel,
  directoryContacts: DirectoryContactModel,
  repoTabs: RepoTabModel,
  repoDocs: RepoDocModel,
  challenges: ChallengeModel,
  stickyNotes: StickyNoteModel,
  feedbackAnalyses: FeedbackAnalysisModel
};

export default async function handler(req: any, res: any) {
  if (res.setHeader) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  try {
    await connectToDatabase();
  } catch (dbErr) {
    console.error('Database connection error:', dbErr);
    return res.status(500).json({ success: false, error: 'Database connection failed' });
  }

  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (method === 'GET') {
    try {
      const results: Record<string, any[]> = {};
      
      // 1. Authentication Check via x-user-id header
      const userId = req.headers['x-user-id'];
      let isAuthenticated = false;
      const host = req.headers.host || '';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000') || host.includes('5173');
      
      if (isLocalhost) {
        isAuthenticated = true;
      } else if (userId) {
        const ConfigSpeaker = modelsMap['speakers'];
        const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
        if (speaker) {
          isAuthenticated = true;
        }
      }

      // Parse public query parameters
      const feedbackId = url.searchParams.get('feedback');
      const isFeedback = url.searchParams.get('public') === 'true' || !!feedbackId;
      const isPublicCalendar = url.searchParams.get('public-calendar') === 'true';
      const action = url.searchParams.get('action');

      if (action) {
        if (!isAuthenticated && action !== 'init' && !(isPublicCalendar && action === 'calendar-events') && action !== 'get-public-doc') {
          return res.status(401).json({ success: false, error: 'Unauthorized action request.' });
        }

        // --- Date and Status helper functions ---
        const parseDate = (dateStr: string): Date | null => {
          if (!dateStr) return null;
          const cleaned = dateStr.trim();
          if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
            const d = new Date(cleaned.slice(0, 10));
            return isNaN(d.getTime()) ? null : d;
          }
          if (/^\d{2}-\d{2}-\d{4}/.test(cleaned)) {
            const [dVal, mVal, yVal] = cleaned.slice(0, 10).split('-');
            const d = new Date(`${yVal}-${mVal}-${dVal}`);
            return isNaN(d.getTime()) ? null : d;
          }
          const parts = cleaned.split(/\s+/);
          if (parts.length >= 3) {
            const day = parts[0];
            const monthStr = parts[1].toLowerCase().slice(0, 3);
            const yearVal = parts[2];
            const months: Record<string, string> = {
              jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
              jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
            };
            const monthVal = months[monthStr];
            if (monthVal && /^\d+$/.test(day) && /^\d{4}/.test(yearVal)) {
              const d = new Date(`${yearVal.slice(0, 4)}-${monthVal}-${day.padStart(2, '0')}`);
              return isNaN(d.getTime()) ? null : d;
            }
          }
          const d = new Date(cleaned);
          return isNaN(d.getTime()) ? null : d;
        };

        const getFilterDates = (dateRangeType: string, customStartDate?: string, customEndDate?: string): { start: Date | null; end: Date | null } => {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          let start: Date | null = null;
          let end: Date | null = null;

          if (dateRangeType === 'all' || !dateRangeType) {
            return { start, end };
          }

          if (dateRangeType === '7days') {
            start = new Date();
            start.setDate(today.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            end = today;
          } else if (dateRangeType === '1month') {
            start = new Date();
            start.setMonth(today.getMonth() - 1);
            start.setHours(0, 0, 0, 0);
            end = today;
          } else if (dateRangeType === '3months') {
            start = new Date();
            start.setMonth(today.getMonth() - 3);
            start.setHours(0, 0, 0, 0);
            end = today;
          } else if (dateRangeType === '1year') {
            start = new Date();
            start.setFullYear(today.getFullYear() - 1);
            start.setHours(0, 0, 0, 0);
            end = today;
          } else if (dateRangeType === 'custom') {
            if (customStartDate) {
              start = new Date(customStartDate);
              start.setHours(0, 0, 0, 0);
            }
            if (customEndDate) {
              end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
            }
          }

          return { start, end };
        };

        const isWithinDateRange = (dateStr: string, filterStart: Date | null, filterEnd: Date | null): boolean => {
          if (!filterStart && !filterEnd) return true;
          const parsed = parseDate(dateStr);
          if (!parsed) return false;
          
          if (filterStart && parsed < filterStart) return false;
          if (filterEnd && parsed > filterEnd) return false;
          return true;
        };

        const isSameStatus = (statusA?: string, statusB?: string): boolean => {
          if (!statusA || !statusB) return (statusA || '').trim() === (statusB || '').trim();
          const cleanA = statusA.toLowerCase().trim();
          const cleanB = statusB.toLowerCase().trim();
          if (cleanA === cleanB) return true;

          const completedGroup = ['completed', 'delivered', 'done', 'closed', 'tested', 'used', 'published'];
          const onHoldGroup = ['cancelled', 'canceled', 'on hold', 'not used'];
          const inProgressGroup = ['in-progress', 'in progress', 'development', 'testing'];
          const ongoingGroup = ['ongoing'];

          if (completedGroup.includes(cleanA) && completedGroup.includes(cleanB)) return true;
          if (onHoldGroup.includes(cleanA) && onHoldGroup.includes(cleanB)) return true;
          if (inProgressGroup.includes(cleanA) && inProgressGroup.includes(cleanB)) return true;
          if (ongoingGroup.includes(cleanA) && ongoingGroup.includes(cleanB)) return true;

          return false;
        };

        const toProductStatus = (status?: string): string => {
          if (!status) return '';
          const cleanStatus = status.toLowerCase();
          if (['completed', 'delivered', 'done', 'closed', 'tested', 'used'].includes(cleanStatus)) return 'Completed';
          if (['cancelled', 'canceled', 'on hold', 'not used'].includes(cleanStatus)) return 'On Hold';
          if (['in-progress', 'in progress', 'development', 'testing'].includes(cleanStatus)) return 'In Progress';
          if (cleanStatus === 'ongoing') return 'Ongoing';
          return status;
        };

        // --- Action Routers ---
        if (action === 'init') {
          const results: Record<string, any[]> = {};
          const allowedKeys = [
            'settings', 'speakers', 'statuses', 'productGroups', 'programs', 'cohorts', 
            'formConfigs', 'products', 'feedbackSubmissions', 'comments', 'directoryContacts', 
            'repoTabs', 'repoDocs', 'challenges', 'stickyNotes',
            'plans', 'projects', 'amaSessions', 'studentMeetings', 'adminCalls', 'tarunSirMeetings', 
            'contentItems', 'dailyIssues', 'featureAdoptions'
          ];
          for (const key of allowedKeys) {
            if (key === 'speakers') {
              const rawSpeakers = await modelsMap[key].find({}).lean();
              results[key] = rawSpeakers.map((s: any) => {
                const copy = { ...s };
                delete copy.password;
                return copy;
              });
            } else if (key === 'settings') {
              const rawSettings = await modelsMap[key].find({}).lean();
              results[key] = rawSettings.map((s: any) => {
                if (s.key === 'clickupApiKey' || s.key === 'geminiApiKey') {
                  return { ...s, value: s.value ? '••••••••' : '' };
                }
                return s;
              });
            } else if (key === 'stickyNotes') {
              results[key] = await modelsMap[key].find({ userId: userId || '', completed: false }).lean();
              results['stickyNotesCompletedCount'] = [{ count: await modelsMap[key].countDocuments({ userId: userId || '', completed: true }) }] as any;
            } else {
              const rawItems = await modelsMap[key].find({}).lean();
              if (key === 'products') {
                results[key] = rawItems.map((item: any) => {
                  const hasLink = item.taskLink && item.taskLink.trim() !== '';
                  return {
                    ...item,
                    id: item.id || String(item._id),
                    clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                    clickupAssignee: hasLink ? (item.clickupAssignee || '') : '',
                    clickupSubtasksCount: hasLink ? (item.clickupSubtasksCount || 0) : 0
                  };
                });
              } else if (key === 'projects' || key === 'plans' || key === 'contentItems' || key === 'dailyIssues' || key === 'studentMeetings') {
                results[key] = rawItems.map((item: any) => {
                  const hasLink = key === 'plans'
                    ? (item.link && item.link.trim() !== '')
                    : key === 'contentItems'
                      ? (item.draftLink && item.draftLink.trim() !== '')
                      : (item.taskLink && item.taskLink.trim() !== '');
                  const formatted = {
                    ...item,
                    id: item.id || String(item._id)
                  };
                  if (!hasLink) {
                    formatted.clickupStatus = '';
                    formatted.clickupAssignee = '';
                    formatted.clickupSubtasksCount = 0;
                  }
                  return formatted;
                });
              } else if (key === 'programs' || key === 'cohorts') {
                results[key] = [...rawItems].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
              } else {
                results[key] = rawItems.map((item: any) => ({
                  ...item,
                  id: item.id || String(item._id)
                }));
              }
            }
          }
          return res.status(200).json({ success: true, data: results });
        }

        if (action === 'completed-sticky-notes') {
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
          const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '5', 10));
          const skip = (page - 1) * limit;

          const filter = {
            userId: userId || '',
            completed: true
          };

          const [notes, total] = await Promise.all([
            modelsMap['stickyNotes'].find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
            modelsMap['stickyNotes'].countDocuments(filter)
          ]);

          return res.status(200).json({
            success: true,
            data: notes,
            total,
            page,
            limit
          });
        }

        if (action === 'suggest-similar') {
          const query = url.searchParams.get('query') || '';
          const excludeId = url.searchParams.get('excludeId') || '';
          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
          const pageSize = 5;
          const skip = (page - 1) * pageSize;
          
          if (!query.trim() || query.trim().length < 3) {
            return res.status(200).json({ success: true, data: [], total: 0, page: 1, pageSize });
          }

          const filter = {
            id: { $ne: excludeId },
            feature: { $regex: query, $options: 'i' }
          };

          const [similar, total] = await Promise.all([
            ProductItemModel.find(filter, 'id feature product status clickupStatus taskLink deadline productDeadline finalRelease notes finalReleaseCompleted').skip(skip).limit(pageSize).lean(),
            ProductItemModel.countDocuments(filter)
          ]);

          return res.status(200).json({ 
            success: true, 
            data: similar.map((item: any) => ({
              ...item,
              id: item.id || String(item._id)
            })),
            total,
            page,
            pageSize
          });
        }

        if (action === 'dashboard-counts') {
          const dateRangeType = url.searchParams.get('dateRangeType') || 'all';
          const customStartDate = url.searchParams.get('startDate') || '';
          const customEndDate = url.searchParams.get('endDate') || '';
          const statusType = url.searchParams.get('statusType') || 'my';

          const [productsRaw, projectsRaw, contentRaw, issuesRaw, meetingsRaw, speakers, productGroups, configStatuses, amaSessionsRaw, adminCallsRaw, tarunSirMeetingsRaw, formConfigs, feedbackSubmissions] = await Promise.all([
            ProductItemModel.find({}, 'id poc product status clickupStatus taskLink deadline productDeadline finalRelease notes finalReleaseCompleted createdAt updatedAt').lean(),
            StudentProjectModel.find({}, 'id poc product status clickupStatus taskLink deadline productDeadline completeInfoDate title thingsWeBuild finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
            ContentItemModel.find({}, 'id poc product status clickupStatus draftLink deadline productDeadline publishDate module subject type finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
            DailyIssueModel.find({}, 'id poc contact product status clickupStatus taskLink deadline module issues notes type finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
            StudentMeetingModel.find({}, 'id poc product status clickupStatus taskLink deadline productDeadline date cohort summary notes finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
            ConfigSpeakerModel.find({}, 'name').lean(),
            ConfigProductGroupModel.find({}).lean(),
            ConfigStatusModel.find({}).lean(),
            AMASessionModel.find({}, 'id date cohort topic speaker link status pinned').lean(),
            AdminCallModel.find({}, 'id date cohortTopic adminPoc status discussion actions pinned').lean(),
            TarunSirMeetingModel.find({}, 'id date cohortTopic adminPoc status discussion actions pinned').lean(),
            FeedbackFormConfigModel.find({}).lean(),
            FeedbackSubmissionModel.find({}).lean()
          ]);

          const products = productsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const projects = projectsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const content = contentRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const issues = issuesRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const meetings = meetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const amaSessions = amaSessionsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const adminCalls = adminCallsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const tarunSirMeetings = tarunSirMeetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

          const mainProductTasks = products
            .filter((item: any) => {
              if (item.id.startsWith('prod-temp-')) return false;
              
              if (item.id.startsWith('prod-ama-')) {
                if (item.notes && item.notes.includes('AMA Session ID:')) {
                  const match = item.notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    const parentExists = amaSessions.some((ama: any) => ama.id === match[1]);
                    if (!parentExists) return false;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }
              
              if (item.id.startsWith('prod-call-')) {
                if (item.notes && item.notes.includes('Admin Call ID:')) {
                  const match = item.notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    const parentExists = adminCalls.some((call: any) => call.id === match[1]);
                    if (!parentExists) return false;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }

              if (item.id.startsWith('prod-tarun-')) {
                if (item.notes && item.notes.includes('Tarun Sir Meeting ID:')) {
                  const match = item.notes.match(/Tarun Sir Meeting ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    const parentExists = tarunSirMeetings.some((call: any) => call.id === match[1]);
                    if (!parentExists) return false;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }
              
              return true;
            })
            .map((item: any) => {
              const isRelatedFeature = item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-');
              const isBreakdown = item.id.startsWith('prod-breakdown-');
              const itemSource = isRelatedFeature 
                ? 'AMA & Meetings' 
                : isBreakdown 
                  ? 'Product Breakdown' 
                  : 'Priority Requests';
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: item.id,
                poc: item.poc || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                taskLink: item.taskLink || '',
                date: item.deadline || item.productDeadline || '',
                feature: item.feature || '',
                notes: item.notes || '',
                source: itemSource,
                finalReleaseCompleted: !!item.finalReleaseCompleted,
                finalRelease: item.finalRelease || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              };
            });

          const projectTasks = projects.map((item: any) => {
            const hasLink = item.taskLink && item.taskLink.trim() !== '';
            return {
              id: item.id,
              poc: item.poc || '',
              product: item.product || '',
              status: toProductStatus(item.status),
              clickupStatus: hasLink ? (item.clickupStatus || '') : '',
              taskLink: item.taskLink || '',
              date: item.deadline || item.productDeadline || item.completeInfoDate || '',
              feature: item.title || '',
              source: 'Student Projects',
              finalReleaseCompleted: !!item.finalReleaseCompleted,
              finalRelease: item.finalRelease || '',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            };
          });

          const contentTasks = content.map((item: any) => {
            const hasLink = item.draftLink && item.draftLink.trim() !== '';
            return {
              id: item.id,
              poc: item.poc || '',
              product: item.product || '',
              status: toProductStatus(item.status),
              clickupStatus: hasLink ? (item.clickupStatus || '') : '',
              taskLink: item.draftLink || '',
              date: item.deadline || item.productDeadline || item.publishDate || '',
              feature: item.module || '',
              source: 'Content Pipeline',
              finalReleaseCompleted: !!item.finalReleaseCompleted,
              finalRelease: item.finalRelease || '',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            };
          });

          const issueTasks = issues.map((item: any) => {
            const hasLink = item.taskLink && item.taskLink.trim() !== '';
            return {
              id: item.id,
              poc: item.poc || item.contact || '',
              product: item.product || '',
              status: toProductStatus(item.status),
              clickupStatus: hasLink ? (item.clickupStatus || '') : '',
              taskLink: item.taskLink || '',
              date: item.deadline || item.productDeadline || '',
              feature: item.module || `Issue #${item.id}`,
              source: 'Daily Issues Log',
              finalReleaseCompleted: !!item.finalReleaseCompleted,
              finalRelease: item.finalRelease || '',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            };
          });

          const meetingTasks = meetings.map((item: any) => {
            const hasLink = item.taskLink && item.taskLink.trim() !== '';
            return {
              id: item.id,
              poc: item.poc || '',
              product: item.product || '',
              status: toProductStatus(item.status),
              clickupStatus: hasLink ? (item.clickupStatus || '') : '',
              taskLink: item.taskLink || '',
              date: item.deadline || item.productDeadline || item.date || '',
              feature: item.cohort || '',
              notes: item.notes || '',
              source: 'AMA & Meetings',
              finalReleaseCompleted: !!item.finalReleaseCompleted,
              finalRelease: item.finalRelease || '',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            };
          });

          const allUnifiedTasks = [
            ...mainProductTasks,
            ...projectTasks,
            ...contentTasks,
            ...issueTasks,
            ...meetingTasks
          ];

          const { start: filterStart, end: filterEnd } = getFilterDates(dateRangeType, customStartDate, customEndDate);
          let validItems = allUnifiedTasks.filter((item: any) => isWithinDateRange(item.date, filterStart, filterEnd));

          const hideReleased = url.searchParams.get('hideReleased') === 'true';
          if (hideReleased) {
            validItems = validItems.filter((item: any) => {
              return !item.finalReleaseCompleted;
            });
          }

          const productStatuses = configStatuses.filter((s: any) => s.scope === 'product' || s.scope === 'all');
          
          let activeStatuses: any[] = [];
          if (statusType === 'my') {
            activeStatuses = productStatuses.map((s: any) => ({ id: s.id, label: s.label, color: s.color }));
          } else {
            const unique = Array.from(new Set(validItems.map((item: any) => item.clickupStatus).filter((s: any) => s && s.trim() !== '')));
            const orderWeight = (status: string) => {
              const s = status.toLowerCase();
              if (s === 'open' || s === 'todo' || s === 'to do' || s === 'backlog') return 1;
              if (s === 'closed' || s === 'done' || s === 'completed' || s === 'delivered') return 9;
              if (s === 'testing' || s === 'review') return 5;
              return 3;
            };
            unique.sort((a: string, b: string) => orderWeight(a) - orderWeight(b) || a.localeCompare(b));
            
            const getClickupColor = (status: string) => {
              const s = status.toLowerCase().trim();
              if (['closed', 'done', 'completed', 'delivered', 'complete', 'resolved'].includes(s)) return '#10b981'; // Green
              if (['open', 'todo', 'to do', 'backlog', 'unstarted'].includes(s)) return '#6b7280'; // Grey
              if (['in progress', 'active', 'development', 'dev', 'in design', 'design', 'building'].includes(s)) return '#3b82f6'; // Blue
              if (['under review', 'review', 'discuss', 'discussing', 'discuss/review', 'in review', 'to review'].includes(s)) return '#f97316'; // Orange / Amber
              if (['testing', 'tested', 'qa', 'quality assurance', 'bug verification'].includes(s)) return '#a855f7'; // Purple / Violet
              if (['on hold', 'hold', 'paused', 'blocked', 'stuck', 'cancelled'].includes(s)) return '#ef4444'; // Red
              
              // Fallback to a stable hex color using hash
              let hash = 0;
              for (let i = 0; i < s.length; i++) {
                hash = s.charCodeAt(i) + ((hash << 5) - hash);
              }
              const hexColors = [
                '#7c3aed', // Purple
                '#db2777', // Pink
                '#0284c7', // Cyan
                '#059669', // Emerald
                '#ea580c', // Orange
                '#e11d48', // Rose
                '#4f46e5', // Indigo
                '#0891b2', // Teal
                '#ca8a04'  // Yellow
              ];
              return hexColors[Math.abs(hash) % hexColors.length];
            };

            activeStatuses = unique.map((status: string, idx: number) => ({
              id: `clickup-${idx}`,
              label: status,
              color: getClickupColor(status)
            }));
          }

          const configuredSpeakers = speakers.map((s: any) => s.name);
          const dataPocs = Array.from(new Set(validItems.map((item: any) => item.poc).filter((p: any) => p && p.trim() !== '')));
          const allPocs = [...Array.from(new Set([...configuredSpeakers, ...dataPocs])), 'No POC Assigned'];

          const rows = allPocs.map(poc => {
            const pocItems = poc === 'No POC Assigned'
              ? validItems.filter((item: any) => !item.poc || item.poc.trim() === '')
              : validItems.filter((item: any) => item.poc === poc);
            
            const statusCounts: Record<string, number> = {};
            activeStatuses.forEach(status => {
              if (statusType === 'my') {
                statusCounts[status.label] = pocItems.filter((item: any) => isSameStatus(item.status, status.label)).length;
              } else {
                statusCounts[status.label] = pocItems.filter((item: any) => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
              }
            });

            const noStatus = statusType === 'my'
              ? pocItems.filter((item: any) => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
              : pocItems.filter((item: any) => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;
            const total = pocItems.length;
            const clickupCount = pocItems.filter((item: any) => item.taskLink && item.taskLink.trim() !== '').length;
            const releasedCount = pocItems.filter((item: any) => !!item.finalReleaseCompleted).length;

            return {
              poc,
              statusCounts,
              noStatus,
              total,
              clickupCount,
              releasedCount,
            };
          });

          const configuredProductGroups = productGroups.map((g: any) => g.name);
          const dataProductGroups = Array.from(new Set(validItems.map((item: any) => item.product).filter((p: any) => p && p.trim() !== '')));
          const allProductGroups = [...Array.from(new Set([...configuredProductGroups, ...dataProductGroups])), 'No Product Group Assigned'];

          const productGroupRows = allProductGroups.map(prodGroup => {
            const prodItems = prodGroup === 'No Product Group Assigned'
              ? validItems.filter((item: any) => !item.product || item.product.trim() === '')
              : validItems.filter((item: any) => item.product === prodGroup);

            const statusCounts: Record<string, number> = {};
            activeStatuses.forEach(status => {
              if (statusType === 'my') {
                statusCounts[status.label] = prodItems.filter((item: any) => isSameStatus(item.status, status.label)).length;
              } else {
                statusCounts[status.label] = prodItems.filter((item: any) => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
              }
            });

            const noStatus = statusType === 'my'
              ? prodItems.filter((item: any) => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
              : prodItems.filter((item: any) => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;
            const total = prodItems.length;
            const clickupCount = prodItems.filter((item: any) => item.taskLink && item.taskLink.trim() !== '').length;
            const releasedCount = prodItems.filter((item: any) => !!item.finalReleaseCompleted).length;

            const matchedGroup = productGroups.find((g: any) => g.name === prodGroup);
            const color = matchedGroup ? matchedGroup.color : '#6b7280';

            return {
              productGroup: prodGroup,
              color,
              statusCounts,
              noStatus,
              total,
              clickupCount,
              releasedCount,
            };
          });

          const filteredAmaSessions = amaSessions.filter((ama: any) => isWithinDateRange(ama.date, filterStart, filterEnd));
          const filteredAdminCalls = adminCalls.filter((call: any) => isWithinDateRange(call.date, filterStart, filterEnd));
          const filteredTarunSirMeetings = tarunSirMeetings.filter((call: any) => isWithinDateRange(call.date, filterStart, filterEnd));

          const getAmaRelatedFeatures = (ama: any) => {
            return validItems.filter((item: any) => 
              item.notes && 
              item.notes.includes(`AMA Session ID: ${ama.id}`)
            );
          };

          const getAdminCallRelatedFeatures = (call: any) => {
            return validItems.filter((item: any) => 
              item.notes && 
              item.notes.includes(`Admin Call ID: ${call.id}`)
            );
          };

          const getTarunSirMeetingRelatedFeatures = (call: any) => {
            return validItems.filter((item: any) => 
              item.notes && 
              item.notes.includes(`Tarun Sir Meeting ID: ${call.id}`)
            );
          };

          const allAmaFeatures: any[] = [];
          filteredAmaSessions.forEach((ama: any) => {
            const feats = getAmaRelatedFeatures(ama);
            feats.forEach(f => {
              if (!allAmaFeatures.some(x => x.id === f.id)) allAmaFeatures.push(f);
            });
          });

          const allAdminFeatures: any[] = [];
          filteredAdminCalls.forEach((call: any) => {
            const feats = getAdminCallRelatedFeatures(call);
            feats.forEach(f => {
              if (!allAdminFeatures.some(x => x.id === f.id)) allAdminFeatures.push(f);
            });
          });

          const allTarunFeatures: any[] = [];
          filteredTarunSirMeetings.forEach((call: any) => {
            const feats = getTarunSirMeetingRelatedFeatures(call);
            feats.forEach(f => {
              if (!allTarunFeatures.some(x => x.id === f.id)) allTarunFeatures.push(f);
            });
          });

          const getCategoryRating = (cat: string) => {
            const config = formConfigs.find((c: any) => c.category === cat);
            if (!config || !config.enabled) return null;
            const submissions = feedbackSubmissions.filter((sub: any) => sub.category === cat);
            if (submissions.length === 0) return null;
            const ratingFields = config.fields.filter((f: any) => f.type === 'rating');
            if (ratingFields.length === 0) return null;
            
            const scores: number[] = [];
            submissions.forEach((sub: any) => {
              ratingFields.forEach((field: any) => {
                const score = Number(sub.answers[field.id]);
                if (!isNaN(score) && score > 0) scores.push(score);
              });
            });
            if (scores.length === 0) return null;
            return {
              avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
              count: submissions.length
            };
          };

          const getMeetingCategoryStats = (features: any[]) => {
            const statusCounts: Record<string, number> = {};
            activeStatuses.forEach(status => {
              if (statusType === 'my') {
                statusCounts[status.label] = features.filter((item: any) => isSameStatus(item.status, status.label)).length;
              } else {
                statusCounts[status.label] = features.filter((item: any) => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
              }
            });

            const noStatus = statusType === 'my'
              ? features.filter((item: any) => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
              : features.filter((item: any) => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;

            return { statusCounts, noStatus };
          };

          const meetingRows = [
            {
              category: 'AMA Sessions',
              formCategory: 'ama-meetings',
              featuresCount: allAmaFeatures.length,
              clickupCount: allAmaFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
              releasedCount: allAmaFeatures.filter(item => !!item.finalReleaseCompleted).length,
              callCount: filteredAmaSessions.length,
              rating: getCategoryRating('ama-meetings'),
              ...getMeetingCategoryStats(allAmaFeatures)
            },
            {
              category: 'Admin Meetings',
              formCategory: 'admin-calls',
              featuresCount: allAdminFeatures.length,
              clickupCount: allAdminFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
              releasedCount: allAdminFeatures.filter(item => !!item.finalReleaseCompleted).length,
              callCount: filteredAdminCalls.length,
              rating: getCategoryRating('admin-calls'),
              ...getMeetingCategoryStats(allAdminFeatures)
            },
            {
              category: 'Tarun Sir Meetings',
              formCategory: null,
              featuresCount: allTarunFeatures.length,
              clickupCount: allTarunFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
              releasedCount: allTarunFeatures.filter(item => !!item.finalReleaseCompleted).length,
              callCount: filteredTarunSirMeetings.length,
              rating: null,
              ...getMeetingCategoryStats(allTarunFeatures)
            }
          ];

          // Overall Totals
          const overallTotal = validItems.length;
          const overallClickup = validItems.filter(item => item.taskLink && item.taskLink.trim() !== '').length;
          const overallReleased = validItems.filter(item => !!item.finalReleaseCompleted).length;
          const overallStatusTotals: Record<string, number> = {};
          activeStatuses.forEach(status => {
            if (statusType === 'my') {
              overallStatusTotals[status.label] = validItems.filter(item => isSameStatus(item.status, status.label)).length;
            } else {
              overallStatusTotals[status.label] = validItems.filter(item => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim()).length;
            }
          });
          const overallNoStatus = statusType === 'my'
            ? validItems.filter(item => !item.status || item.status.trim() === '' || !activeStatuses.some(status => isSameStatus(item.status, status.label))).length
            : validItems.filter(item => !item.clickupStatus || item.clickupStatus.trim() === '' || !activeStatuses.some(status => (item.clickupStatus || '').toLowerCase().trim() === status.label.toLowerCase().trim())).length;

          // Last 30 Days Metrics calculation
          const isTaskCompleted = (statusStr: string) => {
            if (!statusStr) return false;
            const s = statusStr.toLowerCase().trim();
            return ['completed', 'delivered', 'done', 'closed', 'tested', 'released'].includes(s);
          };

          const parseToDateString = (dateStr: string | undefined): string => {
            if (!dateStr) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
              const [d, m, y] = dateStr.split('-');
              return `${y}-${m}-${d}`;
            }
            try {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
              }
            } catch(e) {}
            return dateStr;
          };

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          thirtyDaysAgo.setHours(0, 0, 0, 0);

          const doneInLast30DaysCount = allUnifiedTasks.filter((item: any) => {
            if (!isTaskCompleted(item.status)) return false;
            if (!item.updatedAt) return false;
            const updatedDate = new Date(item.updatedAt);
            return updatedDate >= thirtyDaysAgo;
          }).length;

          const releasedInLast30DaysCount = allUnifiedTasks.filter((item: any) => {
            if (!item.finalRelease || !item.finalReleaseCompleted) return false;
            try {
              const releaseDate = new Date(parseToDateString(item.finalRelease));
              if (isNaN(releaseDate.getTime())) return false;
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              return releaseDate >= thirtyDaysAgo && releaseDate <= today;
            } catch (e) {
              return false;
            }
          }).length;

          return res.status(200).json({
            success: true,
            data: {
              activeStatuses,
              rows,
              productGroupRows,
              meetingRows,
              overallTotal,
              overallClickup,
              overallStatusTotals,
              overallNoStatus,
              overallReleased,
              doneInLast30DaysCount,
              releasedInLast30DaysCount
            }
          });
        }

        if (action === 'dashboard-list') {
          const source = url.searchParams.get('source') || '';
          const poc = url.searchParams.get('poc') || '';
          const status = url.searchParams.get('status') || '';
          const statusType = url.searchParams.get('statusType') || 'my';
          const productGroup = url.searchParams.get('productGroup') || '';
          const meetingCategory = url.searchParams.get('meetingCategory') || '';
          const dateRangeType = url.searchParams.get('dateRangeType') || 'all';
          const customStartDate = url.searchParams.get('startDate') || '';
          const customEndDate = url.searchParams.get('endDate') || '';
          const doneLast30 = url.searchParams.get('doneLast30') === 'true';
          const releaseLast30 = url.searchParams.get('releaseLast30') === 'true';

          const isTaskCompleted = (statusStr: string) => {
            if (!statusStr) return false;
            const s = statusStr.toLowerCase().trim();
            return ['completed', 'delivered', 'done', 'closed', 'tested', 'released'].includes(s);
          };

          console.log('DASHBOARD-LIST PARAMS:', { source, poc, status, statusType, productGroup, meetingCategory, dateRangeType, customStartDate, customEndDate, doneLast30, releaseLast30 });

          if (doneLast30 || releaseLast30) {
            const [productsRaw, projectsRaw, contentRaw, issuesRaw, meetingsRaw] = await Promise.all([
              ProductItemModel.find({}, 'id feature poc product status clickupStatus clickupAssignee taskLink deadline productDeadline finalRelease notes finalReleaseCompleted createdAt updatedAt').lean(),
              StudentProjectModel.find({}, 'id poc product status clickupStatus clickupAssignee taskLink deadline productDeadline completeInfoDate title thingsWeBuild finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
              ContentItemModel.find({}, 'id poc product status clickupStatus clickupAssignee draftLink deadline productDeadline publishDate module subject type finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
              DailyIssueModel.find({}, 'id poc clickupAssignee contact product status clickupStatus taskLink deadline module issues notes type finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
              StudentMeetingModel.find({}, 'id poc product status clickupStatus clickupAssignee taskLink deadline productDeadline date cohort summary notes finalRelease finalReleaseCompleted createdAt updatedAt').lean(),
            ]);

            const products = productsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const projects = projectsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const content = contentRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const issues = issuesRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const meetings = meetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

            const mainProductTasks = products.map((item: any) => {
              const isRelatedFeature = item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-');
              const isBreakdown = item.id.startsWith('prod-breakdown-');
              const itemSource = isRelatedFeature ? 'AMA & Meetings' : isBreakdown ? 'Product Breakdown' : 'Priority Requests';
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: item.id,
                poc: item.poc || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                clickupAssignee: item.clickupAssignee || '',
                taskLink: item.taskLink || '',
                date: item.deadline || item.productDeadline || '',
                feature: item.feature || '',
                notes: item.notes || '',
                source: itemSource,
                finalReleaseCompleted: !!item.finalReleaseCompleted,
                finalRelease: item.finalRelease || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              };
            });

            const projectTasks = projects.map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: item.id,
                poc: item.poc || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                clickupAssignee: item.clickupAssignee || '',
                taskLink: item.taskLink || '',
                date: item.deadline || item.productDeadline || item.completeInfoDate || '',
                feature: item.title || '',
                source: 'Student Projects',
                finalReleaseCompleted: !!item.finalReleaseCompleted,
                finalRelease: item.finalRelease || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              };
            });

            const contentTasks = content.map((item: any) => {
              const hasLink = item.draftLink && item.draftLink.trim() !== '';
              return {
                id: item.id,
                poc: item.poc || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                clickupAssignee: item.clickupAssignee || '',
                taskLink: item.draftLink || '',
                date: item.deadline || item.productDeadline || item.publishDate || '',
                feature: item.module || '',
                source: 'Content Pipeline',
                finalReleaseCompleted: !!item.finalReleaseCompleted,
                finalRelease: item.finalRelease || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              };
            });

            const issueTasks = issues.map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: item.id,
                poc: item.poc || item.contact || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                clickupAssignee: item.clickupAssignee || '',
                taskLink: item.taskLink || '',
                date: item.deadline || item.productDeadline || '',
                feature: item.module || `Issue #${item.id}`,
                source: 'Daily Issues Log',
                finalReleaseCompleted: !!item.finalReleaseCompleted,
                finalRelease: item.finalRelease || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              };
            });

            const meetingTasks = meetings.map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: item.id,
                poc: item.poc || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                clickupAssignee: item.clickupAssignee || '',
                taskLink: item.taskLink || '',
                date: item.deadline || item.productDeadline || item.date || '',
                feature: item.cohort || '',
                notes: item.notes || '',
                source: 'AMA & Meetings',
                finalReleaseCompleted: !!item.finalReleaseCompleted,
                finalRelease: item.finalRelease || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
              };
            });

            const allTasks = [
              ...mainProductTasks,
              ...projectTasks,
              ...contentTasks,
              ...issueTasks,
              ...meetingTasks
            ];

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            // isTaskCompleted helper defined at outer block scope

            const parseToDateString = (dateStr: string | undefined): string => {
              if (!dateStr) return '';
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
              if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                const [d, m, y] = dateStr.split('-');
                return `${y}-${m}-${d}`;
              }
              try {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                  return d.toISOString().split('T')[0];
                }
              } catch(e) {}
              return dateStr;
            };

            let filteredTasks: any[] = [];
            if (doneLast30) {
              filteredTasks = allTasks.filter((item: any) => {
                if (!isTaskCompleted(item.status)) return false;
                if (!item.updatedAt) return false;
                const updatedDate = new Date(item.updatedAt);
                return updatedDate >= thirtyDaysAgo;
              });
            } else if (releaseLast30) {
              filteredTasks = allTasks.filter((item: any) => {
                if (!item.finalRelease || !item.finalReleaseCompleted) return false;
                try {
                  const releaseDate = new Date(parseToDateString(item.finalRelease));
                  if (isNaN(releaseDate.getTime())) return false;
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  return releaseDate >= thirtyDaysAgo && releaseDate <= today;
                } catch (e) {
                  return false;
                }
              });
            }

            // Sort tasks: put completed/released tasks at the bottom
            const sortedTasks = [...filteredTasks].sort((a, b) => {
              const aReleased = !!a.finalReleaseCompleted;
              const bReleased = !!b.finalReleaseCompleted;
              if (aReleased && !bReleased) return 1;
              if (!aReleased && bReleased) return -1;
              return 0;
            });

            const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
            const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10));
            const startIndex = (page - 1) * limit;
            const paginated = sortedTasks.slice(startIndex, startIndex + limit);

            return res.status(200).json({
              success: true,
              data: paginated,
              total: sortedTasks.length
            });
          }

          const getPocFilter = (itemPoc?: string) => {
            if (!poc) return true;
            if (poc === 'No POC Assigned') return !itemPoc || itemPoc.trim() === '';
            return itemPoc === poc;
          };

          const getProductGroupFilter = (itemGroup?: string) => {
            if (!productGroup) return true;
            if (productGroup === 'No Product Group Assigned') return !itemGroup || itemGroup.trim() === '';
            return itemGroup === productGroup;
          };

          const getStatusFilter = (itemStatus?: string, itemClickupStatus?: string, link?: string) => {
            if (!status) return true;
            if (status === 'ClickUp Linked') {
              return !!link && link.trim() !== '';
            }
            const isNoStatus = status === 'No Status' || status === 'No ClickUp Status';
            if (isNoStatus) {
              if (statusType === 'my') {
                return !itemStatus || itemStatus.trim() === '';
              } else {
                return !itemClickupStatus || itemClickupStatus.trim() === '';
              }
            }
            if (statusType === 'my') {
              return isSameStatus(itemStatus, status);
            } else {
              return (itemClickupStatus || '').toLowerCase().trim() === status.toLowerCase().trim();
            }
          };

          const { start: filterStart, end: filterEnd } = getFilterDates(dateRangeType, customStartDate, customEndDate);

          if (source === 'AMA Sessions') {
            const raw = await AMASessionModel.find({}).lean();
            const matched = raw.filter((ama: any) => isWithinDateRange(ama.date, filterStart, filterEnd));
            return res.status(200).json({
              success: true,
              data: matched.map((ama: any) => ({
                id: ama.id,
                feature: `${ama.cohort} - ${ama.topic}`,
                date: ama.date,
                status: ama.status,
                poc: ama.speaker,
                taskLink: ama.link,
                description: '',
                source: 'AMA & Meetings',
                rawItem: ama,
                stage: 'AMA Date'
              }))
            });
          }

          if (source === 'Admin Meetings') {
            const raw = await AdminCallModel.find({}).lean();
            const matched = raw.filter((call: any) => isWithinDateRange(call.date, filterStart, filterEnd));
            return res.status(200).json({
              success: true,
              data: matched.map((call: any) => ({
                id: call.id,
                feature: call.cohortTopic,
                date: call.date,
                status: call.status,
                poc: call.adminPoc,
                taskLink: '',
                description: call.discussion,
                notes: call.actions,
                source: 'Admin Calls',
                rawItem: call,
                stage: 'Call Date'
              }))
            });
          }

          if (source === 'Tarun Sir Meetings') {
            const raw = await TarunSirMeetingModel.find({}).lean();
            const matched = raw.filter((call: any) => isWithinDateRange(call.date, filterStart, filterEnd));
            return res.status(200).json({
              success: true,
              data: matched.map((call: any) => ({
                id: call.id,
                feature: call.cohortTopic,
                date: call.date,
                status: call.status,
                poc: call.adminPoc,
                taskLink: '',
                description: call.discussion,
                notes: call.actions,
                source: 'Tarun Sir Meetings',
                rawItem: call,
                stage: 'Meeting Date'
              }))
            });
          }

          let items: any[] = [];
          if (!source || source === 'Priority Requests' || source === 'Product Breakdown' || source === 'AMA & Meetings' || source === 'Admin Calls' || source === 'Tarun Sir Meetings') {
            const raw = await ProductItemModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              if (item.id.startsWith('prod-temp-')) return false;
              if (meetingCategory === 'all') {
                if (!item.notes || (!item.notes.includes('AMA Session ID:') && !item.notes.includes('Admin Call ID:') && !item.notes.includes('Tarun Sir Meeting ID:'))) return false;
              } else {
                if (meetingCategory === 'AMA Sessions' || source === 'AMA & Meetings') {
                  if (!item.notes || !item.notes.includes('AMA Session ID:')) return false;
                }
                if (meetingCategory === 'Admin Meetings' || source === 'Admin Calls') {
                  if (!item.notes || !item.notes.includes('Admin Call ID:')) return false;
                }
                if (meetingCategory === 'Tarun Sir Meetings' || source === 'Tarun Sir Meetings') {
                  if (!item.notes || !item.notes.includes('Tarun Sir Meeting ID:')) return false;
                }
              }

              const date = item.deadline || item.productDeadline || '';
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              const statusMatch = getStatusFilter(toProductStatus(item.status), hasLink ? item.clickupStatus : '', item.taskLink);
              
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     statusMatch && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map((item: any) => {
              const itemId = item.id || String(item._id);
              let itemSource = 'Priority Requests';
              if (itemId.startsWith('prod-ama-')) {
                itemSource = 'AMA & Meetings';
              } else if (itemId.startsWith('prod-call-')) {
                itemSource = 'Admin Calls';
              } else if (itemId.startsWith('prod-tarun-')) {
                itemSource = 'Tarun Sir Meetings';
              } else if (itemId.startsWith('prod-breakdown-')) {
                itemSource = 'Product Breakdown';
              }
              return {
                ...item,
                id: itemId,
                feature: item.feature || item.module || item.title || item.issues || 'Unnamed Task',
                source: itemSource
              };
            }));
          }

          if (!source || source === 'Student Projects') {
            const raw = await StudentProjectModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || item.completeInfoDate || '';
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), hasLink ? item.clickupStatus : '', item.taskLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map((item: any) => ({
              ...item,
              id: item.id || String(item._id),
              feature: item.title || item.feature || item.module || 'Unnamed Project',
              source: 'Student Projects'
            })));
          }

          if (!source || source === 'Content Pipeline') {
            const raw = await ContentItemModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || item.publishDate || '';
              const hasLink = item.draftLink && item.draftLink.trim() !== '';
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), hasLink ? item.clickupStatus : '', item.draftLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map((item: any) => ({
              ...item,
              id: item.id || String(item._id),
              feature: item.module || item.feature || item.subject || 'Unnamed Content',
              taskLink: item.draftLink || item.taskLink,
              source: 'Content Pipeline'
            })));
          }

          if (!source || source === 'Daily Issues Log') {
            const raw = await DailyIssueModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || '';
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return getPocFilter(item.poc || item.contact) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), hasLink ? item.clickupStatus : '', item.taskLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map((item: any) => ({
              ...item,
              id: item.id || String(item._id),
              feature: item.module || item.issues || item.feature || 'Unnamed Issue',
              source: 'Daily Issues Log'
            })));
          }

          if (!source || source === 'AMA & Meetings') {
            const raw = await StudentMeetingModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || item.date || '';
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), hasLink ? item.clickupStatus : '', item.taskLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map((item: any) => ({
              ...item,
              id: item.id || String(item._id),
              feature: item.cohort || item.module || item.feature || 'Unnamed Meeting',
              source: 'AMA & Meetings'
            })));
          }

          const sanitizedItems = items.map((item: any) => {
            const hasLink = item.source === 'Content Pipeline' 
              ? (item.draftLink && item.draftLink.trim() !== '') 
              : (item.taskLink && item.taskLink.trim() !== '');
            if (!hasLink) {
              return {
                ...item,
                clickupStatus: '',
                clickupAssignee: '',
                clickupSubtasksCount: 0
              };
            }
            return item;
          });

          // Sort tasks: put completed/released tasks at the bottom
          const sortedTasks = [...sanitizedItems].sort((a, b) => {
            const aReleased = !!a.finalReleaseCompleted;
            const bReleased = !!b.finalReleaseCompleted;
            if (aReleased && !bReleased) return 1;
            if (!aReleased && bReleased) return -1;
            return 0;
          });

          const hideReleased = url.searchParams.get('hideReleased') === 'true';
          let finalTasksList = sortedTasks;
          if (hideReleased) {
            finalTasksList = sortedTasks.filter((item: any) => {
              return !item.finalReleaseCompleted;
            });
          }

          const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
          const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10));
          const startIndex = (page - 1) * limit;
          const paginated = finalTasksList.slice(startIndex, startIndex + limit);

          return res.status(200).json({ 
            success: true, 
            data: paginated, 
            total: finalTasksList.length 
          });
        }

        if (action === 'calendar-events') {
          const year = parseInt(url.searchParams.get('year') || '2026');
          const month = parseInt(url.searchParams.get('month') || '6');
          const isPublic = url.searchParams.get('public-calendar') === 'true';

          // Load settings
          const rawSettings = await modelsMap['settings'].find({}).lean();
          const calSourcesSetting = rawSettings.find((s: any) => s.key === 'sharableCalendarSources');
          const allowedSources = calSourcesSetting ? calSourcesSetting.value.split(',') : [
            'product', 'projects', 'meetings', 'admin', 'tarun-meetings', 'content', 'issues'
          ];

           const calStagesSetting = rawSettings.find((s: any) => s.key === 'sharableCalendarStages');
           const allowedStages = calStagesSetting ? calStagesSetting.value.split(',') : [
             'Specs', 'UI/UX', 'Dev', 'Release', 'Commited'
           ];

          const [productsRaw, projectsRaw, amaSessionsRaw, meetingsRaw, adminCallsRaw, tarunSirMeetingsRaw, contentRaw, issuesRaw] = await Promise.all([
            ProductItemModel.find({}).lean(),
            StudentProjectModel.find({}).lean(),
            AMASessionModel.find({}).lean(),
            StudentMeetingModel.find({}).lean(),
            AdminCallModel.find({}).lean(),
            TarunSirMeetingModel.find({}).lean(),
            ContentItemModel.find({}).lean(),
            DailyIssueModel.find({}).lean()
          ]);

          const products = productsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const projects = projectsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const amaSessions = amaSessionsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const meetings = meetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const adminCalls = adminCallsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const tarunSirMeetings = tarunSirMeetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const content = contentRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const issues = issuesRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

          const list: any[] = [];
          const parseDateToYYYYMMDD = (dateStr: string | undefined): string => {
            if (!dateStr) return '';
            const cleaned = dateStr.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
            
            if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
              const [d, m, y] = cleaned.split('-');
              return `${y}-${m}-${d}`;
            }

            const parts = cleaned.split(/\s+/);
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const monthStr = parts[1].toLowerCase();
              const yearVal = parts[2];
              
              const months: Record<string, string> = {
                jan: '01', january: '01',
                feb: '02', february: '02',
                mar: '03', march: '03',
                apr: '04', april: '04',
                may: '05',
                jun: '06', june: '06',
                jul: '07', july: '07',
                aug: '08', august: '08',
                sep: '09', september: '09',
                oct: '10', october: '10',
                nov: '11', november: '11',
                dec: '12', december: '12'
              };
              
              const m = months[monthStr.slice(0, 3)] || '01';
              if (/^\d{2}$/.test(day) && /^\d{4}$/.test(yearVal)) {
                return `${yearVal}-${m}-${day}`;
              }
            }

            try {
              const d = new Date(cleaned);
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${mo}-${day}`;
              }
            } catch (e) {}

            return '';
          };

          const isCompletedStatus = (status?: string): boolean => {
            if (!status) return false;
            const s = status.toLowerCase().trim();
            return ['completed', 'delivered', 'done', 'closed', 'tested', 'used', 'published'].includes(s);
          };

          const isLinkedToMeetingOrCall = (notes: string | undefined) => {
            if (!notes) return false;
            return notes.includes('AMA Session ID:') || notes.includes('Admin Call ID:') || notes.includes('Tarun Sir Meeting ID:');
          };

          const addEvent = (
            id: string,
            source: string,
            title: string,
            stage: string,
            dateStrRaw: string | undefined,
            isCompleted: boolean,
            poc: string,
            priority: string | undefined,
            taskLink: string | undefined,
            rawItem: any,
            tab: string
          ) => {
            if (isPublic) {
              // 1. Check if source/tab is allowed
              if (tab === 'product' && !allowedSources.includes('product')) return;
              if (tab === 'projects' && !allowedSources.includes('projects')) return;
              if (tab === 'meetings' && !allowedSources.includes('meetings')) return;
              if (tab === 'admin' && !allowedSources.includes('admin')) return;
              if (tab === 'tarun-meetings' && !allowedSources.includes('tarun-meetings')) return;
              if (tab === 'content' && !allowedSources.includes('content')) return;
              if (tab === 'issues' && !allowedSources.includes('issues')) return;

              // 2. Check if stage is allowed
              const isMeetingStage = ['AMA Date', 'Call Date', 'Meeting Date'].includes(stage);
              if (!isMeetingStage) {
                let mappedCheckbox = '';
                if (stage === 'Specs') mappedCheckbox = 'Specs';
                else if (stage === 'UI/UX') mappedCheckbox = 'UI/UX';
                else if (stage === 'Dev') mappedCheckbox = 'Dev';
                else if (['Final Release', 'Publish Date', 'Deadline'].includes(stage)) mappedCheckbox = 'Release';
                else if (stage === 'Commited') mappedCheckbox = 'Commited';

                if (mappedCheckbox && !allowedStages.includes(mappedCheckbox)) return;
              }
            }

            const normalized = parseDateToYYYYMMDD(dateStrRaw);
            if (!normalized) return;
            
            const evDate = new Date(normalized);
            const isCurrentMonth = evDate.getFullYear() === year && evDate.getMonth() === month;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const evDateMidnight = new Date(normalized);
            evDateMidnight.setHours(0, 0, 0, 0);
            
            const isOverdue = !isCompleted && evDateMidnight < today;

            if (isCurrentMonth || isOverdue) {
              list.push({
                id: `${id}-${stage}`,
                source,
                title,
                stage,
                dateStr: normalized,
                poc,
                priority,
                status: rawItem.status || '',
                taskLink,
                rawItem,
                tab,
                isCompleted
              });
            }
          };

          products.forEach((item: any) => {
            if (item.id.startsWith('prod-temp-')) return;
            if (isLinkedToMeetingOrCall(item.notes)) return;
            const isOverallCompleted = isCompletedStatus(item.status);
             addEvent(item.id, 'Priority Requests', item.feature, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
             addEvent(item.id, 'Priority Requests', item.feature, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
             addEvent(item.id, 'Priority Requests', item.feature, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
             addEvent(item.id, 'Priority Requests', item.feature, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
             addEvent(item.id, 'Priority Requests', item.feature, 'Commited', item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc, item.priority, item.taskLink, item, 'product');
          });

          projects.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            addEvent(item.id, 'Student Projects', item.title, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'Commited', item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
          });

          amaSessions.forEach((item: any) => {
            const linked = products.filter(p => 
              !p.id.startsWith('prod-temp-') && 
              p.notes && 
              p.notes.includes(`AMA Session ID: ${item.id}`)
            );
            linked.forEach((task: any) => {
              const isOverallCompleted = isCompletedStatus(task.status);
              addEvent(task.id, 'AMA Sessions', task.feature, 'Specs', task.productDeadline, !!task.productDeadlineCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'meetings');
              addEvent(task.id, 'AMA Sessions', task.feature, 'UI/UX', task.uiux, !!task.uiuxCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'meetings');
              addEvent(task.id, 'AMA Sessions', task.feature, 'Dev', task.deadline, !!task.deadlineCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'meetings');
              addEvent(task.id, 'AMA Sessions', task.feature, 'Final Release', task.finalRelease, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'meetings');
              addEvent(task.id, 'AMA Sessions', task.feature, 'Commited', task.committedDate, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'meetings');
            });
          });

          meetings.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            addEvent(item.id, 'Student Meetings', item.cohort, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
            addEvent(item.id, 'Student Meetings', item.cohort, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
            addEvent(item.id, 'Student Meetings', item.cohort, 'Commited', item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
          });

          adminCalls.forEach((item: any) => {
            const linked = products.filter(p => 
              !p.id.startsWith('prod-temp-') && 
              p.notes && 
              p.notes.includes(`Admin Call ID: ${item.id}`)
            );
            linked.forEach((task: any) => {
              const isOverallCompleted = isCompletedStatus(task.status);
              addEvent(task.id, 'Admin Calls', task.feature, 'Specs', task.productDeadline, !!task.productDeadlineCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'admin');
              addEvent(task.id, 'Admin Calls', task.feature, 'UI/UX', task.uiux, !!task.uiuxCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'admin');
              addEvent(task.id, 'Admin Calls', task.feature, 'Dev', task.deadline, !!task.deadlineCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'admin');
              addEvent(task.id, 'Admin Calls', task.feature, 'Final Release', task.finalRelease, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'admin');
              addEvent(task.id, 'Admin Calls', task.feature, 'Commited', task.committedDate, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'admin');
            });
          });

          tarunSirMeetings.forEach((item: any) => {
            const linked = products.filter(p => 
              !p.id.startsWith('prod-temp-') && 
              p.notes && 
              p.notes.includes(`Tarun Sir Meeting ID: ${item.id}`)
            );
            linked.forEach((task: any) => {
              const isOverallCompleted = isCompletedStatus(task.status);
              addEvent(task.id, 'Tarun Sir Meetings', task.feature, 'Specs', task.productDeadline, !!task.productDeadlineCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'tarun-meetings');
              addEvent(task.id, 'Tarun Sir Meetings', task.feature, 'UI/UX', task.uiux, !!task.uiuxCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'tarun-meetings');
              addEvent(task.id, 'Tarun Sir Meetings', task.feature, 'Dev', task.deadline, !!task.deadlineCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'tarun-meetings');
              addEvent(task.id, 'Tarun Sir Meetings', task.feature, 'Final Release', task.finalRelease, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'tarun-meetings');
              addEvent(task.id, 'Tarun Sir Meetings', task.feature, 'Commited', task.committedDate, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'tarun-meetings');
            });
          });

          content.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            addEvent(item.id, 'Content Pipeline', item.module, 'Publish Date', item.finalRelease || item.publishDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
            addEvent(item.id, 'Content Pipeline', item.module, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
            addEvent(item.id, 'Content Pipeline', item.module, 'Commited', item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
          });

          issues.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            if (['Feature Gap', 'Enhancement', 'BUG', 'New Feature', 'Data Needed', 'Term Report/ Transcript'].includes(item.type)) {
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Commited', item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
            } else {
              addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
              addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
              addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
              addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
              addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'Commited', item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
            }
          });

          // Deduplicate by event ID — a task linked to multiple meetings or with
          // overlapping date fields could otherwise appear more than once.
          const seen = new Set<string>();
          const deduped = list.filter(evt => {
            if (seen.has(evt.id)) return false;
            seen.add(evt.id);
            return true;
          });

          return res.status(200).json({ success: true, data: deduped });
        }

        if (action === 'sprint-planning-data') {
          const monthLabel = url.searchParams.get('monthLabel') || ''; // e.g. "July 2026"
          
          const monthsMapping: Record<string, number> = {
            january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
          };
          const parts = monthLabel.trim().split(/\s+/);
          let targetYear = 2026;
          let targetMonth = 6; // July
          if (parts.length === 2) {
            const m = monthsMapping[parts[0].toLowerCase()];
            const y = parseInt(parts[1], 10);
            if (m !== undefined && !isNaN(y)) {
              targetMonth = m;
              targetYear = y;
            }
          }

          const [products, projects, plans, contentItems, dailyIssues] = await Promise.all([
            ProductItemModel.find({}).lean(),
            StudentProjectModel.find({}).lean(),
            PlanItemModel.find({ month: monthLabel }).lean(),
            ContentItemModel.find({}).lean(),
            DailyIssueModel.find({}).lean()
          ]);

          const parseDateToYYYYMMDD = (dateStr: string | undefined): string => {
            if (!dateStr) return '';
            const cleaned = dateStr.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
            if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
              const [d, m, y] = cleaned.split('-');
              return `${y}-${m}-${d}`;
            }
            const parts = cleaned.split(/\s+/);
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const monthStr = parts[1].toLowerCase();
              const yearVal = parts[2];
              const months: Record<string, string> = {
                jan: '01', january: '01',
                feb: '02', february: '02',
                mar: '03', march: '03',
                apr: '04', april: '04',
                may: '05',
                jun: '06', june: '06',
                jul: '07', july: '07',
                aug: '08', august: '08',
                sep: '09', september: '09',
                oct: '10', october: '10',
                nov: '11', november: '11',
                dec: '12', december: '12'
              };
              const m = months[monthStr.slice(0, 3)] || '01';
              if (/^\d{2}$/.test(day) && /^\d{4}$/.test(yearVal)) {
                return `${yearVal}-${m}-${day}`;
              }
            }
            try {
              const d = new Date(cleaned);
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${mo}-${day}`;
              }
            } catch (e) {}
            return '';
          };

          const dateInSelectedMonth = (dateStr: string | undefined): boolean => {
            if (!dateStr) return false;
            const iso = parseDateToYYYYMMDD(dateStr);
            if (!iso) return false;
            const [y, m] = iso.split('-').map(Number);
            return y === targetYear && m === (targetMonth + 1);
          };

          const filteredProducts = products.filter((item: any) => {
            if (item.id.startsWith('prod-temp-')) return false;
            if (item.status === 'Completed') return false;
            return dateInSelectedMonth(item.productDeadline) || 
                   dateInSelectedMonth(item.uiux) || 
                   dateInSelectedMonth(item.deadline) || 
                   dateInSelectedMonth(item.finalRelease);
          });

          const filteredProjects = projects.filter((p: any) => {
            if (p.status === 'Delivered' || p.status === 'Cancelled') return false;
            return dateInSelectedMonth(p.productDeadline) || 
                   dateInSelectedMonth(p.uiux) || 
                   dateInSelectedMonth(p.deadline || p.completeInfoDate);
          });

          const filteredContent = contentItems.filter((item: any) => {
            if (item.status === 'Completed' || item.status === 'Cancelled') return false;
            return dateInSelectedMonth(item.deadline);
          });

          const filteredIssues = dailyIssues.filter((item: any) => {
            if (item.status === 'Completed' || item.status === 'Closed' || item.status === 'Resolved') return false;
            return dateInSelectedMonth(item.deadline);
          });

          return res.status(200).json({
            success: true,
            data: {
              plans,
              products: filteredProducts,
              projects: filteredProjects,
              contentItems: filteredContent,
              dailyIssues: filteredIssues
            }
          });
        }

        if (action === 'product-breakdown-data') {
          const product = url.searchParams.get('product') || '';
          const page = parseInt(url.searchParams.get('page') || '1', 10);
          const limit = parseInt(url.searchParams.get('limit') || '25', 10);
          const search = (url.searchParams.get('search') || '').trim().toLowerCase();
          const superPriority = url.searchParams.get('superPriority') === 'true';
          const statusesParam = url.searchParams.get('statuses') || '';
          const pocsParam = url.searchParams.get('pocs') || '';
          const sortField = url.searchParams.get('sortField') || '';
          const sortAsc = url.searchParams.get('sortAsc') !== 'false';

          const activeProduct = product;
          const isNoGroupTab = activeProduct === 'No Product Group Assigned';

          const dbProductFilter = isNoGroupTab
            ? { $or: [{ product: { $exists: false } }, { product: null }, { product: '' }] }
            : { product: activeProduct };

          const productItems = await modelsMap['products'].find(dbProductFilter).lean();
          const studentProjects = await modelsMap['projects'].find(dbProductFilter).lean();
          const contentItems = await modelsMap['contentItems'].find(dbProductFilter).lean();
          const studentMeetings = await modelsMap['studentMeetings'].find(dbProductFilter).lean();
          const dailyIssues = await modelsMap['dailyIssues'].find(dbProductFilter).lean();

          const [amaSessionsRaw, adminCallsRaw, tarunSirMeetingsRaw] = await Promise.all([
            modelsMap['amaSessions'].find({}, 'id').lean(),
            modelsMap['adminCalls'].find({}, 'id').lean(),
            modelsMap['tarunSirMeetings'].find({}, 'id').lean()
          ]);

          const amaSessions = amaSessionsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const adminCalls = adminCallsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
          const tarunIds = new Set(tarunSirMeetingsRaw.map((call: any) => call.id || String(call._id)));
          const amaIds = new Set(amaSessions.map((ama: any) => ama.id));
          const callIds = new Set(adminCalls.map((call: any) => call.id));

          const isCompletedStatusLocal = (status: string | undefined): boolean => {
            const s = (status || '').toLowerCase();
            return ['completed', 'delivered', 'done', 'closed', 'resolved', 'tested', 'used'].includes(s);
          };

          const mappedProducts = productItems
            .filter((item: any) => {
              const itemId = item.id || `prod-db-${item._id}`;
              if (itemId.startsWith('prod-temp-')) return false;

              if (itemId.startsWith('prod-ama-')) {
                if (item.notes && item.notes.includes('AMA Session ID:')) {
                  const match = item.notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    if (!amaIds.has(match[1])) return false;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }

              if (itemId.startsWith('prod-call-')) {
                if (item.notes && item.notes.includes('Admin Call ID:')) {
                  const match = item.notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    if (!callIds.has(match[1])) return false;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }

              if (itemId.startsWith('prod-tarun-')) {
                if (item.notes && item.notes.includes('Tarun Sir Meeting ID:')) {
                  const match = item.notes.match(/Tarun Sir Meeting ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    if (!tarunIds.has(match[1])) return false;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              }

              return true;
            })
            .map((item: any) => {
              const itemId = item.id || `prod-db-${item._id}`;
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                ...item,
                id: itemId,
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                clickupAssignee: hasLink ? (item.clickupAssignee || '') : '',
                clickupSubtasksCount: hasLink ? (item.clickupSubtasksCount || 0) : 0,
                productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatusLocal(item.status),
                uiuxCompleted: item.uiuxCompleted || isCompletedStatusLocal(item.status),
                deadlineCompleted: item.deadlineCompleted || isCompletedStatusLocal(item.status),
                finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatusLocal(item.status),
                sourceLabel: 
                  itemId.startsWith('prod-ama-') || itemId.startsWith('prod-call-') || itemId.startsWith('prod-tarun-')
                    ? 'Feedback' 
                    : itemId.startsWith('prod-breakdown-')
                      ? 'Product Breakdown'
                      : 'Priority Requests',
                sourceId: itemId,
                canDelete: true
              };
            });

          const mappedProjects = studentProjects
            .map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: `breakdown-project-${item.id || item._id}`,
                feature: item.title,
                description: item.description || item.thingsWeBuild || '',
                tarunSirApproval: item.tarunSirApproval || false,
                raisedByTarunSir: item.raisedByTarunSir || false,
                priority: item.priority || '',
                poc: item.poc || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || item.status || '') : '',
                taskLink: item.taskLink || '',
                blocker: item.blocker || '',
                deadline: item.deadline || item.completeInfoDate || '',
                notes: item.thingsWeBuild || '',
                product: item.product || '',
                module: item.module || '',
                type: item.type || 'Student Project',
                uiux: item.uiux || '',
                finalRelease: item.finalRelease || '',
                productDeadline: item.productDeadline || '',
                productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatusLocal(item.status),
                uiuxCompleted: item.uiuxCompleted || isCompletedStatusLocal(item.status),
                deadlineCompleted: item.deadlineCompleted || isCompletedStatusLocal(item.status),
                finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatusLocal(item.status),
                sourceLabel: 'Student Projects',
                sourceId: item.id || item._id,
                canDelete: false
              };
            });

          const mappedContent = contentItems
            .map((item: any) => {
              const hasLink = item.draftLink && item.draftLink.trim() !== '';
              return {
                id: `breakdown-content-${item.id || item._id}`,
                feature: item.module,
                description: `Content topic: ${item.module}. Subject: ${item.subject || ''}. Type: ${item.type || ''}.`,
                tarunSirApproval: false,
                raisedByTarunSir: false,
                priority: item.priority || '',
                poc: item.poc || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || item.status || '') : '',
                taskLink: item.draftLink || '',
                blocker: '',
                deadline: item.deadline || '',
                notes: item.subject || '',
                product: item.product || '',
                module: item.module || '',
                type: item.type || 'Content',
                uiux: item.uiux || '',
                finalRelease: item.finalRelease || item.publishDate || '',
                productDeadline: item.productDeadline || '',
                productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatusLocal(item.status),
                uiuxCompleted: item.uiuxCompleted || isCompletedStatusLocal(item.status),
                deadlineCompleted: item.deadlineCompleted || isCompletedStatusLocal(item.status),
                finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatusLocal(item.status),
                sourceLabel: 'Content Pipeline',
                sourceId: item.id || item._id,
                canDelete: false
              };
            });

          const mappedMeetings = studentMeetings
            .map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: `breakdown-meeting-${item.id || item._id}`,
                feature: item.cohort,
                description: item.summary || '',
                tarunSirApproval: item.tarunSirApproval || false,
                raisedByTarunSir: item.raisedByTarunSir || false,
                priority: item.priority || '',
                poc: item.poc || '',
                status: toProductStatus(item.status),
                clickupStatus: hasLink ? (item.clickupStatus || item.status || '') : '',
                taskLink: item.taskLink || '',
                blocker: item.blocker || '',
                deadline: item.deadline || '',
                notes: item.notes || item.summary || '',
                product: item.product || '',
                module: item.module || '',
                type: item.type || 'Student Meeting',
                uiux: item.uiux || '',
                finalRelease: item.finalRelease || '',
                productDeadline: item.productDeadline || '',
                productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatusLocal(item.status),
                uiuxCompleted: item.uiuxCompleted || isCompletedStatusLocal(item.status),
                deadlineCompleted: item.deadlineCompleted || isCompletedStatusLocal(item.status),
                finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatusLocal(item.status),
                sourceLabel: 'Student Meetings',
                sourceId: item.id || item._id,
                canDelete: false
              };
            });

          const mappedIssues = dailyIssues
            .filter((item: any) => item.type !== 'Feature Gap' && item.type !== 'Enhancement')
            .map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: `breakdown-issue-${item.id || item._id}`,
                feature: item.module || `Issue #${item.id || item._id}`,
                description: item.issues || '',
                tarunSirApproval: item.tarunSirApproval || false,
                raisedByTarunSir: item.raisedByTarunSir || false,
                priority: item.priority || '',
                poc: item.poc || item.contact || '',
                status: item.status || '',
                clickupStatus: hasLink ? (item.clickupStatus || item.type || '') : '',
                taskLink: item.taskLink || '',
                blocker: item.blocker || '',
                deadline: item.deadline || '',
                notes: item.notes || item.issues || '',
                product: item.product || '',
                module: item.module || '',
                type: item.type || 'Daily Issue',
                uiux: item.uiux || '',
                finalRelease: item.finalRelease || '',
                productDeadline: item.productDeadline || '',
                productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatusLocal(item.status),
                uiuxCompleted: item.uiuxCompleted || isCompletedStatusLocal(item.status),
                deadlineCompleted: item.deadlineCompleted || isCompletedStatusLocal(item.status),
                finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatusLocal(item.status),
                sourceLabel: 'Daily Issues',
                sourceId: item.id || item._id,
                canDelete: false
              };
            });

          const mappedRequests = dailyIssues
            .filter((item: any) => item.type === 'Feature Gap' || item.type === 'Enhancement')
            .map((item: any) => {
              const hasLink = item.taskLink && item.taskLink.trim() !== '';
              return {
                id: `breakdown-request-${item.id || item._id}`,
                feature: item.module || `Request #${item.id || item._id}`,
                description: item.issues || '',
                tarunSirApproval: item.tarunSirApproval || false,
                raisedByTarunSir: item.raisedByTarunSir || false,
                priority: item.priority || '',
                poc: item.poc || '',
                status: item.status || '',
                clickupStatus: hasLink ? (item.clickupStatus || '') : '',
                taskLink: item.taskLink || '',
                blocker: item.blocker || '',
                deadline: item.deadline || '',
                notes: item.notes || item.issues || '',
                product: item.product || '',
                module: item.module || '',
                type: item.type || 'Feature Gap',
                uiux: item.uiux || '',
                finalRelease: item.finalRelease || '',
                productDeadline: item.productDeadline || '',
                productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatusLocal(item.status),
                uiuxCompleted: item.uiuxCompleted || isCompletedStatusLocal(item.status),
                deadlineCompleted: item.deadlineCompleted || isCompletedStatusLocal(item.status),
                finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatusLocal(item.status),
                sourceLabel: 'Feature Request',
                sourceId: item.id || item._id,
                canDelete: false
              };
            });

          const allFeatures = [
            ...mappedProducts,
            ...mappedProjects,
            ...mappedContent,
            ...mappedMeetings,
            ...mappedIssues,
            ...mappedRequests
          ];

          const filterStatusesList = statusesParam ? statusesParam.split(',').map((s: string) => s.trim()) : [];
          const filterPocsList = pocsParam ? pocsParam.split(',').map((p: string) => p.trim()) : [];

          const filteredFeatures = allFeatures.filter((item: any) => {
            const matchesSuperPriority = !superPriority || !!item.raisedByTarunSir;
            if (!matchesSuperPriority) return false;

            if (filterStatusesList.length > 0 && !filterStatusesList.includes(item.status)) return false;

            if (filterPocsList.length > 0) {
              const itemPoc = (item.poc || '').trim();
              const hasMatchingPoc = filterPocsList.some((p: string) => {
                if (p === 'No POC') {
                  return !itemPoc;
                }
                return itemPoc.toLowerCase() === p.toLowerCase();
              });
              if (!hasMatchingPoc) return false;
            }

            if (!search) return true;
            return (
              (item.feature || '').toLowerCase().includes(search) ||
              (item.description || '').toLowerCase().includes(search) ||
              (item.poc || '').toLowerCase().includes(search) ||
              (item.sourceLabel || '').toLowerCase().includes(search)
            );
          });

          const sortedFeatures = [...filteredFeatures];
          sortedFeatures.sort((a: any, b: any) => {
            const aComp = !!a.finalReleaseCompleted;
            const bComp = !!b.finalReleaseCompleted;
            if (aComp !== bComp) return aComp ? 1 : -1;
            if (sortField) {
              let valA = a[sortField];
              let valB = b[sortField];
              if (valA === undefined || valA === null) valA = '';
              if (valB === undefined || valB === null) valB = '';
              const strA = String(valA).toLowerCase();
              const strB = String(valB).toLowerCase();
              return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
            }
            return 0;
          });

          const totalItems = sortedFeatures.length;
          const totalPages = Math.ceil(totalItems / limit) || 1;
          const activePage = Math.min(page, totalPages);
          const startIndex = (activePage - 1) * limit;
          const endIndex = Math.min(startIndex + limit, totalItems);
          const paginatedFeatures = sortedFeatures.slice(startIndex, endIndex);

          const getProductBreakdownCounts = async () => {
            const counts: Record<string, { total: number; completed: number }> = {};
            const addToCount = (prod: string | undefined | null, item: any) => {
              const name = (prod || '').trim() || 'No Product Group Assigned';
              if (!counts[name]) {
                counts[name] = { total: 0, completed: 0 };
              }
              counts[name].total += 1;
              const isCompleted = !!item.finalReleaseCompleted || isCompletedStatusLocal(item.status);
              if (isCompleted) {
                counts[name].completed += 1;
              }
            };

            const [productsRaw, projectsRaw, contentRaw, meetingsRaw, issuesRaw] = await Promise.all([
              modelsMap['products'].find({}, 'id product notes status finalReleaseCompleted').lean(),
              modelsMap['projects'].find({}, 'product status finalReleaseCompleted').lean(),
              modelsMap['contentItems'].find({}, 'product status finalReleaseCompleted').lean(),
              modelsMap['studentMeetings'].find({}, 'product status finalReleaseCompleted').lean(),
              modelsMap['dailyIssues'].find({}, 'product status finalReleaseCompleted').lean()
            ]);

            const products = productsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const projects = projectsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const content = contentRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const meetings = meetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            const issues = issuesRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

            for (const item of products) {
              if (item.id.startsWith('prod-temp-')) continue;
              
              if (item.id.startsWith('prod-ama-')) {
                if (item.notes && item.notes.includes('AMA Session ID:')) {
                  const match = item.notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    if (!amaIds.has(match[1])) continue;
                  } else {
                    continue;
                  }
                } else {
                  continue;
                }
              }
              
              if (item.id.startsWith('prod-call-')) {
                if (item.notes && item.notes.includes('Admin Call ID:')) {
                  const match = item.notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    if (!callIds.has(match[1])) continue;
                  } else {
                    continue;
                  }
                } else {
                  continue;
                }
              }

              if (item.id.startsWith('prod-tarun-')) {
                if (item.notes && item.notes.includes('Tarun Sir Meeting ID:')) {
                  const match = item.notes.match(/Tarun Sir Meeting ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) {
                    if (!tarunIds.has(match[1])) continue;
                  } else {
                    continue;
                  }
                } else {
                  continue;
                }
              }

              addToCount(item.product, item);
            }

            for (const p of projects) addToCount(p.product, p);
            for (const c of content) addToCount(c.product, c);
            for (const m of meetings) addToCount(m.product, m);
            for (const i of issues) addToCount(i.product, i);

            return counts;
          };

          const productCounts = await getProductBreakdownCounts();
          const completedItems = sortedFeatures.filter((item: any) => !!item.finalReleaseCompleted).length;

          return res.status(200).json({
            success: true,
            data: paginatedFeatures,
            totalItems,
            totalPages,
            page: activePage,
            limit,
            productCounts,
            completedItems
          });
        }

        if (action === 'team-assignees') {
          const page = parseInt(url.searchParams.get('page') || '1', 10);
          const limit = parseInt(url.searchParams.get('limit') || '20', 10);
          const search = (url.searchParams.get('search') || '').trim().toLowerCase();
          const hideReleased = url.searchParams.get('hideReleased') === 'true';
          const sortField = url.searchParams.get('sortField') || 'activeCount';
          const sortAsc = url.searchParams.get('sortAsc') === 'true';

          // Fetch all assignees from the 5 main collections
          const [products, sprintPlan, projects, contentItems, dailyIssues] = await Promise.all([
            modelsMap['products'].find({}, 'clickupAssignee clickupStatus status finalReleaseCompleted notes id taskLink').lean(),
            modelsMap['plans'].find({}, 'clickupAssignee clickupStatus status link').lean(),
            modelsMap['projects'].find({}, 'clickupAssignee clickupStatus status finalReleaseCompleted taskLink').lean(),
            modelsMap['contentItems'].find({}, 'clickupAssignee clickupStatus status finalReleaseCompleted draftLink').lean(),
            modelsMap['dailyIssues'].find({}, 'clickupAssignee clickupStatus status finalReleaseCompleted taskLink').lean()
          ]);

          const allDocs = [
            ...products.map(d => ({ ...d, type: 'products' })),
            ...sprintPlan.map(d => ({ ...d, type: 'sprintPlan' })),
            ...projects.map(d => ({ ...d, type: 'projects' })),
            ...contentItems.map(d => ({ ...d, type: 'contentItems' })),
            ...dailyIssues.map(d => ({ ...d, type: 'dailyIssues' }))
          ];

          const groups: Record<string, { totalCount: number, activeCount: number, statusCounts: Record<string, number> }> = {};

          const isCompletedStatus = (statusStr: string | undefined): boolean => {
            if (!statusStr) return false;
            const s = statusStr.toLowerCase().trim();
            return ['completed', 'delivered', 'done', 'closed', 'resolved', 'tested', 'released', 'complete'].includes(s);
          };

          const addDocToGroup = (groupName: string, doc: any) => {
            if (!groups[groupName]) {
              groups[groupName] = { totalCount: 0, activeCount: 0, statusCounts: {} };
            }
            
            const isDone = isCompletedStatus(doc.status) ||
                           isCompletedStatus(doc.clickupStatus) ||
                           doc.finalReleaseCompleted === true;

            if (hideReleased && isDone) {
              return;
            }

            groups[groupName].totalCount++;
            if (!isDone) {
              groups[groupName].activeCount++;
            }

            // Only count status breakdown for assignees other than Unassigned
            if (groupName !== 'Unassigned') {
              const s = (doc.clickupStatus || doc.status || 'Open').trim();
              if (s) {
                groups[groupName].statusCounts[s] = (groups[groupName].statusCounts[s] || 0) + 1;
              }
            }
          };

          allDocs.forEach((doc: any) => {
            const id = doc.id || String(doc._id);
            if (id.startsWith('prod-temp-')) return;

            if (id.startsWith('prod-ama-') || id.startsWith('prod-call-') || id.startsWith('prod-tarun-')) {
              const hasParent = doc.notes && (
                doc.notes.includes('AMA Session ID:') || 
                doc.notes.includes('Admin Call ID:') || 
                doc.notes.includes('Tarun Sir Meeting ID:')
              );
              if (!hasParent) return;
            }

            const hasLink = (doc.taskLink || doc.draftLink || doc.link || '').trim() !== '';
            if (!hasLink) return;

            const assigneeStr = doc.clickupAssignee || '';
            if (!assigneeStr.trim()) {
              addDocToGroup('Unassigned', doc);
              return;
            }

            const names = assigneeStr.split(',').map((name: string) => name.trim()).filter(Boolean);
            names.forEach((name: string) => {
              addDocToGroup(name, doc);
            });
          });

          // Convert groups to list and apply filters/sorting/pagination
          let assigneeList = Object.keys(groups).map(name => ({
            name,
            totalCount: groups[name].totalCount,
            activeCount: groups[name].activeCount,
            statusCounts: groups[name].statusCounts
          }));

          // Filter by hideReleased (remove assignees with 0 active tasks, unless name is Unassigned and we want to show it)
          if (hideReleased) {
            assigneeList = assigneeList.filter(g => g.activeCount > 0 || g.name === 'Unassigned');
          }

          // Search filter on name
          if (search) {
            const q = search.toLowerCase();
            assigneeList = assigneeList.filter(g => g.name.toLowerCase().includes(q));
          }

          // Sort assignees
          assigneeList.sort((a, b) => {
            if (sortField === 'name') {
              return sortAsc 
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
            } else {
              // activeCount
              return sortAsc
                ? a.activeCount - b.activeCount
                : b.activeCount - a.activeCount;
            }
          });

          const totalItems = assigneeList.length;
          const totalPages = Math.ceil(totalItems / limit) || 1;
          const activePage = Math.min(page, totalPages);
          const startIndex = totalItems === 0 ? 0 : (activePage - 1) * limit;
          const paginatedAssignees = assigneeList.slice(startIndex, startIndex + limit);

          const matchedAssigneeNames = new Set(assigneeList.map(a => a.name));
          const uniqueActiveTaskIds = new Set<string>();

          allDocs.forEach((doc: any) => {
            const id = doc.id || String(doc._id);
            if (id.startsWith('prod-temp-')) return;

            if (id.startsWith('prod-ama-') || id.startsWith('prod-call-') || id.startsWith('prod-tarun-')) {
              const hasParent = doc.notes && (
                doc.notes.includes('AMA Session ID:') || 
                doc.notes.includes('Admin Call ID:') || 
                doc.notes.includes('Tarun Sir Meeting ID:')
              );
              if (!hasParent) return;
            }

            const hasLink = (doc.taskLink || doc.draftLink || doc.link || '').trim() !== '';
            if (!hasLink) return;

            const isDone = isCompletedStatus(doc.status) ||
                           isCompletedStatus(doc.clickupStatus) ||
                           doc.finalReleaseCompleted === true;

            if (isDone) return;

            const assigneeStr = doc.clickupAssignee || '';
            const names = !assigneeStr.trim()
              ? ['Unassigned']
              : assigneeStr.split(',').map((name: string) => name.trim()).filter(Boolean);

            const hasMatchedAssignee = names.some(name => matchedAssigneeNames.has(name));
            if (hasMatchedAssignee) {
              const uniqueId = `${doc.type}-${doc._id || doc.id}`;
              uniqueActiveTaskIds.add(uniqueId);
            }
          });

          const totalActiveCount = uniqueActiveTaskIds.size;

          const overloadedCount = assigneeList.filter(g => g.activeCount > 10).length;
          const optimalCount = assigneeList.filter(g => g.activeCount > 0 && g.activeCount <= 10).length;
          const availableCount = assigneeList.filter(g => g.activeCount === 0).length;

          return res.status(200).json({
            success: true,
            data: paginatedAssignees,
            totalItems,
            totalPages,
            page: activePage,
            limit,
            totalActiveCount,
            overloadedCount,
            optimalCount,
            availableCount
          });
        }

        if (action === 'team-member-tasks') {
          const name = url.searchParams.get('name') || '';
          const hideReleased = url.searchParams.get('hideReleased') === 'true';
          const search = (url.searchParams.get('search') || '').trim().toLowerCase();

          if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
          }

          const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const isUnassigned = name === 'Unassigned';
          
          const queryFilter = isUnassigned
            ? { $or: [{ clickupAssignee: { $exists: false } }, { clickupAssignee: null }, { clickupAssignee: '' }] }
            : { clickupAssignee: new RegExp(`\\b${escapeRegex(name)}\\b`, 'i') };

          const [products, sprintPlan, projects, contentItems, dailyIssues] = await Promise.all([
            modelsMap['products'].find(queryFilter).lean(),
            modelsMap['plans'].find(queryFilter).lean(),
            modelsMap['projects'].find(queryFilter).lean(),
            modelsMap['contentItems'].find(queryFilter).lean(),
            modelsMap['dailyIssues'].find(queryFilter).lean()
          ]);

          const list: any[] = [];

          const isCompletedStatus = (statusStr: string | undefined): boolean => {
            if (!statusStr) return false;
            const s = statusStr.toLowerCase().trim();
            return ['completed', 'delivered', 'done', 'closed', 'resolved', 'tested', 'released', 'complete'].includes(s);
          };

          // 1. Product Items
          products.forEach((item: any) => {
            const id = item.id || String(item._id);
            if (id.startsWith('prod-temp-')) return;
            
            if (id.startsWith('prod-ama-') || id.startsWith('prod-call-') || id.startsWith('prod-tarun-')) {
              const hasParent = item.notes && (
                item.notes.includes('AMA Session ID:') || 
                item.notes.includes('Admin Call ID:') || 
                item.notes.includes('Tarun Sir Meeting ID:')
              );
              if (!hasParent) return;
            }

            let src = 'Priority Requests';
            if (id.startsWith('prod-ama-') || id.startsWith('prod-call-') || id.startsWith('prod-tarun-')) {
              src = 'Feedback';
            } else if (id.startsWith('prod-breakdown-')) {
              src = 'Product Breakdown';
            }
            list.push({
              id: `product-${id}`,
              sourceId: id,
              feature: item.feature || item.description || 'Unnamed Feature',
              source: src as any,
              product: item.product || 'No Product Assigned',
              module: item.module,
              status: item.status || '',
              clickupStatus: item.clickupStatus || '',
              clickupAssignee: item.clickupAssignee || '',
              clickupSubtasksCount: item.clickupSubtasksCount,
              taskLink: item.taskLink,
              priority: item.priority,
              productDeadline: item.productDeadline,
              uiux: item.uiux,
              deadline: item.deadline,
              finalRelease: item.finalRelease,
              productDeadlineCompleted: item.productDeadlineCompleted,
              uiuxCompleted: item.uiuxCompleted,
              deadlineCompleted: item.deadlineCompleted,
              finalReleaseCompleted: item.finalReleaseCompleted,
              createdAt: item.createdAt,
              rawItem: item
            });
          });

          // 2. Plan Items
          sprintPlan.forEach((item: any) => {
            if (!item.link || item.link.trim() === '') return;
            list.push({
              id: `plan-${item.id}`,
              sourceId: item.id,
              feature: item.task || 'Unnamed Sprint Task',
              source: 'Sprint Planning',
              product: item.category || 'Sprint Task',
              status: item.status || '',
              clickupStatus: item.clickupStatus || '',
              clickupAssignee: item.clickupAssignee || '',
              clickupSubtasksCount: item.clickupSubtasksCount,
              taskLink: item.link,
              createdAt: item.createdAt,
              rawItem: item
            });
          });

          // 3. Student Projects
          projects.forEach((item: any) => {
            if (!item.taskLink || item.taskLink.trim() === '') return;
            list.push({
              id: `project-${item.id}`,
              sourceId: item.id,
              feature: item.title || 'Unnamed Project',
              source: 'Student Projects',
              product: item.product || 'Student Work',
              module: item.module,
              status: item.status || '',
              clickupStatus: item.clickupStatus || '',
              clickupAssignee: item.clickupAssignee || '',
              clickupSubtasksCount: item.clickupSubtasksCount,
              taskLink: item.taskLink,
              priority: item.priority,
              productDeadline: item.productDeadline,
              uiux: item.uiux,
              deadline: item.deadline,
              finalRelease: item.finalRelease,
              productDeadlineCompleted: item.productDeadlineCompleted,
              uiuxCompleted: item.uiuxCompleted,
              deadlineCompleted: item.deadlineCompleted,
              finalReleaseCompleted: item.finalReleaseCompleted,
              createdAt: item.createdAt,
              rawItem: item
            });
          });

          // 4. Content Items
          contentItems.forEach((item: any) => {
            if (!item.draftLink || item.draftLink.trim() === '') return;
            list.push({
              id: `content-${item.id}`,
              sourceId: item.id,
              feature: `${item.subject} (${item.type})`,
              source: 'Content Pipeline',
              product: item.product || 'Content publish',
              status: item.status || '',
              clickupStatus: item.clickupStatus || '',
              clickupAssignee: item.clickupAssignee || '',
              clickupSubtasksCount: item.clickupSubtasksCount,
              taskLink: item.draftLink,
              priority: item.priority,
              productDeadline: item.productDeadline,
              uiux: item.uiux,
              deadline: item.deadline,
              finalRelease: item.finalRelease,
              productDeadlineCompleted: item.productDeadlineCompleted,
              uiuxCompleted: item.uiuxCompleted,
              deadlineCompleted: item.deadlineCompleted,
              finalReleaseCompleted: item.finalReleaseCompleted,
              createdAt: item.createdAt,
              rawItem: item
            });
          });

          // 5. Daily Issues
          dailyIssues.forEach((item: any) => {
            if (!item.taskLink || item.taskLink.trim() === '') return;
            const isRequest = item.type === 'Feature Gap' || item.type === 'Enhancement';
            list.push({
              id: `issue-${item.id}`,
              sourceId: item.id,
              feature: item.module || item.issues || 'Unnamed Daily Issue',
              source: isRequest ? 'Feature Requests' : 'Daily Issues',
              product: item.product || 'Daily Issue Log',
              module: item.module,
              status: item.status || '',
              clickupStatus: item.clickupStatus || '',
              clickupAssignee: item.clickupAssignee || '',
              clickupSubtasksCount: item.clickupSubtasksCount,
              taskLink: item.taskLink,
              priority: item.priority,
              productDeadline: item.productDeadline,
              uiux: item.uiux,
              deadline: item.deadline,
              finalRelease: item.finalRelease,
              productDeadlineCompleted: item.productDeadlineCompleted,
              uiuxCompleted: item.uiuxCompleted,
              deadlineCompleted: item.deadlineCompleted,
              finalReleaseCompleted: item.finalReleaseCompleted,
              createdAt: item.createdAt,
              rawItem: item
            });
          });

          // Apply task-level filters
          let filteredList = list;
          if (hideReleased) {
            filteredList = filteredList.filter(t => {
              const isDone = isCompletedStatus(t.status) ||
                             isCompletedStatus(t.clickupStatus) ||
                             t.finalReleaseCompleted === true;
              return !isDone;
            });
          }

          if (search) {
            filteredList = filteredList.filter(t => 
              (t.feature || '').toLowerCase().includes(search) ||
              (t.product || '').toLowerCase().includes(search) ||
              (t.module || '').toLowerCase().includes(search) ||
              (t.source || '').toLowerCase().includes(search)
            );
          }

          return res.status(200).json({
            success: true,
            data: filteredList
          });
        }

        if (action === 'paginated-meetings-data') {
          const type = url.searchParams.get('type') || ''; // 'amaSessions' | 'adminCalls' | 'tarunSirMeetings' | 'amaFeedback' | 'adminFeedback' | 'tarunFeedback'
          const page = parseInt(url.searchParams.get('page') || '1', 10);
          const limit = parseInt(url.searchParams.get('limit') || '20', 10);
          const search = (url.searchParams.get('search') || '').trim().toLowerCase();
          const superPriority = url.searchParams.get('superPriority') === 'true';
          const statusesParam = url.searchParams.get('statuses') || '';
          const programsParam = url.searchParams.get('programs') || '';
          const pocsParam = url.searchParams.get('pocs') || '';
          const sortField = url.searchParams.get('sortField') || '';
          const sortAsc = url.searchParams.get('sortAsc') !== 'false';

          console.log(`[API LOG] paginated-meetings-data: type=${type}, page=${page}, limit=${limit}, search="${search}", statuses="${statusesParam}", programs="${programsParam}", pocs="${pocsParam}"`);

          if (!type || !['amaSessions', 'adminCalls', 'tarunSirMeetings', 'amaFeedback', 'adminFeedback', 'tarunFeedback', 'dailyIssues', 'featureRequests', 'challenges'].includes(type)) {
            console.log(`[API LOG] Invalid type requested: ${type}`);
            return res.status(400).json({ success: false, error: 'Invalid meeting type' });
          }

          if (type === 'challenges') {
            const rawChallenges = await modelsMap['challenges'].find({}).lean();
            const filterDepartments = url.searchParams.get('departments') ? (url.searchParams.get('departments') || '').split(',') : [];
            const filterStatuses = statusesParam ? statusesParam.split(',') : [];
            const priorityParam = url.searchParams.get('priority') || '';
            const blockersOnly = url.searchParams.get('blockersOnly') === 'true';

            const filtered = rawChallenges.filter((item: any) => {
              if (priorityParam && priorityParam !== 'All') {
                if (item.priority !== priorityParam) return false;
              }

              if (filterStatuses.length > 0 && !filterStatuses.includes(item.status || '')) return false;

              if (filterDepartments.length > 0) {
                const itemDepts = item.departments || [];
                const hasOverlap = filterDepartments.some((d: string) => itemDepts.includes(d));
                if (!hasOverlap) return false;
              }

              if (blockersOnly && !item.isBlocker) return false;

              if (search) {
                const matchesSearch =
                  (item.title || '').toLowerCase().includes(search) ||
                  (item.description || '').toLowerCase().includes(search) ||
                  (item.poc || '').toLowerCase().includes(search);
                if (!matchesSearch) return false;
              }

              return true;
            });

            const sorted = [...filtered];
            sorted.sort((a: any, b: any) => {
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });

            const totalItems = sorted.length;
            const totalPages = Math.ceil(totalItems / limit) || 1;
            const activePage = Math.min(page, totalPages);
            const startIndex = (activePage - 1) * limit;
            const paginatedData = sorted.slice(startIndex, startIndex + limit);

            return res.status(200).json({
              success: true,
              data: paginatedData,
              totalItems,
              totalPages,
              page: activePage
            });
          }

          if (type === 'featureRequests') {
            const rawIssues = await modelsMap['dailyIssues'].find({}).lean();
            const productParam = url.searchParams.get('product') || '';
            const requestTypeParam = url.searchParams.get('requestType') || 'FEATURE';

            const filtered = rawIssues.filter((item: any) => {
              const isBug = item.type === 'BUG';
              const isFeature = ['Feature Gap', 'Enhancement', 'New Feature', 'Data Needed', 'Term Report/ Transcript'].includes(item.type);

              if (!isBug && !isFeature) return false;

              if (requestTypeParam === 'BUG') {
                if (!isBug) return false;
              } else {
                if (!isFeature) return false;
              }

              if (productParam && productParam !== 'All') {
                if (item.product !== productParam) return false;
              }

              if (search) {
                const matchesSearch =
                  (item.module || '').toLowerCase().includes(search) ||
                  (item.issues || item.notes || '').toLowerCase().includes(search) ||
                  (item.product || '').toLowerCase().includes(search) ||
                  (item.poc || item.contact || '').toLowerCase().includes(search);
                if (!matchesSearch) return false;
              }

              return true;
            });

            const sorted = [...filtered];
            sorted.sort((a: any, b: any) => {
              const aComp = !!a.finalReleaseCompleted;
              const bComp = !!b.finalReleaseCompleted;
              if (aComp !== bComp) return aComp ? 1 : -1;

              if (sortField) {
                const valA = String(a[sortField] || '').toLowerCase();
                const valB = String(b[sortField] || '').toLowerCase();
                return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });

            const totalItems = sorted.length;
            const totalPages = Math.ceil(totalItems / limit) || 1;
            const activePage = Math.min(page, totalPages);
            const startIndex = (activePage - 1) * limit;
            const paginatedData = sorted.slice(startIndex, startIndex + limit);
            const completedItems = sorted.filter((item: any) => !!item.finalReleaseCompleted).length;

            return res.status(200).json({
              success: true,
              data: paginatedData,
              totalItems,
              totalPages,
              page: activePage,
              completedItems
            });
          }

          if (type === 'dailyIssues') {
            const rawIssues = await modelsMap['dailyIssues'].find({}).lean();
            const filterStatuses = statusesParam ? statusesParam.split(',') : [];
            const filterPocs = pocsParam ? pocsParam.split(',') : [];
            const priorityParam = url.searchParams.get('priority') || '';

            const filtered = rawIssues.filter((item: any) => {
              if (['Feature Gap', 'Enhancement', 'BUG', 'New Feature', 'Data Needed', 'Term Report/ Transcript'].includes(item.type)) return false;

              if (priorityParam && priorityParam !== 'All') {
                if (item.priority !== priorityParam) return false;
              }

              if (filterStatuses.length > 0 && !filterStatuses.includes(item.status || '')) return false;
              if (filterPocs.length > 0 && !filterPocs.includes(item.poc || '')) return false;
              if (superPriority && !item.raisedByTarunSir) return false;

              if (search) {
                const matchesSearch =
                  (item.module || '').toLowerCase().includes(search) ||
                  (item.poc || item.contact || '').toLowerCase().includes(search) ||
                  (item.notes || item.issues || '').toLowerCase().includes(search) ||
                  (item.product || '').toLowerCase().includes(search);
                if (!matchesSearch) return false;
              }

              return true;
            });

            const sorted = [...filtered];
            sorted.sort((a: any, b: any) => {
              const aComp = !!a.finalReleaseCompleted;
              const bComp = !!b.finalReleaseCompleted;
              if (aComp !== bComp) return aComp ? 1 : -1;

              if (sortField) {
                const valA = String(a[sortField] || '').toLowerCase();
                const valB = String(b[sortField] || '').toLowerCase();
                return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }
              return 0;
            });

            const totalItems = sorted.length;
            const totalPages = Math.ceil(totalItems / limit) || 1;
            const activePage = Math.min(page, totalPages);
            const startIndex = (activePage - 1) * limit;
            const paginatedData = sorted.slice(startIndex, startIndex + limit);
            const completedItems = sorted.filter((item: any) => !!item.finalReleaseCompleted).length;

            return res.status(200).json({
              success: true,
              data: paginatedData,
              totalItems,
              totalPages,
              page: activePage,
              completedItems
            });
          }

          if (['amaFeedback', 'adminFeedback', 'tarunFeedback'].includes(type)) {
            const productsRaw = await modelsMap['products'].find({}).lean();
            const products = productsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
            let parentMeetingsRaw: any[] = [];
            if (type === 'amaFeedback') {
              parentMeetingsRaw = await modelsMap['amaSessions'].find({}).lean();
            } else if (type === 'adminFeedback') {
              parentMeetingsRaw = await modelsMap['adminCalls'].find({}).lean();
            } else if (type === 'tarunFeedback') {
              parentMeetingsRaw = await modelsMap['tarunSirMeetings'].find({}).lean();
            }
            const parentMeetings = parentMeetingsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

            const getParent = (item: any) => {
              const notes = item.notes || '';
              if (type === 'amaFeedback') {
                if (notes.includes('AMA Session ID:')) {
                  const match = notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) return parentMeetings.find((p: any) => p.id === match[1]);
                }
              } else if (type === 'adminFeedback') {
                if (notes.includes('Admin Call ID:')) {
                  const match = notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) return parentMeetings.find((p: any) => p.id === match[1]);
                }
              } else if (type === 'tarunFeedback') {
                if (notes.includes('Tarun Sir Meeting ID:')) {
                  const match = notes.match(/Tarun Sir Meeting ID:\s*([^\s,;\]]+)/);
                  if (match && match[1]) return parentMeetings.find((p: any) => p.id === match[1]);
                }
              }
              return undefined;
            };

            const filterStatuses = statusesParam ? statusesParam.split(',') : [];
            const filterPrograms = programsParam ? programsParam.split(',') : [];
            const filterPocs = pocsParam ? pocsParam.split(',') : [];

            const filtered = products.filter((item: any) => {
              if (item.id.startsWith('prod-temp-')) return false;

              if (type === 'amaFeedback') {
                if (item.id.startsWith('prod-call-') || item.id.startsWith('prod-tarun-')) return false;
                if (item.id.startsWith('prod-ama-')) {
                  const parent = getParent(item);
                  if (!parent) return false;
                }
                const matchesAma = parentMeetings.some((ama: any) => {
                  if (filterPrograms.length > 0 && (!ama.program || !filterPrograms.includes(ama.program))) return false;
                  if (item.id.startsWith('prod-ama-')) return item.notes && item.notes.includes(`AMA Session ID: ${ama.id}`);
                  if (!ama.topic.trim() && !ama.cohort.trim()) return false;
                  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
                  const topicWords = clean(ama.topic).split(/\s+/).filter((w: string) => w.length > 3);
                  const cohortWords = clean(ama.cohort).split(/\s+/).filter((w: string) => w.length > 2);
                  const searchTerms = [...topicWords, ...cohortWords];
                  const productLower = (item.product || '').toLowerCase().trim();
                  const moduleLower = (item.module || '').toLowerCase().trim();
                  const notesLower = (item.notes || '').toLowerCase().trim();
                  const cohortLower = (ama.cohort || '').toLowerCase().trim();
                  const directCohortMatch = cohortLower && (
                    (productLower && (productLower.includes(cohortLower) || cohortLower.includes(productLower))) ||
                    (moduleLower && (moduleLower.includes(cohortLower) || cohortLower.includes(moduleLower))) ||
                    (notesLower && notesLower.includes(cohortLower))
                  );
                  const text = clean((item.feature || '') + ' ' + (item.description || '') + ' ' + (item.notes || '') + ' ' + (item.product || '') + ' ' + (item.module || ''));
                  const matchesKeyword = searchTerms.some((word: string) => text.includes(word));
                  return directCohortMatch || matchesKeyword;
                });
                if (!matchesAma) return false;
              } else if (type === 'adminFeedback') {
                if (item.id.startsWith('prod-ama-') || item.id.startsWith('prod-tarun-')) return false;
                const parent = getParent(item);
                if (item.id.startsWith('prod-call-') && !parent) return false;
                if (filterPrograms.length > 0) {
                  if (!parent || !parent.program) return false;
                  const callPrograms = parent.program.split(',').map((p: string) => p.trim()).filter(Boolean);
                  if (!callPrograms.some((p: string) => filterPrograms.includes(p))) return false;
                }
                if (!item.notes?.includes('Admin Call ID:') && !item.id.startsWith('prod-call-')) return false;
              } else if (type === 'tarunFeedback') {
                if (item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-')) return false;
                const parent = getParent(item);
                if (item.id.startsWith('prod-tarun-') && !parent) return false;
                if (filterPrograms.length > 0) {
                  if (!parent || !parent.program) return false;
                  const meetingPrograms = parent.program.split(',').map((p: string) => p.trim()).filter(Boolean);
                  if (!meetingPrograms.some((p: string) => filterPrograms.includes(p))) return false;
                }
                if (!item.notes?.includes('Tarun Sir Meeting ID:') && !item.id.startsWith('prod-tarun-')) return false;
              }

              if (superPriority && !item.raisedByTarunSir) return false;
              if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;
              if (filterPocs.length > 0 && !filterPocs.includes(item.poc)) return false;

              if (search) {
                const matchesSearch =
                  (item.feature || '').toLowerCase().includes(search) ||
                  (item.poc || '').toLowerCase().includes(search) ||
                  (item.notes || '').toLowerCase().includes(search) ||
                  (item.product || '').toLowerCase().includes(search) ||
                  (item.module || '').toLowerCase().includes(search);
                if (!matchesSearch) return false;
              }

              return true;
            });

            const sorted = [...filtered];
            sorted.sort((a: any, b: any) => {
              const aComp = !!a.finalReleaseCompleted;
              const bComp = !!b.finalReleaseCompleted;
              if (aComp !== bComp) return aComp ? 1 : -1;

              if (sortField) {
                let valA: any = '';
                let valB: any = '';
                const parentA = getParent(a);
                const parentB = getParent(b);

                if (['amaDate', 'callDate', 'meetingDate'].includes(sortField)) {
                  valA = parentA?.date || '';
                  valB = parentB?.date || '';
                } else if (['amaProgram', 'program'].includes(sortField)) {
                  valA = parentA?.program || '';
                  valB = parentB?.program || '';
                } else if (['amaCohort'].includes(sortField)) {
                  valA = parentA?.cohort || '';
                  valB = parentB?.cohort || '';
                } else if (['amaSpeaker'].includes(sortField)) {
                  valA = parentA?.speaker || '';
                  valB = parentB?.speaker || '';
                } else if (['callPoc', 'meetingPoc'].includes(sortField)) {
                  valA = parentA?.adminPoc || '';
                  valB = parentB?.adminPoc || '';
                } else if (['callTopic', 'meetingTopic'].includes(sortField)) {
                  valA = parentA?.cohortTopic || '';
                  valB = parentB?.cohortTopic || '';
                } else {
                  valA = a[sortField] || '';
                  valB = b[sortField] || '';
                }

                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
              }
              return 0;
            });

            const totalItems = sorted.length;
            const totalPages = Math.ceil(totalItems / limit) || 1;
            const activePage = Math.min(page, totalPages);
            const startIndex = (activePage - 1) * limit;
            const paginatedData = sorted.slice(startIndex, startIndex + limit);
            const completedItems = sorted.filter((item: any) => !!item.finalReleaseCompleted).length;

            console.log(`[API LOG] feedback: type=${type}, matched=${totalItems}, returned=${paginatedData.length}, activePage=${activePage}`);

            return res.status(200).json({
              success: true,
              data: paginatedData,
              totalItems,
              totalPages,
              page: activePage,
              completedItems
            });
          }

          // 1. Fetch the raw items for this model
          let itemsRaw: any[] = [];
          if (type === 'amaSessions') {
            itemsRaw = await modelsMap['amaSessions'].find({}).lean();
          } else if (type === 'adminCalls') {
            itemsRaw = await modelsMap['adminCalls'].find({}).lean();
          } else if (type === 'tarunSirMeetings') {
            itemsRaw = await modelsMap['tarunSirMeetings'].find({}).lean();
          }
          const items = itemsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

          // 2. Fetch all products (to check related items for POC / Super Priority filters)
          const productsRaw = await modelsMap['products'].find({}, 'id notes poc raisedByTarunSir').lean();
          const products = productsRaw.map((item: any) => ({ ...item, id: item.id || String(item._id) }));

          // Helper to get related features
          const getRelatedFeatures = (meetingId: string) => {
            const notesSubstring = type === 'amaSessions'
              ? `AMA Session ID: ${meetingId}`
              : type === 'adminCalls'
              ? `Admin Call ID: ${meetingId}`
              : `Tarun Sir Meeting ID: ${meetingId}`;

            const matchesId = products.filter((item: any) =>
              !item.id.startsWith('prod-temp-') &&
              item.notes &&
              item.notes.includes(notesSubstring)
            );

            if (superPriority) {
              return matchesId.filter((feat: any) => feat.raisedByTarunSir);
            }
            return matchesId;
          };

          // 3. Filter items
          const filterStatuses = statusesParam ? statusesParam.split(',') : [];
          const filterPrograms = programsParam ? programsParam.split(',') : [];
          const filterPocs = pocsParam ? pocsParam.split(',') : [];

          const filtered = items.filter((item: any) => {
            // Search query
            let matchesSearch = false;
            if (type === 'amaSessions') {
              matchesSearch =
                (item.topic || '').toLowerCase().includes(search) ||
                (item.speaker || '').toLowerCase().includes(search) ||
                (item.cohort || '').toLowerCase().includes(search);
            } else {
              matchesSearch =
                (item.cohortTopic || '').toLowerCase().includes(search) ||
                (item.adminPoc || '').toLowerCase().includes(search) ||
                (item.discussion || '').toLowerCase().includes(search);
            }

            if (!matchesSearch) return false;

            // Status filter
            if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;

            // Program filter
            if (filterPrograms.length > 0) {
              if (!item.program || !filterPrograms.includes(item.program)) return false;
            }

            // POC filter
            const related = getRelatedFeatures(item.id);
            if (filterPocs.length > 0) {
              const hasMatchingPoc = related.some((feat: any) => filterPocs.includes(feat.poc));
              if (!hasMatchingPoc) return false;
            }

            // Super Priority filter
            if (superPriority) {
              if (related.length === 0) return false;
            }

            return true;
          });

          // 4. Sort items
          const sorted = [...filtered];
           sorted.sort((a, b) => {
             // 1. Pinned status takes absolute priority
             const aPinned = !!a.pinned;
             const bPinned = !!b.pinned;
             if (aPinned !== bPinned) return aPinned ? -1 : 1;

             // 2. Completed status
             const aComp = a.status === 'Completed';
             const bComp = b.status === 'Completed';
             if (aComp !== bComp) return aComp ? 1 : -1;

             if (sortField) {
               const valA = a[sortField] || '';
               const valB = b[sortField] || '';
               const strA = String(valA).toLowerCase();
               const strB = String(valB).toLowerCase();
               return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
             }

             const dateA = a.date || '';
             const dateB = b.date || '';
             return dateB.localeCompare(dateA);
           });

          // 5. Slice / Paginate
          const totalItems = sorted.length;
          const totalPages = Math.ceil(totalItems / limit) || 1;
          const activePage = Math.min(page, totalPages);
          const startIndex = totalItems === 0 ? 0 : (activePage - 1) * limit;
          const paginated = sorted.slice(startIndex, startIndex + limit);

          console.log(`[API LOG] meetings/calls: type=${type}, matched=${totalItems}, returned=${paginated.length}, activePage=${activePage}`);

          return res.status(200).json({
            success: true,
            data: paginated,
            totalItems,
            totalPages
          });
        }

        if (action === 'single-task') {
          const id = url.searchParams.get('id');
          if (!id) {
            return res.status(400).json({ success: false, error: 'id parameter is required' });
          }
          let query: any = { id };
          if (id.startsWith('prod-db-')) {
            query = { _id: id.replace('prod-db-', '') };
          }
          const item: any = await modelsMap['products'].findOne(query).lean();
          if (item) {
            const hasLink = item.taskLink && item.taskLink.trim() !== '';
            const mappedItem = {
              ...item,
              id: item.id || `prod-db-${item._id}`,
              clickupStatus: hasLink ? (item.clickupStatus || '') : '',
              clickupAssignee: hasLink ? (item.clickupAssignee || '') : '',
              clickupSubtasksCount: hasLink ? (item.clickupSubtasksCount || 0) : 0
            };
            return res.status(200).json({ success: true, data: mappedItem });
          }
          return res.status(404).json({ success: false, error: 'Task not found' });
        }

        if (action === 'get-public-doc') {
          const id = url.searchParams.get('id');
          if (!id) {
            return res.status(400).json({ success: false, error: 'id parameter is required' });
          }
          let query: any = { id };
          if (id.startsWith('prod-db-')) {
            query = { _id: id.replace('prod-db-', '') };
          }
          const item: any = await modelsMap['products'].findOne(query).lean();
          if (item) {
            return res.status(200).json({
              success: true,
              data: {
                id: item.id || `prod-db-${item._id}`,
                feature: item.feature,
                description: item.description || '',
                poc: item.poc || ''
              }
            });
          }
          return res.status(404).json({ success: false, error: 'Document not found' });
        }

        if (action === 'get-change-history') {
          const itemId = url.searchParams.get('itemId');
          if (!itemId) {
            return res.status(400).json({ success: false, error: 'itemId parameter is required' });
          }
          const ChangeHistory = modelsMap['changeHistories'];
          if (!ChangeHistory) {
            return res.status(500).json({ success: false, error: 'Change history model not registered' });
          }
          const logs = await ChangeHistory.find({ itemId }).sort({ createdAt: -1 }).lean();
          return res.status(200).json({ success: true, data: logs });
        }

        if (action === 'global-search') {
          const queryStr = (url.searchParams.get('q') || '').trim();
          if (!queryStr || queryStr.length < 2) {
            return res.status(200).json({ success: true, data: [] });
          }

          const regex = new RegExp(queryStr, 'i');

          const [
            products,
            plans,
            projects,
            amaSessions,
            studentMeetings,
            adminCalls,
            tarunSirMeetings,
            contentItems,
            dailyIssues
          ] = await Promise.all([
            modelsMap['products'].find({
              $or: [
                { feature: regex },
                { description: regex },
                { poc: regex },
                { product: regex },
                { notes: regex },
                { taskLink: regex }
              ]
            }).limit(10).lean(),

            modelsMap['plans'].find({
              $or: [
                { task: regex },
                { month: regex },
                { category: regex },
                { link: regex }
              ]
            }).limit(10).lean(),

            modelsMap['projects'].find({
              $or: [
                { title: regex },
                { poc: regex },
                { product: regex },
                { description: regex },
                { thingsWeBuild: regex },
                { taskLink: regex }
              ]
            }).limit(10).lean(),

            modelsMap['amaSessions'].find({
              $or: [
                { topic: regex },
                { speaker: regex },
                { cohort: regex },
                { link: regex }
              ]
            }).limit(10).lean(),

            modelsMap['studentMeetings'].find({
              $or: [
                { cohort: regex },
                { summary: regex },
                { notes: regex },
                { taskLink: regex }
              ]
            }).limit(10).lean(),

            modelsMap['adminCalls'].find({
              $or: [
                { cohortTopic: regex },
                { adminPoc: regex },
                { discussion: regex },
                { taskLink: regex }
              ]
            }).limit(10).lean(),

            modelsMap['tarunSirMeetings'].find({
              $or: [
                { cohortTopic: regex },
                { adminPoc: regex },
                { discussion: regex },
                { taskLink: regex }
              ]
            }).limit(10).lean(),

            modelsMap['contentItems'].find({
              $or: [
                { module: regex },
                { subject: regex },
                { type: regex },
                { poc: regex },
                { draftLink: regex }
              ]
            }).limit(10).lean(),

            modelsMap['dailyIssues'].find({
              $or: [
                { module: regex },
                { issues: regex },
                { contact: regex },
                { poc: regex },
                { taskLink: regex }
              ]
            }).limit(10).lean()
          ]);

          const resultsList: any[] = [];

          // 1. Priority Requests
          products.forEach((item: any) => {
            const itemId = item.id || `prod-db-${item._id}`;
            if (itemId.startsWith('prod-temp-')) return;
            resultsList.push({
              id: `product-${itemId}`,
              title: item.feature,
              subtitle: `${item.product || 'No Product'} • POC: ${item.poc || 'Unassigned'} • Status: ${item.status || 'Draft'}`,
              category: 'Priority Requests',
              tab: 'product',
              rawItem: { ...item, id: itemId }
            });
          });

          // 2. Sprint Planning
          plans.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `plan-${itemId}`,
              title: item.task,
              subtitle: `Month: ${item.month} • Category: ${item.category} • Status: ${item.status || 'Open'}`,
              category: 'Sprint Planning',
              tab: 'plan',
              rawItem: { ...item, id: itemId }
            });
          });

          // 3. Student Projects
          projects.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `project-${itemId}`,
              title: item.title,
              subtitle: `${item.product || 'No Product'} • POC: ${item.poc || 'Unassigned'} • Status: ${item.status || 'Active'}`,
              category: 'Student Projects',
              tab: 'projects',
              rawItem: { ...item, id: itemId }
            });
          });

          // 5. AMA Sessions
          amaSessions.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `ama-${itemId}`,
              title: item.topic,
              subtitle: `Date: ${item.date} • Speaker: ${item.speaker} • Cohort: ${item.cohort}`,
              category: 'AMA Sessions',
              tab: 'meetings',
              rawItem: { ...item, id: itemId }
            });
          });

          // 5b. Student Meetings
          studentMeetings.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `meeting-${itemId}`,
              title: `Meeting: ${item.cohort}`,
              subtitle: `Date: ${item.date} • Summary: ${item.summary ? item.summary.substring(0, 60) : ''}`,
              category: 'Student Meetings',
              tab: 'meetings',
              rawItem: { ...item, id: itemId }
            });
          });

          // 6. Admin Calls
          adminCalls.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `admin-${itemId}`,
              title: item.cohortTopic,
              subtitle: `Date: ${item.date} • POC: ${item.adminPoc} • Actions: ${item.actions ? item.actions.substring(0, 60) : ''}`,
              category: 'Admin Calls',
              tab: 'admin',
              rawItem: { ...item, id: itemId }
            });
          });

          // 7. Tarun Sir Meetings
          tarunSirMeetings.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `tarun-${itemId}`,
              title: `Tarun Sir Meeting: ${item.cohortTopic}`,
              subtitle: `Date: ${item.date} • POC: ${item.adminPoc} • Actions: ${item.actions ? item.actions.substring(0, 60) : ''}`,
              category: 'Tarun Sir Meetings',
              tab: 'tarun-meetings',
              rawItem: { ...item, id: itemId }
            });
          });

          // 8. Content Pipeline
          contentItems.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `content-${itemId}`,
              title: item.module,
              subtitle: `Subject: ${item.subject} • Type: ${item.type} • POC: ${item.poc || 'Unassigned'}`,
              category: 'Content Pipeline',
              tab: 'content',
              rawItem: { ...item, id: itemId }
            });
          });

          // 9. Daily Issues Log
          dailyIssues.forEach((item: any) => {
            const itemId = item.id || String(item._id);
            resultsList.push({
              id: `issue-${itemId}`,
              title: item.module || `Issue #${itemId}`,
              subtitle: `Product: ${item.product || 'No Product'} • Issue: ${item.issues ? item.issues.substring(0, 60) : ''}`,
              category: 'Daily Issues Log',
              tab: 'issues',
              rawItem: { ...item, id: itemId }
            });
          });

          return res.status(200).json({ success: true, data: resultsList });
        }

        if (action === 'tab-data') {
          const type = url.searchParams.get('type');
          if (!type || !modelsMap[type]) {
            return res.status(400).json({ success: false, error: `Invalid entity type: ${type}` });
          }
          const rawItems = await modelsMap[type].find({}).lean();
          const items = rawItems.map((item: any) => {
            const hasLink = type === 'plans' 
              ? (item.link && item.link.trim() !== '') 
              : type === 'contentItems' 
                ? (item.draftLink && item.draftLink.trim() !== '') 
                : (item.taskLink && item.taskLink.trim() !== '');
            if (!hasLink) {
              return {
                ...item,
                clickupStatus: '',
                clickupAssignee: '',
                clickupSubtasksCount: 0
              };
            }
            return item;
          });
          return res.status(200).json({ success: true, data: items });
        }

        if (action === 'comments') {
          const itemId = url.searchParams.get('itemId');
          if (!itemId) {
            return res.status(400).json({ success: false, error: 'itemId parameter is required' });
          }
          const commentsList = await CommentModel.find({ itemId }).lean();
          return res.status(200).json({ success: true, data: commentsList });
        }

        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }

      const keys = Object.keys(modelsMap);

      if (isPublicCalendar) {
        // Return only the configured calendar sources
        const rawSettings = await modelsMap['settings'].find({}).lean();
        const calSourcesSetting = rawSettings.find((s: any) => s.key === 'sharableCalendarSources');
        const allowedSources = calSourcesSetting ? calSourcesSetting.value.split(',') : [];

        for (const key of keys) {
          if (key === 'settings') {
            results[key] = rawSettings.map((s: any) => {
              if (s.key === 'clickupApiKey') {
                return { ...s, value: '' }; // Redact ClickUp API key
              }
              return s;
            });
          } else if (key === 'statuses' || key === 'productGroups' || key === 'programs' || key === 'cohorts' || key === 'comments') {
            results[key] = await modelsMap[key].find({}).lean();
          } else if (key === 'speakers') {
            // Return speakers (without passwords) so the frontend can restore guest sessions on refresh
            const rawSpeakers = await modelsMap[key].find({}).lean();
            results[key] = rawSpeakers.map((s: any) => {
              const copy = { ...s };
              delete copy.password;
              return copy;
            });
          } else {
            // Map models to sources
            if (key === 'products') {
              const queryParts = [];
              if (allowedSources.includes('product')) {
                results[key] = await modelsMap[key].find({}).lean();
              } else {
                if (allowedSources.includes('meetings')) {
                  queryParts.push({ notes: { $regex: 'AMA Session ID:', $options: 'i' } });
                }
                if (allowedSources.includes('admin')) {
                  queryParts.push({ notes: { $regex: 'Admin Call ID:', $options: 'i' } });
                }
                if (allowedSources.includes('tarun-meetings')) {
                  queryParts.push({ notes: { $regex: 'Tarun Sir Meeting ID:', $options: 'i' } });
                }

                if (queryParts.length > 0) {
                  results[key] = await modelsMap[key].find({ $or: queryParts }).lean();
                } else {
                  results[key] = [];
                }
              }
            } else {
              let isAllowed = false;
              if (key === 'projects' && allowedSources.includes('projects')) isAllowed = true;
              if (key === 'amaSessions' && allowedSources.includes('meetings')) isAllowed = true;
              if (key === 'studentMeetings' && allowedSources.includes('meetings')) isAllowed = true;
              if (key === 'adminCalls' && allowedSources.includes('admin')) isAllowed = true;
              if (key === 'tarunSirMeetings' && allowedSources.includes('tarun-meetings')) isAllowed = true;
              if (key === 'contentItems' && allowedSources.includes('content')) isAllowed = true;
              if (key === 'dailyIssues' && allowedSources.includes('issues')) isAllowed = true;

              if (isAllowed) {
                results[key] = await modelsMap[key].find({}).lean();
              } else {
                results[key] = [];
              }
            }
          }
        }
      } else if (isAuthenticated) {
        // Return everything for authenticated users, but strip passwords and mask ClickUp keys
        for (const key of keys) {
          if (key === 'speakers') {
            const rawSpeakers = await modelsMap[key].find({}).lean();
            results[key] = rawSpeakers.map((s: any) => {
              const copy = { ...s };
              delete copy.password;
              return copy;
            });
          } else if (key === 'settings') {
            const rawSettings = await modelsMap[key].find({}).lean();
            results[key] = rawSettings.map((s: any) => {
              if (s.key === 'clickupApiKey') {
                return { ...s, value: s.value ? '••••••••' : '' }; // Mask ClickUp API key
              }
              return s;
            });
          } else {
            results[key] = await modelsMap[key].find({}).lean();
          }
        }
      } else if (isFeedback) {
        // Return only what is needed for public feedback form
        for (const key of keys) {
          if (key === 'formConfigs' || key === 'feedbackSubmissions') {
            results[key] = await modelsMap[key].find({}).lean();
          } else if (key === 'settings') {
            const rawSettings = await modelsMap[key].find({}).lean();
            results[key] = rawSettings.map((s: any) => {
              if (s.key === 'clickupApiKey') {
                return { ...s, value: '' }; // Redact ClickUp API key
              }
              return s;
            });
          } else if (feedbackId && ['adminCalls', 'studentMeetings', 'amaSessions', 'projects'].includes(key)) {
            // Find only the specific item being reviewed
            results[key] = await modelsMap[key].find({ id: feedbackId }).lean();
          } else {
            results[key] = [];
          }
        }
      } else {
        // Unauthenticated login page request: only return settings (redacted)
        for (const key of keys) {
          if (key === 'settings') {
            const rawSettings = await modelsMap[key].find({}).lean();
            results[key] = rawSettings.map((s: any) => {
              if (s.key === 'clickupApiKey') {
                return { ...s, value: '' }; // Redact ClickUp API key
              }
              return s;
            });
          } else {
            results[key] = [];
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (err: any) {
      console.error('GET error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (method === 'POST') {
    const { action: bodyAction, type, id, data } = req.body || {};
    const action = bodyAction || url.searchParams.get('action');

    if (action === 'login') {
      try {
        const { credential } = data || {};
        if (!credential) {
          return res.status(400).json({ success: false, error: 'Credential token is required for authentication.' });
        }

        // Verify token with Google Auth API
        const tokeninfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!tokeninfoResponse.ok) {
          return res.status(401).json({ success: false, error: 'Invalid Google identity token.' });
        }

        const payload = await tokeninfoResponse.json();
        const email = payload.email;

        if (!email) {
          return res.status(400).json({ success: false, error: 'Google account email not found in token payload.' });
        }

        const ConfigSpeaker = modelsMap['speakers'];
        const targetEmail = email.toLowerCase().trim();
        
        // Find speakers
        const speakers = await ConfigSpeaker.find({}).lean();
        const speaker = speakers.find((s: any) => {
          if (!s.email) return false;
          const emails = s.email.split(',').map((e: any) => e.trim().toLowerCase());
          return emails.includes(targetEmail);
        });

        if (!speaker) {
          // Check if this is a valid domain login from the allowed domains settings
          const GlobalSettings = modelsMap['settings'];
          const allowedDomainsSetting = await GlobalSettings.findOne({ key: 'googleAllowedDomains' }).lean() as any;
          const allowedDomains = allowedDomainsSetting?.value
            ? allowedDomainsSetting.value.split(',').map((d: any) => d.trim().toLowerCase()).filter(Boolean)
            : [];
          
          const emailDomain = targetEmail.split('@')[1];
          const isDomainAllowed = allowedDomains.length === 0 || allowedDomains.includes(emailDomain);
          
          if (isDomainAllowed) {
            // Return a virtual guest speaker object
            const guestUser = {
              id: `guest-${targetEmail}`,
              name: payload.name || targetEmail.split('@')[0],
              email: targetEmail,
              role: 'Guest',
              isGuest: true
            };
            return res.status(200).json({
              success: true,
              user: guestUser
            });
          }

          return res.status(401).json({ 
            success: false, 
            error: `Access Denied: Your Google email (${email}) is not authorized.` 
          });
        }

        // Return user without password
        const safeUser = { ...speaker };
        delete safeUser.password;

        return res.status(200).json({
          success: true,
          user: safeUser
        });
      } catch (err: any) {
        console.error('Login action error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'ai-meeting-assist') {
      try {
        // Authenticate
        const userId = req.headers['x-user-id'];
        const host = req.headers.host || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000') || host.includes('5173');
        let isAuthenticated = isLocalhost;
        if (!isAuthenticated && userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) {
            isAuthenticated = true;
          }
        }
        if (!isAuthenticated) {
          return res.status(401).json({ success: false, error: 'Unauthorized AI operation.' });
        }

        const { text, model } = data || {};
        if (!text || !text.trim()) {
          return res.status(400).json({ success: false, error: 'Meeting text/notes are required for AI analysis' });
        }

        // Fetch geminiApiKey from settings in DB
        const GlobalSettings = modelsMap['settings'];
        const geminiSetting = await GlobalSettings.findOne({ key: 'geminiApiKey' }).lean();
        const apiKey = geminiSetting?.value || process.env.GEMINI_API_KEY;

        if (!apiKey || !apiKey.trim()) {
          return res.status(400).json({ success: false, error: 'Gemini API Key is not configured. Please set it in Admin Config.' });
        }

        const prompt = `You are a SaaS Product Manager. Analyze the meeting minutes or notes provided below and generate a JSON response.

GLOBAL WRITING STYLE:
- You MUST write the summary and task descriptions in simple, clear, and easy-to-read English. Avoid advanced vocabulary, complex jargon, or overly complicated sentences. Keep it extremely straightforward and easy to understand for anyone.

INSTRUCTIONS:
1. Synthesize the key points into a clean, professional, bullet-pointed summary (using markdown hyphens).
   - CRITICAL: If the meeting minutes contain any links (such as Google Drive/Docs links, Figma URLs, ClickUp task links, or other reference URLs), you MUST preserve and include them in the summary under the relevant points.
2. Extract specific actionable tasks / feature requests. For each task, generate a clear title (as 'feature') and a detailed description of what to do (as 'description').
   - DESCRIPTION LENGTH: Make each task's 'description' field highly detailed, descriptive, and comprehensive. Provide the full context, the task requirements, and any specific details discussed in the meeting notes. Do not make it small or brief.
   - CRITICAL: If the meeting minutes contain any links (such as Google Drive/Docs links, Figma URLs, ClickUp task links, or other reference URLs) that are relevant to a specific task, you MUST preserve and include those exact links inside the 'description' field for that task (as part of the description text or in markdown link format). Do not omit or discard any links from the source text.

Return a JSON object conforming exactly to this structure:
{
  "summary": "Bulleted summary points of the meeting.",
  "actionItems": [
    {
      "feature": "Feature name / task title",
      "description": "Description of the feature request / task"
    }
  ]
}

Do not include any markdown block markers like \`\`\`json. Output ONLY the raw JSON string.

Meeting text to analyze:
${text}`;

        const selectedModel = model || 'gemini-1.5-flash-latest';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        };

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('Gemini API request failed:', errText);
          return res.status(response.status).json({ success: false, error: `Gemini API Error: ${errText}` });
        }

        const resData = await response.json();
        const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        let parsedResult;
        try {
          parsedResult = JSON.parse(generatedText.trim());
        } catch (parseErr) {
          console.error('Failed to parse Gemini JSON output:', generatedText);
          return res.status(500).json({ success: false, error: 'AI returned invalid JSON format. Please try again.', raw: generatedText });
        }

        return res.status(200).json({ success: true, result: parsedResult });
      } catch (err: any) {
        console.error('AI Meeting Assist error:', err);
        return res.status(500).json({ success: false, error: err.message || 'An error occurred during AI generation' });
      }
    }

    if (action === 'get-feedback-analysis') {
      try {
        await connectToDatabase();
        const itemId = req.query.itemId || req.body?.itemId;
        const category = req.query.category || req.body?.category;

        if (!itemId || !category) {
          return res.status(400).json({ success: false, error: 'itemId and category are required' });
        }

        const FeedbackAnalysis = modelsMap['feedbackAnalyses'];
        const analysis = await FeedbackAnalysis.findOne({ itemId, category }).lean();
        return res.status(200).json({ success: true, analysis });
      } catch (err: any) {
        console.error('Get feedback analysis error:', err);
        return res.status(500).json({ success: false, error: err.message || 'An error occurred fetching feedback analysis' });
      }
    }

    if (action === 'ai-feedback-assist') {
      try {
        await connectToDatabase();
        // Authenticate
        const userId = req.headers['x-user-id'];
        const host = req.headers.host || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000') || host.includes('5173');
        let isAuthenticated = isLocalhost;
        let speakerName = 'Anonymous Admin';
        let speakerId = userId || 'anonymous';

        if (userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) {
            isAuthenticated = true;
            speakerName = speaker.name || speaker.email || 'Anonymous Admin';
            speakerId = speaker.id;
          }
        }
        if (!isAuthenticated) {
          return res.status(401).json({ success: false, error: 'Unauthorized AI operation.' });
        }

        const { itemId, category, fields, submissions, model } = data || {};
        if (!itemId || !category) {
          return res.status(400).json({ success: false, error: 'itemId and category are required' });
        }
        if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
          return res.status(400).json({ success: false, error: 'No submissions found to analyze.' });
        }

        // Fetch geminiApiKey from settings in DB
        const GlobalSettings = modelsMap['settings'];
        const geminiSetting = await GlobalSettings.findOne({ key: 'geminiApiKey' }).lean();
        const apiKey = geminiSetting?.value || process.env.GEMINI_API_KEY;

        if (!apiKey || !apiKey.trim()) {
          return res.status(400).json({ success: false, error: 'Gemini API Key is not configured. Please set it in Admin Config.' });
        }

        // Prepare context for Gemini
        const formattedFields = fields.map((f: any) => `Question ID: ${f.id}, Question Label: "${f.label}", Type: ${f.type}`).join('\n');
        const formattedSubmissions = submissions.map((sub: any, idx: number) => {
          const subAnswers = Object.entries(sub.answers || {}).map(([fieldId, ans]) => {
            const field = fields.find((f: any) => f.id === fieldId);
            const questionLabel = field ? field.label : fieldId;
            return `- ${questionLabel}: ${Array.isArray(ans) ? ans.join(', ') : ans}`;
          }).join('\n');
          return `Submission #${idx + 1} by ${sub.submittedBy || 'Anonymous'}:\n${subAnswers}`;
        }).join('\n\n');

        const prompt = `You are a SaaS Product Analyst and UX Expert. Analyze the following feedback submissions collected for a session or feature and generate a JSON response.

GLOBAL WRITING STYLE:
- You MUST write the summary, positive findings, pain points, and recommendations in simple, clear, and easy-to-read English. Keep it extremely straightforward and easy to understand for anyone.

INSTRUCTIONS:
1. Generate a high-level summary of the overall feedback (as 'summary').
2. Classify the overall sentiment of the submissions. Must be one of 'Positive', 'Mixed', or 'Critical' (as 'sentiment'). Provide a short sentence justifying it (as 'sentimentJustification').
3. Extract key positive highlights (what went well). List up to 4 bullet points (as 'positives').
4. Identify the top pain points, issues, or negative feedback. List up to 4 bullet points (as 'painPoints').
5. Provide a list of actionable recommendations. For each recommendation, generate a clear title (as 'recommendation'), detailed elaboration on how to implement it (as 'details'), and a predicted priority level (one of 'P0', 'P1', 'P2', 'P3', 'P4' depending on urgency) (as 'recommendations').

Return a JSON object conforming exactly to this structure:
{
  "summary": "Overall feedback summary.",
  "sentiment": "Positive",
  "sentimentJustification": "Sentiment explanation.",
  "positives": [
    "Highlight 1",
    "Highlight 2"
  ],
  "painPoints": [
    "Pain point 1",
    "Pain point 2"
  ],
  "recommendations": [
    {
      "recommendation": "Recommendation Title",
      "details": "Details on how to implement this recommendation",
      "priority": "P2"
    }
  ]
}

Do not include any markdown block markers like \`\`\`json. Output ONLY the raw JSON string.

QUESTIONS/FIELDS:
${formattedFields}

FEEDBACK SUBMISSIONS:
${formattedSubmissions}`;

        const selectedModel = model || 'gemini-1.5-flash-latest';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        };

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('Gemini API request failed for feedback assist:', errText);
          return res.status(response.status).json({ success: false, error: `Gemini API Error: ${errText}` });
        }

        const resData = await response.json();
        const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        let parsedResult;
        try {
          parsedResult = JSON.parse(generatedText.trim());
        } catch (parseErr) {
          console.error('Failed to parse Gemini feedback assist JSON output:', generatedText);
          return res.status(500).json({ success: false, error: 'AI returned invalid JSON format. Please try again.', raw: generatedText });
        }

        // Save or update in database
        const FeedbackAnalysis = modelsMap['feedbackAnalyses'];
        let analysisDoc = await FeedbackAnalysis.findOne({ itemId, category });
        if (!analysisDoc) {
          analysisDoc = new FeedbackAnalysis({
            id: `analysis-${Date.now()}`,
            itemId,
            category,
            summary: parsedResult.summary,
            sentiment: parsedResult.sentiment,
            sentimentJustification: parsedResult.sentimentJustification,
            positives: parsedResult.positives,
            painPoints: parsedResult.painPoints,
            recommendations: parsedResult.recommendations,
            generatedBy: speakerName,
            generatedById: speakerId
          });
        } else {
          analysisDoc.summary = parsedResult.summary;
          analysisDoc.sentiment = parsedResult.sentiment;
          analysisDoc.sentimentJustification = parsedResult.sentimentJustification;
          analysisDoc.positives = parsedResult.positives;
          analysisDoc.painPoints = parsedResult.painPoints;
          analysisDoc.recommendations = parsedResult.recommendations;
          analysisDoc.generatedBy = speakerName;
          analysisDoc.generatedById = speakerId;
          // Mark modified since schema type is Mixed
          analysisDoc.markModified('recommendations');
        }
        await analysisDoc.save();

        return res.status(200).json({ success: true, analysis: analysisDoc });
      } catch (err: any) {
        console.error('AI Feedback Assist error:', err);
        return res.status(500).json({ success: false, error: err.message || 'An error occurred during AI feedback generation' });
      }
    }

    if (action === 'clickup-sync') {
      try {
        // Authenticate
        const userId = req.headers['x-user-id'];
        let isAuthenticated = false;
        if (userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) {
            isAuthenticated = true;
          }
        }
        if (!isAuthenticated) {
          return res.status(401).json({ success: false, error: 'Unauthorized ClickUp sync operation.' });
        }

        const { taskId } = data || {};
        if (!taskId) {
          return res.status(400).json({ success: false, error: 'taskId is required' });
        }

        // Fetch clickupApiKey from settings in DB
        const GlobalSettings = modelsMap['settings'];
        const clickupSetting = await GlobalSettings.findOne({ key: 'clickupApiKey' }).lean();
        const apiKey = clickupSetting?.value || '';

        if (!apiKey.trim()) {
          return res.status(400).json({ success: false, error: 'ClickUp API Key is not configured in settings.' });
        }

        const clickupData = await new Promise<any>((resolve, reject) => {
          const url = `https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`;
          const options = {
            headers: {
              'Authorization': apiKey.trim(),
              'Content-Type': 'application/json',
              'Connection': 'close'
            }
          };
          https.get(url, options, (clickupRes) => {
            let dataStr = '';
            clickupRes.on('data', (chunk) => {
              dataStr += chunk;
            });
            clickupRes.on('end', () => {
              try {
                const parsed = JSON.parse(dataStr);
                parsed.statusCode = clickupRes.statusCode;
                resolve(parsed);
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', (err) => {
            reject(err);
          });
        });

        if (clickupData.statusCode >= 200 && clickupData.statusCode < 300) {
          if (clickupData && clickupData.status && clickupData.status.status) {
            const assigneeName = clickupData.assignees && Array.isArray(clickupData.assignees)
              ? clickupData.assignees.map((a: any) => a.username).join(', ')
              : '';
            return res.status(200).json({
              success: true,
              data: {
                status: clickupData.status.status,
                subtasksCount: clickupData.subtasks ? clickupData.subtasks.length : 0,
                assignee: assigneeName,
                subtasks: clickupData.subtasks || [],
                name: clickupData.name
              }
            });
          }
        }

        return res.status(clickupData.statusCode || 500).json({ success: false, error: clickupData.error || `ClickUp API returned error status ${clickupData.statusCode}` });
      } catch (err: any) {
        console.error('ClickUp sync proxy error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'clickup-bulk-sync') {
      try {
        const userId = req.headers['x-user-id'];
        let isAuthenticated = false;
        if (userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) {
            isAuthenticated = true;
          }
        }
        if (!isAuthenticated) {
          return res.status(401).json({ success: false, error: 'Unauthorized.' });
        }

        const GlobalSettings = modelsMap['settings'];
        const clickupSetting = await GlobalSettings.findOne({ key: 'clickupApiKey' }).lean();
        const apiKey = clickupSetting?.value || '';
        if (!apiKey.trim()) {
          return res.status(400).json({ success: false, error: 'ClickUp API Key not configured.' });
        }

        const [products, projects, meetings, issues, plans] = await Promise.all([
          modelsMap['products'].find({ taskLink: { $exists: true, $ne: "" } }).lean(),
          modelsMap['projects'].find({ taskLink: { $exists: true, $ne: "" } }).lean(),
          modelsMap['studentMeetings'].find({ taskLink: { $exists: true, $ne: "" } }).lean(),
          modelsMap['dailyIssues'].find({ taskLink: { $exists: true, $ne: "" } }).lean(),
          modelsMap['plans'].find({ link: { $exists: true, $ne: "" } }).lean()
        ]);

        const taskIds = new Set<string>();
        const extractId = (url: string) => {
          if (!url) return null;
          const trimmed = url.trim();
          const match = trimmed.match(/\/t\/(?:h\/)?(?:[a-zA-Z0-9\-]+\/)?([a-zA-Z0-9\-_]{7,12})/);
          if (match) return match[1];
          const endMatch = trimmed.match(/\/([a-zA-Z0-9\-_]{7,12})(?:\?|$)/);
          if (endMatch) return endMatch[1];
          return null;
        };

        [...products, ...projects, ...meetings, ...issues].forEach((item: any) => {
          const tid = extractId(item.taskLink);
          if (tid) taskIds.add(tid);
        });
        plans.forEach((item: any) => {
          const tid = extractId(item.link);
          if (tid) taskIds.add(tid);
        });

        const uniqueTaskIds = Array.from(taskIds);
        if (uniqueTaskIds.length === 0) {
          return res.status(200).json({ success: true, totalScanned: 0, updatedCount: 0 });
        }

        const fetchTaskDetails = async (taskId: string): Promise<any> => {
          try {
            return await new Promise<any>((resolve) => {
              const url = `https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`;
              const options = {
                headers: {
                  'Authorization': apiKey.trim(),
                  'Content-Type': 'application/json',
                  'Connection': 'close'
                }
              };
              https.get(url, options, (clickupRes) => {
                let dataStr = '';
                clickupRes.on('data', (chunk) => {
                  dataStr += chunk;
                });
                clickupRes.on('end', () => {
                  try {
                    if (clickupRes.statusCode && clickupRes.statusCode >= 200 && clickupRes.statusCode < 300) {
                      const clickupData = JSON.parse(dataStr);
                      if (clickupData && clickupData.status && clickupData.status.status) {
                        const assigneeName = clickupData.assignees && Array.isArray(clickupData.assignees)
                          ? clickupData.assignees.map((a: any) => a.username).join(', ')
                          : '';
                        resolve({
                          taskId,
                          status: clickupData.status.status,
                          subtasksCount: clickupData.subtasks ? clickupData.subtasks.length : 0,
                          assignee: assigneeName
                        });
                        return;
                      }
                    }
                  } catch (e) {}
                  resolve(null);
                });
              }).on('error', () => {
                resolve(null);
              });
            });
          } catch (e) {
            return null;
          }
        };

        const batchSize = 10;
        const results: any[] = [];
        for (let i = 0; i < uniqueTaskIds.length; i += batchSize) {
          const chunk = uniqueTaskIds.slice(i, i + batchSize);
          const chunkResults = await Promise.all(chunk.map(fetchTaskDetails));
          results.push(...chunkResults);
          await new Promise(r => setTimeout(r, 50));
        }

        const validResults = results.filter(Boolean);
        const statusMap = new Map<string, any>();
        for (const r of validResults) {
          statusMap.set(r.taskId, r);
        }

        const prepareBulkOps = (items: any[], isPlan: boolean) => {
          const ops: any[] = [];
          for (const item of items) {
            const tid = extractId(isPlan ? item.link : item.taskLink);
            if (tid && statusMap.has(tid)) {
              const data = statusMap.get(tid);
              if (item.clickupStatus !== data.status || item.clickupSubtasksCount !== data.subtasksCount || item.clickupAssignee !== data.assignee) {
                ops.push({
                  updateOne: {
                    filter: { _id: item._id },
                    update: {
                      $set: {
                        clickupStatus: data.status,
                        clickupSubtasksCount: data.subtasksCount,
                        clickupAssignee: data.assignee
                      }
                    }
                  }
                });
              }
            }
          }
          return ops;
        };

        const [productOps, projectOps, meetingOps, issueOps, planOps] = [
          prepareBulkOps(products, false),
          prepareBulkOps(projects, false),
          prepareBulkOps(meetings, false),
          prepareBulkOps(issues, false),
          prepareBulkOps(plans, true)
        ];

        await Promise.all([
          productOps.length > 0 ? modelsMap['products'].bulkWrite(productOps) : Promise.resolve(),
          projectOps.length > 0 ? modelsMap['projects'].bulkWrite(projectOps) : Promise.resolve(),
          meetingOps.length > 0 ? modelsMap['studentMeetings'].bulkWrite(meetingOps) : Promise.resolve(),
          issueOps.length > 0 ? modelsMap['dailyIssues'].bulkWrite(issueOps) : Promise.resolve(),
          planOps.length > 0 ? modelsMap['plans'].bulkWrite(planOps) : Promise.resolve()
        ]);

        const totalUpdated = productOps.length + projectOps.length + meetingOps.length + issueOps.length + planOps.length;
        return res.status(200).json({ success: true, totalScanned: uniqueTaskIds.length, updatedCount: totalUpdated });
      } catch (err: any) {
        console.error('ClickUp bulk sync error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'clickup-register-webhook') {
      try {
        const userId = req.headers['x-user-id'];
        let isAuthenticated = false;
        if (userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) isAuthenticated = true;
        }
        const host = req.headers.host || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        if (isLocalhost) isAuthenticated = true;

        if (!isAuthenticated) {
          return res.status(401).json({ success: false, error: 'Unauthorized.' });
        }

        const GlobalSettings = modelsMap['settings'];
        const clickupSetting = await GlobalSettings.findOne({ key: 'clickupApiKey' }).lean();
        const apiKey = clickupSetting?.value || '';
        if (!apiKey.trim()) {
          return res.status(200).json({ success: false, error: 'ClickUp API Key not configured. Please save your API key first.' });
        }

        const makeRequest = (url: string, method = 'GET', body?: string): Promise<any> => {
          return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const headers: Record<string, string> = {
              'Authorization': apiKey.trim(),
              'Connection': 'close'
            };
            if (body) {
              headers['Content-Type'] = 'application/json';
              headers['Content-Length'] = String(Buffer.byteLength(body));
            }
            const options = {
              hostname: parsedUrl.hostname,
              path: parsedUrl.pathname + parsedUrl.search,
              method,
              headers
            };
            const clientReq = https.request(options, (serverRes) => {
              let dataStr = '';
              serverRes.on('data', (chunk) => { dataStr += chunk; });
              serverRes.on('end', () => {
                try {
                  const text = dataStr.trim();
                  const parsed = text ? JSON.parse(text) : {};
                  parsed._statusCode = serverRes.statusCode;
                  resolve(parsed);
                } catch (e) {
                  resolve({ _statusCode: serverRes.statusCode, _raw: dataStr.slice(0, 200) });
                }
              });
            });
            clientReq.on('error', reject);
            if (body) clientReq.write(body);
            clientReq.end();
          });
        };

        // Step 1: Get all team IDs
        const teamsData = await makeRequest('https://api.clickup.com/api/v2/team');
        const teams = teamsData?.teams || [];
        if (teams.length === 0) {
          return res.status(200).json({ success: false, error: 'No ClickUp workspace found for this API key. Please verify your key.' });
        }

        const protocol = req.headers['x-forwarded-proto'] || (isLocalhost ? 'http' : 'https');
        const webhookUrl = `${protocol}://${host}/api/webhook`;
        console.log('[Webhook Register] Target URL:', webhookUrl);

        const registeredWebhooks = [];

        // Loop through all teams and register webhooks
        for (const team of teams) {
          const teamId = team.id;
          console.log(`[Webhook Register] Processing team ${team.name} (${teamId})`);

          // List and delete existing webhooks pointing to our endpoint
          const existingWebhooks = await makeRequest(`https://api.clickup.com/api/v2/team/${teamId}/webhook`);
          const allWebhooks: any[] = existingWebhooks?.webhooks || [];
          
          for (const w of allWebhooks) {
            if (w.endpoint && w.endpoint.includes('/api/webhook') && w.endpoint.includes(host.split(':')[0])) {
              const deleteResult = await makeRequest(`https://api.clickup.com/api/v2/webhook/${w.id}`, 'DELETE');
              console.log(`[Webhook Register] Deleted old webhook ${w.id} (${w.endpoint}) on team ${teamId}:`, deleteResult._statusCode);
            }
          }

          // Register a fresh webhook
          const registerBody = JSON.stringify({
            endpoint: webhookUrl,
            events: ['taskStatusUpdated', 'taskAssigneeUpdated', 'taskUpdated']
          });

          const registerResult = await makeRequest(
            `https://api.clickup.com/api/v2/team/${teamId}/webhook`,
            'POST',
            registerBody
          );

          console.log(`[Webhook Register] Registration result for team ${teamId}:`, registerResult._statusCode);

          if (registerResult._statusCode >= 200 && registerResult._statusCode < 300) {
            registeredWebhooks.push({ teamId, webhookId: registerResult.id });
          } else {
            const errMsg = registerResult?.err || registerResult?.error || registerResult?._raw || `ClickUp returned status ${registerResult._statusCode}`;
            return res.status(200).json({ success: false, error: `Registration failed on workspace "${team.name}": ${errMsg}` });
          }
        }

        return res.status(200).json({ success: true, registeredWebhooks, webhookUrl });

      } catch (err: any) {
        console.error('ClickUp webhook registration error:', err.message);
        return res.status(200).json({ success: false, error: err.message });
      }
    }


    if (action === 'clickup-check-webhook') {
      try {
        const userId = req.headers['x-user-id'];
        let isAuthenticated = false;
        if (userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) {
            isAuthenticated = true;
          }
        }
        if (!isAuthenticated) {
          return res.status(401).json({ success: false, error: 'Unauthorized.' });
        }

        const GlobalSettings = modelsMap['settings'];
        const clickupSetting = await GlobalSettings.findOne({ key: 'clickupApiKey' }).lean();
        const apiKey = clickupSetting?.value || '';
        if (!apiKey.trim()) {
          return res.status(200).json({ success: true, registered: false });
        }

        const teamsData = await new Promise<any>((resolve, reject) => {
          const url = 'https://api.clickup.com/api/v2/team';
          const options = {
            headers: {
              'Authorization': apiKey.trim(),
              'Connection': 'close'
            }
          };
          https.get(url, options, (teamRes) => {
            let dataStr = '';
            teamRes.on('data', (chunk) => { dataStr += chunk; });
            teamRes.on('end', () => {
              try {
                resolve(JSON.parse(dataStr));
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', (err) => {
            reject(err);
          });
        });

        const teams = teamsData?.teams || [];
        if (teams.length === 0) {
          return res.status(200).json({ success: true, registered: false });
        }

        const host = req.headers.host || '';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const currentWebhookUrl = `${protocol}://${host}/api/webhook`;

        let allRegistered = true;

        for (const team of teams) {
          const teamId = team.id;
          const webhooksData = await new Promise<any>((resolve, reject) => {
            const url = `https://api.clickup.com/api/v2/team/${teamId}/webhook`;
            const options = {
              headers: {
                'Authorization': apiKey.trim(),
                'Connection': 'close'
              }
            };
            https.get(url, options, (webhookRes) => {
              let dataStr = '';
              webhookRes.on('data', (chunk) => {
                dataStr += chunk;
              });
              webhookRes.on('end', () => {
                try {
                  resolve(JSON.parse(dataStr));
                } catch (e) {
                  reject(e);
                }
              });
            }).on('error', (err) => {
              reject(err);
            });
          });

          const hasWebhook = webhooksData?.webhooks?.some((w: any) => 
            w.endpoint === currentWebhookUrl && w.status === 'active'
          ) || false;

          if (!hasWebhook) {
            allRegistered = false;
            break;
          }
        }

        return res.status(200).json({ success: true, registered: allRegistered });
      } catch (err: any) {
        console.error('ClickUp webhook check error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    if (action === 'send-product-ship-digest') {
      try {
        const userId = req.headers['x-user-id'];
        let isAuthenticated = false;
        if (userId) {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          if (speaker) {
            isAuthenticated = true;
          }
        }
        const host = req.headers.host || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000') || host.includes('5173');
        if (!isAuthenticated && !isLocalhost) {
          return res.status(401).json({ success: false, error: 'Unauthorized.' });
        }

        const { testRecipient } = req.body;

        // 1. Fetch SMTP settings from DB
        const GlobalSettings = modelsMap['settings'];
        const recipientSet = await GlobalSettings.findOne({ key: 'digestRecipient' }).lean();
        const appUrlSet = await GlobalSettings.findOne({ key: 'digestAppUrl' }).lean();
        const smtpHostSet = await GlobalSettings.findOne({ key: 'digestSMTPHost' }).lean();
        const smtpPortSet = await GlobalSettings.findOne({ key: 'digestSMTPPort' }).lean();
        const smtpUserSet = await GlobalSettings.findOne({ key: 'digestSMTPUser' }).lean();
        const smtpPassSet = await GlobalSettings.findOne({ key: 'digestSMTPPass' }).lean();

        const recipient = testRecipient || recipientSet?.value || '';
        const smtpHost = smtpHostSet?.value || '';
        const smtpPort = smtpPortSet?.value || '465';
        const smtpUser = smtpUserSet?.value || '';
        const smtpPass = smtpPassSet?.value || '';

        if (!recipient.trim()) {
          return res.status(400).json({ success: false, error: 'No recipient email specified.' });
        }

        // 2. Fetch Models
        const ProductItemModel = modelsMap['products'];
        const AdminCallModel = modelsMap['adminCalls'];
        const TarunSirMeetingModel = modelsMap['tarunSirMeetings'];
        const AMASessionModel = modelsMap['amaSessions'];
        const DailyIssueModel = modelsMap['dailyIssues'];
        const StudentProjectModel = modelsMap['projects'];
        const ContentItemModel = modelsMap['contentItems'];
        const StudentMeetingModel = modelsMap['studentMeetings'];
        const FeedbackSubmissionModel = modelsMap['feedbackSubmissions'];

        const isCompletedStatusLocal = (status: string | undefined): boolean => {
          const s = (status || '').toLowerCase();
          return ['completed', 'delivered', 'done', 'closed', 'resolved', 'tested', 'used'].includes(s);
        };

        // Fetch parent IDs and sub-collections to align totals with Product Breakdown tabs
        const [
          tarunMeetingsRaw,
          adminCallsRaw,
          amaSessionsRaw,
          allProductFeaturesRaw,
          dailyIssuesRaw,
          projectsRaw,
          contentRaw,
          meetingsRaw
        ] = await Promise.all([
          TarunSirMeetingModel.find({}, 'id').lean(),
          AdminCallModel.find({}, 'id').lean(),
          AMASessionModel.find({}, 'id').lean(),
          ProductItemModel.find({}).lean(),
          DailyIssueModel.find({}).lean(),
          StudentProjectModel.find({}).lean(),
          ContentItemModel.find({}).lean(),
          StudentMeetingModel.find({}).lean()
        ]);

        const tarunIds = new Set(tarunMeetingsRaw.map((item: any) => item.id || String(item._id)));
        const callIds = new Set(adminCallsRaw.map((item: any) => item.id || String(item._id)));
        const amaIds = new Set(amaSessionsRaw.map((item: any) => item.id || String(item._id)));

        const tarunCallsCount = tarunIds.size;
        const weeklyCallsCount = callIds.size;
        const amaCallsCount = amaIds.size;

        const isValidFeature = (item: any): boolean => {
          const itemId = item.id || `prod-db-${item._id}`;
          if (itemId.startsWith('prod-temp-')) return false;
          return true;
        };

        const tarunFeatures = allProductFeaturesRaw.filter((item: any) => {
          if (item.id?.startsWith('prod-ama-') || item.id?.startsWith('prod-call-') || !isValidFeature(item)) return false;
          const notes = item.notes || '';
          if (notes.includes('Tarun Sir Meeting ID:')) {
            const match = notes.match(/Tarun Sir Meeting ID:\s*([^\s,;\]]+)/);
            return !!(match && match[1] && tarunIds.has(match[1]));
          }
          return false;
        });
        const tarunTotal = tarunFeatures.length;
        const tarunPending = tarunFeatures.filter((f: any) => !f.finalReleaseCompleted && !isCompletedStatusLocal(f.status)).length;

        const adminFeatures = allProductFeaturesRaw.filter((item: any) => {
          if (item.id?.startsWith('prod-ama-') || item.id?.startsWith('prod-tarun-') || !isValidFeature(item)) return false;
          const notes = item.notes || '';
          if (notes.includes('Admin Call ID:')) {
            const match = notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
            return !!(match && match[1] && callIds.has(match[1]));
          }
          return false;
        });
        const adminTotal = adminFeatures.length;
        const adminPending = adminFeatures.filter((f: any) => !f.finalReleaseCompleted && !isCompletedStatusLocal(f.status)).length;

        const amaFeatures = allProductFeaturesRaw.filter((item: any) => {
          if (item.id?.startsWith('prod-call-') || item.id?.startsWith('prod-tarun-') || !isValidFeature(item)) return false;
          const notes = item.notes || '';
          if (notes.includes('AMA Session ID:')) {
            const match = notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
            return !!(match && match[1] && amaIds.has(match[1]));
          }
          return false;
        });
        const amaTotal = amaFeatures.length;
        const amaPending = amaFeatures.filter((f: any) => !f.finalReleaseCompleted && !isCompletedStatusLocal(f.status)).length;

        const dailyIssuesFiltered = dailyIssuesRaw.filter((item: any) => item.type !== 'Feature Gap' && item.type !== 'Enhancement');
        const issuesTotal = dailyIssuesFiltered.length;
        const issuesPending = dailyIssuesFiltered.filter((item: any) => !item.finalReleaseCompleted && !isCompletedStatusLocal(item.status)).length;

        const activeProducts = allProductFeaturesRaw.filter((item: any) => isValidFeature(item));
        const activeProjects = projectsRaw.filter((item: any) => !item.id?.startsWith('prod-temp-'));
        const activeContent = contentRaw.filter((item: any) => !item.id?.startsWith('prod-temp-'));
        const activeMeetings = meetingsRaw.filter((item: any) => !item.id?.startsWith('prod-temp-'));
        const activeIssues = dailyIssuesRaw.filter((item: any) => !item.id?.startsWith('prod-temp-'));

        const totalTasksList = [
          ...activeProducts,
          ...activeProjects,
          ...activeContent,
          ...activeMeetings,
          ...activeIssues
        ];

        const releasedTotal = totalTasksList.length;
        const releasedCompleted = totalTasksList.filter((item: any) => item.finalReleaseCompleted || isCompletedStatusLocal(item.status)).length;

        // Released in last 30 days — same logic as dashboard releasedInLast30DaysCount
        const thirtyDaysAgoDigest = new Date();
        thirtyDaysAgoDigest.setDate(thirtyDaysAgoDigest.getDate() - 30);
        thirtyDaysAgoDigest.setHours(0, 0, 0, 0);
        const parseReleaseDateLocal = (dateStr: string | undefined): Date | null => {
          if (!dateStr) return null;
          const cleaned = dateStr.trim();
          let iso = cleaned;
          if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
            const [d, m, y] = cleaned.split('-');
            iso = `${y}-${m}-${d}`;
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
            try { iso = new Date(cleaned).toISOString().slice(0, 10); } catch { return null; }
          }
          const d = new Date(iso);
          return isNaN(d.getTime()) ? null : d;
        };
        const releasedInLast30DaysCount = totalTasksList.filter((item: any) => {
          if (!item.finalRelease || !item.finalReleaseCompleted) return false;
          const releaseDate = parseReleaseDateLocal(item.finalRelease);
          if (!releaseDate) return false;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return releaseDate >= thirtyDaysAgoDigest && releaseDate <= today;
        }).length;

        // Feedback submissions
        const configs = await modelsMap['formConfigs'].find({ enabled: true }).lean();
        const amaConfig = configs.find((c: any) => c.category === 'ama-meetings');
        const adminConfig = configs.find((c: any) => c.category === 'admin-calls');

        const amaRatingFields = amaConfig ? amaConfig.fields.filter((f: any) => f.type === 'rating').map((f: any) => f.id) : [];
        const adminRatingFields = adminConfig ? adminConfig.fields.filter((f: any) => f.type === 'rating').map((f: any) => f.id) : [];

        const [amaSubmissions, adminSubmissions] = await Promise.all([
          FeedbackSubmissionModel.find({ category: 'ama-meetings' }).lean(),
          FeedbackSubmissionModel.find({ category: 'admin-calls' }).lean()
        ]);

        const amaFeedbackCount = amaSubmissions.length;
        const weeklyFeedbackCount = adminSubmissions.length;

        let amaAvgRating: number | null = null;
        if (amaSubmissions.length > 0 && amaRatingFields.length > 0) {
          const scores: number[] = [];
          amaSubmissions.forEach((sub: any) => {
            if (sub.answers) {
              amaRatingFields.forEach((fieldId: string) => {
                const score = Number(sub.answers[fieldId]);
                if (!isNaN(score) && score > 0) {
                  scores.push(score);
                }
              });
            }
          });
          if (scores.length > 0) {
            amaAvgRating = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
          }
        }

        let weeklyAvgRating: number | null = null;
        if (adminSubmissions.length > 0 && adminRatingFields.length > 0) {
          const scores: number[] = [];
          adminSubmissions.forEach((sub: any) => {
            if (sub.answers) {
              adminRatingFields.forEach((fieldId: string) => {
                const score = Number(sub.answers[fieldId]);
                if (!isNaN(score) && score > 0) {
                  scores.push(score);
                }
              });
            }
          });
          if (scores.length > 0) {
            weeklyAvgRating = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
          }
        }

        const getStars = (r: number | null) => {
          if (r === null) return '☆☆☆☆☆';
          const rounded = Math.round(r);
          return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
        };

        const tarunPercent = tarunTotal > 0 ? Math.round(((tarunTotal - tarunPending) / tarunTotal) * 100) : 100;
        const adminPercent = adminTotal > 0 ? Math.round(((adminTotal - adminPending) / adminTotal) * 100) : 100;
        const amaPercent = amaTotal > 0 ? Math.round(((amaTotal - amaPending) / amaTotal) * 100) : 100;
        const issuesPercent = issuesTotal > 0 ? Math.round(((issuesTotal - issuesPending) / issuesTotal) * 100) : 100;
        const releasedPercent = releasedTotal > 0 ? Math.round((releasedCompleted / releasedTotal) * 100) : 100;
        // Resolve application base URL
        let appUrl = appUrlSet?.value || (process as any).env.APP_URL || '';
        
        // Fallback to VERCEL_URL if available
        if (!appUrl && (process as any).env.VERCEL_URL) {
          appUrl = `https://${(process as any).env.VERCEL_URL}`;
        }
        
        // If still not set, default to request headers
        if (!appUrl) {
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const host = req.headers.host || '';
          appUrl = `${protocol}://${host}`;
        } else {
          // Clean up appUrl to ensure it starts with http:// or https://
          if (!/^https?:\/\//i.test(appUrl)) {
            appUrl = `https://${appUrl}`;
          }
        }

        const isMetricsGood = releasedPercent >= 75;

        const emailHtml = `
          <!--[if mso]>
          <noscript>
              <xml>
                  <o:OfficeDocumentSettings>
                      <o:PixelsPerInch>96</o:PixelsPerInch>
                  </o:OfficeDocumentSettings>
              </xml>
          </noscript>
          <![endif]-->
          <div style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap');
              
              body, table, td, th, p, h1, h2, h3, h4, span, a, div {
                font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
              }
            </style>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f6f9fc; padding: 20px 10px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden;">
                    
                    <!-- Header Card Border -->
                    <tr>
                      <td style="background-color: #7c3aed; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>

                    <!-- Header Content -->
                    <tr>
                      <td style="padding: 24px 30px; border-bottom: 1px solid #f1f5f9;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="vertical-align: middle;">
                              <span style="font-size: 24px; vertical-align: middle; margin-right: 8px;">🚢</span>
                              <span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; vertical-align: middle;">Product Ship</span>
                            </td>
                            <td align="right" style="vertical-align: middle;">
                              <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Sync Digest</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Greeting & Intro -->
                    <tr>
                      <td style="padding: 30px 30px 15px 30px;">
                        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #1e293b; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Hello team,</h3>
                        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                          Here is the summary of product shipments and operational metrics. Please review the digest below:
                        </p>
                      </td>
                    </tr>

                    <!-- Analytics Status Banner UIUX (CSS-driven, no external images) -->
                    <tr>
                      <td style="padding: 0 30px 20px 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${isMetricsGood ? '#bbf7d0' : '#fee2e2'}; border-radius: 12px; background: ${isMetricsGood ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)'}; background-color: ${isMetricsGood ? '#f0fdf4' : '#fff5f5'}; padding: 20px; box-sizing: border-box;">
                          <tr>
                            <td align="center">
                              <!-- Badge -->
                              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                                <tr>
                                  <td style="background-color: ${isMetricsGood ? '#16a34a' : '#dc2626'}; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 20px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                    ${isMetricsGood ? '🟢 Excellent Performance' : '⚠️ Attention Required'}
                                  </td>
                                </tr>
                              </table>
                              
                              <!-- Main Metric Percentage -->
                              <div style="font-size: 48px; font-weight: 800; color: #0f172a; line-height: 1; margin: 4px 0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${releasedPercent}%
                              </div>
                              
                              <!-- Label -->
                              <div style="font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                Overall Task Release Rate
                              </div>

                              <!-- Progress Bar Track -->
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${isMetricsGood ? '#dcfce7' : '#fecaca'}; border-radius: 10px; height: 10px; overflow: hidden; margin-bottom: 8px;">
                                <tr>
                                  <!-- Progress Bar Fill -->
                                  <td width="${releasedPercent}%" style="background-color: ${isMetricsGood ? '#16a34a' : '#dc2626'}; border-radius: 10px; height: 10px; font-size: 0; line-height: 0;">&nbsp;</td>
                                  <!-- Empty space -->
                                  <td width="${100 - releasedPercent}%" style="font-size: 0; line-height: 0;">&nbsp;</td>
                                </tr>
                              </table>

                              <!-- Released (Total Tasks) stat -->
                              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 12px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                🚀 Released (Total Tasks): <span style="color: ${isMetricsGood ? '#16a34a' : '#dc2626'};">${releasedCompleted} / ${releasedTotal}</span>
                              </div>

                              <!-- Status Description Message -->
                              <div style="font-size: 13px; line-height: 1.5; color: #334155; max-width: 400px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                ${isMetricsGood 
                                  ? `Great job! The release rate is above target. Excellent pace of shipping new features and updates.` 
                                  : `System status is warm. Release rate is below target. Action needed to resolve blockers and accelerate pending tasks.`
                                }
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Operations & Weekly Status Table -->
                    <tr>
                      <td style="padding: 15px 30px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                          📋 Operations Status Log
                        </h4>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background-color: #fafbfc;">
                          <!-- Headers -->
                          <tr style="background-color: #f1f5f9;">
                            <th align="left" style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Category</th>
                            <th align="right" style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; width: 120px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Unresolved Tasks</th>
                            <th align="right" style="padding: 10px 14px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; width: 100px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Progress</th>
                          </tr>

                          <!-- Tarun Sir Meetings Row -->
                          <tr>
                            <td align="left" style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              👑 Tarun Sir Meetings <span style="font-weight: 400; color: #64748b; font-size: 11px;">(${tarunCallsCount} calls)</span>
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #ea580c; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${tarunPending} / ${tarunTotal} pending
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${tarunPercent}%
                            </td>
                          </tr>

                          <!-- Weekly Calls Row -->
                          <tr>
                            <td align="left" style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              📞 Weekly Calls <span style="font-weight: 400; color: #64748b; font-size: 11px;">(${weeklyCallsCount} calls)</span>
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #ea580c; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${adminPending} / ${adminTotal} pending
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${adminPercent}%
                            </td>
                          </tr>

                          <!-- AMA Sessions Row -->
                          <tr>
                            <td align="left" style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              🎥 AMA Sessions <span style="font-weight: 400; color: #64748b; font-size: 11px;">(${amaCallsCount} sessions)</span>
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #2563eb; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${amaPending} / ${amaTotal} pending
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${amaPercent}%
                            </td>
                          </tr>

                          <!-- Daily Issues Log -->
                          <tr>
                            <td align="left" style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ⚠️ Daily Issues Log
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #dc2626; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${issuesPending} / ${issuesTotal} unresolved
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${issuesPercent}%
                            </td>
                          </tr>

                          <!-- Released (Last 30 Days) Row -->
                          <tr style="background-color: #faf5ff;">
                            <td align="left" style="padding: 12px 14px; font-size: 12px; font-weight: 700; color: #7c3aed; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              🚀 Released (Last 30 Days)
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 13px; font-weight: 800; color: #7c3aed; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              ${releasedInLast30DaysCount} tasks
                            </td>
                            <td align="right" style="padding: 12px 14px; font-size: 11px; font-weight: 600; color: #a78bfa; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                              &nbsp;
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- User & Student Feedback Cards -->
                    <tr>
                      <td style="padding: 15px 30px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                          💬 User & Student Feedback Radar
                        </h4>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <!-- AMA Feedback Card -->
                            <td width="48%" style="vertical-align: top;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background-color: #ffffff;">
                                <tr>
                                  <td style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding-bottom: 4px;">
                                    AMA Sessions Rating
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 6px;">
                                    <span style="font-size: 22px; font-weight: 800; color: #7c3aed; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${amaAvgRating !== null ? amaAvgRating : '—'}</span>
                                    ${amaAvgRating !== null ? `<span style="font-size: 10px; color: #94a3b8; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">/ 5.0</span>` : ''}
                                    <span style="color: ${amaAvgRating !== null ? '#fbbf24' : '#cbd5e1'}; font-size: 12px; margin-left: 6px; letter-spacing: 1px;">${getStars(amaAvgRating)}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-size: 10px; font-weight: 600; color: #475569; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                    ${amaFeedbackCount} feedback submissions
                                  </td>
                                </tr>
                              </table>
                            </td>

                            <!-- Spacer -->
                            <td width="4%">&nbsp;</td>

                            <!-- Weekly Calls Card -->
                            <td width="48%" style="vertical-align: top;">
                              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background-color: #ffffff;">
                                <tr>
                                  <td style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding-bottom: 4px;">
                                    Weekly Calls Rating
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding-bottom: 6px;">
                                    <span style="font-size: 22px; font-weight: 800; color: #7c3aed; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${weeklyAvgRating !== null ? weeklyAvgRating : '—'}</span>
                                    ${weeklyAvgRating !== null ? `<span style="font-size: 10px; color: #94a3b8; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">/ 5.0</span>` : ''}
                                    <span style="color: ${weeklyAvgRating !== null ? '#fbbf24' : '#cbd5e1'}; font-size: 12px; margin-left: 6px; letter-spacing: 1px;">${getStars(weeklyAvgRating)}</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-size: 10px; font-weight: 600; color: #475569; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                                    ${weeklyFeedbackCount} feedback submissions
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Call To Action Button -->
                    <tr>
                      <td style="padding: 24px 30px; text-align: center; border-top: 1px solid #f1f5f9; background-color: #fafbfc;">
                        <a href="${appUrl}" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.2px;">
                          Open Product Ship
                        </a>
                      </td>
                    </tr>

                    <!-- Footer Details -->
                    <tr>
                      <td style="background-color: #f1f5f9; padding: 16px 30px; font-size: 10px; color: #94a3b8; text-align: center; font-family: 'Google Sans', 'Product Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4;">
                        This digest was auto-generated by the internal Product Ship Management Tool.<br>
                        To manage email notifications or view detailed logs, visit the Configuration portal.
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </div>
        `;

        let transporter;
        if (smtpHost && smtpUser && smtpPass) {
          transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });
        } else {
          const testAccount = await nodemailer.createTestAccount();
          transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          });
        }

        const mailOptions = {
          from: smtpUser ? `Product Ship Console <${smtpUser}>` : 'Product Ship Console <digest@productship.com>',
          to: recipient,
          subject: '🚢 Product Ship Digest — Delivery & Status',
          html: emailHtml
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);

        let testLink = '';
        if (!smtpHost) {
          testLink = nodemailer.getTestMessageUrl(info);
        }

        return res.status(200).json({ success: true, message: 'Email digest sent successfully!', testLink });
      } catch (err: any) {
        console.error('Send email digest error:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // 1. Authorization check for write actions
    const isPublicFeedbackSubmit = action === 'create' && type === 'feedbackSubmissions';
    if (!isPublicFeedbackSubmit) {
      const userId = req.headers['x-user-id'];
      console.log(`[AUTH DEBUG] Action: ${action}, Type: ${type}, userId header: ${userId}`);
      let isAuthenticated = false;
      const host = req.headers.host || '';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000');
      
      if (isLocalhost) {
        isAuthenticated = true;
        console.log(`[AUTH DEBUG] Authenticated via localhost bypass.`);
      } else if (userId) {
        if (String(userId).startsWith('guest-')) {
          const targetEmail = String(userId).replace('guest-', '');
          const GlobalSettings = modelsMap['settings'];
          const allowedDomainsSetting = await GlobalSettings.findOne({ key: 'googleAllowedDomains' }).lean() as any;
          const allowedDomains = allowedDomainsSetting?.value
            ? allowedDomainsSetting.value.split(',').map((d: any) => d.trim().toLowerCase()).filter(Boolean)
            : [];
          
          const emailDomain = targetEmail.split('@')[1];
          const isDomainAllowed = allowedDomains.length === 0 || allowedDomains.includes(emailDomain);
          if (isDomainAllowed) {
            isAuthenticated = true;
          }
        } else {
          const ConfigSpeaker = modelsMap['speakers'];
          const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
          console.log(`[AUTH DEBUG] Found speaker for id ${userId}: ${speaker ? JSON.stringify(speaker) : 'null'}`);
          if (speaker) {
            isAuthenticated = true;
          }
        }
      } else {
        console.log(`[AUTH DEBUG] No userId header present in request headers: ${JSON.stringify(req.headers)}`);
      }
      if (!isAuthenticated) {
        return res.status(401).json({ success: false, error: 'Unauthorized write operation.' });
      }

      // Restrict guest users to ONLY raising feature requests (create dailyIssues) or commenting (create comments)
      if (userId && String(userId).startsWith('guest-')) {
        const isGuestAllowed = action === 'create' && (type === 'dailyIssues' || type === 'comments');
        if (!isGuestAllowed) {
          return res.status(401).json({ success: false, error: 'Unauthorized write operation for Guest users.' });
        }
      }
    }

    const Model = modelsMap[type];
    if (!Model) {
      return res.status(400).json({ success: false, error: `Invalid entity type: ${type}` });
    }

    try {
      if (action === 'delete-all-completed-notes') {
        const userId = req.headers['x-user-id'];
        await Model.deleteMany({ userId: userId || '', completed: true });
        return res.status(200).json({ success: true });
      }

      if (action === 'restore-all-completed-notes') {
        const userId = req.headers['x-user-id'];
        await Model.updateMany({ userId: userId || '', completed: true }, { $set: { completed: false } });
        return res.status(200).json({ success: true });
      }

      if (action === 'create') {
        const newItem = new Model(data);
        await newItem.save();
        return res.status(201).json({ success: true, item: newItem });
      }

      if (action === 'update') {
        if (!id) return res.status(400).json({ success: false, error: 'ID is required for update' });
        
        // Use key for settings, and id for all other tables
        const query = type === 'settings' ? { key: id } : { id };

        if (type === 'products') {
          const userId = req.headers['x-user-id'];
          const host = req.headers.host || '';
          const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000') || host.includes('5173');
          
          if (!isLocalhost) {
            if (!userId) {
              return res.status(401).json({ success: false, error: 'Unauthorized: Missing user credentials.' });
            }
            
            const ConfigSpeaker = modelsMap['speakers'];
            const speaker = await ConfigSpeaker.findOne({ id: userId }).lean() as any;
            if (!speaker) {
              return res.status(401).json({ success: false, error: 'Unauthorized: User profile not found.' });
            }
            
            const existingProduct = await Model.findOne(query).lean() as any;
            if (existingProduct) {
              const userName = speaker.name.toLowerCase().trim();
              const docPoc = (existingProduct.poc || '').toLowerCase().trim();
              
              const isTarun = userName.includes('tarun') || speaker.id === 'speaker-1' || speaker.role === 'Admin';
              const nameParts = userName.split(/\s+/);
              const isMatched = nameParts.some((part: string) => part.length > 2 && docPoc.includes(part)) || docPoc.includes(userName);
              
              // Only restrict to POC if they are editing the description document itself
              const isEditingDescription = data && (data.description || '') !== (existingProduct.description || '');
              
              if (isEditingDescription && !isTarun && !isMatched) {
                return res.status(403).json({ success: false, error: 'Access Denied: You are not authorized as a Point of Contact (POC) to edit this document.' });
              }
            }
          }
        }

        // --- CASCADING UPDATES FOR PROGRAM & COHORT RENAMES ---
        if (type === 'programs' || type === 'cohorts') {
          try {
            const existing = await Model.findOne(query).lean() as any;
            if (existing && existing.name && data && data.name && existing.name !== data.name) {
              const oldName = existing.name;
              const newName = data.name;

              if (type === 'programs') {
                await Promise.all([
                  modelsMap['amaSessions'].updateMany({ program: oldName }, { $set: { program: newName } }),
                  modelsMap['adminCalls'].updateMany({ program: oldName }, { $set: { program: newName } }),
                  modelsMap['tarunSirMeetings'].updateMany({ program: oldName }, { $set: { program: newName } }),
                  modelsMap['featureAdoptions'].updateMany({ program: oldName }, { $set: { program: newName } }),
                  modelsMap['studentMeetings'].updateMany({ product: oldName }, { $set: { product: newName } }),
                  modelsMap['dailyIssues'].updateMany({ product: oldName }, { $set: { product: newName } }),
                  modelsMap['products'].updateMany({ product: oldName }, { $set: { product: newName } }),
                  modelsMap['projects'].updateMany({ product: oldName }, { $set: { product: newName } }),
                  modelsMap['contentItems'].updateMany({ product: oldName }, { $set: { product: newName } })
                ]);
                console.log(`Cascaded Program rename from "${oldName}" to "${newName}"`);
              } else if (type === 'cohorts') {
                await Promise.all([
                  modelsMap['amaSessions'].updateMany({ cohort: oldName }, { $set: { cohort: newName } }),
                  modelsMap['adminCalls'].updateMany({ cohortTopic: oldName }, { $set: { cohortTopic: newName } }),
                  modelsMap['tarunSirMeetings'].updateMany({ cohortTopic: oldName }, { $set: { cohortTopic: newName } }),
                  modelsMap['featureAdoptions'].updateMany({ cohort: oldName }, { $set: { cohort: newName } }),
                  modelsMap['studentMeetings'].updateMany({ cohort: oldName }, { $set: { cohort: newName } }),
                  modelsMap['dailyIssues'].updateMany({ cohort: oldName }, { $set: { cohort: newName } })
                ]);
                console.log(`Cascaded Cohort rename from "${oldName}" to "${newName}"`);
              }
            }
          } catch (cascadeErr) {
            console.error('Cascading update failed:', cascadeErr);
          }
        }

        // --- Change Logging System ---
        const loggedTables = ['products', 'projects', 'contentItems', 'studentMeetings', 'dailyIssues'];
        if (loggedTables.includes(type) && data) {
          try {
            const existingItem = await Model.findOne(query).lean() as any;
            if (existingItem) {
              const userId = req.headers['x-user-id'];
              let changerName = 'Unknown User';
              if (userId) {
                const ConfigSpeaker = modelsMap['speakers'];
                if (ConfigSpeaker) {
                  const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
                  if (speaker) {
                    changerName = speaker.name;
                  } else if (String(userId).startsWith('guest-')) {
                    changerName = `Guest (${userId.replace('guest-', '')})`;
                  } else {
                    changerName = String(userId);
                  }
                }
              }
              
              const fieldsToTrack = ['productDeadline', 'uiux', 'deadline', 'finalRelease', 'poc', 'committedDate'];
              const ChangeHistory = modelsMap['changeHistories'];
              if (ChangeHistory) {
                for (const field of fieldsToTrack) {
                  if (data[field] !== undefined) {
                    const oldValue = String(existingItem[field] || '').trim();
                    const newValue = String(data[field] || '').trim();
                    if (oldValue !== newValue) {
                      // Deduplicate logs created within 2 seconds
                      const twoSecondsAgo = new Date(Date.now() - 2000);
                      const duplicateLog = await ChangeHistory.findOne({
                        itemId: id,
                        fieldName: field,
                        oldValue,
                        newValue,
                        createdAt: { $gte: twoSecondsAgo }
                      }).lean();

                      if (!duplicateLog) {
                        const logEntry = new ChangeHistory({
                          id: `change-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          itemId: id,
                          fieldName: field,
                          oldValue,
                          newValue,
                          changedBy: changerName,
                          changedById: String(userId || '')
                        });
                        await logEntry.save();
                      }
                    }
                  }
                }
              }
            }
          } catch (logErr) {
            console.error('Audit change logging error:', logErr);
          }
        }
        // ------------------------------
        
        // If updating clickupApiKey or geminiApiKey, check if it is masked
        if (type === 'settings' && (id === 'clickupApiKey' || id === 'geminiApiKey')) {
          if (data && data.value === '••••••••') {
            // Do not overwrite existing settings value with masked symbols
            const existingSetting = await Model.findOne({ key: id }).lean();
            return res.status(200).json({ success: true, item: existingSetting });
          }
        }

        // Bypassing Mongoose immutable flag for createdAt update
        if (data && data.createdAt) {
          try {
            const existingItem = await Model.findOne(query).lean() as any;
            if (existingItem && existingItem.createdAt) {
              const oldTime = new Date(existingItem.createdAt).getTime();
              const newTime = new Date(data.createdAt).getTime();
              if (oldTime !== newTime) {
                await Model.collection.updateOne(
                  query,
                  { $set: { createdAt: new Date(data.createdAt) } }
                );
              }
            }
          } catch (rawErr) {
            console.error('Failed to update raw createdAt timestamp:', rawErr);
          }
        }

        const updatedItem = await Model.findOneAndUpdate(query, data, { new: true, upsert: true });
        return res.status(200).json({ success: true, item: updatedItem });
      }

      if (action === 'delete') {
        if (!id) return res.status(400).json({ success: false, error: 'ID is required for delete' });
        
        // Use key for settings, and id for all other tables
        const query = type === 'settings' ? { key: id } : { id };
        await Model.findOneAndDelete(query);
        return res.status(200).json({ success: true });
      }

      if (action === 'batch-import') {
        if (!Array.isArray(data)) {
          return res.status(400).json({ success: false, error: 'Batch import data must be an array' });
        }
        // Insert many (skipping duplicates where id matches)
        const operations = data.map((item: any) => ({
          updateOne: {
            filter: { id: item.id },
            update: { $set: item },
            upsert: true
          }
        }));
        await Model.bulkWrite(operations);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
    } catch (err: any) {
      console.error(`POST (${action}) error:`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
}
