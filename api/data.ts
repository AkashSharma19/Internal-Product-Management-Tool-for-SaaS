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
  FeedbackSubmissionModel
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
  feedbackSubmissions: FeedbackSubmissionModel
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
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('3000');
      
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
          } else if (key === 'statuses' || key === 'productGroups') {
            results[key] = await modelsMap[key].find({}).lean();
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
          return res.status(401).json({ 
            success: false, 
            error: `Access Denied: Your Google email (${email}) is not registered in the POC Owners/Speakers configuration.` 
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
                assignee: assigneeName
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
        // Allow localhost for local dev
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
                  const parsed = JSON.parse(dataStr);
                  parsed._statusCode = serverRes.statusCode;
                  resolve(parsed);
                } catch (e) {
                  reject(new Error(`Failed to parse ClickUp response: ${dataStr.slice(0, 200)}`));
                }
              });
            });
            clientReq.on('error', reject);
            if (body) clientReq.write(body);
            clientReq.end();
          });
        };

        // Step 1: Get team ID
        const teamsData = await makeRequest('https://api.clickup.com/api/v2/team');
        const teamId = teamsData?.teams?.[0]?.id;
        if (!teamId) {
          return res.status(200).json({ success: false, error: 'No ClickUp workspace/team found for this API key. Please verify your key is correct.' });
        }

        // Step 2: Build the webhook URL for this deployment
        const protocol = req.headers['x-forwarded-proto'] || (isLocalhost ? 'http' : 'https');
        const webhookUrl = `${protocol}://${host}/api/webhook`;
        console.log('[Webhook Register] Target URL:', webhookUrl);

        // Step 3: Check if webhook already exists for this URL
        const existingWebhooks = await makeRequest(`https://api.clickup.com/api/v2/team/${teamId}/webhook`);
        const alreadyExists = existingWebhooks?.webhooks?.some(
          (w: any) => w.endpoint === webhookUrl && w.status === 'active'
        );

        if (alreadyExists) {
          console.log('[Webhook Register] Webhook already exists for', webhookUrl);
          return res.status(200).json({ success: true, alreadyExisted: true });
        }

        // Step 4: Register the webhook
        const registerBody = JSON.stringify({
          endpoint: webhookUrl,
          events: ['taskStatusUpdated', 'taskAssigneeUpdated', 'taskUpdated']
        });

        const registerResult = await makeRequest(
          `https://api.clickup.com/api/v2/team/${teamId}/webhook`,
          'POST',
          registerBody
        );

        console.log('[Webhook Register] ClickUp response status:', registerResult._statusCode, JSON.stringify(registerResult).slice(0, 300));

        if (registerResult._statusCode >= 200 && registerResult._statusCode < 300) {
          return res.status(200).json({ success: true, webhook: registerResult });
        }

        // Always return 200 from our API with a clear error message
        const errMsg = registerResult?.err || registerResult?.error || `ClickUp returned ${registerResult._statusCode}`;
        return res.status(200).json({ success: false, error: `ClickUp registration failed: ${errMsg}` });

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
            teamRes.on('data', (chunk) => {
              dataStr += chunk;
            });
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

        const teamId = teamsData?.teams?.[0]?.id;
        if (!teamId) {
          return res.status(200).json({ success: true, registered: false });
        }

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

        const host = req.headers.host || '';
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const currentWebhookUrl = `${protocol}://${host}/api/webhook`;

        const hasWebhook = webhooksData?.webhooks?.some((w: any) => 
          w.endpoint === currentWebhookUrl && w.status === 'active'
        ) || false;

        return res.status(200).json({ success: true, registered: hasWebhook });
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
        const ConfigSpeaker = modelsMap['speakers'];
        const speaker = await ConfigSpeaker.findOne({ id: userId }).lean();
        console.log(`[AUTH DEBUG] Found speaker for id ${userId}: ${speaker ? JSON.stringify(speaker) : 'null'}`);
        if (speaker) {
          isAuthenticated = true;
        }
      } else {
        console.log(`[AUTH DEBUG] No userId header present in request headers: ${JSON.stringify(req.headers)}`);
      }
      if (!isAuthenticated) {
        return res.status(401).json({ success: false, error: 'Unauthorized write operation.' });
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
