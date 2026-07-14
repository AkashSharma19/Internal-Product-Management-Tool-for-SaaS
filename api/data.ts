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

        const clickupResponse = await fetch(`https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=true`, {
          method: 'GET',
          headers: {
            'Authorization': apiKey.trim(),
            'Content-Type': 'application/json'
          }
        });

        if (clickupResponse.ok) {
          const clickupData = await clickupResponse.json();
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

        return res.status(clickupResponse.status).json({ success: false, error: `ClickUp API returned error status ${clickupResponse.status}` });
      } catch (err: any) {
        console.error('ClickUp sync proxy error:', err);
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
