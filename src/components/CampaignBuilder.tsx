import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Link2,
  Megaphone,
  Plus,
  Repeat2,
  Trash2,
  X
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import type {
  Campaign,
  CampaignActivity,
  CampaignAudience,
  CampaignOccurrence,
  CampaignOccurrenceStatus,
  ProductItem
} from '../types';
import {
  campaignRecurrenceExceedsLimit,
  dedupeCampaignOccurrences,
  generateCampaignOccurrences,
  getCampaignProgress,
  getOccurrenceViewStatus,
  normalizeCampaignDate,
  toLocalDateInput
} from '../utils/campaigns';
import './CampaignBuilder.css';

const CHANNELS: CampaignActivity['channel'][] = [
  'Email', 'WhatsApp', 'In-app announcement', 'LMS announcement',
  'Push notification', 'Webinar/demo', 'Social media', 'Help article',
  'Internal announcement', 'Other'
];

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatDate = (value: string) => {
  const normalized = normalizeCampaignDate(value);
  if (!normalized) return value || '—';
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric'
  });
};

const statusClass = (status: string) => `status-${status.toLowerCase().replace(/\s+/g, '-')}`;

const getFeatureSupportDocs = (feature: Campaign['features'][number] | undefined) => {
  if (!feature) return [];
  if (Array.isArray(feature.supportDocs) && feature.supportDocs.length > 0) {
    return feature.supportDocs.filter(doc => doc && (doc.link || doc.name));
  }
  return feature.supportDocLink
    ? [{ id: `support-${feature.id}`, name: 'Support Document', link: feature.supportDocLink }]
    : [];
};

const normalizeExternalLink = (link: string) => /^https?:\/\//i.test(link) ? link : `https://${link}`;

const createFeatureCampaign = (ownerId = '', ownerName = ''): Campaign => ({
    id: makeId('campaign'),
    name: '',
    objective: 'Feature awareness',
    description: '',
    audience: 'Students',
    ownerId,
    ownerName,
    priority: 'Medium',
    startDate: '',
    endDate: '',
    status: 'Active',
    features: [],
    activities: [],
    createdById: ownerId,
    createdByName: ownerName
  });

const createCommunication = (campaign: Campaign): CampaignActivity => ({
  id: makeId('campaign-communication'),
  title: '',
  channel: 'Email',
  ownerId: campaign.ownerId,
  ownerName: campaign.ownerName,
  scheduledAt: toLocalDateInput(new Date(Date.now() + 86_400_000)),
  content: '',
  callToAction: '',
  supportingLink: '',
  recurrence: {
    enabled: false,
    frequency: 'weekly',
    interval: 1,
    unit: 'weeks',
    endType: 'count',
    occurrenceCount: 4,
    endDate: ''
  },
  occurrences: []
});

type CommunicationEditor =
  | { mode: 'create'; campaignId: string; activity: CampaignActivity; scheduleDirty: boolean }
  | { mode: 'edit'; campaignId: string; activity: CampaignActivity; originalActivityId: string; originalIndex: number; scheduleDirty: boolean };
type CommunicationRow = { activity: CampaignActivity; occurrence: CampaignOccurrence; occurrenceIndex: number };

export const CampaignBuilder: React.FC = () => {
  const {
    campaigns,
    speakers,
    currentUser,
    canUserEdit,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    confirm,
    alert
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [featureEditor, setFeatureEditor] = useState<Campaign | null>(null);
  const [communicationEditor, setCommunicationEditor] = useState<CommunicationEditor | null>(null);
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureResults, setFeatureResults] = useState<ProductItem[]>([]);
  const [isSearchingFeatures, setIsSearchingFeatures] = useState(false);
  const [featureSearchError, setFeatureSearchError] = useState('');
  const featureSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featureSearchSequenceRef = useRef(0);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const owners = useMemo(() => speakers.filter(speaker => speaker.role !== 'Guest'), [speakers]);

  const filteredCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return campaigns.filter(campaign => {
      const feature = campaign.features[0];
      const searchText = [
        feature?.feature || campaign.name,
        feature?.product || '',
        campaign.ownerName,
        campaign.audience,
        ...campaign.activities.map(activity => `${activity.title} ${activity.channel} ${activity.customChannel || ''}`)
      ].join(' ').toLowerCase();
      return (!query || searchText.includes(query))
        && (!audienceFilter || campaign.audience === audienceFilter)
        && (!ownerFilter || campaign.ownerId === ownerFilter)
        && (!channelFilter || campaign.activities.some(activity => activity.channel === channelFilter));
    });
  }, [campaigns, searchQuery, audienceFilter, ownerFilter, channelFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = filteredCampaigns.length === 0 ? 0 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCampaigns.length);
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  const visibleFeatures = useMemo(() => {
    const usedFeatureIds = new Set(campaigns
      .filter(campaign => campaign.id !== featureEditor?.id)
      .flatMap(campaign => campaign.features.map(feature => feature.id)));
    return featureResults.filter(feature => !usedFeatureIds.has(feature.id));
  }, [featureResults, campaigns, featureEditor?.id]);

  const handleFeatureSearch = (value: string) => {
    setFeatureSearch(value);
    setFeatureSearchError('');
    featureSearchSequenceRef.current += 1;
    const sequence = featureSearchSequenceRef.current;
    if (featureSearchTimerRef.current) clearTimeout(featureSearchTimerRef.current);

    const query = value.trim();
    if (query.length < 2) {
      setFeatureResults([]);
      setIsSearchingFeatures(false);
      return;
    }

    setFeatureResults([]);
    setIsSearchingFeatures(true);
    featureSearchTimerRef.current = setTimeout(async () => {
      try {
        const savedUserId = localStorage.getItem('logged-in-user-id') || '';
        const response = await fetch(`/api/data?action=global-search&q=${encodeURIComponent(query)}`, {
          headers: savedUserId ? { 'x-user-id': savedUserId } : {}
        });
        const result = await response.json().catch(() => ({}));
        if (sequence !== featureSearchSequenceRef.current) return;
        if (!response.ok || !result.success) {
          throw new Error(result.error || `Feature search failed (${response.status})`);
        }
        const searchItems = Array.isArray(result.data)
          ? result.data as Array<{ tab?: string; rawItem?: ProductItem }>
          : [];
        const productMatches = searchItems
          .filter(item => item.tab === 'product' && item.rawItem)
          .map(item => item.rawItem as ProductItem);
        setFeatureResults(productMatches);
      } catch (error) {
        if (sequence === featureSearchSequenceRef.current) {
          setFeatureResults([]);
          setFeatureSearchError(error instanceof Error ? error.message : 'Unable to search features.');
        }
      } finally {
        if (sequence === featureSearchSequenceRef.current) setIsSearchingFeatures(false);
      }
    }, 300);
  };

  const openAddFeature = () => {
    setFormError('');
    setFeatureSearch('');
    setFeatureResults([]);
    setFeatureSearchError('');
    setFeatureEditor(createFeatureCampaign(currentUser?.id || '', currentUser?.name || ''));
  };

  const openEditFeature = (campaign: Campaign) => {
    setFormError('');
    setFeatureSearch('');
    setFeatureResults([]);
    setFeatureSearchError('');
    setFeatureEditor(JSON.parse(JSON.stringify(campaign)));
  };

  const selectFeature = (feature: ProductItem) => {
    if (!featureEditor) return;
    setFeatureEditor({
      ...featureEditor,
      name: feature.feature,
      features: [{
        id: feature.id,
        feature: feature.feature,
        product: feature.product,
        status: feature.status || feature.clickupStatus || '',
        finalRelease: feature.finalRelease || '',
        supportDocsRequired: !!feature.supportDocsRequired,
        supportDocLink: feature.supportDocLink || '',
        supportDocs: feature.supportDocs || []
      }]
    });
  };

  const saveFeature = async () => {
    if (!featureEditor) return;
    if (!featureEditor.features[0]) return setFormError('Select a feature from the existing list.');
    if (!featureEditor.ownerId) return setFormError('Select a campaign owner.');

    setIsSaving(true);
    setFormError('');
    const exists = campaigns.some(campaign => campaign.id === featureEditor.id);
    const saved = exists
      ? await updateCampaign(featureEditor.id, featureEditor)
      : await addCampaign(featureEditor);
    setIsSaving(false);
    if (saved) {
      setFeatureEditor(null);
      setExpandedCampaignId(featureEditor.id);
    } else {
      setFormError('Could not save this feature campaign. Please try again.');
    }
  };

  const handleCampaignOwnerChange = (campaign: Campaign, ownerId: string) => {
    const owner = owners.find(item => item.id === ownerId);
    updateCampaign(campaign.id, { ownerId, ownerName: owner?.name || '' });
  };

  const handleFeatureDelete = async (campaign: Campaign) => {
    const featureName = campaign.features[0]?.feature || campaign.name;
    const ok = await confirm(
      `Delete “${featureName}” and all communication tracking below it?`,
      'Delete Campaign Feature', 'Delete', 'Cancel', 'danger'
    );
    if (!ok) return;
    const deleted = await deleteCampaign(campaign.id);
    if (!deleted) await alert('Could not delete this campaign feature.', 'Delete Failed', 'OK', 'danger');
    if (expandedCampaignId === campaign.id) setExpandedCampaignId(null);
  };

  const openAddCommunication = (campaign: Campaign) => {
    setFormError('');
    setCommunicationEditor({ mode: 'create', campaignId: campaign.id, activity: createCommunication(campaign), scheduleDirty: true });
  };

  const openEditCommunication = (campaign: Campaign, activity: CampaignActivity) => {
    setFormError('');
    const originalIndex = campaign.activities.findIndex(item => item === activity);
    const canonicalId = typeof activity.id === 'string' && activity.id.trim()
      ? activity.id
      : makeId('campaign-communication');
    const normalizedActivity = { ...activity, id: canonicalId };
    setCommunicationEditor({
      mode: 'edit',
      campaignId: campaign.id,
      activity: JSON.parse(JSON.stringify(normalizedActivity)),
      originalActivityId: typeof activity.id === 'string' ? activity.id : '',
      originalIndex,
      scheduleDirty: false
    });
  };

  const updateCommunicationDraft = (updates: Partial<CampaignActivity>) => {
    setCommunicationEditor(previous => previous ? {
      ...previous,
      scheduleDirty: previous.scheduleDirty || Object.prototype.hasOwnProperty.call(updates, 'scheduledAt'),
      activity: { ...previous.activity, ...updates }
    } : previous);
  };

  const updateRecurrenceDraft = (updates: Partial<CampaignActivity['recurrence']>) => {
    setCommunicationEditor(previous => previous ? {
      ...previous,
      scheduleDirty: true,
      activity: {
        ...previous.activity,
        recurrence: { ...previous.activity.recurrence, ...updates }
      }
    } : previous);
  };

  const saveCommunication = async () => {
    if (!communicationEditor) return;
    const campaign = campaigns.find(item => item.id === communicationEditor.campaignId);
    if (!campaign) return setFormError('The parent feature could not be found.');
    const activity = communicationEditor.activity;
    if (!activity.title.trim()) return setFormError('Communication title is required.');
    if (!activity.ownerId) return setFormError('Select a communication owner.');
    if (!activity.scheduledAt) return setFormError('Planned date is required.');
    if (activity.channel === 'Other' && !activity.customChannel?.trim()) return setFormError('Enter the custom channel name.');
    if (activity.recurrence.enabled && activity.recurrence.endType === 'date' && !activity.recurrence.endDate) {
      return setFormError('Select when the recurring communication should end.');
    }
    if (campaignRecurrenceExceedsLimit(activity)) {
      return setFormError('This recurrence creates more than 120 rows. Shorten the date range or use a less frequent schedule.');
    }
    const normalizedActivity: CampaignActivity = {
      ...activity,
      title: activity.title.trim(),
      scheduledAt: normalizeCampaignDate(activity.scheduledAt),
      content: activity.content.trim(),
      customChannel: activity.customChannel?.trim() || '',
      callToAction: activity.callToAction?.trim() || '',
      supportingLink: activity.supportingLink?.trim() || ''
    };
    let activities: CampaignActivity[];
    if (communicationEditor.mode === 'edit') {
      let editIndex = communicationEditor.originalActivityId
        ? campaign.activities.findIndex(item => item.id === communicationEditor.originalActivityId)
        : communicationEditor.originalIndex;
      if (editIndex < 0 && communicationEditor.originalIndex < campaign.activities.length) {
        editIndex = communicationEditor.originalIndex;
      }
      if (editIndex < 0 || editIndex >= campaign.activities.length) {
        return setFormError('This communication changed while you were editing it. Close the form and try again.');
      }

      const currentActivity = campaign.activities[editIndex];
      if (communicationEditor.scheduleDirty || !normalizedActivity.recurrence.enabled) {
        normalizedActivity.occurrences = generateCampaignOccurrences({
          ...normalizedActivity,
          occurrences: currentActivity.occurrences || []
        });
      } else {
        normalizedActivity.occurrences = dedupeCampaignOccurrences(currentActivity.occurrences || []);
      }
      activities = campaign.activities.map((item, index) => index === editIndex ? normalizedActivity : item);
    } else {
      normalizedActivity.occurrences = generateCampaignOccurrences(normalizedActivity);
      activities = [...campaign.activities, normalizedActivity];
    }
    setIsSaving(true);
    const saved = await updateCampaign(campaign.id, { activities });
    setIsSaving(false);
    if (saved) setCommunicationEditor(null);
    else setFormError('Could not save this communication. Please try again.');
  };

  const deleteCommunication = async (campaign: Campaign, activity: CampaignActivity) => {
    const ok = await confirm(`Delete “${activity.title}” and all its occurrences?`, 'Delete Communication', 'Delete', 'Cancel', 'danger');
    if (!ok) return;
    await updateCampaign(campaign.id, {
      activities: campaign.activities.filter(item => item.id !== activity.id)
    });
  };

  const updateOccurrence = async (
    campaign: Campaign,
    activityId: string,
    occurrenceId: string,
    status: CampaignOccurrenceStatus
  ) => {
    if (!canUserEdit) return;
    const activities = campaign.activities.map(activity => activity.id !== activityId ? activity : {
      ...activity,
      occurrences: activity.occurrences.map(occurrence => occurrence.id !== occurrenceId ? occurrence : {
        ...occurrence,
        status,
        completedAt: status === 'Completed' ? new Date().toISOString() : '',
        completedById: status === 'Completed' ? currentUser?.id || '' : '',
        completedByName: status === 'Completed' ? currentUser?.name || '' : ''
      })
    });
    await updateCampaign(campaign.id, { activities });
  };

  const getCommunicationRows = (campaign: Campaign): CommunicationRow[] => campaign.activities
    .flatMap(activity => {
      const occurrences = activity.recurrence.enabled
        ? (activity.occurrences.length ? dedupeCampaignOccurrences(activity.occurrences) : generateCampaignOccurrences(activity))
        : generateCampaignOccurrences(activity);
      return occurrences.map((occurrence, occurrenceIndex) => ({ activity, occurrence, occurrenceIndex }));
    })
    .sort((a, b) => normalizeCampaignDate(a.occurrence.scheduledAt).localeCompare(normalizeCampaignDate(b.occurrence.scheduledAt)));

  return (
    <TabContainer
      title="Campaign Builder"
      searchQuery={searchQuery}
      setSearchQuery={(value) => { setSearchQuery(value); setCurrentPage(1); }}
      searchPlaceholder="Search features or communications..."
      onAddClick={openAddFeature}
      addLabel="Add Feature"
      filterComponent={
        <div className="campaign-filters">
          <select className="filter-select" value={audienceFilter} onChange={event => { setAudienceFilter(event.target.value); setCurrentPage(1); }}>
            <option value="">All audiences</option><option>Staff</option><option>Students</option>
          </select>
          <select className="filter-select" value={ownerFilter} onChange={event => { setOwnerFilter(event.target.value); setCurrentPage(1); }}>
            <option value="">All owners</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
          <select className="filter-select" value={channelFilter} onChange={event => { setChannelFilter(event.target.value); setCurrentPage(1); }}>
            <option value="">All channels</option>{CHANNELS.map(channel => <option key={channel}>{channel}</option>)}
          </select>
        </div>
      }
    >
      <div className="campaign-table-shell">
        <div className="table-responsive">
          <table className="grid-table campaign-parent-table">
            <thead><tr>
              <th style={{ minWidth: 300 }}>Feature</th>
              <th style={{ minWidth: 140 }}>Product</th>
              <th style={{ minWidth: 110 }}>Audience</th>
              <th style={{ minWidth: 160 }}>Campaign Owner</th>
              <th style={{ minWidth: 170 }}>Support Docs</th>
              <th style={{ minWidth: 125 }}>Comms Progress</th>
              <th style={{ width: 80 }}></th>
            </tr></thead>
            <tbody>
              {filteredCampaigns.length === 0 ? <tr><td colSpan={7} className="campaign-empty-cell"><Megaphone size={30} /><strong>{campaigns.length ? 'No features match your filters.' : 'No campaign features yet.'}</strong><span>Use Add Feature, then add communications below it.</span></td></tr> : paginatedCampaigns.map(campaign => {
                const feature = campaign.features[0];
                const isExpanded = expandedCampaignId === campaign.id;
                const progress = getCampaignProgress(campaign);
                const rows = getCommunicationRows(campaign);
                const supportDocs = getFeatureSupportDocs(feature);
                return <React.Fragment key={campaign.id}>
                  <tr className={isExpanded ? 'campaign-parent-expanded' : ''} onClick={() => setExpandedCampaignId(isExpanded ? null : campaign.id)} style={{ cursor: 'pointer' }}>
                    <td><div className="campaign-feature-cell">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}<div><strong>{feature?.feature || campaign.name}</strong><div className="campaign-muted">{campaign.activities.length} communication{campaign.activities.length === 1 ? '' : 's'} • {rows.length} scheduled item{rows.length === 1 ? '' : 's'}</div></div></div></td>
                    <td>{feature?.product || '—'}</td>
                    <td onClick={event => event.stopPropagation()}>{canUserEdit ? <select className="campaign-inline-select" value={campaign.audience} onChange={event => updateCampaign(campaign.id, { audience: event.target.value as CampaignAudience })}><option>Staff</option><option>Students</option></select> : campaign.audience}</td>
                    <td onClick={event => event.stopPropagation()}>{canUserEdit ? <select className="campaign-inline-select" value={campaign.ownerId} onChange={event => handleCampaignOwnerChange(campaign, event.target.value)}>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select> : campaign.ownerName}</td>
                    <td onClick={event => event.stopPropagation()}>{supportDocs.length ? <div className="campaign-support-links">{supportDocs.map(doc => <a key={doc.id} href={normalizeExternalLink(doc.link)} target="_blank" rel="noopener noreferrer" title={doc.name}><BookOpen size={11} /> {doc.name || 'Support Doc'}</a>)}</div> : feature?.supportDocsRequired ? <span className="campaign-doc-missing">Required • Not added</span> : <span className="campaign-muted">Not added</span>}</td>
                    <td><div className="campaign-progress-label">{progress.resolved}/{progress.total} ({progress.percent}%)</div><div className="campaign-progress"><span style={{ width: `${progress.percent}%` }} /></div></td>
                    <td onClick={event => event.stopPropagation()}><div className="campaign-row-actions">{canUserEdit && <><button title="Edit feature campaign" onClick={() => openEditFeature(campaign)}><Edit3 size={13} /></button><button className="danger" title="Delete feature campaign" onClick={() => handleFeatureDelete(campaign)}><Trash2 size={13} /></button></>}</div></td>
                  </tr>
                  {isExpanded && <tr className="campaign-expanded-row"><td colSpan={7}>
                    <div className="campaign-related-wrap">
                      <div className="campaign-expanded-card">
                        <div className="campaign-expanded-top">
                          <div className="campaign-notes-block">
                            <label>Campaign Notes</label>
                            {canUserEdit ? (
                              <textarea
                                key={`${campaign.id}-${campaign.updatedAt || ''}`}
                                defaultValue={campaign.description || ''}
                                placeholder="Enter communication planning notes..."
                                onClick={event => event.stopPropagation()}
                                onBlur={event => {
                                  if (event.target.value !== (campaign.description || '')) {
                                    updateCampaign(campaign.id, { description: event.target.value });
                                  }
                                }}
                              />
                            ) : (
                              <div className="campaign-notes-readonly">{campaign.description || 'No campaign notes added.'}</div>
                            )}
                          </div>
                          <div className="campaign-docs-block">
                            <label>Support Documentation</label>
                            {supportDocs.length ? supportDocs.map(doc => (
                              <a key={doc.id} href={normalizeExternalLink(doc.link)} target="_blank" rel="noopener noreferrer">
                                <BookOpen size={13} /> <span>{doc.name || 'Support Document'}</span> <ExternalLink size={10} />
                              </a>
                            )) : (
                              <div className={feature?.supportDocsRequired ? 'campaign-doc-missing' : 'campaign-muted'}>
                                {feature?.supportDocsRequired ? 'Support docs required but no link is added.' : 'No support docs linked to this feature.'}
                              </div>
                            )}
                          </div>
                        </div>
                        <hr className="campaign-section-divider" />
                        <div className="campaign-related-header"><div><strong>Related Communications</strong><span>Communications planned for {feature?.feature || campaign.name}</span></div>{canUserEdit && <button className="btn btn-secondary btn-sm" onClick={() => openAddCommunication(campaign)}><Plus size={13} /> Add Communication</button>}</div>
                      {rows.length === 0 ? <div className="campaign-related-empty"><Megaphone size={25} /><span>No communications added for this feature.</span>{canUserEdit && <button className="btn btn-secondary btn-sm" onClick={() => openAddCommunication(campaign)}>Create one now</button>}</div> : <div className="table-responsive campaign-related-table-wrap"><table className="grid-table campaign-related-table"><thead><tr><th style={{ width: 54 }}>Done</th><th style={{ minWidth: 240 }}>Communication</th><th style={{ minWidth: 140 }}>Channel</th><th style={{ minWidth: 150 }}>Owner</th><th style={{ minWidth: 180 }}>Planned For</th><th style={{ minWidth: 100 }}>Recurring</th><th style={{ minWidth: 115 }}>Status</th><th style={{ width: 90 }}></th></tr></thead><tbody>{rows.map(({ activity, occurrence, occurrenceIndex }) => {
                        const viewStatus = getOccurrenceViewStatus(occurrence);
                        return <tr key={occurrence.id}>
                          <td><input className="campaign-done-checkbox" type="checkbox" title="Mark as done" disabled={!canUserEdit || occurrence.status === 'Skipped' || occurrence.status === 'Cancelled'} checked={occurrence.status === 'Completed'} onChange={event => updateOccurrence(campaign, activity.id, occurrence.id, event.target.checked ? 'Completed' : 'Upcoming')} /></td>
                          <td><div className="campaign-communication-title">{activity.title}{activity.recurrence.enabled && <span className="campaign-occurrence-number">#{occurrenceIndex + 1}</span>}</div>{activity.content && <div className="campaign-communication-preview">{activity.content}</div>}{activity.callToAction && <div className="campaign-muted">CTA: {activity.callToAction}</div>}</td>
                          <td><span className="campaign-badge">{activity.channel === 'Other' ? activity.customChannel : activity.channel}</span></td>
                          <td>{activity.ownerName || '—'}</td>
                          <td>{formatDate(occurrence.scheduledAt)}</td>
                          <td>{activity.recurrence.enabled ? <span className="campaign-badge"><Repeat2 size={10} /> Yes</span> : 'No'}</td>
                          <td>{canUserEdit ? <select className={`campaign-status-select ${statusClass(viewStatus)}`} value={occurrence.status} onChange={event => updateOccurrence(campaign, activity.id, occurrence.id, event.target.value as CampaignOccurrenceStatus)}><option value="Upcoming">{viewStatus === 'Upcoming' ? 'Upcoming' : viewStatus}</option><option value="Completed">Completed</option><option value="Skipped">Skipped</option><option value="Cancelled">Cancelled</option></select> : <span className={`campaign-badge ${statusClass(viewStatus)}`}>{viewStatus}</span>}</td>
                          <td><div className="campaign-row-actions">{activity.supportingLink && <a href={activity.supportingLink} target="_blank" rel="noopener noreferrer" title="Open supporting link"><Link2 size={13} /><ExternalLink size={9} /></a>}{canUserEdit && <><button title="Edit communication" onClick={() => openEditCommunication(campaign, activity)}><Edit3 size={13} /></button><button className="danger" title="Delete communication" onClick={() => deleteCommunication(campaign, activity)}><Trash2 size={13} /></button></>}</div></td>
                        </tr>;
                      })}</tbody></table></div>}
                      </div>
                    </div>
                  </td></tr>}
                </React.Fragment>;
              })}
            </tbody>
          </table>
        </div>
        <div className="campaign-pagination">
          <div className="campaign-pagination-summary">
            Showing {filteredCampaigns.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredCampaigns.length} entries
          </div>
          <div className="campaign-pagination-controls">
            <label>
              <span>Rows per page:</span>
              <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <button className="btn btn-secondary btn-sm" disabled={activePage === 1} onClick={() => setCurrentPage(Math.max(1, activePage - 1))}>Previous</button>
            <span>Page {activePage} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={activePage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}>Next</button>
          </div>
        </div>
      </div>

      {featureEditor && <div className="campaign-modal-overlay" onClick={() => setFeatureEditor(null)}><div className="campaign-modal" onClick={event => event.stopPropagation()}>
        <div className="campaign-modal-header"><div><h2>{campaigns.some(campaign => campaign.id === featureEditor.id) ? 'Edit Campaign Feature' : 'Add Feature to Campaign Builder'}</h2><p>Select the feature first. Communications are added after saving.</p></div><button onClick={() => setFeatureEditor(null)}><X size={18} /></button></div>
        <div className="campaign-modal-body">{formError && <div className="campaign-error">{formError}</div>}
          <div className="campaign-field campaign-form-full"><label>Feature * {featureEditor.features[0] && <span className="campaign-selected-feature">Selected: {featureEditor.features[0].feature}</span>}</label><div className="campaign-feature-picker"><div className="campaign-feature-search"><input value={featureSearch} onChange={event => handleFeatureSearch(event.target.value)} placeholder="Type at least 2 characters to search..." /></div><div className="campaign-feature-list">{visibleFeatures.map(feature => { const selected = featureEditor.features[0]?.id === feature.id; return <button type="button" className={`campaign-feature-option ${selected ? 'selected' : ''}`} key={feature.id} onClick={() => selectFeature(feature)}><span className="campaign-feature-check">{selected && <Check size={12} />}</span><span><strong>{feature.feature}</strong><small>{feature.product || 'No product'} • {feature.status || feature.clickupStatus || 'No status'}</small></span></button>; })}{!visibleFeatures.length && <div className={`campaign-picker-empty${featureSearchError ? ' error' : ''}`}>{isSearchingFeatures ? 'Searching features...' : featureSearchError || (featureSearch.trim().length < 2 ? 'Type at least 2 characters to find a feature.' : 'No matching available features found.')}</div>}</div></div></div>
          <div className="campaign-form-grid" style={{ marginTop: 14 }}>
            <div className="campaign-field"><label>Audience *</label><select value={featureEditor.audience} onChange={event => setFeatureEditor({ ...featureEditor, audience: event.target.value as CampaignAudience })}><option>Staff</option><option>Students</option></select></div>
            <div className="campaign-field"><label>Campaign owner *</label><select value={featureEditor.ownerId} onChange={event => { const owner = owners.find(item => item.id === event.target.value); setFeatureEditor({ ...featureEditor, ownerId: event.target.value, ownerName: owner?.name || '' }); }}><option value="">Select owner</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></div>
            <div className="campaign-field campaign-form-full"><label>Notes</label><textarea value={featureEditor.description || ''} onChange={event => setFeatureEditor({ ...featureEditor, description: event.target.value })} placeholder="Optional campaign notes for this feature" /></div>
          </div>
        </div>
        <div className="campaign-modal-footer"><button className="btn btn-secondary" onClick={() => setFeatureEditor(null)}>Cancel</button><button className="btn btn-primary" disabled={isSaving} onClick={saveFeature}>{isSaving ? 'Saving...' : 'Save Feature'}</button></div>
      </div></div>}

      {communicationEditor && (() => { const campaign = campaigns.find(item => item.id === communicationEditor.campaignId); const activity = communicationEditor.activity; const isExisting = communicationEditor.mode === 'edit'; return <div className="campaign-modal-overlay" onClick={() => setCommunicationEditor(null)}><div className="campaign-modal campaign-modal-wide" onClick={event => event.stopPropagation()}>
        <div className="campaign-modal-header"><div><h2>{isExisting ? 'Edit Communication' : 'Add Communication'}</h2><p>{campaign?.features[0]?.feature || campaign?.name}</p></div><button onClick={() => setCommunicationEditor(null)}><X size={18} /></button></div>
        <div className="campaign-modal-body">{formError && <div className="campaign-error">{formError}</div>}<div className="campaign-form-grid">
          <div className="campaign-field campaign-form-full"><label>Communication title *</label><input value={activity.title} onChange={event => updateCommunicationDraft({ title: event.target.value })} placeholder="e.g. Send feature launch email" /></div>
          <div className="campaign-field"><label>Channel *</label><select value={activity.channel} onChange={event => updateCommunicationDraft({ channel: event.target.value as CampaignActivity['channel'] })}>{CHANNELS.map(channel => <option key={channel}>{channel}</option>)}</select></div>
          {activity.channel === 'Other' && <div className="campaign-field"><label>Custom channel *</label><input value={activity.customChannel || ''} onChange={event => updateCommunicationDraft({ customChannel: event.target.value })} /></div>}
          <div className="campaign-field"><label>Owner *</label><select value={activity.ownerId} onChange={event => { const owner = owners.find(item => item.id === event.target.value); updateCommunicationDraft({ ownerId: event.target.value, ownerName: owner?.name || '' }); }}><option value="">Select owner</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></div>
          <div className="campaign-field"><label>Planned date *</label><input type="date" value={normalizeCampaignDate(activity.scheduledAt)} onChange={event => updateCommunicationDraft({ scheduledAt: event.target.value })} /></div>
          <div className="campaign-field campaign-form-full"><label>Communication content</label><textarea value={activity.content} onChange={event => updateCommunicationDraft({ content: event.target.value })} placeholder="Draft the email, WhatsApp message, announcement or agenda..." /></div>
          <div className="campaign-field"><label>Call to action</label><input value={activity.callToAction || ''} onChange={event => updateCommunicationDraft({ callToAction: event.target.value })} /></div>
          <div className="campaign-field"><label>Supporting link</label><input type="url" value={activity.supportingLink || ''} onChange={event => updateCommunicationDraft({ supportingLink: event.target.value })} placeholder="https://..." /></div>
        </div><div className="campaign-recurrence"><label className="campaign-checkline"><input type="checkbox" checked={activity.recurrence.enabled} onChange={event => updateRecurrenceDraft({ enabled: event.target.checked })} /> Recurring communication</label>{activity.recurrence.enabled && <div className="campaign-form-grid" style={{ marginTop: 12 }}>
          <div className="campaign-field"><label>Frequency</label><select value={activity.recurrence.frequency} onChange={event => updateRecurrenceDraft({ frequency: event.target.value as CampaignActivity['recurrence']['frequency'] })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></div>
          {activity.recurrence.frequency === 'custom' && <><div className="campaign-field"><label>Repeat every</label><input type="number" min="1" max="60" value={activity.recurrence.interval} onChange={event => updateRecurrenceDraft({ interval: Math.max(1, Number(event.target.value)) })} /></div><div className="campaign-field"><label>Unit</label><select value={activity.recurrence.unit} onChange={event => updateRecurrenceDraft({ unit: event.target.value as CampaignActivity['recurrence']['unit'] })}><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></div></>}
          <div className="campaign-field"><label>Ends</label><select value={activity.recurrence.endType} onChange={event => updateRecurrenceDraft({ endType: event.target.value as 'date' | 'count' })}><option value="count">After occurrences</option><option value="date">On a date</option></select></div>
          {activity.recurrence.endType === 'count' ? <div className="campaign-field"><label>Number of occurrences</label><input type="number" min="1" max="120" value={activity.recurrence.occurrenceCount || 1} onChange={event => updateRecurrenceDraft({ occurrenceCount: Math.min(120, Math.max(1, Number(event.target.value))) })} /></div> : <div className="campaign-field"><label>End date</label><input type="date" value={activity.recurrence.endDate || ''} onChange={event => updateRecurrenceDraft({ endDate: event.target.value })} /></div>}
          <div className="campaign-field"><label>Planned rows</label><div className="campaign-planned-count">{generateCampaignOccurrences(activity).length}{campaignRecurrenceExceedsLimit(activity) ? '+ (shorten schedule)' : ''}</div></div>
        </div>}</div></div>
        <div className="campaign-modal-footer"><button className="btn btn-secondary" onClick={() => setCommunicationEditor(null)}>Cancel</button><button className="btn btn-primary" disabled={isSaving} onClick={saveCommunication}>{isSaving ? 'Saving...' : 'Save Communication'}</button></div>
      </div></div>; })()}
    </TabContainer>
  );
};
