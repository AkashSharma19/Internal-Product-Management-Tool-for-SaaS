import type { Campaign, CampaignActivity, CampaignOccurrence } from '../types';

export type CampaignOccurrenceViewStatus = CampaignOccurrence['status'] | 'Due today' | 'Overdue';

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const toLocalDateTimeInput = (date = new Date()): string => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const getOccurrenceViewStatus = (
  occurrence: CampaignOccurrence,
  now = new Date()
): CampaignOccurrenceViewStatus => {
  if (occurrence.status !== 'Upcoming') return occurrence.status;
  const scheduled = new Date(occurrence.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return 'Upcoming';
  const scheduledDay = startOfDay(scheduled).getTime();
  const today = startOfDay(now).getTime();
  if (scheduledDay < today || scheduled.getTime() < now.getTime()) return 'Overdue';
  if (scheduledDay === today) return 'Due today';
  return 'Upcoming';
};

const nextOccurrenceDate = (current: Date, activity: CampaignActivity): Date => {
  const next = new Date(current);
  const recurrence = activity.recurrence;
  if (recurrence.frequency === 'monthly') {
    const targetMonth = next.getMonth() + 1;
    const originalDay = next.getDate();
    next.setDate(1);
    next.setMonth(targetMonth);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  } else if (recurrence.frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (recurrence.frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
  } else if (recurrence.frequency === 'custom') {
    const interval = Math.max(1, recurrence.interval || 1);
    if (recurrence.unit === 'months') {
      const targetMonth = next.getMonth() + interval;
      const originalDay = next.getDate();
      next.setDate(1);
      next.setMonth(targetMonth);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(originalDay, lastDay));
    }
    else if (recurrence.unit === 'weeks') next.setDate(next.getDate() + (interval * 7));
    else next.setDate(next.getDate() + interval);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const MAX_CAMPAIGN_OCCURRENCES = 120;

export const campaignRecurrenceExceedsLimit = (activity: CampaignActivity): boolean => {
  if (!activity.recurrence.enabled || activity.recurrence.endType !== 'date' || !activity.recurrence.endDate) return false;
  const end = new Date(`${activity.recurrence.endDate}T23:59:59`);
  let cursor = new Date(activity.scheduledAt);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return false;
  for (let count = 1; count < MAX_CAMPAIGN_OCCURRENCES; count += 1) {
    const next = nextOccurrenceDate(cursor, activity);
    if (next <= cursor || next > end) return false;
    cursor = next;
  }
  const next = nextOccurrenceDate(cursor, activity);
  return next > cursor && next <= end;
};

export const generateCampaignOccurrences = (activity: CampaignActivity): CampaignOccurrence[] => {
  const firstDate = new Date(activity.scheduledAt);
  if (Number.isNaN(firstDate.getTime())) return [];

  const previousByDate = new Map((activity.occurrences || []).map(item => [item.scheduledAt, item]));
  const dates: Date[] = [firstDate];

  if (activity.recurrence.enabled) {
    const maxOccurrences = MAX_CAMPAIGN_OCCURRENCES;
    if (activity.recurrence.endType === 'date' && activity.recurrence.endDate) {
      const end = new Date(`${activity.recurrence.endDate}T23:59:59`);
      let cursor = firstDate;
      while (dates.length < maxOccurrences) {
        const next = nextOccurrenceDate(cursor, activity);
        if (next <= cursor || next > end) break;
        dates.push(next);
        cursor = next;
      }
    } else {
      const count = Math.min(maxOccurrences, Math.max(1, activity.recurrence.occurrenceCount || 1));
      let cursor = firstDate;
      while (dates.length < count) {
        const next = nextOccurrenceDate(cursor, activity);
        if (next <= cursor) break;
        dates.push(next);
        cursor = next;
      }
    }
  }

  const generated = dates.map(date => {
    const scheduledAt = toLocalDateTimeInput(date);
    return previousByDate.get(scheduledAt) || {
      id: `${activity.id}-occ-${date.getTime()}`,
      scheduledAt,
      status: 'Upcoming' as const
    };
  });

  // Resolved occurrences are permanent history. Pending occurrences that are
  // already overdue must also remain until explicitly completed, skipped or
  // cancelled, even when future recurrence settings are changed.
  const generatedDates = new Set(generated.map(item => item.scheduledAt));
  const now = Date.now();
  const historicalRequired = (activity.occurrences || []).filter(item => {
    if (generatedDates.has(item.scheduledAt)) return false;
    if (item.status !== 'Upcoming') return true;
    const scheduledTime = new Date(item.scheduledAt).getTime();
    return !Number.isNaN(scheduledTime) && scheduledTime < now;
  });
  return [...historicalRequired, ...generated].sort((a, b) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
};

export const getCampaignProgress = (campaign: Campaign) => {
  const occurrences = campaign.activities.flatMap(activity => activity.occurrences || []);
  const completed = occurrences.filter(item => item.status === 'Completed').length;
  const skipped = occurrences.filter(item => item.status === 'Skipped').length;
  const cancelled = occurrences.filter(item => item.status === 'Cancelled').length;
  const resolved = completed + skipped + cancelled;
  return {
    total: occurrences.length,
    completed,
    skipped,
    cancelled,
    resolved,
    percent: occurrences.length ? Math.round((resolved / occurrences.length) * 100) : 0
  };
};

export const getCampaignDisplayStatus = (campaign: Campaign, now = new Date()): string => {
  if (campaign.status === 'Paused' || campaign.status === 'Cancelled' || campaign.status === 'Completed' || campaign.status === 'Draft') {
    return campaign.status;
  }
  const progress = getCampaignProgress(campaign);
  if (progress.total > 0 && progress.resolved === progress.total) {
    return progress.completed === progress.total ? 'Completed' : 'Closed';
  }
  const hasOverdue = campaign.activities.some(activity =>
    (activity.occurrences || []).some(item => getOccurrenceViewStatus(item, now) === 'Overdue')
  );
  if (hasOverdue) return 'Overdue';
  const start = new Date(`${campaign.startDate}T00:00:00`);
  if (!Number.isNaN(start.getTime()) && start > now) return 'Scheduled';
  return 'Active';
};
