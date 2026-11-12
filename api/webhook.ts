import https from 'https';
import { timingSafeEqual } from 'node:crypto';
import { connectToDatabase } from './lib/db.js';
import {
  ProductItemModel,
  StudentProjectModel,
  StudentMeetingModel,
  DailyIssueModel,
  PlanItemModel,
  GlobalSettingsModel,
  ChangeHistoryModel,
  CommentModel,
  WebhookInboxModel
} from './lib/models.js';
import {
  PORTAL_EVENTS,
  buildImportedTicketId,
  extractClickupTaskId,
  fetchClickupTaskMetadata,
  findImportedTicket
} from './lib/productShipSync.js';

const PRODUCTSHIP_EVENT = 'ticket_created';
const PRODUCTSHIP_ID_PREFIX = 'productship:';
const firstHeaderValue = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return typeof value === 'string' ? value.trim() : '';
};

const getProductShipSecret = (headers: Record<string, unknown> = {}): string => {
  const authorization = firstHeaderValue(headers.authorization);
  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim();
  }

  return firstHeaderValue(headers['x-productship-webhook-secret'])
    || firstHeaderValue(headers['x-webhook-secret']);
};

const secretsMatch = (actual: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
};

const requiredString = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
};

const optionalString = (value: unknown, field: string, maxLength: number): string => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
};

const normalizeTicketType = (category: string): string | null => {
  const normalized = category.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  const types: Record<string, string> = {
    'bug': 'BUG',
    'bug/defect': 'BUG',
    'defect': 'BUG',
    'feature': 'New Feature',
    'request': 'New Feature',
    'feature request': 'New Feature',
    'new feature': 'New Feature',
    'enhancement': 'Enhancement',
    'feature gap': 'Feature Gap',
    'data needed': 'Data Needed',
    'term report/ transcript': 'Term Report/ Transcript'
  };
  return types[normalized] || null;
};

class PortalHttpError extends Error {
  constructor(public statusCode: number, message: string, public eventId = '') {
    super(message);
  }
}

const normalizeNullableString = (value: unknown, field: string, maxLength: number): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') throw new PortalHttpError(400, `${field} must be a string or null.`);
  const result = value.trim();
  if (result.length > maxLength) throw new PortalHttpError(400, `${field} is too long.`);
  return result || null;
};

const portalRequiredString = (value: unknown, field: string, maxLength: number, eventId = ''): string => {
  try {
    return requiredString(value, field, maxLength);
  } catch (error: any) {
    throw new PortalHttpError(400, error.message, eventId);
  }
};

const portalResult = (eventId: string, processed: boolean, alreadyProcessed = false, reason?: string) => ({
  success: true,
  eventId,
  processed,
  alreadyProcessed,
  ...(reason ? { reason } : {})
});

async function handlePortalV2Event(payload: any) {
  const eventId = portalRequiredString(payload.eventId, 'eventId', 128);
  const organizationId = portalRequiredString(payload.organizationId, 'organizationId', 128, eventId);
  const externalTicketId = portalRequiredString(payload.externalTicketId, 'externalTicketId', 128, eventId);
  const environment = portalRequiredString(payload.environment, 'environment', 32, eventId);
  if (payload.schemaVersion !== 1) throw new PortalHttpError(400, 'Unsupported schemaVersion.', eventId);
  if (payload.source !== 'coachlms') throw new PortalHttpError(400, 'source must be coachlms.', eventId);
  if (!['development', 'production'].includes(environment)) throw new PortalHttpError(400, 'Invalid environment.', eventId);
  const occurredAt = new Date(portalRequiredString(payload.occurredAt, 'occurredAt', 64, eventId));
  if (Number.isNaN(occurredAt.getTime())) throw new PortalHttpError(400, 'occurredAt must be a valid date.', eventId);
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw new PortalHttpError(400, 'data must be an object.', eventId);
  }

  const duplicate: any = await WebhookInboxModel.findOne({ organizationId, eventId }).lean();
  if (duplicate) {
    if (duplicate.status === 'processed') return portalResult(eventId, false, true, 'duplicate');
    throw new PortalHttpError(503, 'Event is currently being processed.', eventId);
  }

  const ticket: any = await findImportedTicket(organizationId, externalTicketId, environment);
  if (!ticket) throw new PortalHttpError(404, 'Ticket not found for organization.', eventId);

  try {
    await WebhookInboxModel.create({ organizationId, eventId, source: 'coachlms', event: payload.event, status: 'processing' });
  } catch (error: any) {
    if (error?.code === 11000) {
      const raced: any = await WebhookInboxModel.findOne({ organizationId, eventId }).lean();
      if (raced?.status === 'processed') return portalResult(eventId, false, true, 'duplicate');
      throw new PortalHttpError(503, 'Event is currently being processed.', eventId);
    }
    throw error;
  }

  const clockDecision = (clockValue: unknown, currentValue: unknown, nextValue: unknown) => {
    if (!clockValue) return 'apply';
    const currentTime = new Date(clockValue as any).getTime();
    const incomingTime = occurredAt.getTime();
    if (incomingTime < currentTime) return 'stale';
    if (incomingTime === currentTime) return String(currentValue ?? '') === String(nextValue ?? '') ? 'unchanged' : 'conflict';
    return String(currentValue ?? '') === String(nextValue ?? '') ? 'advance' : 'apply';
  };

  let reason = '';
  try {
    if (payload.event === 'ticket_clickup_link_updated') {
      const clickupLink = normalizeNullableString(payload.data.clickupLink, 'data.clickupLink', 2000);
      const suppliedTaskId = normalizeNullableString(payload.data.clickupTaskId, 'data.clickupTaskId', 64);
      const parsedTaskId = clickupLink ? extractClickupTaskId(clickupLink) : null;
      if (clickupLink && !parsedTaskId) throw new PortalHttpError(400, 'clickupLink must be a valid HTTPS ClickUp task URL.', eventId);
      if ((clickupLink === null) !== (suppliedTaskId === null)) throw new PortalHttpError(400, 'clickupLink and clickupTaskId must both be null when clearing.', eventId);
      if (suppliedTaskId && parsedTaskId !== suppliedTaskId) throw new PortalHttpError(400, 'clickupTaskId does not match clickupLink.', eventId);
      const decision = clockDecision(ticket.clickupLinkUpdatedAt, ticket.taskLink, clickupLink || '');
      if (decision === 'conflict') throw new PortalHttpError(409, 'Conflicting ClickUp link update.', eventId);
      reason = decision === 'apply' ? '' : decision === 'advance' ? 'unchanged' : decision;
      if (decision === 'apply') {
        ticket.taskLink = clickupLink || '';
        ticket.clickupTaskId = parsedTaskId || '';
        if (!clickupLink) {
          ticket.clickupStatus = '';
          ticket.clickupAssignee = '';
          ticket.clickupSubtasksCount = 0;
        } else if (parsedTaskId) {
          const metadata = await fetchClickupTaskMetadata(parsedTaskId);
          if (metadata) {
            ticket.clickupStatus = metadata.status;
            ticket.clickupAssignee = metadata.assignee;
            ticket.clickupSubtasksCount = metadata.subtasksCount;
          }
        }
      }
      if (decision === 'apply' || decision === 'advance') {
        ticket.clickupLinkUpdatedAt = occurredAt;
        ticket.clickupLinkUpdatedBySource = 'coachlms';
      }
    } else if (payload.event === 'ticket_status_updated') {
      const incomingStatus = portalRequiredString(payload.data.status, 'data.status', 100, eventId);
      const decision = clockDecision(ticket.coachlmsStatusUpdatedAt, ticket.coachlmsStatus, incomingStatus);
      if (decision === 'conflict') throw new PortalHttpError(409, 'Conflicting status update.', eventId);
      reason = decision === 'apply' ? '' : decision === 'advance' ? 'unchanged' : decision;
      if (decision === 'apply') ticket.coachlmsStatus = incomingStatus;
      if (decision === 'apply' || decision === 'advance') {
        ticket.coachlmsStatusUpdatedAt = occurredAt;
        ticket.coachlmsStatusUpdatedBySource = 'coachlms';
      }
    } else if (payload.event === 'ticket_deadline_updated') {
      const deadline = normalizeNullableString(payload.data.deadline, 'data.deadline', 64);
      if (deadline && Number.isNaN(new Date(deadline).getTime())) throw new PortalHttpError(400, 'data.deadline must be a valid date or null.', eventId);
      const normalized = deadline ? new Date(deadline).toISOString().slice(0, 10) : '';
      const decision = clockDecision(ticket.committedDateUpdatedAt, ticket.committedDate, normalized);
      if (decision === 'conflict') throw new PortalHttpError(409, 'Conflicting deadline update.', eventId);
      reason = decision === 'apply' ? '' : decision === 'advance' ? 'unchanged' : decision;
      if (decision === 'apply') ticket.committedDate = normalized;
      if (decision === 'apply' || decision === 'advance') {
        ticket.committedDateUpdatedAt = occurredAt;
        ticket.committedDateUpdatedBySource = 'coachlms';
      }
    } else if (payload.event === 'ticket_comment_created') {
      const comment = payload.data.comment;
      if (!comment || typeof comment !== 'object') throw new PortalHttpError(400, 'data.comment is required.', eventId);
      const externalCommentId = portalRequiredString(comment.externalCommentId, 'data.comment.externalCommentId', 256, eventId);
      const content = portalRequiredString(comment.content, 'data.comment.content', 10000, eventId);
      const authorName = portalRequiredString(comment.author?.name, 'data.comment.author.name', 200, eventId);
      const authorEmail = normalizeNullableString(comment.author?.email ?? null, 'data.comment.author.email', 320) || '';
      const sourceCreatedAt = new Date(portalRequiredString(comment.createdAt, 'data.comment.createdAt', 64, eventId));
      if (Number.isNaN(sourceCreatedAt.getTime())) throw new PortalHttpError(400, 'data.comment.createdAt must be a valid date.', eventId);
      const result = await CommentModel.updateOne(
        { source: 'coachlms', organizationId, externalCommentId },
        { $setOnInsert: {
          id: `coachlms:${organizationId}:${externalCommentId}`,
          itemId: ticket.id,
          authorName,
          authorEmail,
          content,
          source: 'coachlms',
          organizationId,
          externalCommentId,
          originEventId: eventId,
          sourceCreatedAt,
          syncStatus: 'imported',
          createdAt: sourceCreatedAt
        } },
        { upsert: true }
      );
      reason = result.upsertedCount ? '' : 'duplicate';
    } else {
      throw new PortalHttpError(400, `Unsupported event: ${payload.event}`, eventId);
    }

    if (!ticket.externalSource) {
      ticket.externalSource = 'coachlms';
      ticket.organizationId = organizationId;
      ticket.environment = environment;
      ticket.externalTicketId = externalTicketId;
    }
    if (payload.event !== 'ticket_comment_created') await ticket.save();
    const result = portalResult(eventId, !reason, reason === 'duplicate', reason || undefined);
    await WebhookInboxModel.updateOne({ organizationId, eventId }, { $set: { status: 'processed', result, processedAt: new Date() } });
    return result;
  } catch (error) {
    await WebhookInboxModel.deleteOne({ organizationId, eventId });
    throw error;
  }
}

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

    if (payload.event !== PRODUCTSHIP_EVENT && (payload.source === 'coachlms' || payload.schemaVersion !== undefined || (PORTAL_EVENTS as readonly string[]).includes(payload.event))) {
      const expectedSecret = String(process.env.PRODUCTSHIP_WEBHOOK_SECRET || '').trim();
      if (!expectedSecret) return res.status(500).json({ success: false, eventId: payload.eventId || '', error: 'Webhook authentication is not configured.' });
      const suppliedSecret = getProductShipSecret(req.headers || {});
      if (!suppliedSecret || !secretsMatch(suppliedSecret, expectedSecret)) {
        return res.status(401).json({ success: false, eventId: payload.eventId || '', error: 'Invalid webhook credentials.' });
      }
      try {
        const result = await handlePortalV2Event(payload);
        return res.status(200).json(result);
      } catch (error: any) {
        const statusCode = error instanceof PortalHttpError ? error.statusCode : 500;
        console.error('[CoachLMS Sync] Inbound event failed:', error.message);
        return res.status(statusCode).json({ success: false, eventId: payload.eventId || '', error: error.message || 'Internal server error.' });
      }
    }

    if (payload.event === PRODUCTSHIP_EVENT) {
      const expectedSecret = String(process.env.PRODUCTSHIP_WEBHOOK_SECRET || '').trim();
      if (!expectedSecret) {
        console.error('[ProductShip Webhook] PRODUCTSHIP_WEBHOOK_SECRET is not configured.');
        return res.status(500).json({ success: false, error: 'Webhook authentication is not configured.' });
      }

      const suppliedSecret = getProductShipSecret(req.headers || {});
      if (!suppliedSecret || !secretsMatch(suppliedSecret, expectedSecret)) {
        console.warn('[ProductShip Webhook] Rejected request with invalid credentials.');
        return res.status(401).json({ success: false, error: 'Invalid webhook credentials.' });
      }

      try {
        const externalTicketId = requiredString(payload.externalTicketId, 'externalTicketId', 128);
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(externalTicketId)) {
          return res.status(400).json({ success: false, error: 'externalTicketId contains unsupported characters.' });
        }

        const category = requiredString(payload.ticketType ?? payload.category, 'ticketType or category', 64);
        const type = normalizeTicketType(category);
        if (!type) {
          return res.status(400).json({ success: false, error: `Unsupported ticket category: ${category}` });
        }

        const title = requiredString(payload.title, 'title', 300);
        const description = optionalString(payload.description, 'description', 10000);
        const program = optionalString(payload.program, 'program', 200);
        const raisedByName = optionalString(payload.raisedByName, 'raisedByName', 200);
        const raisedByEmail = optionalString(payload.raisedByEmail, 'raisedByEmail', 320);
        const clickupLink = optionalString(payload.clickupLink, 'clickupLink', 2000);
        const createdFrom = optionalString(payload.createdFrom, 'createdFrom', 200);
        const neededByDate = optionalString(payload.neededByDate, 'neededByDate', 64);
        const organizationId = optionalString(payload.organizationId, 'organizationId', 128);
        const environment = optionalString(payload.environment, 'environment', 32);
        if ((organizationId && !environment) || (!organizationId && environment)) {
          return res.status(400).json({ success: false, error: 'organizationId and environment must be provided together.' });
        }
        if (environment && !['development', 'production'].includes(environment)) {
          return res.status(400).json({ success: false, error: 'Invalid environment.' });
        }
        const existingTicket: any = organizationId
          ? (await findImportedTicket(organizationId, externalTicketId, environment)
            || await DailyIssueModel.findOne({
              id: `${PRODUCTSHIP_ID_PREFIX}${externalTicketId}`,
              $or: [{ externalSource: '' }, { externalSource: { $exists: false } }],
              $and: [
                { $or: [{ organizationId: '' }, { organizationId: { $exists: false } }] },
                { $or: [{ environment: '' }, { environment: { $exists: false } }] }
              ]
            }))
          : null;
        const internalTicketId = existingTicket?.id || (organizationId
          ? buildImportedTicketId(organizationId, environment, externalTicketId)
          : `${PRODUCTSHIP_ID_PREFIX}${externalTicketId}`);
        const contact = raisedByName && raisedByEmail
          ? `${raisedByName} (${raisedByEmail})`
          : raisedByName || raisedByEmail;
        const notes = [
          createdFrom ? `Created from: ${createdFrom}` : '',
          `External ticket ID: ${externalTicketId}`
        ].filter(Boolean).join('\n');

        const createdDate = optionalString(payload.createdDate, 'createdDate', 64);
        const createdAt = createdDate ? new Date(createdDate) : null;
        if (createdAt && Number.isNaN(createdAt.getTime())) {
          return res.status(400).json({ success: false, error: 'createdDate must be a valid date.' });
        }
        if (neededByDate && Number.isNaN(new Date(neededByDate).getTime())) {
          return res.status(400).json({ success: false, error: 'neededByDate must be a valid date.' });
        }

        const ticket: Record<string, unknown> = {
          id: internalTicketId,
          externalSource: organizationId ? 'coachlms' : '',
          organizationId,
          environment,
          externalTicketId: organizationId ? externalTicketId : '',
          cohort: program,
          module: title,
          type,
          issues: description,
          contact,
          poc: '',
          taskLink: clickupLink,
          notes
        };
        if (createdAt) ticket.createdAt = createdAt;

        const result = await DailyIssueModel.updateOne(
          { id: internalTicketId },
          { $setOnInsert: ticket },
          { upsert: true }
        );
        const created = result.upsertedCount > 0;
        if (organizationId) {
          await DailyIssueModel.updateOne(
            { id: internalTicketId },
            { $set: { externalSource: 'coachlms', organizationId, environment, externalTicketId } }
          );
        }

        let clickupMetadataUpdated = false;
        const clickupTaskId = clickupLink ? extractClickupTaskId(clickupLink) : null;
        if (clickupTaskId) {
          const metadata = await fetchClickupTaskMetadata(clickupTaskId);
          const metadataUpdate: Record<string, unknown> = { clickupTaskId };
          if (metadata) {
            metadataUpdate.clickupStatus = metadata.status;
            metadataUpdate.clickupAssignee = metadata.assignee;
            metadataUpdate.clickupSubtasksCount = metadata.subtasksCount;
            clickupMetadataUpdated = true;
          }
          await DailyIssueModel.updateOne({ id: internalTicketId }, { $set: metadataUpdate });
        }

        let neededByCommentCreated = false;
        let correctedLegacyDevDate = false;
        if (neededByDate) {
          const neededBy = new Date(neededByDate);
          const formattedNeededBy = new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
          }).format(neededBy);
          const commentId = organizationId
            ? `productship-needed-by:${organizationId}:${externalTicketId}`
            : `productship-needed-by:${externalTicketId}`;
          const commentResult = await CommentModel.updateOne(
            { id: commentId },
            {
              $setOnInsert: {
                id: commentId,
                itemId: internalTicketId,
                authorName: raisedByName || createdFrom || 'External Portal',
                authorEmail: raisedByEmail,
                content: `Needed by date: ${formattedNeededBy}`,
                source: 'coachlms',
                organizationId,
                externalCommentId: `needed-by:${externalTicketId}`,
                syncStatus: 'imported',
                ...(createdAt ? { createdAt } : {})
              }
            },
            { upsert: true }
          );
          neededByCommentCreated = commentResult.upsertedCount > 0;

          // Repair records created by the previous mapping, but preserve any independently edited Dev Date.
          const correctionResult = await DailyIssueModel.updateOne(
            { id: internalTicketId, deadline: neededByDate },
            { $unset: { deadline: '' } }
          );
          correctedLegacyDevDate = correctionResult.modifiedCount > 0;
        }

        debugEntry.externalTicketId = externalTicketId;
        debugEntry.internalTicketId = internalTicketId;
        debugEntry.created = created;
        debugEntry.neededByCommentCreated = neededByCommentCreated;
        debugEntry.correctedLegacyDevDate = correctedLegacyDevDate;
        await GlobalSettingsModel.updateOne(
          { key: '_webhookLastEvent' },
          { $set: { key: '_webhookLastEvent', value: JSON.stringify(debugEntry) } },
          { upsert: true }
        );

        console.log(`[ProductShip Webhook] ${created ? 'Created' : 'Acknowledged existing'} ticket ${internalTicketId}.`);
        return res.status(200).json({
          success: true,
          ticketId: internalTicketId,
          created,
          alreadyExists: !created,
          neededByCommentCreated,
          correctedLegacyDevDate,
          clickupMetadataUpdated
        });
      } catch (validationError: any) {
        return res.status(400).json({ success: false, error: validationError.message });
      }
    }

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
    const escapedTaskId = String(taskId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexFilter = { $regex: escapedTaskId, $options: 'i' };

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
      DailyIssueModel.updateMany({ $or: [{ clickupTaskId: taskId }, { taskLink: regexFilter }] }, { $set: updatePayload }),
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
