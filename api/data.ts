import https from 'https';
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
  CommentModel
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
  comments: CommentModel
};

export default async function handler(req: any, res: any) {
  try {
    await connectToDatabase();
  } catch (dbErr) {
    console.error('Database connection error:', dbErr);
    return res.status(500).json({ success: false, error: 'Database connection failed' });
  }

  const { method } = req;

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
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const feedbackId = url.searchParams.get('feedback');
      const isFeedback = url.searchParams.get('public') === 'true' || !!feedbackId;
      const isPublicCalendar = url.searchParams.get('public-calendar') === 'true';
      const action = url.searchParams.get('action');

      if (action) {
        if (!isAuthenticated && action !== 'init' && !(isPublicCalendar && action === 'calendar-events')) {
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
          const allowedKeys = ['settings', 'speakers', 'statuses', 'productGroups', 'programs', 'cohorts', 'formConfigs', 'products'];
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
                if (s.key === 'clickupApiKey') {
                  return { ...s, value: s.value ? '••••••••' : '' };
                }
                return s;
              });
            } else {
              const rawItems = await modelsMap[key].find({}).lean();
              if (key === 'products') {
                results[key] = rawItems.map((item: any) => ({ ...item, id: item.id || String(item._id) }));
              } else {
                results[key] = rawItems;
              }
            }
          }
          return res.status(200).json({ success: true, data: results });
        }

        if (action === 'dashboard-counts') {
          const dateRangeType = url.searchParams.get('dateRangeType') || 'all';
          const customStartDate = url.searchParams.get('startDate') || '';
          const customEndDate = url.searchParams.get('endDate') || '';
          const statusType = url.searchParams.get('statusType') || 'my';

          const [productsRaw, projectsRaw, contentRaw, issuesRaw, meetingsRaw, speakers, productGroups, configStatuses, amaSessionsRaw, adminCallsRaw, tarunSirMeetingsRaw, formConfigs, feedbackSubmissions] = await Promise.all([
            ProductItemModel.find({}, 'id poc product status clickupStatus taskLink deadline productDeadline finalRelease notes').lean(),
            StudentProjectModel.find({}, 'id poc product status clickupStatus taskLink deadline productDeadline completeInfoDate title thingsWeBuild').lean(),
            ContentItemModel.find({}, 'id poc product status clickupStatus draftLink deadline productDeadline publishDate module subject type').lean(),
            DailyIssueModel.find({}, 'id poc contact product status clickupStatus taskLink deadline module issues notes type').lean(),
            StudentMeetingModel.find({}, 'id poc product status clickupStatus taskLink deadline productDeadline date cohort summary notes').lean(),
            ConfigSpeakerModel.find({}, 'name').lean(),
            ConfigProductGroupModel.find({}).lean(),
            ConfigStatusModel.find({}).lean(),
            AMASessionModel.find({}, 'id date cohort topic speaker link status').lean(),
            AdminCallModel.find({}, 'id date cohortTopic adminPoc status discussion actions').lean(),
            TarunSirMeetingModel.find({}, 'id date cohortTopic adminPoc status discussion actions').lean(),
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
              return {
                id: item.id,
                poc: item.poc || '',
                product: item.product || '',
                status: toProductStatus(item.status),
                clickupStatus: item.clickupStatus || '',
                taskLink: item.taskLink || '',
                date: item.deadline || item.productDeadline || '',
                feature: item.feature || '',
                notes: item.notes || '',
                source: itemSource
              };
            });

          const projectTasks = projects.map((item: any) => ({
            id: item.id,
            poc: item.poc || '',
            product: item.product || '',
            status: toProductStatus(item.status),
            clickupStatus: item.clickupStatus || '',
            taskLink: item.taskLink || '',
            date: item.deadline || item.productDeadline || item.completeInfoDate || '',
            feature: item.title || '',
            source: 'Student Projects'
          }));

          const contentTasks = content.map((item: any) => ({
            id: item.id,
            poc: item.poc || '',
            product: item.product || '',
            status: toProductStatus(item.status),
            clickupStatus: item.clickupStatus || '',
            taskLink: item.draftLink || '',
            date: item.deadline || item.productDeadline || item.publishDate || '',
            feature: item.module || '',
            source: 'Content Pipeline'
          }));

          const issueTasks = issues.map((item: any) => ({
            id: item.id,
            poc: item.poc || item.contact || '',
            product: item.product || '',
            status: toProductStatus(item.status),
            clickupStatus: item.clickupStatus || '',
            taskLink: item.taskLink || '',
            date: item.deadline || item.productDeadline || '',
            feature: item.module || `Issue #${item.id}`,
            source: 'Daily Issues Log'
          }));

          const meetingTasks = meetings.map((item: any) => ({
            id: item.id,
            poc: item.poc || '',
            product: item.product || '',
            status: toProductStatus(item.status),
            clickupStatus: item.clickupStatus || '',
            taskLink: item.taskLink || '',
            date: item.deadline || item.productDeadline || item.date || '',
            feature: item.cohort || '',
            notes: item.notes || '',
            source: 'AMA & Meetings'
          }));

          const allUnifiedTasks = [
            ...mainProductTasks,
            ...projectTasks,
            ...contentTasks,
            ...issueTasks,
            ...meetingTasks
          ];

          const { start: filterStart, end: filterEnd } = getFilterDates(dateRangeType, customStartDate, customEndDate);
          const validItems = allUnifiedTasks.filter((item: any) => isWithinDateRange(item.date, filterStart, filterEnd));

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
              const s = status.toLowerCase();
              if (s === 'closed' || s === 'done' || s === 'completed' || s === 'delivered') return '#10b981';
              if (s === 'open' || s === 'todo' || s === 'to do' || s === 'backlog') return '#6b7280';
              if (s === 'in progress' || s === 'active' || s === 'development') return '#3b82f6';
              return '#8b5cf6';
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

            return {
              poc,
              statusCounts,
              noStatus,
              total,
              clickupCount,
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

            const matchedGroup = productGroups.find((g: any) => g.name === prodGroup);
            const color = matchedGroup ? matchedGroup.color : '#6b7280';

            return {
              productGroup: prodGroup,
              color,
              statusCounts,
              noStatus,
              total,
              clickupCount,
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
              callCount: filteredAmaSessions.length,
              rating: getCategoryRating('ama-meetings'),
              ...getMeetingCategoryStats(allAmaFeatures)
            },
            {
              category: 'Admin Meetings',
              formCategory: 'admin-calls',
              featuresCount: allAdminFeatures.length,
              clickupCount: allAdminFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
              callCount: filteredAdminCalls.length,
              rating: getCategoryRating('admin-calls'),
              ...getMeetingCategoryStats(allAdminFeatures)
            },
            {
              category: 'Tarun Sir Meetings',
              formCategory: null,
              featuresCount: allTarunFeatures.length,
              clickupCount: allTarunFeatures.filter(item => item.taskLink && item.taskLink.trim() !== '').length,
              callCount: filteredTarunSirMeetings.length,
              rating: null,
              ...getMeetingCategoryStats(allTarunFeatures)
            }
          ];

          // Overall Totals
          const overallTotal = validItems.length;
          const overallClickup = validItems.filter(item => item.taskLink && item.taskLink.trim() !== '').length;
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
              overallNoStatus
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

          console.log('DASHBOARD-LIST PARAMS:', { source, poc, status, statusType, productGroup, meetingCategory, dateRangeType, customStartDate, customEndDate });

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
              const statusMatch = getStatusFilter(toProductStatus(item.status), item.clickupStatus, item.taskLink);
              
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     statusMatch && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map(item => ({ ...item, source: 'Priority Requests' })));
          }

          if (!source || source === 'Student Projects') {
            const raw = await StudentProjectModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || item.completeInfoDate || '';
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), item.clickupStatus, item.taskLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map(item => ({ ...item, source: 'Student Projects' })));
          }

          if (!source || source === 'Content Pipeline') {
            const raw = await ContentItemModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || item.publishDate || '';
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), item.clickupStatus, item.draftLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map(item => ({ ...item, source: 'Content Pipeline' })));
          }

          if (!source || source === 'Daily Issues Log') {
            const raw = await DailyIssueModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || '';
              return getPocFilter(item.poc || item.contact) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), item.clickupStatus, item.taskLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map(item => ({ ...item, source: 'Daily Issues Log' })));
          }

          if (!source || source === 'AMA & Meetings') {
            const raw = await StudentMeetingModel.find({}).lean();
            const matched = raw.filter((item: any) => {
              const date = item.deadline || item.productDeadline || item.date || '';
              return getPocFilter(item.poc) && 
                     getProductGroupFilter(item.product) && 
                     getStatusFilter(toProductStatus(item.status), item.clickupStatus, item.taskLink) && 
                     isWithinDateRange(date, filterStart, filterEnd);
            });
            items.push(...matched.map(item => ({ ...item, source: 'AMA & Meetings' })));
          }

          return res.status(200).json({ success: true, data: items });
        }

        if (action === 'calendar-events') {
          const year = parseInt(url.searchParams.get('year') || '2026');
          const month = parseInt(url.searchParams.get('month') || '6');

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
          });

          projects.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            addEvent(item.id, 'Student Projects', item.title, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
            addEvent(item.id, 'Student Projects', item.title, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'projects');
          });

          amaSessions.forEach((item: any) => {
            const linked = products.filter(p => 
              !p.id.startsWith('prod-temp-') && 
              p.notes && 
              p.notes.includes(`AMA Session ID: ${item.id}`)
            );
            linked.forEach((task: any) => {
              const isOverallCompleted = isCompletedStatus(task.status);
              addEvent(task.id, 'AMA Sessions', task.feature, 'Final Release', task.finalRelease, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'meetings');
            });
          });

          meetings.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            addEvent(item.id, 'Student Meetings', item.cohort, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
            addEvent(item.id, 'Student Meetings', item.cohort, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'meetings');
          });

          adminCalls.forEach((item: any) => {
            const linked = products.filter(p => 
              !p.id.startsWith('prod-temp-') && 
              p.notes && 
              p.notes.includes(`Admin Call ID: ${item.id}`)
            );
            linked.forEach((task: any) => {
              const isOverallCompleted = isCompletedStatus(task.status);
              addEvent(task.id, 'Admin Calls', task.feature, 'Final Release', task.finalRelease, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'admin');
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
              addEvent(task.id, 'Tarun Sir Meetings', task.feature, 'Final Release', task.finalRelease, !!task.finalReleaseCompleted || isOverallCompleted, task.poc, task.priority, task.taskLink, task, 'tarun-meetings');
            });
          });

          content.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            addEvent(item.id, 'Content Pipeline', item.module, 'Publish Date', item.publishDate, isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
            addEvent(item.id, 'Content Pipeline', item.module, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc, item.priority, item.draftLink, item, 'content');
          });

          issues.forEach((item: any) => {
            const isOverallCompleted = isCompletedStatus(item.status);
            if (item.type === 'Feature Gap' || item.type === 'Enhancement') {
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Specs', item.productDeadline, !!item.productDeadlineCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'UI/UX', item.uiux, !!item.uiuxCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Dev', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
              addEvent(item.id, 'Priority Requests', item.module || `Request #${item.id}`, 'Final Release', item.finalRelease, !!item.finalReleaseCompleted || isOverallCompleted, item.poc || item.contact || '', item.priority, item.taskLink, item, 'feature-requests');
            } else {
              addEvent(item.id, 'Daily Issues Log', item.module || `Issue #${item.id}`, 'Deadline', item.deadline, !!item.deadlineCompleted || isOverallCompleted, item.poc || '', item.priority, item.taskLink, item, 'issues');
            }
          });

          return res.status(200).json({ success: true, data: list });
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
              return {
                ...item,
                id: itemId,
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
            .map((item: any) => ({
              id: `breakdown-project-${item.id || item._id}`,
              feature: item.title,
              description: item.description || item.thingsWeBuild || '',
              tarunSirApproval: item.tarunSirApproval || false,
              raisedByTarunSir: item.raisedByTarunSir || false,
              priority: item.priority || '',
              poc: item.poc || '',
              status: toProductStatus(item.status),
              clickupStatus: item.clickupStatus || item.status || '',
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
            }));

          const mappedContent = contentItems
            .map((item: any) => ({
              id: `breakdown-content-${item.id || item._id}`,
              feature: item.module,
              description: `Content topic: ${item.module}. Subject: ${item.subject || ''}. Type: ${item.type || ''}.`,
              tarunSirApproval: false,
              raisedByTarunSir: false,
              priority: item.priority || '',
              poc: item.poc || '',
              status: toProductStatus(item.status),
              clickupStatus: item.clickupStatus || item.status || '',
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
            }));

          const mappedMeetings = studentMeetings
            .map((item: any) => ({
              id: `breakdown-meeting-${item.id || item._id}`,
              feature: item.cohort,
              description: item.summary || '',
              tarunSirApproval: item.tarunSirApproval || false,
              raisedByTarunSir: item.raisedByTarunSir || false,
              priority: item.priority || '',
              poc: item.poc || '',
              status: toProductStatus(item.status),
              clickupStatus: item.clickupStatus || item.status || '',
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
            }));

          const mappedIssues = dailyIssues
            .filter((item: any) => item.type !== 'Feature Gap' && item.type !== 'Enhancement')
            .map((item: any) => ({
              id: `breakdown-issue-${item.id || item._id}`,
              feature: item.module || `Issue #${item.id || item._id}`,
              description: item.issues || '',
              tarunSirApproval: item.tarunSirApproval || false,
              raisedByTarunSir: item.raisedByTarunSir || false,
              priority: item.priority || '',
              poc: item.poc || item.contact || '',
              status: item.status || '',
              clickupStatus: item.clickupStatus || item.type || '',
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
            }));

          const mappedRequests = dailyIssues
            .filter((item: any) => item.type === 'Feature Gap' || item.type === 'Enhancement')
            .map((item: any) => ({
              id: `breakdown-request-${item.id || item._id}`,
              feature: item.module || `Request #${item.id || item._id}`,
              description: item.issues || '',
              tarunSirApproval: item.tarunSirApproval || false,
              raisedByTarunSir: item.raisedByTarunSir || false,
              priority: item.priority || '',
              poc: item.poc || '',
              status: item.status || '',
              clickupStatus: item.clickupStatus || '',
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
            }));

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
            const counts: Record<string, number> = {};
            const addToCount = (prod: string | undefined | null) => {
              const name = (prod || '').trim() || 'No Product Group Assigned';
              counts[name] = (counts[name] || 0) + 1;
            };

            const [productsRaw, projectsRaw, contentRaw, meetingsRaw, issuesRaw] = await Promise.all([
              modelsMap['products'].find({}, 'id product notes').lean(),
              modelsMap['projects'].find({}, 'product').lean(),
              modelsMap['contentItems'].find({}, 'product').lean(),
              modelsMap['studentMeetings'].find({}, 'product').lean(),
              modelsMap['dailyIssues'].find({}, 'product').lean()
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

              addToCount(item.product);
            }

            for (const p of projects) addToCount(p.product);
            for (const c of content) addToCount(c.product);
            for (const m of meetings) addToCount(m.product);
            for (const i of issues) addToCount(i.product);

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

          if (!type || !['amaSessions', 'adminCalls', 'tarunSirMeetings', 'amaFeedback', 'adminFeedback', 'tarunFeedback', 'dailyIssues', 'featureRequests'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid meeting type' });
          }

          if (type === 'featureRequests') {
            const rawIssues = await modelsMap['dailyIssues'].find({}).lean();
            const productParam = url.searchParams.get('product') || '';

            const filtered = rawIssues.filter((item: any) => {
              if (item.type !== 'Feature Gap' && item.type !== 'Enhancement') return false;

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
              if (item.type === 'Feature Gap' || item.type === 'Enhancement') return false;

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
            const mappedItem = {
              ...item,
              id: item.id || `prod-db-${item._id}`
            };
            return res.status(200).json({ success: true, data: mappedItem });
          }
          return res.status(404).json({ success: false, error: 'Task not found' });
        }

        if (action === 'tab-data') {
          const type = url.searchParams.get('type');
          if (!type || !modelsMap[type]) {
            return res.status(400).json({ success: false, error: `Invalid entity type: ${type}` });
          }
          const items = await modelsMap[type].find({}).lean();
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
    const { action, type, id, data } = req.body;

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
                subtasks: clickupData.subtasks || []
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
      if (action === 'create') {
        const newItem = new Model(data);
        await newItem.save();
        return res.status(201).json({ success: true, item: newItem });
      }

      if (action === 'update') {
        if (!id) return res.status(400).json({ success: false, error: 'ID is required for update' });
        
        // If updating clickupApiKey, check if it is masked
        if (type === 'settings' && id === 'clickupApiKey') {
          if (data && data.value === '••••••••') {
            // Do not overwrite existing ClickUp API Key with masked symbols
            const existingSetting = await Model.findOne({ key: id }).lean();
            return res.status(200).json({ success: true, item: existingSetting });
          }
        }

        // Use key for settings, and id for all other tables
        const query = type === 'settings' ? { key: id } : { id };
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
