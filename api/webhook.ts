import https from 'https';
import { connectToDatabase } from './lib/db.js';
import {
  ProductItemModel,
  StudentProjectModel,
  StudentMeetingModel,
  DailyIssueModel,
  PlanItemModel,
  GlobalSettingsModel
} from './lib/models.js';

export default async function handler(req: any, res: any) {
  // ClickUp webhooks send a verification request when registering.
  // The verification request is a POST that we must respond to with a 200 OK.
  if (req.method !== 'POST') {
    return res.status(200).json({ success: true, message: 'Webhook endpoint is active.' });
  }

  try {
    await connectToDatabase();

    const payload = req.body || {};
    
    // ClickUp sends a handshake to verify the webhook when registering
    if (payload.event === 'webhook_handshake') {
      return res.status(200).json({ success: true });
    }

    const taskId = payload.task_id || payload.taskId;
    if (!taskId) {
      return res.status(200).json({ success: false, error: 'No task_id in webhook payload.' });
    }

    // Retrieve ClickUp API Key
    const clickupSetting = await GlobalSettingsModel.findOne({ key: 'clickupApiKey' }).lean();
    const apiKey = clickupSetting?.value || '';
    if (!apiKey.trim()) {
      return res.status(200).json({ success: false, error: 'ClickUp API Key not configured.' });
    }

    // Fetch up-to-date details of the task from ClickUp API
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
        
        const updatePayload = {
          clickupStatus: clickupData.status.status,
          clickupSubtasksCount: clickupData.subtasks ? clickupData.subtasks.length : 0,
          clickupAssignee: assigneeName
        };

        // Match the task ID inside link fields (e.g. taskLink or link contains taskId)
        const regexFilter = { $regex: taskId };

        const updateResults = await Promise.all([
          ProductItemModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
          StudentProjectModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
          StudentMeetingModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
          DailyIssueModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
          PlanItemModel.updateMany({ link: regexFilter }, { $set: updatePayload })
        ]);

        const matchedCount = updateResults.reduce((acc, curr) => acc + (curr.matchedCount || 0), 0);
        const modifiedCount = updateResults.reduce((acc, curr) => acc + (curr.modifiedCount || 0), 0);

        console.log(`[Webhook ClickUp Sync] Successfully synced Task ${taskId}. Matched: ${matchedCount}, Updated: ${modifiedCount}`);
        return res.status(200).json({ success: true, taskId, matchedCount, modifiedCount });
      }
    }

    return res.status(200).json({ 
      success: false, 
      error: `ClickUp API returned status ${clickupData.statusCode || 500} for Task ${taskId}` 
    });
  } catch (err: any) {
    console.error('Webhook ClickUp Sync error:', err);
    // Always return a 200 OK so that ClickUp doesn't deactivate the webhook due to repeated failures.
    return res.status(200).json({ success: false, error: err.message });
  }
}
