import { randomUUID } from 'node:crypto';
import { DailyIssueModel, CommentModel, GlobalSettingsModel, WebhookOutboxModel } from './models.js';

export const PORTAL_EVENTS = [
  'ticket_comment_created',
  'ticket_clickup_link_updated',
  'ticket_status_updated',
  'ticket_deadline_updated'
] as const;

export type PortalEvent = typeof PORTAL_EVENTS[number];

const KNOWN_URLS: Record<string, string> = {
  '77aa25d2-d52c-4c7b-ad4b-7b7de339fc4e:development': 'https://api-dev.mastersunion.in/api/v1/feature-requests/productship/webhook',
  '77aa25d2-d52c-4c7b-ad4b-7b7de339fc4e:production': 'https://api.mastersunion.in/api/v1/feature-requests/productship/webhook'
};

export const buildImportedTicketId = (organizationId: string, environment: string, externalTicketId: string) =>
  `productship:${organizationId}:${environment}:${externalTicketId}`;

export async function findImportedTicket(organizationId: string, externalTicketId: string, environment?: string) {
  return DailyIssueModel.findOne({
    externalSource: 'coachlms',
    organizationId,
    externalTicketId,
    ...(environment ? { environment } : {})
  });
}

export function extractClickupTaskId(link: unknown): string | null {
  if (typeof link !== 'string' || !link.trim()) return null;
  try {
    const parsed = new URL(link.trim());
    if (parsed.protocol !== 'https:' || !(parsed.hostname === 'clickup.com' || parsed.hostname.endsWith('.clickup.com'))) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const taskId = parts.at(-1) || '';
    return parts.includes('t') && /^[a-zA-Z0-9_-]{7,20}$/.test(taskId) ? taskId : null;
  } catch {
    return null;
  }
}

export async function fetchClickupTaskMetadata(taskId: string) {
  const setting: any = await GlobalSettingsModel.findOne({ key: 'clickupApiKey' }).lean();
  const apiKey = String(setting?.value || '').trim();
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}?include_subtasks=true`, {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;
    const task: any = await response.json();
    if (!task?.status?.status) return null;
    return {
      status: String(task.status.status),
      assignee: Array.isArray(task.assignees)
        ? task.assignees.map((item: any) => item.username || item.email || '').filter(Boolean).join(', ')
        : '',
      subtasksCount: Array.isArray(task.subtasks) ? task.subtasks.length : 0
    };
  } catch (error: any) {
    console.warn(`[ClickUp Sync] Could not fetch task ${taskId}:`, error?.message || error);
    return null;
  }
}

function configuredUrls(): Record<string, string> {
  const raw = process.env.COACHLMS_WEBHOOK_URLS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    console.error('[CoachLMS Sync] COACHLMS_WEBHOOK_URLS_JSON is invalid JSON.');
    return {};
  }
}

export function resolveCoachLmsWebhookUrl(organizationId: string, environment: string): string | null {
  const key = `${organizationId}:${environment}`;
  const value = configuredUrls()[key] || KNOWN_URLS[key] || process.env.COACHLMS_WEBHOOK_URL || '';
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function enqueuePortalEvent(
  ticket: any,
  event: PortalEvent,
  data: Record<string, unknown>,
  occurredAt = new Date(),
  relatedCommentId = ''
) {
  if (ticket?.externalSource !== 'coachlms' || !ticket.organizationId || !ticket.externalTicketId) return null;
  const environment = ticket.environment || 'development';
  const eventId = randomUUID();
  const payload = {
    schemaVersion: 1,
    eventId,
    event,
    source: 'productship',
    occurredAt: occurredAt.toISOString(),
    environment,
    organizationId: ticket.organizationId,
    externalTicketId: ticket.externalTicketId,
    data
  };
  await WebhookOutboxModel.create({
    organizationId: ticket.organizationId,
    environment,
    eventId,
    event,
    relatedCommentId,
    payload,
    status: 'pending',
    nextAttemptAt: new Date()
  });
  return eventId;
}

const RETRY_DELAYS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000];

export async function deliverOutboxBatch(limit = 20) {
  const now = new Date();
  let delivered = 0;
  let failed = 0;
  for (let index = 0; index < limit; index += 1) {
    const row: any = await WebhookOutboxModel.findOneAndUpdate(
      {
        status: { $in: ['pending', 'retry'] },
        nextAttemptAt: { $lte: now },
        $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }]
      },
      { $set: { status: 'delivering', lockedUntil: new Date(Date.now() + 30_000) } },
      { new: true, sort: { nextAttemptAt: 1 } }
    ).lean();
    if (!row) break;

    const url = resolveCoachLmsWebhookUrl(row.organizationId, row.environment);
    const secret = String(process.env.COACHLMS_WEBHOOK_SECRET || '').trim();
    const expired = Date.now() - new Date(row.createdAt).getTime() >= 24 * 60 * 60 * 1000;
    if (expired) {
      await WebhookOutboxModel.updateOne({ _id: row._id }, {
        $set: { status: 'dead', attempts: row.attempts + 1, lastError: 'Delivery window expired after 24 hours.' },
        $unset: { lockedUntil: '' }
      });
      if (row.relatedCommentId) await CommentModel.updateOne({ id: row.relatedCommentId }, { $set: { syncStatus: 'failed' } });
      failed += 1;
      continue;
    }
    if (!url || !secret) {
      await WebhookOutboxModel.updateOne({ _id: row._id }, {
        $set: { status: 'retry', attempts: row.attempts + 1, lastError: 'Coach LMS webhook URL or secret is not configured.', nextAttemptAt: new Date(Date.now() + 60_000) },
        $unset: { lockedUntil: '' }
      });
      failed += 1;
      continue;
    }

    try {
      const timeoutMs = Math.min(15_000, Math.max(1_000, Number(process.env.COACHLMS_WEBHOOK_TIMEOUT_MS || 10_000)));
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(row.payload),
        signal: AbortSignal.timeout(timeoutMs)
      });
      const responseText = (await response.text()).slice(0, 500);
      if (response.ok) {
        await WebhookOutboxModel.updateOne({ _id: row._id }, {
          $set: { status: 'delivered', deliveredAt: new Date(), attempts: row.attempts + 1, lastError: '' },
          $unset: { lockedUntil: '' }
        });
        if (row.relatedCommentId) await CommentModel.updateOne({ id: row.relatedCommentId }, { $set: { syncStatus: 'synced' } });
        delivered += 1;
      } else if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after') || 0) * 1000;
        const delay = retryAfter || RETRY_DELAYS[Math.min(row.attempts, RETRY_DELAYS.length - 1)];
        await WebhookOutboxModel.updateOne({ _id: row._id }, {
          $set: { status: 'retry', attempts: row.attempts + 1, nextAttemptAt: new Date(Date.now() + delay), lastError: `HTTP ${response.status}: ${responseText}` },
          $unset: { lockedUntil: '' }
        });
        failed += 1;
      } else {
        await WebhookOutboxModel.updateOne({ _id: row._id }, {
          $set: { status: 'dead', attempts: row.attempts + 1, lastError: `HTTP ${response.status}: ${responseText}` },
          $unset: { lockedUntil: '' }
        });
        if (row.relatedCommentId) await CommentModel.updateOne({ id: row.relatedCommentId }, { $set: { syncStatus: 'failed' } });
        failed += 1;
      }
    } catch (error: any) {
      const delay = RETRY_DELAYS[Math.min(row.attempts, RETRY_DELAYS.length - 1)];
      await WebhookOutboxModel.updateOne({ _id: row._id }, {
        $set: { status: 'retry', attempts: row.attempts + 1, nextAttemptAt: new Date(Date.now() + delay), lastError: String(error?.message || 'Network error').slice(0, 500) },
        $unset: { lockedUntil: '' }
      });
      failed += 1;
    }
  }
  return { delivered, failed };
}

export function startCoachLmsOutboxWorker() {
  const run = () => deliverOutboxBatch().catch(error => console.error('[CoachLMS Sync] Outbox worker failed:', error));
  const initial = setTimeout(run, 5_000);
  const interval = setInterval(run, 30_000);
  return () => {
    clearTimeout(initial);
    clearInterval(interval);
  };
}
