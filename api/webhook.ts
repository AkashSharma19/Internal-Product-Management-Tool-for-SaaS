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

  try {
    await connectToDatabase();

    const payload = req.body || {};

    // Persist for debugging — visible via GET /api/webhook even across serverless cold starts
    const debugEntry = { time: new Date().toISOString(), event: payload.event, task_id: payload.task_id, payload };
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

    // Extract the new status directly from the webhook payload (taskStatusUpdated event)
    let newStatus: string | null = null;
    for (const item of historyItems) {
      if (item.field === 'status' && item.after && item.after.status) {
        newStatus = item.after.status;
        break;
      }
    }

    // Extract assignee from the webhook payload (taskAssigneeUpdated event)
    let newAssignee: string | null = null;
    for (const item of historyItems) {
      if ((item.field === 'assignee' || item.field === 'assignees') && item.after) {
        if (Array.isArray(item.after)) {
          newAssignee = item.after.map((a: any) => a.username || a.email || '').filter(Boolean).join(', ');
        } else if (item.after.username) {
          newAssignee = item.after.username;
        }
        break;
      }
    }

    if (!newStatus && newAssignee === null) {
      console.log(`[Webhook] No actionable status/assignee change for task ${taskId}, event: ${payload.event}`);
      return res.status(200).json({ success: true, message: 'No actionable field in history_items.' });
    }

    // Build the update payload — only update fields that actually changed
    const updatePayload: Record<string, any> = {};
    if (newStatus) updatePayload.clickupStatus = newStatus;
    if (newAssignee !== null) updatePayload.clickupAssignee = newAssignee;

    console.log(`[Webhook] Updating task ${taskId} with:`, updatePayload);

    // Match the task ID inside link fields — ClickUp task IDs appear both as
    // standalone strings and embedded inside full URLs like
    // https://app.clickup.com/t/abc123  or  https://app.clickup.com/t/h/abc123/taskname
    // We match any record whose taskLink field contains the task ID string.
    const regexFilter = { $regex: taskId, $options: 'i' };

    const updateResults = await Promise.all([
      ProductItemModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      StudentProjectModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      StudentMeetingModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      DailyIssueModel.updateMany({ taskLink: regexFilter }, { $set: updatePayload }),
      PlanItemModel.updateMany({ link: regexFilter }, { $set: updatePayload })
    ]);

    const matchedCount = updateResults.reduce((acc: number, curr: any) => acc + (curr.matchedCount || 0), 0);
    const modifiedCount = updateResults.reduce((acc: number, curr: any) => acc + (curr.modifiedCount || 0), 0);

    console.log(`[Webhook] Task ${taskId} — Matched: ${matchedCount}, Updated: ${modifiedCount}`);

    // Also update the debug entry with result info
    await GlobalSettingsModel.updateOne(
      { key: '_webhookLastEvent' },
      { $set: { value: JSON.stringify({ ...debugEntry, matchedCount, modifiedCount, updatePayload }) } }
    );

    return res.status(200).json({ success: true, taskId, matchedCount, modifiedCount });

  } catch (err: any) {
    console.error('[Webhook] Error:', err.message, err.stack);
    // Always return 200 so ClickUp doesn't deactivate the webhook on failures
    return res.status(200).json({ success: false, error: err.message });
  }
}
