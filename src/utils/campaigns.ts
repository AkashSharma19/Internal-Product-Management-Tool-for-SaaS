import type { Campaign, CampaignActivity, CampaignOccurrence } from '../types';

export type CampaignOccurrenceViewStatus = CampaignOccurrence['status'] | 'Due today' | 'Overdue';

export const toLocalDateInput = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeCampaignDate = (value: string | undefined | null): string => {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : toLocalDateInput(parsed);
};

const parseCampaignDate = (value: string | undefined | null): Date | null => {
  const normalized = normalizeCampaignDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const getOccurrenceViewStatus = (
  occurrence: CampaignOccurrence,
  now = new Date()
): CampaignOccurrenceViewStatus => {
  if (occurrence.status !== 'Upcoming') return occurrence.status;
  const scheduled = parseCampaignDate(occurrence.scheduledAt);
  if (!scheduled) return 'Upcoming';
  const scheduledDay = startOfDay(scheduled).getTime();
  const today = startOfDay(now).getTime();
  if (scheduledDay < today) return 'Overdue';
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
    } else if (recurrence.unit === 'weeks') {
      next.setDate(next.getDate() + (interval * 7));
    } else {
      next.setDate(next.getDate() + interval);
    }
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const MAX_CAMPAIGN_OCCURRENCES = 120;

export const campaignRecurrenceExceedsLimit = (activity: CampaignActivity): boolean => {
  if (!activity.recurrence.enabled || activity.recurrence.endType !== 'date' || !activity.recurrence.endDate) return false;
  const end = parseCampaignDate(activity.recurrence.endDate);
  let cursor = parseCampaignDate(activity.scheduledAt);
  if (!cursor || !end) return false;
  for (let count = 1; count < MAX_CAMPAIGN_OCCURRENCES; count += 1) {
    const next = nextOccurrenceDate(cursor, activity);
    if (next <= cursor || next > end) return false;
    cursor = next;
  }
  const next = nextOccurrenceDate(cursor, activity);
  return next > cursor && next <= end;
};

const occurrenceDateKey = (value: string) => normalizeCampaignDate(value) || `raw:${value}`;

export const dedupeCampaignOccurrences = (occurrences: CampaignOccurrence[] = []): CampaignOccurrence[] => {
  const byDate = new Map<string, CampaignOccurrence>();
  occurrences.forEach(occurrence => {
    const key = occurrenceDateKey(occurrence.scheduledAt);
    const normalized = { ...occurrence, scheduledAt: normalizeCampaignDate(occurrence.scheduledAt) || occurrence.scheduledAt };
    const existing = byDate.get(key);
    if (!existing || (existing.status === 'Upcoming' && normalized.status !== 'Upcoming')) {
      byDate.set(key, normalized);
    }
  });
  return Array.from(byDate.values()).sort((a, b) =>
    occurrenceDateKey(a.scheduledAt).localeCompare(occurrenceDateKey(b.scheduledAt))
  );
};

export const generateCampaignOccurrences = (activity: CampaignActivity): CampaignOccurrence[] => {
  const firstDate = parseCampaignDate(activity.scheduledAt);
  if (!firstDate) return [];

  const previousOccurrences = dedupeCampaignOccurrences(activity.occurrences || []);
  const previousByDate = new Map(previousOccurrences.map(item => [occurrenceDateKey(item.scheduledAt), item]));

  if (!activity.recurrence.enabled) {
    const terminalOccurrence = previousOccurrences.find(item => item.status === 'Completed')
      || previousOccurrences.find(item => item.status === 'Skipped' || item.status === 'Cancelled');
    if (terminalOccurrence) return [terminalOccurrence];

    const scheduledAt = toLocalDateInput(firstDate);
    return [previousByDate.get(occurrenceDateKey(scheduledAt)) || {
      id: `${activity.id}-occ-${firstDate.getTime()}`,
      scheduledAt,
      status: 'Upcoming' as const
    }];
  }

  const dates: Date[] = [firstDate];
  const maxOccurrences = MAX_CAMPAIGN_OCCURRENCES;
  if (activity.recurrence.endType === 'date' && activity.recurrence.endDate) {
    const end = parseCampaignDate(activity.recurrence.endDate);
    if (end) {
      let cursor = firstDate;
      while (dates.length < maxOccurrences) {
        const next = nextOccurrenceDate(cursor, activity);
        if (next <= cursor || next > end) break;
        dates.push(next);
        cursor = next;
      }
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

  const generated = dates.map(date => {
    const scheduledAt = toLocalDateInput(date);
    return previousByDate.get(occurrenceDateKey(scheduledAt)) || {
      id: `${activity.id}-occ-${date.getTime()}`,
      scheduledAt,
      status: 'Upcoming' as const
    };
  });

  const generatedDates = new Set(generated.map(item => occurrenceDateKey(item.scheduledAt)));
  const today = startOfDay(new Date()).getTime();
  const historicalRequired = previousOccurrences.filter(item => {
    if (generatedDates.has(occurrenceDateKey(item.scheduledAt))) return false;
    if (item.status !== 'Upcoming') return true;
    const scheduled = parseCampaignDate(item.scheduledAt);
    return Boolean(scheduled && activity.recurrence.enabled && scheduled.getTime() < today);
  });
  return dedupeCampaignOccurrences([...historicalRequired, ...generated]);
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
  return 'Active';
};
