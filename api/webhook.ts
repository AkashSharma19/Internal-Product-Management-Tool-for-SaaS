import https from 'https';
import { connectToDatabase } from './lib/db.js';
import {
  ProductItemModel,
  StudentProjectModel,
  StudentMeetingModel,
  DailyIssueModel,
  PlanItemModel,
  GlobalSettingsModel,
  ChangeHistoryModel
} from './lib/models.js';

export default async function handler(req: any, res: any) {
  // GET: return info about the last payload received — reads from MongoDB so it works across serverless instances
  if (req.method === 'GET') {
    try {
      await connectToDatabase();
      const lastEventSetting = await GlobalSettingsModel.findOne({ key: '_webhookLastEvent' }).lean() as any;
      return res.status(200).json({
        active: true,
        message: 'ClickUp webhook endpoint is active.',
        lastReceived: lastEventSetting?.value
          ? JSON.parse(lastEventSetting.value)
          : null
      });
    } catch (err: any) {
      return res.status(200).json({
        active: true,
        message: 'ClickUp webhook endpoint is active (DB read error).',
        lastReceived: null,
        error: err.message
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ success: true, message: 'Webhook endpoint is active.' });
  }

  // Debug entry payload
  let debugEntry: any = { time: new Date().toISOString() };

  try {
    await connectToDatabase();

    const payload = req.body || {};
    debugEntry.event = payload.event;
    debugEntry.task_id = payload.task_id;
    debugEntry.payload = payload;

    // Persist for debugging — visible via GET /api/webhook even across serverless cold starts
    await GlobalSettingsModel.updateOne(
      { key: '_webhookLastEvent' },
      { $set: { key: '_webhookLastEvent', value: JSON.stringify(debugEntry) } },
      { upsert: true }
    );

    console.log('[Webhook] Received event:', JSON.stringify(payload).slice(0, 1000));

    // ClickUp sends a handshake to verify the webhook when registering
    if (payload.event === 'webhook_handshake') {
      console.log('[Webhook] Handshake acknowledged.');
      return res.status(200).json({ success: true });
    }

    const taskId = payload.task_id;
    if (!taskId) {
      console.log('[Webhook] No task_id in payload, skipping.');
      return res.status(200).json({ success: false, error: 'No task_id in webhook payload.' });
    }

    const historyItems: any[] = payload.history_items || [];

    // 1. Try to extract status and assignee from the payload directly (fallback/backup)
    let extractedStatus: string | null = null;
    let extractedAssignee: string | null = null;

    for (const item of historyItems) {
      if (item.field === 'status') {
        if (item.after && typeof item.after === 'object' && item.after.status) {
          extractedStatus = item.after.status;
        } else if (item.data && item.data.status_after && item.data.status_after.status) {
          extractedStatus = item.data.status_after.status;
        } else if (item.after && typeof item.after === 'string') {
          extractedStatus = item.after;
        }
      }
      if ((item.field === 'assignee' || item.field === 'assignees') && item.after) {
        if (Array.isArray(item.after)) {
          extractedAssignee = item.after.map((a: any) => a.username || a.email || '').filter(Boolean).join(', ');
        } else if (item.after.username) {
          extractedAssignee = item.after.username;
        }
      }
    }

    // 2. Query ClickUp API to get the absolute source of truth (status, assignees, subtask count)
    const clickupSetting = await GlobalSettingsModel.findOne({ key: 'clickupApiKey' }).lean();
    const apiKey = clickupSetting?.value || '';

    let clickupStatus = extractedStatus;
    let clickupAssignee = extractedAssignee;
    let clickupSubtasksCount = 0;
    let apiFetchSuccess = false;

    if (apiKey && apiKey.trim()) {
      try {
        console.log(`[Webhook] Fetching latest details for task ${taskId} from ClickUp API...`);
        const taskData = await new Promise<any>((resolve, reject) => {
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
          }).on('error', reject);
        });

        if (taskData.statusCode >= 200 && taskData.statusCode < 300 && taskData.status) {
          clickupStatus = taskData.status.status;
          clickupAssignee = taskData.assignees && Array.isArray(taskData.assignees)
            ? taskData.assignees.map((a: any) => a.username).filter(Boolean).join(', ')
            : '';
          clickupSubtasksCount = taskData.subtasks ? taskData.subtasks.length : 0;
          apiFetchSuccess = true;
          console.log(`[Webhook] ClickUp API fetch successful for task ${taskId}. Status: ${clickupStatus}, Assignee: ${clickupAssignee}`);
        } else {
          console.warn(`[Webhook] ClickUp API fetch returned status ${taskData.statusCode || 500} for task ${taskId}`);
        }
      } catch (apiErr: any) {
        console.error(`[Webhook] ClickUp API fetch failed for task ${taskId}:`, apiErr.message);
      }
    }

    if (!clickupStatus && !clickupAssignee && !apiFetchSuccess) {
      console.log(`[Webhook] No status or assignee data found for task ${taskId}`);
      return res.status(200).json({ success: true, message: 'No updates captured.' });
    }

    // Build the update payload
    const updatePayload: Record<string, any> = {};
    if (clickupStatus) updatePayload.clickupStatus = clickupStatus;
    if (clickupAssignee !== null && clickupAssignee !== undefined) updatePayload.clickupAssignee = clickupAssignee;
    if (apiFetchSuccess) updatePayload.clickupSubtasksCount = clickupSubtasksCount;

    console.log(`[Webhook] Updating task ${taskId} with payload:`, updatePayload);

    // Match the task ID inside link fields using a case-insensitive regex
    const regexFilter = { $regex: taskId, $options: 'i' };

    // Fetch matching products to audit status/assignee transitions
    try {
      const matchedProducts = await ProductItemModel.find({ taskLink: regexFilter }).lean() as any[];
      if (clickupStatus) {
        for (const prod of matchedProducts) {
          const oldVal = (prod.clickupStatus || '').trim();
          const newVal = clickupStatus.trim();
          if (oldVal !== newVal) {
            const logEntry = new ChangeHistoryModel({
              id: `change-log-webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              itemId: prod.id,
              fieldName: 'clickupStatus',
              oldValue: oldVal,
              newValue: newVal,
              changedBy: 'ClickUp Webhook',
              changedById: 'webhook'
            });
            await logEntry.save();
          }
        }
      }
      if (clickupAssignee !== null && clickupAssignee !== undefined) {
        for (const prod of matchedProducts) {
          const oldVal = (prod.clickupAssignee || '').trim();
          const newVal = clickupAssignee.trim();
          if (oldVal !== newVal) {
            const logEntry = new ChangeHistoryModel({
              id: `change-log-webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              itemId: prod.id,
              fieldName: 'clickupAssignee',
              oldValue: oldVal,
              newValue: newVal,
              changedBy: 'ClickUp Webhook',
              changedById: 'webhook'
            });
            await logEntry.save();
          }
        }
      }
    } catch (auditErr: any) {
      console.error('[Webhook] Failed to write audit log entries:', auditErr.message);
    }

    const updateResults = await Promise.all([
      ProductItemModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      StudentProjectModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      StudentMeetingModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      DailyIssueModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      PlanItemModel.updateMany({ link: regexFilter }, { $set: updatePayload })
    ]);

    const matchedCount = updateResults.reduce((acc: number, curr: any) => acc + (curr.matchedCount || 0), 0);
    const modifiedCount = updateResults.reduce((acc: number, curr: any) => acc + (curr.modifiedCount || 0), 0);

    console.log(`[Webhook] Task ${taskId} updates applied. Matched: ${matchedCount}, Updated: ${modifiedCount}`);

    // Update debug log with results
    debugEntry.matchedCount = matchedCount;
    debugEntry.modifiedCount = modifiedCount;
    debugEntry.updatePayload = updatePayload;
    debugEntry.apiFetchSuccess = apiFetchSuccess;
    
    await GlobalSettingsModel.updateOne(
      { key: '_webhookLastEvent' },
      { $set: { value: JSON.stringify(debugEntry) } }
    );

    return res.status(200).json({ success: true, taskId, matchedCount, modifiedCount });

  } catch (err: any) {
    console.error('[Webhook] Error:', err.message, err.stack);
    // Always return 200 so ClickUp doesn't deactivate the webhook on failures
    try {
      debugEntry.error = err.message;
      await GlobalSettingsModel.updateOne(
        { key: '_webhookLastEvent' },
        { $set: { value: JSON.stringify(debugEntry) } }
      );
    } catch (e) {}
    return res.status(200).json({ success: false, error: err.message });
  }
}
