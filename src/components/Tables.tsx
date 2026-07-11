import React, { useState, useRef, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { 
  Trash2, 
  Edit2,
  ExternalLink, 
  X,
  Check,
  ArrowLeft,
  AlertCircle,
  Palette,
  Code,
  Sparkles,
  Calendar,
  User,
  Flag,
  CheckSquare,
  Star,
  Link,
  Inbox,
  CheckCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Search,
  Plus,
  Layers,
  ClipboardList
} from 'lucide-react';
import type { 
  ProductItem, 
  PlanItem, 
  StudentProject, 
  AMASession,
  StudentMeeting, 
  AdminCall, 
  TarunSirMeeting,
  ContentItem, 
  DailyIssue, 
  FeatureAdoption 
} from '../types';

// Global POC/Assignee color mapping and badge styling
const getPOCBadgeStyle = (name: string) => {
  if (!name) return {};
  
  // Custom HSL lookup for known speakers (matching sidebar / priority styles)
  const ASSIGNEE_COLORS: Record<string, { h: number; s: number; l: number }> = {
    'akash': { h: 262, s: 80, l: 60 },      // Purple
    'anushka': { h: 330, s: 75, l: 55 },    // Pink
    'nikhil': { h: 199, s: 98, l: 45 },     // Blue
    'nikhil jain': { h: 162, s: 94, l: 35 },// Green
    'tarun': { h: 0, s: 72, l: 50 },        // Red
    'tarun sir': { h: 0, s: 72, l: 50 },
  };

  const cleanName = name.trim().toLowerCase();
  let colorParts = { h: 215, s: 15, l: 60 }; // Default gray

  // Try exact lookup first
  if (ASSIGNEE_COLORS[cleanName]) {
    colorParts = ASSIGNEE_COLORS[cleanName];
  } else {
    // Try partial match
    let found = false;
    for (const key of Object.keys(ASSIGNEE_COLORS)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        colorParts = ASSIGNEE_COLORS[key];
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Generate a beautiful, stable HSL color based on string hash
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorParts = {
        h: Math.abs(hash) % 360,
        s: 65,
        l: 50
      };
    }
  }

  const { h, s } = colorParts;
  
  // Check if current theme is light or dark
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  
  // Theme-specific lightness and opacity matching priority badges in index.css
  const textLightness = isLight ? 35 : colorParts.l;
  const bgOpacity = isLight ? '0.08' : '0.15';
  const borderOpacity = isLight ? '0.18' : '0.3';

  return {
    backgroundColor: `hsla(${h}, ${s}%, ${textLightness}%, ${bgOpacity})`,
    color: `hsl(${h}, ${s}%, ${textLightness}%)`,
    borderColor: `hsla(${h}, ${s}%, ${textLightness}%, ${borderOpacity})`,
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1
  };
};

const AttendeeFeedbackDetails: React.FC<{
  itemId: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
}> = ({ itemId, category }) => {
  const { formConfigs, feedbackSubmissions, currentUser, confirm, deleteFeedbackSubmission } = useDashboard();
  const [copied, setCopied] = useState(false);
  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;

  const config = formConfigs.find(c => c.category === category);
  const isFormConfigured = config && config.enabled && config.fields && config.fields.length > 0;
  const submissions = feedbackSubmissions.filter(sub => sub.itemId === itemId);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/?feedback=${itemId}&category=${category}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isFormConfigured) {
    return (
      <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--background-alt)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-secondary)' }}>Attendee Feedback Portal</h5>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {"Feedback form is currently not configured or disabled in Configuration -> Form Builder."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Averages for rating fields
  const ratingFields = config.fields.filter(f => f.type === 'rating');
  const ratingsSummary = ratingFields.map(field => {
    const scores = submissions
      .map(sub => Number(sub.answers[field.id]))
      .filter(score => !isNaN(score) && score > 0);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
    return { fieldId: field.id, label: field.label, avg, count: scores.length };
  });

  const sortedFields = [...config.fields].sort((a, b) => a.order - b.order);

  return (
    <div style={{
      marginTop: '1.25rem', padding: '1.25rem', border: '1px solid var(--border)',
      borderRadius: '10px', background: 'var(--background-alt)', display: 'flex', flexDirection: 'column', gap: '1rem'
    }} onClick={(e) => e.stopPropagation()}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ClipboardList size={14} /> Attendee Feedback ({submissions.length} {submissions.length === 1 ? 'response' : 'responses'})
          </h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Share the link below with participants to collect feedback.
          </p>
        </div>
        <button
          onClick={handleCopyLink}
          style={{
            background: copied ? 'var(--success-bg)' : 'var(--primary)',
            color: copied ? 'var(--success)' : '#fff',
            border: copied ? '1px solid var(--success)' : 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 650,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          {copied ? <Check size={12} /> : <Link size={12} />}
          {copied ? 'Link Copied!' : 'Copy Feedback Link'}
        </button>
      </div>

      {/* Ratings Summary Cards */}
      {ratingsSummary.length > 0 && submissions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
          {ratingsSummary.map((item) => (
            <div key={item.fieldId} style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)', padding: '0.6rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }} title={item.label}>
                {item.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {item.avg ?? '—'}
                </span>
                {item.avg && <Star size={11} fill="#fbbf24" color="#fbbf24" style={{ position: 'relative', top: '-1px' }} />}
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>({item.count})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabular Feedback View */}
      {submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--panel-bg)' }}>
          No feedback responses submitted yet for this item.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: 'var(--panel-bg)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--panel-bg)', zIndex: 1, minWidth: '100px' }}>Respondent</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', minWidth: '110px' }}>Date</th>
                {sortedFields.map(field => (
                  <th key={field.id} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', minWidth: field.type === 'rating' ? '70px' : '120px' }}>
                    {field.label}
                  </th>
                ))}
                {isCurrentUserAdmin && (
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: '60px' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--background)' : 'var(--background-alt)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--background)' : 'var(--background-alt)', zIndex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{sub.submittedBy || 'Anonymous'}</span>
                      {sub.submittedByEmail && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>{sub.submittedByEmail}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  {sortedFields.map(field => {
                    const ans = sub.answers[field.id];
                    return (
                      <td key={field.id} style={{ padding: '7px 10px', borderRight: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {ans === undefined || ans === null || ans === '' ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : field.type === 'rating' ? (
                          <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {ans} <Star size={10} fill="#fbbf24" color="#fbbf24" />
                          </span>
                        ) : Array.isArray(ans) ? (
                          <span>{ans.join(', ')}</span>
                        ) : (
                          <span style={{ maxWidth: '200px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ans}</span>
                        )}
                      </td>
                    );
                  })}
                  {isCurrentUserAdmin && (
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = await confirm(
                            'Are you sure you want to delete this feedback submission?',
                            'Delete Feedback',
                            'Delete',
                            'Cancel',
                            'danger'
                          );
                          if (confirmed) {
                            await deleteFeedbackSubmission(sub.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--danger)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'background-color 0.15s'
                        }}
                        title="Delete submission"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


const FeedbackRatingCell: React.FC<{
  itemId: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
  onCellClick: (itemId: string, category: 'admin-calls' | 'ama-meetings' | 'student-projects') => void;
}> = ({ itemId, category, onCellClick }) => {
  const { feedbackSubmissions, formConfigs } = useDashboard();
  
  const config = formConfigs.find(c => c.category === category);
  if (!config || !config.enabled) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const submissions = feedbackSubmissions.filter(sub => sub.itemId === itemId);
  if (submissions.length === 0) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>;

  const ratingFields = config.fields.filter(f => f.type === 'rating');
  let avg: string | null = null;
  let totalCount = 0;

  if (ratingFields.length > 0) {
    const scores: number[] = [];
    submissions.forEach(sub => {
      ratingFields.forEach(field => {
        const score = Number(sub.answers[field.id]);
        if (!isNaN(score) && score > 0) {
          scores.push(score);
        }
      });
    });
    if (scores.length > 0) {
      avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      totalCount = submissions.length;
    }
  }

  if (avg) {
    return (
      <span 
        className="badge" 
        onClick={(e) => {
          e.stopPropagation();
          onCellClick(itemId, category);
        }}
        style={{
          fontSize: '0.725rem',
          padding: '4px 8px',
          background: 'rgba(251, 191, 36, 0.12)',
          color: '#d97706',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          userSelect: 'none'
        }}
        title="Click to view feedback submissions"
      >
        <Star size={11} fill="#d97706" />
        {avg} <span style={{ opacity: 0.6, fontSize: '0.625rem', fontWeight: 500 }}>({totalCount})</span>
      </span>
    );
  }

  return (
    <span 
      className="badge" 
      onClick={(e) => {
        e.stopPropagation();
        onCellClick(itemId, category);
      }}
      style={{
        fontSize: '0.725rem',
        padding: '4px 8px',
        background: 'rgba(99, 102, 241, 0.12)',
        color: 'var(--primary)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        userSelect: 'none'
      }}
      title="Click to view feedback submissions"
    >
      <ClipboardList size={11} />
      {submissions.length} <span style={{ opacity: 0.6, fontSize: '0.625rem', fontWeight: 500 }}>{submissions.length === 1 ? 'response' : 'responses'}</span>
    </span>
  );
};

const FeedbackDrawer: React.FC<{
  itemId: string | null;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects' | null;
  onClose: () => void;
}> = ({ itemId, category, onClose }) => {
  if (!itemId || !category) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '65vw',
          height: '100%',
          backgroundColor: 'var(--panel-bg)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--background-alt)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
            Feedback Submissions Drawer
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'background-color 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.5rem'
        }}>
          <AttendeeFeedbackDetails itemId={itemId} category={category} />
        </div>
      </div>
    </div>
  );
};

const getClickupBadgeStyle = (status: string) => {
  if (!status) return {};
  
  const cleanStatus = status.trim().toLowerCase();
  
  // Custom HSL colors for known ClickUp statuses
  const CLICKUP_COLORS: Record<string, { h: number; s: number; l: number }> = {
    'open': { h: 215, s: 15, l: 60 },
    'todo': { h: 215, s: 15, l: 60 },
    'to do': { h: 215, s: 15, l: 60 },
    'backlog': { h: 215, s: 15, l: 60 },
    
    'in progress': { h: 205, s: 85, l: 55 },
    'in-progress': { h: 205, s: 85, l: 55 },
    'active': { h: 205, s: 85, l: 55 },
    'development': { h: 205, s: 85, l: 55 },
    
    'testing': { h: 290, s: 80, l: 60 },
    'review': { h: 290, s: 80, l: 60 },
    
    'closed': { h: 142, s: 70, l: 45 },
    'done': { h: 142, s: 70, l: 45 },
    'completed': { h: 142, s: 70, l: 45 },
    'delivered': { h: 142, s: 70, l: 45 },
  };

  let colorParts = { h: 260, s: 75, l: 60 }; // Default violet for custom/other statuses
  
  if (CLICKUP_COLORS[cleanStatus]) {
    colorParts = CLICKUP_COLORS[cleanStatus];
  } else {
    // Try substring matching
    let found = false;
    for (const key of Object.keys(CLICKUP_COLORS)) {
      if (cleanStatus.includes(key) || key.includes(cleanStatus)) {
        colorParts = CLICKUP_COLORS[key];
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Generate a stable color based on status string hash
      let hash = 0;
      for (let i = 0; i < cleanStatus.length; i++) {
        hash = cleanStatus.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorParts = {
        h: Math.abs(hash) % 360,
        s: 70,
        l: 50
      };
    }
  }

  const { h, s } = colorParts;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const textLightness = isLight ? 35 : colorParts.l;
  const bgOpacity = isLight ? '0.08' : '0.15';
  const borderOpacity = isLight ? '0.18' : '0.3';

  return {
    backgroundColor: `hsla(${h}, ${s}%, ${textLightness}%, ${bgOpacity})`,
    color: `hsl(${h}, ${s}%, ${textLightness}%)`,
    borderColor: `hsla(${h}, ${s}%, ${textLightness}%, ${borderOpacity})`,
    borderWidth: '1px',
    borderStyle: 'solid',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1
  };
};

/* =========================================================================
   CSV IMPORT MODAL
   ========================================================================= */
interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsedData: any[]) => void;
  headers: string[];
  title: string;
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onImport, headers, title }) => {
  const [csvText, setCsvText] = useState('');
  
  if (!isOpen) return null;

  const handleParse = () => {
    if (!csvText.trim()) return;
    
    const lines = csvText.split('\n');
    const result: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => 
        cell.replace(/^"|"$/g, '').trim()
      );
      
      if (row.length > 0) {
        result.push(row);
      }
    }

    if (result.length > 0) {
      onImport(result);
      setCsvText('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Import CSV for {title}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="form-group form-group-full">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Paste comma-separated rows. Expected fields: 
            <code style={{ background: 'var(--background)', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px', display: 'block', marginTop: '5px' }}>
              {headers.join(', ')}
            </code>
          </p>
          <textarea 
            className="csv-textarea" 
            placeholder={`Example:\nFeature Name, Tarun Sir Review, P0, POC Name, In Progress, ...`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleParse}>Parse & Append</button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   1. PRODUCT TABLE (PRIORITY REQUESTS) MODAL & COMPONENT
   ========================================================================= */
interface ProductDetailViewProps {
  item: ProductItem;
  onBack: () => void;
  onUpdate: (id: string, updated: Partial<ProductItem>) => void;
}

const parseDateToYYYYMMDD = (dateStr: string) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }

  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1].toLowerCase();
    const year = parts[2];
    
    const months: Record<string, string> = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09', sept: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };
    
    const month = months[monthStr.slice(0, 3)] || '01';
    if (/^\d{2}$/.test(day) && /^\d{4}$/.test(year)) {
      return `${year}-${month}-${day}`;
    }
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return '';
};

const formatDateToUserPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10).toString();
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  }

  // 2. Check DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[2];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[0], 10).toString();
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  }

  // 3. Try standard parse (handles strings like "30 March 2026" or "9 Dec 2026")
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIndex = d.getMonth();
      const day = d.getDate().toString();
      return `${day} ${monthsFull[monthIndex]} ${year}`;
    }
  } catch (e) {}

  return dateStr;
};

const isCompletedStatus = (status: string | undefined) => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'delivered' || s === 'completed' || s === 'done' || s === 'closed';
};

const getDateSpanStyle = (dateStr: string | undefined, isCompleted: boolean | undefined) => {
  if (!dateStr) return {};
  if (isCompleted) {
    return {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: '4px',
      display: 'inline-block'
    };
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsed = parseDateToYYYYMMDD(dateStr);
    if (parsed) {
      const target = new Date(parsed);
      target.setHours(0, 0, 0, 0);
      if (target < today) {
        return {
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: '4px',
          display: 'inline-block'
        };
      }
    }
  } catch (e) {}
  return {};
};

const formatDateWithTimeToUserPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  
  const monthsFull = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIndex = d.getMonth();
      const day = d.getDate().toString();
      const formattedDate = `${day} ${monthsFull[monthIndex]} ${year}`;
      
      if (dateStr.includes('T') || dateStr.includes(':')) {
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${formattedDate} @ ${hours}:${minutes} ${ampm}`;
      }
      return formattedDate;
    }
  } catch (e) {}
  
  return dateStr;
};

const formatToDatetimeLocalValue = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  } catch (e) {}
  return dateStr;
};

const getDateDiffDays = (dateStr1: string | undefined, dateStr2: string | undefined): string => {
  if (!dateStr1 || !dateStr2) return '';
  try {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';
    
    d1.setHours(12, 0, 0, 0);
    d2.setHours(12, 0, 0, 0);
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? `+${diffDays}d` : `${diffDays}d`;
  } catch (e) {
    return '';
  }
};

const DateDiffBadge: React.FC<{ prevDate?: string; currentDate?: string }> = ({ prevDate, currentDate }) => {
  const diffText = getDateDiffDays(prevDate, currentDate);
  if (!diffText) return null;
  return (
    <span 
      style={{ 
        position: 'absolute',
        left: '0',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        fontSize: '0.6rem', 
        padding: '1px 5px', 
        borderRadius: '10px', 
        backgroundColor: 'var(--panel-bg)', 
        border: '1px solid var(--border)',
        color: 'var(--primary)', 
        fontWeight: 700,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}
    >
      {diffText}
    </span>
  );
};

interface StatusDropdownProps {
  value: string;
  onChange: (value: string) => void;
  productStatuses: Array<{ id: string; label: string; color?: string }>;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ value, onChange, productStatuses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper styles matching status colors (case-insensitive)
  const getStatusColor = (status: string) => {
    if (!status) return '#6b7280';
    const s = status.trim().toLowerCase();
    
    // Check if there is a color configured
    const matched = productStatuses.find(p => p.label.toLowerCase() === s);
    if (matched && matched.color) return matched.color;
    
    if (s === 'completed' || s === 'done' || s === 'delivered' || s === 'closed') return '#10b981';
    if (s === 'in progress' || s === 'in-progress' || s === 'active') return '#3b82f6';
    if (s === 'on hold' || s === 'on-hold' || s === 'hold') return '#f59e0b';
    if (s === 'ongoing') return '#8b5cf6';
    return '#6b7280';
  };

  const statusColor = getStatusColor(value);

  return (
    <div className="status-dropdown-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 24px 4px 8px', // extra right padding for chevron
          background: `${statusColor}14`,
          border: `1px solid ${statusColor}33`,
          borderRadius: '6px',
          color: statusColor,
          fontSize: '0.725rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          minHeight: '26px'
        }}
        className="status-dropdown-trigger"
      >
        <span>{value || '— Select Status —'}</span>
        {/* Chevron Icon */}
        <span style={{
          position: 'absolute',
          right: '6px',
          top: '50%',
          transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
          transition: 'transform 0.2s',
          display: 'flex',
          alignItems: 'center',
          color: statusColor
        }}>
          <ChevronDown size={12} />
        </span>
      </button>

      {/* Dropdown Options Menu */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow)',
            padding: '4px',
            minWidth: '160px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.15s'
            }}
            className="status-dropdown-option-row"
          >
            — None —
          </div>
          
          {productStatuses.map(s => {
            const isSelected = s.label === value;
            const itemColor = getStatusColor(s.label);
            return (
              <div
                key={s.id}
                onClick={() => {
                  onChange(s.label);
                  setIsOpen(false);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.15s',
                  backgroundColor: isSelected ? 'var(--background-alt)' : 'transparent'
                }}
                className="status-dropdown-option-row"
              >
                {/* Colored Badge Option */}
                <span className="badge" style={{
                  backgroundColor: `${itemColor}14`,
                  color: itemColor,
                  borderColor: `${itemColor}33`,
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}>
                  {s.label}
                </span>
                {isSelected && (
                  <CheckSquare size={12} style={{ color: itemColor, marginLeft: '8px' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ item, onBack, onUpdate }) => {
  const { studentProjects, speakers: configSpeakers, productGroups, statuses: configStatuses, clickupApiKey, syncClickupTask, activeTab, canUserEdit, currentUser } = useDashboard();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pocList = configSpeakers.map(s => s.name);
  const productList = productGroups.map(g => g.name);
  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;
  
  const realProjectId = item.id.startsWith('prod-temp-') ? item.id.replace('prod-temp-', '') : item.id;
  const isProject = item.id.startsWith('proj-') || studentProjects.some(p => p.id === realProjectId);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const productStatuses = configStatuses;

  // Auto-expand textareas based on content on mount or update
  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
    if (notesRef.current) {
      notesRef.current.style.height = 'auto';
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`;
    }
  }, [item.id, item.description, item.notes]);

  // Timeline progress calculations
  const getProgressPercentage = () => {
    if (item.status === 'Completed') return 87.5;
    if (item.status === 'On Hold') return 12.5;
    
    let percentage = 12.5;
    if (item.productDeadlineCompleted || item.tarunSirApproval) {
      percentage = 12.5;
      if (item.uiuxCompleted) {
        percentage = 37.5;
        if (item.deadlineCompleted) {
          percentage = 62.5;
          if (item.finalReleaseCompleted) {
            percentage = 87.5;
          }
        }
      }
    }
    return percentage;
  };

  const isProductCompleted = !!item.productDeadlineCompleted || item.tarunSirApproval || item.status === 'Completed';
  const isUiuxCompleted = !!item.uiuxCompleted || item.status === 'Completed';
  const isUiuxActive = isProductCompleted && !item.uiuxCompleted && item.status !== 'Completed';
  const isDevCompleted = !!item.deadlineCompleted || item.status === 'Completed' || item.clickupStatus?.toLowerCase() === 'closed';
  const isDevActive = isUiuxCompleted && !item.deadlineCompleted && item.status !== 'Completed' && item.clickupStatus?.toLowerCase() !== 'closed';
  const isFinalCompleted = !!item.finalReleaseCompleted || item.status === 'Completed';
  const isFinalActive = isDevCompleted && !item.finalReleaseCompleted && item.status !== 'Completed';


  const getClickupStatusColor = (status: string) => {
    if (!status) return 'var(--text-secondary)';
    const s = status.toLowerCase();
    if (s === 'closed' || s === 'done' || s === 'completed') return '#10b981';
    if (s === 'open' || s === 'todo') return '#6b7280';
    if (s === 'in progress' || s === 'active') return '#3b82f6';
    return '#8b5cf6';
  };

  const getPriorityFlagColor = (prio: string) => {
    switch (prio) {
      case 'P0': return '#ef4444'; // Red
      case 'P1': return '#f97316'; // Orange
      case 'P2': return '#3b82f6'; // Blue
      case 'P3': return '#eab308'; // Yellow
      case 'P4': return '#9ca3af'; // Grey
      default: return '#9ca3af';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAssigneeColor = (name: string) => {
    const colors: Record<string, string> = {
      'Akash': '#7c3aed',
      'Akash Sharma': '#7c3aed',
      'Anushka': '#db2777',
      'Nikhil': '#0284c7',
      'Nikhil Jain': '#059669',
    };
    return colors[name] || '#6b7280';
  };

  

  const handleFieldUpdate = (field: keyof ProductItem, newValue: any) => {
    if (!canUserEdit) return;
    const oldValue = item[field];
    if (oldValue === newValue) return;

    // Call parent update
    if (field === 'taskLink' && !newValue) {
      onUpdate(item.id, { taskLink: '', clickupStatus: '' });
    } else {
      onUpdate(item.id, { [field]: newValue });
    }
  };

  const handleSyncClickup = async (taskLinkValue: string) => {
    if (!canUserEdit || !taskLinkValue) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const fetchedStatus = await syncClickupTask(taskLinkValue);
      if (fetchedStatus) {
        handleFieldUpdate('clickupStatus', fetchedStatus);
      } else {
        setSyncError('Could not fetch status from ClickUp API. Please check your credentials or connection.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  

  

  

  return (
    <div className="premium-workspace animate-fade-in" key={item.id} style={{ display: 'block', padding: '1.5rem', overflowY: 'auto' }}>
      
      {/* Top Navigation & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
        <div className="premium-breadcrumb">
          <button className="btn-back" style={{ width: '24px', height: '24px', borderRadius: '6px', marginRight: '0.25rem' }} onClick={onBack} title="Back to Table">
            <ArrowLeft size={12} />
          </button>
          <span>
            {activeTab === 'issues' ? 'Daily Issues Log' : 
             activeTab === 'projects' ? 'Student Projects' : 
             activeTab === 'meetings' ? 'AMA & Meetings' : 
             activeTab === 'admin' ? 'Admin Calls' : 
             activeTab === 'content' ? 'Content Pipeline' : 
             activeTab === 'plan' ? 'Sprint Planning' : 
             'Priority Requests'}
          </span>
          <span>/</span>
          <span style={{ color: !item.product ? '#f97316' : 'var(--text-primary)', fontWeight: 600 }}>
            {item.product || '— Select Product Group —'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            backgroundColor: 'var(--background-alt)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '0.675rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Task <span style={{ color: 'var(--text-primary)' }}>#{item.id}</span>
          </span>
        </div>
      </div>

      <div style={{ pointerEvents: canUserEdit ? 'auto' : 'none', opacity: canUserEdit ? 1 : 0.95 }}>
      {/* Task Title (Editable) */}
      <div style={{ marginTop: '0.75rem' }}>
        <input
          type="text"
          className="premium-title-input"
          style={{ paddingLeft: 0, fontSize: '1.75rem', borderBottom: '2px solid transparent' }}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== item.feature) {
              handleFieldUpdate('feature', e.target.value.trim());
            }
          }}
          defaultValue={item.feature}
          placeholder="Task name"
        />
      </div>

      {/* 3-COLUMN PROPERTIES GRID DASHBOARD */}
      <div className="premium-properties-dashboard">
        
        {/* PANEL 1: Lifecycle & Integration */}
        <div className="properties-panel">
          <h4 className="properties-panel-title">Lifecycle & Integration</h4>

          {/* Product Group */}
          <div className="property-row-flat">
            <span className="premium-property-label" style={{ color: !item.product ? '#f97316' : undefined, fontWeight: !item.product ? '700' : undefined }}>
              <Layers size={13} style={{ color: !item.product ? '#f97316' : undefined }} /> Product Group
            </span>
            <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className={`premium-select-pill ${!item.product ? 'warning-highlight' : ''}`}>
                <select
                  value={item.product || ''}
                  onChange={(e) => handleFieldUpdate('product', e.target.value)}
                >
                  <option value="">— Select Product Group —</option>
                  {productList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  {item.product && !productList.includes(item.product) && (
                    <option value={item.product}>{item.product}</option>
                  )}
                </select>
              </div>
              {!item.product && (
                <span className="animate-pulse" style={{ color: '#f97316', fontSize: '0.65rem', fontWeight: 'bold' }}>Required</span>
              )}
            </div>
          </div>




          
          {/* Status */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <CheckSquare size={13} /> status
            </span>
            <div className="premium-property-value">
              <StatusDropdown
                value={item.status}
                onChange={(val) => handleFieldUpdate('status', val)}
                productStatuses={productStatuses}
              />
            </div>
          </div>



          {/* ClickUp Task Link */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Link size={13} /> ClickUp Task
            </span>
            <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                style={{ 
                  color: 'var(--accent)', 
                  width: '160px', 
                  textAlign: 'right', 
                  fontWeight: 500,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
                placeholder="Empty Link"
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== item.taskLink) {
                    handleFieldUpdate('taskLink', val);
                    if (val) {
                      handleSyncClickup(val);
                    }
                  }
                }}
                defaultValue={item.taskLink}
              />
              {item.taskLink && (
                <a href={item.taskLink} target="_blank" rel="noreferrer" title="Open ClickUp Task" style={{ display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}>
                  <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                </a>
              )}
            </div>
          </div>

          {/* ClickUp Status */}
          {item.taskLink && (
            <div className="property-row-flat">
              <span className="premium-property-label">
                <RefreshCw size={13} /> ClickUp Status
              </span>
              <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  className="premium-clickup-badge"
                  style={{ 
                    borderColor: getClickupStatusColor(item.clickupStatus), 
                    color: getClickupStatusColor(item.clickupStatus),
                    paddingRight: isSyncing ? '18px' : '6px',
                    fontSize: '0.675rem',
                    padding: '3px 8px',
                    width: '100px',
                    textAlign: 'center',
                    fontWeight: 700,
                    borderRadius: '6px',
                    backgroundColor: 'var(--background)'
                  }}
                  placeholder="Status"
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== item.clickupStatus) {
                      handleFieldUpdate('clickupStatus', val);
                    }
                  }}
                  defaultValue={item.clickupStatus || ''}
                />
                <button
                  type="button"
                  onClick={() => handleSyncClickup(item.taskLink)}
                  disabled={isSyncing || !clickupApiKey}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: (isSyncing || !clickupApiKey) ? 'not-allowed' : 'pointer',
                    color: 'var(--text-muted)',
                    padding: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: !clickupApiKey ? 0.3 : 1
                  }}
                  title={!clickupApiKey ? "Configure API Key in Settings to sync" : "Sync status with ClickUp"}
                >
                  <RefreshCw size={11} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                </button>
                {syncError && (
                  <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', cursor: 'help' }} title={syncError}>
                    <AlertCircle size={11} />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: Milestone Checkpoints */}
        <div className="properties-panel">
          <h4 className="properties-panel-title">Milestone Checkpoints</h4>
          
          {/* Specs Date */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Calendar size={13} /> Specs Date
            </span>
            <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                style={{ width: '110px', textAlign: 'right', cursor: 'pointer', fontWeight: 600 }}
                value={item.productDeadline || ''}
                onClick={(e) => (e.target as any).showPicker?.()}
                onChange={(e) => handleFieldUpdate('productDeadline', e.target.value)}
              />
              <input
                type="checkbox"
                checked={!!item.productDeadlineCompleted}
                onChange={(e) => handleFieldUpdate('productDeadlineCompleted', e.target.checked)}
                style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                title="Mark Product Specs as Completed"
              />
            </div>
          </div>

          {/* UI/UX Date */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Palette size={13} /> UI/UX Date
            </span>
            <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                style={{ width: '110px', textAlign: 'right', cursor: 'pointer', fontWeight: 600 }}
                value={item.uiux || ''}
                onClick={(e) => (e.target as any).showPicker?.()}
                onChange={(e) => handleFieldUpdate('uiux', e.target.value)}
              />
              <input
                type="checkbox"
                checked={!!item.uiuxCompleted}
                onChange={(e) => handleFieldUpdate('uiuxCompleted', e.target.checked)}
                style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                title="Mark UI/UX Design as Completed"
              />
            </div>
          </div>

          {/* Dev Date */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Code size={13} /> Dev Date
            </span>
            <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                style={{ width: '110px', textAlign: 'right', cursor: 'pointer', fontWeight: 600 }}
                value={item.deadline || ''}
                onClick={(e) => (e.target as any).showPicker?.()}
                onChange={(e) => handleFieldUpdate('deadline', e.target.value)}
              />
              <input
                type="checkbox"
                checked={!!item.deadlineCompleted}
                onChange={(e) => handleFieldUpdate('deadlineCompleted', e.target.checked)}
                style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                title="Mark Dev Deadline as Completed"
              />
            </div>
          </div>

          {/* Release Date */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Sparkles size={13} /> Release Date
            </span>
            <div className="premium-property-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                style={{ width: '110px', textAlign: 'right', cursor: 'pointer', fontWeight: 600 }}
                value={item.finalRelease || ''}
                onClick={(e) => (e.target as any).showPicker?.()}
                onChange={(e) => handleFieldUpdate('finalRelease', e.target.value)}
              />
              <input
                type="checkbox"
                checked={!!item.finalReleaseCompleted}
                onChange={(e) => handleFieldUpdate('finalReleaseCompleted', e.target.checked)}
                style={{ width: '13px', height: '13px', cursor: 'pointer' }}
                title="Mark Final Release as Completed"
              />
            </div>
          </div>
        </div>

        {/* PANEL 3: Governance & Ownership */}
        <div className="properties-panel">
          <h4 className="properties-panel-title">Governance & Ownership</h4>
          
          {/* Assignees */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <User size={13} /> assignees
            </span>
            <div className="premium-property-value">
              <div className="premium-select-pill" style={{ paddingLeft: '4px' }}>
                <div 
                  className="clickup-avatar-circle" 
                  style={{ 
                    backgroundColor: getAssigneeColor(item.poc),
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'white',
                    flexShrink: 0
                  }}
                >
                  {getInitials(item.poc)}
                </div>
                <select
                  value={item.poc || ''}
                  onChange={(e) => handleFieldUpdate('poc', e.target.value)}
                >
                  <option value="">— Select POC —</option>
                  {pocList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  {item.poc && !pocList.includes(item.poc) && (
                    <option value={item.poc}>{item.poc}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Blockers */}
          <div className="property-row-flat">
            <span className="premium-property-label" style={{ color: item.blocker ? 'var(--danger)' : 'var(--text-muted)' }}>
              <AlertCircle size={13} /> blockers
            </span>
            <div className="premium-property-value">
              <input
                type="text"
                style={{ color: item.blocker ? 'var(--danger)' : 'var(--text-primary)', width: '120px', textAlign: 'right', fontWeight: 600 }}
                placeholder="None"
                onBlur={(e) => {
                  if (e.target.value !== item.blocker) {
                    handleFieldUpdate('blocker', e.target.value);
                  }
                }}
                defaultValue={item.blocker}
              />
            </div>
          </div>

          {/* Tarun Sir Verified */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <CheckSquare size={13} /> Tarun Sir verified
            </span>
            <div className="premium-property-value">
              <label 
                className="premium-toggle-wrapper"
                style={{ opacity: isCurrentUserAdmin ? 1 : 0.6, cursor: isCurrentUserAdmin ? 'pointer' : 'not-allowed' }}
                title={isCurrentUserAdmin ? 'Toggle verification status' : 'Only admins can toggle Tarun Sir verification'}
              >
                <input 
                  type="checkbox" 
                  className="premium-toggle-checkbox" 
                  checked={item.tarunSirApproval} 
                  disabled={!isCurrentUserAdmin}
                  onChange={(e) => handleFieldUpdate('tarunSirApproval', e.target.checked)} 
                />
                <span className="premium-toggle-slider" />
              </label>
            </div>
          </div>

          {/* Raised by Tarun Sir */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Star size={13} /> raised by Tarun Sir
            </span>
            <div className="premium-property-value">
              <label className="premium-toggle-wrapper">
                <input 
                  type="checkbox" 
                  className="premium-toggle-checkbox" 
                  checked={item.raisedByTarunSir} 
                  onChange={(e) => handleFieldUpdate('raisedByTarunSir', e.target.checked)} 
                />
                <span className="premium-toggle-slider" />
              </label>
            </div>
          </div>

          {/* Priority */}
          <div className="property-row-flat">
            <span className="premium-property-label">
              <Flag size={13} /> priority
            </span>
            <div className="premium-property-value">
              <div className="premium-select-pill">
                <Flag size={11} fill={getPriorityFlagColor(item.priority)} color={getPriorityFlagColor(item.priority)} style={{ marginRight: '2px' }} />
                <select
                  value={item.priority || ''}
                  onChange={(e) => handleFieldUpdate('priority', e.target.value as any)}
                >
                  <option value="">— Select Priority —</option>
                  <option value="P0">P0 (Critical)</option>
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Medium)</option>
                  <option value="P3">P3 (Normal)</option>
                  <option value="P4">P4 (Low)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Stepper progress timeline tracker */}
      <div className="compact-timeline-container" style={{ margin: '1.5rem 0' }}>
        <div className="compact-timeline-track">
          <div 
            className="compact-timeline-track-progress" 
            style={{ width: `${getProgressPercentage()}%` }} 
          />
        </div>
        <div className="compact-timeline-steps">
          
          {/* Step 1: Specs */}
          <div className={`compact-timeline-step ${isProductCompleted ? 'completed' : 'active'}`}>
            <div className="compact-timeline-node">
              {isProductCompleted ? (
                <CheckSquare size={12} />
              ) : (
                <span>1</span>
              )}
            </div>
            <span className="compact-timeline-step-label">Specs</span>
            
            <span 
              className="compact-timeline-step-date" 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => {
                const inputEl = document.getElementById(`date-picker-specs-${item.id}`);
                if (inputEl) (inputEl as any).showPicker?.();
              }}
            >
              {item.productDeadline ? formatDateToUserPattern(item.productDeadline) : 'Set Date'}
            </span>
            <input
              id={`date-picker-specs-${item.id}`}
              type="date"
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              value={parseDateToYYYYMMDD(item.productDeadline)}
              onChange={(e) => {
                if (e.target.value) {
                  handleFieldUpdate('productDeadline', e.target.value);
                }
              }}
            />
          </div>

          {/* Step 2: UI/UX */}
          <div className={`compact-timeline-step ${isUiuxCompleted ? 'completed' : isUiuxActive ? 'active' : 'pending'}`}>
            <div className="compact-timeline-node">
              {isUiuxCompleted ? (
                <CheckSquare size={12} />
              ) : (
                <span>2</span>
              )}
            </div>
            <span className="compact-timeline-step-label">UI/UX</span>
            
            <span 
              className="compact-timeline-step-date" 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => {
                const inputEl = document.getElementById(`date-picker-uiux-${item.id}`);
                if (inputEl) (inputEl as any).showPicker?.();
              }}
            >
              {item.uiux ? formatDateToUserPattern(item.uiux) : 'Set Date'}
            </span>
            <input
              id={`date-picker-uiux-${item.id}`}
              type="date"
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              value={parseDateToYYYYMMDD(item.uiux)}
              onChange={(e) => {
                if (e.target.value) {
                  handleFieldUpdate('uiux', e.target.value);
                }
              }}
            />
          </div>

          {/* Step 3: Dev */}
          <div className={`compact-timeline-step ${isDevCompleted ? 'completed' : isDevActive ? 'active' : 'pending'}`}>
            <div className="compact-timeline-node">
              {isDevCompleted ? (
                <CheckSquare size={12} />
              ) : (
                <span>3</span>
              )}
            </div>
            <span className="compact-timeline-step-label">Dev</span>
            
            <span 
              className="compact-timeline-step-date" 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => {
                const inputEl = document.getElementById(`date-picker-dev-${item.id}`);
                if (inputEl) (inputEl as any).showPicker?.();
              }}
            >
              {item.deadline ? formatDateToUserPattern(item.deadline) : 'Set Date'}
            </span>
            <input
              id={`date-picker-dev-${item.id}`}
              type="date"
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              value={parseDateToYYYYMMDD(item.deadline)}
              onChange={(e) => {
                if (e.target.value) {
                  handleFieldUpdate('deadline', e.target.value);
                }
              }}
            />
          </div>

          {/* Step 4: Release */}
          <div className={`compact-timeline-step ${isFinalCompleted ? 'completed' : isFinalActive ? 'active' : 'pending'}`}>
            <div className="compact-timeline-node">
              {isFinalCompleted ? (
                <CheckSquare size={12} />
              ) : (
                <span>4</span>
              )}
            </div>
            <span className="compact-timeline-step-label">Release</span>
            
            <span 
              className="compact-timeline-step-date" 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => {
                const inputEl = document.getElementById(`date-picker-release-${item.id}`);
                if (inputEl) (inputEl as any).showPicker?.();
              }}
            >
              {item.finalRelease ? formatDateToUserPattern(item.finalRelease) : 'Set Date'}
            </span>
            <input
              id={`date-picker-release-${item.id}`}
              type="date"
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              value={parseDateToYYYYMMDD(item.finalRelease)}
              onChange={(e) => {
                if (e.target.value) {
                  handleFieldUpdate('finalRelease', e.target.value);
                }
              }}
            />
          </div>

        </div>
      </div>

      {/* Blocker Alert Banner */}
      {item.blocker && (
        <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', borderLeft: '4px solid var(--danger)', borderRadius: '6px', padding: '0.4rem 0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1rem' }}>🛑</span>
          <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>
            <strong style={{ color: 'var(--danger)' }}>Blocker active:</strong> {item.blocker}
          </p>
        </div>
      )}

      {/* Description card */}
      <div style={{ marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>
          Description
        </p>
        <textarea
          ref={descriptionRef}
          className="premium-textarea"
          style={{ minHeight: '120px', overflowY: 'hidden', resize: 'none' }}
          placeholder="Enter feature description..."
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          onBlur={(e) => {
            if (e.target.value !== item.description) {
              handleFieldUpdate('description', e.target.value);
            }
          }}
          defaultValue={item.description}
        />
      </div>

      {/* Notes & Reference Links card */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>
          Notes & Reference Links
        </p>
        <textarea
          ref={notesRef}
          className="premium-textarea"
          style={{ minHeight: '100px', overflowY: 'hidden', resize: 'none' }}
          placeholder="Paste reference notes, Figma links, or release checklist here..."
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          onBlur={(e) => {
            if (e.target.value !== item.notes) {
              handleFieldUpdate('notes', e.target.value);
            }
          }}
          defaultValue={item.notes}
        />
      </div>

      {isProject && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
          <AttendeeFeedbackDetails itemId={realProjectId} category="student-projects" />
        </>
      )}

      </div>
    </div>
  );
};

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const displayText = selectedValues.length === 0 
    ? `All ${placeholder === 'POC' ? 'POCs' : `${placeholder}es`}`
    : selectedValues.length === options.length 
      ? `All ${placeholder === 'POC' ? 'POCs' : `${placeholder}es`}`
      : selectedValues.join(', ');

  return (
    <div className="multi-select-container" ref={containerRef}>
      <button 
        type="button" 
        className="multi-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="multi-select-trigger-text">{displayText}</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && (
        <div className="multi-select-dropdown">
          {options.map(option => {
            const isChecked = selectedValues.includes(option);
            return (
              <label key={option} className="multi-select-option">
                <input 
                  type="checkbox" 
                  className="multi-select-checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleOption(option)}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ProductTable: React.FC = () => {
  const { productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId, statuses, canUserEdit, currentUser, confirm } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];

  // Sorting state
  const [sortField, setSortField] = useState<keyof ProductItem | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Inline editing state
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFeatureId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFeatureId]);

  const handleSort = (field: keyof ProductItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Search
  const filtered = productItems.filter(item => {
    if (item.id.startsWith('prod-temp-') || item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-') || item.id.startsWith('prod-tarun-') || item.id.startsWith('prod-breakdown-')) return false;
    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesPriority = filterPriority === 'All' || item.priority === filterPriority;
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(item.status);
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesSuperPriority;
  });

  // Sort
  filtered.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (sortField) {
      const valA = String(a[sortField]).toLowerCase();
      const valB = String(b[sortField]).toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return 0;
  });


  const handleAddNew = () => {
    // Reset search query and sort to ensure the new row is visible at the top
    setSearchQuery('');
    setSortField(null);

    const newItem: ProductItem = {
      id: `prod-${Date.now()}`,
      feature: 'New Priority Request',
      description: '',
      tarunSirApproval: false,
      raisedByTarunSir: false,
      priority: '',
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      product: '',
      uiux: '',
      finalRelease: '',
      productDeadline: ''
    };
    addProductItem(newItem);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };

  const handleImportCSV = (data: string[][]) => {
    data.forEach(row => {
      if (row.length < 2) return;
      const newItem: ProductItem = {
        id: `prod-${Math.random()}`,
        feature: row[0] || 'Imported Feature',
        tarunSirApproval: row[1]?.toLowerCase() === 'yes' || row[1]?.toLowerCase() === 'true',
        raisedByTarunSir: row[2]?.toLowerCase() === 'yes' || row[2]?.toLowerCase() === 'true',
        priority: (row[3] as any) || 'P2',
        poc: row[4] || currentUser?.name || 'Akash Sharma',
        status: (row[5] as any) || 'In Progress',
        clickupStatus: row[6] || 'open',
        taskLink: row[7] || '',
        blocker: row[8] || '',
        deadline: row[9] || '',
        notes: row[10] || '',
        product: row[11] || 'Coach LMS Web',
        uiux: row[12] || '',
        finalRelease: row[13] || '',
        productDeadline: row[14] || '',
        description: row[15] || ''
      };
      addProductItem(newItem);
    });
  };

  // CSV and table render wrapper follows

  return (
    <>
      <TabContainer
        title="Priority Requests"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Feature"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              <option value="P0">P0 (Critical)</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('product')} style={{ cursor: 'pointer' }}>Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>Priority {sortField === 'priority' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ cursor: 'pointer' }}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ cursor: 'pointer' }}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ cursor: 'pointer' }}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ cursor: 'pointer' }}>Final {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => {
                    if (editingFeatureId !== item.id) {
                      setPreviewProductId(item.id);
                    }
                  }} 
                  className={deletingIds.has(item.id) ? 'row-deleting' : ''}
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                >
                  <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                      {editingFeatureId === item.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const finalVal = inlineEditValue.trim() || 'New Feature Request';
                              updateProductItem(item.id, { feature: finalVal });
                              setEditingFeatureId(null);
                              if (e.ctrlKey) {
                                setPreviewProductId(item.id);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingFeatureId(null);
                            }
                          }}
                          onBlur={() => {
                            const finalVal = inlineEditValue.trim() || 'New Feature Request';
                            updateProductItem(item.id, { feature: finalVal });
                            setEditingFeatureId(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--background)',
                            border: '1.5px solid var(--primary)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            outline: 'none',
                            boxShadow: '0 0 0 2px var(--primary-glow)'
                          }}
                        />
                      ) : (
                        <span 
                          onDoubleClick={(e) => {
                            if (!canUserEdit) return;
                            e.stopPropagation();
                            setEditingFeatureId(item.id);
                            setInlineEditValue(item.feature);
                          }}
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}
                        >
                          {item.feature}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {item.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={10} fill="currentColor" /> Super Priority
                          </span>
                        )}
                        {item.tarunSirApproval && (
                          <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                            <CheckCircle size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{item.product || '—'}</td>
                  <td>
                    {item.priority ? (
                      <span className={`badge badge-${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {item.poc ? (
                      <span style={getPOCBadgeStyle(item.poc)}>
                        {item.poc}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {item.status ? (() => {
                      const matched = statuses.find(s => s.label === item.status);
                      if (matched) {
                        return (
                          <span className="badge" style={{
                            backgroundColor: `${matched.color}14`,
                            color: matched.color,
                            borderColor: `${matched.color}33`,
                            borderStyle: 'solid',
                            borderWidth: '1px'
                          }}>
                            {item.status}
                          </span>
                        );
                      }
                      return (
                        <span className={`badge ${
                          item.status === 'On Hold' ? 'status-hold' :
                          item.status === 'In Progress' ? 'status-progress' :
                          item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                        }`}>
                          {item.status}
                        </span>
                      );
                    })() : '—'}
                  </td>
                  <td>
                    {item.clickupStatus ? (
                      <span style={getClickupBadgeStyle(item.clickupStatus)}>
                        {item.clickupStatus}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {item.productDeadline ? (
                      <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                        {formatDateToUserPattern(item.productDeadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.productDeadline} currentDate={item.uiux} />
                    {item.uiux ? (
                      <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                        {formatDateToUserPattern(item.uiux)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.uiux || item.productDeadline} currentDate={item.deadline} />
                    {item.deadline ? (
                      <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                        {formatDateToUserPattern(item.deadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline} currentDate={item.finalRelease} />
                    {item.finalRelease ? (
                      <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                        {formatDateToUserPattern(item.finalRelease)}
                      </span>
                    ) : '—'}
                  </td>

                  <td>
                    {canUserEdit && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                            setDeletingIds(prev => new Set(prev).add(item.id));
                            setTimeout(() => {
                              deleteProductItem(item.id);
                              setDeletingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
                            }, 320);
                          }
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

      <CSVImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCSV}
        title="Priority Requests"
        headers={['Feature', 'Tarun Sir Approval (Yes/No)', 'Raised by Tarun Sir (Yes/No)', 'Priority (P0/P1/P2)', 'POC Name', 'Status (In Progress/On Hold)', 'Clickup Status', 'Task URL', 'Blockers', 'Deadline Date', 'Notes text', 'Product mapping', 'UIUX Date', 'Final Release Date', 'Product Deadline Date', 'Description']}
      />
    </>
  );
};

/* =========================================================================
   2. SPRINT PLANNING (PLAN TABLE) MODAL & COMPONENT
   ========================================================================= */
interface PlanDetailModalProps {
  item: PlanItem;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<PlanItem>) => void;
}

const PlanDetailModal: React.FC<PlanDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const { canUserEdit } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PlanItem>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Planned Task' : 'Planned Task Details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid">
            <div className="form-group form-group-full">
              <label className="form-label">Task Description</label>
              <textarea 
                className="form-input" 
                style={{ height: '70px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.task} 
                onChange={(e) => setDraft({ ...draft, task: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sprint Month</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.month} 
                onChange={(e) => setDraft({ ...draft, month: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}
              >
                <option value="Development">Development</option>
                <option value="UI/UX">UI/UX</option>
                <option value="Product">Product</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select 
                className="filter-select w-full"
                style={{ height: '38px' }}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              >
                <option value="open">Product</option>
                <option value="in design">In Design</option>
                <option value="development">Development</option>
                <option value="closed">Closed</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem' }}>
              <input 
                type="checkbox" 
                id="task-completed-checkbox"
                checked={!!draft.completed} 
                onChange={(e) => setDraft({ ...draft, completed: e.target.checked })} 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="task-completed-checkbox" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Mark as Completed</label>
            </div>

            <div className="form-group">
              <label className="form-label">Sprint Link / References</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.link} 
                onChange={(e) => setDraft({ ...draft, link: e.target.value })} 
                placeholder="e.g. ClickUp URL or documentation"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ClickUp Status</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.clickupStatus || ''} 
                onChange={(e) => setDraft({ ...draft, clickupStatus: e.target.value })} 
                placeholder="Syncs from ClickUp or manual input"
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group detail-group-full">
              <span className="detail-label">Task / Deliverable</span>
              <span className="detail-value" style={{ fontSize: '1rem', fontWeight: 600 }}>{item.task}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Sprint Month</span>
              <span className="detail-value">{item.month}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Category</span>
              <span className="detail-value">{item.category}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Sprint Status</span>
              <div>
                <span className={`badge ${
                  item.status === 'Done' ? 'status-done' :
                  item.status === 'development' ? 'clickup-development' :
                  item.status === 'closed' ? 'clickup-closed' : 'clickup-open'
                }`}>
                  {item.status === 'open' ? 'Product' : item.status}
                </span>
              </div>
            </div>

            <div className="detail-group">
              <span className="detail-label">Completion Status</span>
              <div>
                {item.completed ? (
                  <span className="badge status-done" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={12} /> Completed
                  </span>
                ) : (
                  <span className="badge clickup-open">Active</span>
                )}
              </div>
            </div>

            {item.clickupStatus && (
              <div className="detail-group">
                <span className="detail-label">ClickUp Status</span>
                <div>
                  <span style={getClickupBadgeStyle(item.clickupStatus)}>
                    {item.clickupStatus}
                  </span>
                </div>
              </div>
            )}

            <div className="detail-group detail-group-full">
              <span className="detail-label">Sprint Reference Link</span>
              <div>
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noreferrer" className="detail-link">
                    Open Task Reference <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="detail-value" style={{ color: 'var(--text-muted)' }}>No reference link attached</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              {canUserEdit && <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const PlanTable: React.FC = () => {
  const {
    planItems, updatePlanItem, addPlanItem, deletePlanItem,
    productItems, studentProjects, contentItems, studentMeetings,
    openPreviewForFeature, canUserEdit, confirm
  } = useDashboard();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const showAutoItems = true;
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);

  // Helper to find a matching product item to read completion status
  const findMatchingProductItem = (title: string) => {
    if (!title) return null;
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = clean(title);
    
    // 1. Check exact or substring match
    let match = productItems.find(item => {
      const cleanFeature = clean(item.feature);
      return cleanName.includes(cleanFeature) || cleanFeature.includes(cleanName);
    });

    // 2. Token overlap match
    if (!match) {
      const nameWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      match = productItems.find(item => {
        const featureWords = item.feature.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const common = nameWords.filter(w => featureWords.includes(w));
        return common.length >= 2;
      });
    }
    return match;
  };

  // ── Month options ──────────────────────────────────────────────────────────
  const getMonthSortValue = (monthStr: string): number => {
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const parts = monthStr.trim().split(/\s+/);
    if (parts.length !== 2) return 0;
    const m = months[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (m === undefined || isNaN(y)) return 0;
    return y * 12 + m;
  };

  const manualMonths = Array.from(new Set(planItems.map(item => item.month)));
  const extraMonths = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'].flatMap(m =>
    ['2026', '2027'].map(y => `${m} ${y}`)
  );
  const allMonths = Array.from(new Set([...manualMonths, ...extraMonths]));
  allMonths.sort((a, b) => getMonthSortValue(a) - getMonthSortValue(b));

  // ── Parse a date string → { year, month } (1-indexed) ─────────────────────
  const parseDateMonth = (dateStr: string | undefined): { year: number; month: number } | null => {
    if (!dateStr) return null;
    const iso = parseDateToYYYYMMDD(dateStr);
    if (!iso) return null;
    const [y, m] = iso.split('-').map(Number);
    if (!y || !m) return null;
    return { year: y, month: m };
  };

  // Parse the selected month label → { year, month }
  const parseSelectedMonth = (): { year: number; month: number } | null => {
    const months: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
    };
    const parts = selectedMonth.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const m = months[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (!m || !y) return null;
    return { year: y, month: m };
  };

  const dateInSelectedMonth = (dateStr: string | undefined): boolean => {
    const sm = parseSelectedMonth();
    if (!sm) return false;
    const dm = parseDateMonth(dateStr);
    if (!dm) return false;
    return dm.year === sm.year && dm.month === sm.month;
  };

  // ── Build aggregated "auto" items from all data sources ────────────────────
  interface AutoItem {
    id: string;
    title: string;
    source: 'Priority Requests' | 'Student Projects' | 'Content Pipeline' | 'AMA & Meetings' | 'Admin Calls' | 'Tarun Sir Meetings' | 'Product Breakdown';
    column: 'product' | 'design' | 'dev';
    priority?: string;
    poc?: string;
    status?: string;
    date: string;
    dateLabel: string;
    rawItem: any;
  }

  const autoItems: AutoItem[] = [];

  if (showAutoItems) {
    // ProductItems
    productItems.forEach(item => {
      if (item.id.startsWith('prod-temp-')) return;
      if (item.status === 'Completed') return;
      const isBreakdown = item.id.startsWith('prod-breakdown-');
      const itemSource = item.id.startsWith('prod-ama-') 
        ? 'AMA & Meetings' 
        : item.id.startsWith('prod-call-')
          ? 'Admin Calls'
          : item.id.startsWith('prod-tarun-')
            ? 'Tarun Sir Meetings'
            : isBreakdown 
              ? 'Product Breakdown' 
              : 'Priority Requests';
      if (dateInSelectedMonth(item.productDeadline)) {
        autoItems.push({
          id: `auto-prod-specs-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'product',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.productDeadline,
          dateLabel: 'Specs',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.uiux)) {
        autoItems.push({
          id: `auto-prod-uiux-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'design',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.uiux,
          dateLabel: 'UI/UX',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.deadline)) {
        autoItems.push({
          id: `auto-prod-dev-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'dev',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.deadline,
          dateLabel: 'Dev',
          rawItem: item
        });
      }
    });

    // StudentProjects
    studentProjects.forEach(p => {
      if (p.status === 'Delivered' || p.status === 'Cancelled') return;
      if (dateInSelectedMonth(p.productDeadline)) {
        autoItems.push({
          id: `auto-proj-specs-${p.id}`,
          title: p.title,
          source: 'Student Projects',
          column: 'product',
          priority: p.priority,
          poc: p.poc,
          status: p.status,
          date: p.productDeadline!,
          dateLabel: 'Specs',
          rawItem: p
        });
      }
      if (dateInSelectedMonth(p.uiux)) {
        autoItems.push({
          id: `auto-proj-uiux-${p.id}`,
          title: p.title,
          source: 'Student Projects',
          column: 'design',
          priority: p.priority,
          poc: p.poc,
          status: p.status,
          date: p.uiux!,
          dateLabel: 'UI/UX',
          rawItem: p
        });
      }
      if (dateInSelectedMonth(p.deadline || p.completeInfoDate)) {
        autoItems.push({
          id: `auto-proj-dev-${p.id}`,
          title: p.title,
          source: 'Student Projects',
          column: 'dev',
          priority: p.priority,
          poc: p.poc,
          status: p.status,
          date: p.deadline || p.completeInfoDate,
          dateLabel: 'Dev',
          rawItem: p
        });
      }
    });

    // ContentItems
    contentItems.forEach(item => {
      if (dateInSelectedMonth(item.productDeadline)) {
        autoItems.push({
          id: `auto-content-specs-${item.id}`,
          title: item.module,
          source: 'Content Pipeline',
          column: 'product',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.productDeadline!,
          dateLabel: 'Specs',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.uiux)) {
        autoItems.push({
          id: `auto-content-uiux-${item.id}`,
          title: item.module,
          source: 'Content Pipeline',
          column: 'design',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.uiux!,
          dateLabel: 'UI/UX',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.deadline)) {
        autoItems.push({
          id: `auto-content-dev-${item.id}`,
          title: item.module,
          source: 'Content Pipeline',
          column: 'dev',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.deadline!,
          dateLabel: 'Dev',
          rawItem: item
        });
      }
    });

    // StudentMeetings
    studentMeetings.forEach(m => {
      if (m.status === 'Completed') return;
      if (dateInSelectedMonth(m.productDeadline)) {
        autoItems.push({
          id: `auto-meet-specs-${m.id}`,
          title: m.cohort,
          source: 'AMA & Meetings',
          column: 'product',
          priority: m.priority,
          poc: m.poc,
          status: m.status,
          date: m.productDeadline!,
          dateLabel: 'Specs',
          rawItem: m
        });
      }
      if (dateInSelectedMonth(m.uiux)) {
        autoItems.push({
          id: `auto-meet-uiux-${m.id}`,
          title: m.cohort,
          source: 'AMA & Meetings',
          column: 'design',
          priority: m.priority,
          poc: m.poc,
          status: m.status,
          date: m.uiux!,
          dateLabel: 'UI/UX',
          rawItem: m
        });
      }
      if (dateInSelectedMonth(m.deadline)) {
        autoItems.push({
          id: `auto-meet-dev-${m.id}`,
          title: m.cohort,
          source: 'AMA & Meetings',
          column: 'dev',
          priority: m.priority,
          poc: m.poc,
          status: m.status,
          date: m.deadline!,
          dateLabel: 'Dev',
          rawItem: m
        });
      }
    });
  }

  // Sort auto items by date
  autoItems.sort((a, b) => {
    const da = parseDateToYYYYMMDD(a.date);
    const db = parseDateToYYYYMMDD(b.date);
    return da.localeCompare(db);
  });

  // ── Manual plan items ──────────────────────────────────────────────────────
  const filteredPlan = planItems.filter(item => {
    const matchesMonth = item.month === selectedMonth;
    const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase());
    const matchedProduct = findMatchingProductItem(item.task);
    const matchesSuperPriority = !filterSuperPriorityOnly || !!matchedProduct?.raisedByTarunSir;
    return matchesMonth && matchesSearch && matchesSuperPriority;
  });

  // ── Filtered auto items by search ──────────────────────────────────────────
  const filteredAuto = autoItems.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSuperPriority = !filterSuperPriorityOnly || !!a.rawItem?.raisedByTarunSir;
    return matchesSearch && matchesSuperPriority;
  });

  const handleAddNew = () => {
    const newTask: PlanItem = {
      id: `plan-${Date.now()}`,
      month: selectedMonth,
      category: 'Development',
      task: 'New Sprint Task Description',
      link: '',
      status: 'open'
    };
    addPlanItem(newTask);
    setEditingItem(newTask);
  };

  // HTML5 Drag-and-drop operations (manual items only)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canUserEdit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    if (!canUserEdit) return;
    e.preventDefault();
    setDraggedOverColumn(colId);
  };
  const handleDragLeave = () => setDraggedOverColumn(null);
  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    if (!canUserEdit) return;
    e.preventDefault();
    setDraggedOverColumn(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId || itemId.startsWith('auto-')) return;
    const statusMap: Record<string, string> = {
      product: 'open',
      design: 'in design',
      dev: 'development'
    };
    if (statusMap[targetColId]) updatePlanItem(itemId, { status: statusMap[targetColId] as any });
  };

  const COLUMNS = [
    { id: 'product', title: 'Product Specs', statuses: ['open'], headerClass: 'product', icon: <Inbox size={14} style={{ color: 'var(--text-muted)' }} /> },
    { id: 'design', title: 'UI/UX Design', statuses: ['in design'], headerClass: 'design', icon: <Palette size={14} style={{ color: 'var(--primary)' }} /> },
    { id: 'dev', title: 'Development', statuses: ['development', 'testing', 'tested'], headerClass: 'dev', icon: <Code size={14} style={{ color: 'var(--info)' }} /> }
  ];

  // Source badge colour map
  const sourceColors: Record<string, { bg: string; color: string }> = {
    'Priority Requests': { bg: 'hsla(245,80%,60%,0.12)', color: 'hsl(245,70%,50%)' },
    'Student Projects':  { bg: 'hsla(199,80%,50%,0.12)', color: 'hsl(199,80%,38%)' },
    'Content Pipeline':  { bg: 'hsla(38,90%,50%,0.12)',  color: 'hsl(38,85%,38%)' },
    'AMA & Meetings':    { bg: 'hsla(142,70%,45%,0.12)', color: 'hsl(142,65%,32%)' },
    'Product Breakdown': { bg: 'hsla(271,80%,60%,0.12)', color: 'hsl(271,70%,50%)' },
  };

  return (
    <>
      <TabContainer
        title="Sprint Planning"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Task"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >

        <div className="kanban-board-container">
          {COLUMNS.map(col => {
            const getAutoItemCompleted = (a: any) => {
              const matchedProduct = findMatchingProductItem(a.title);
              if (a.column === 'product') {
                const isProductCompleted = matchedProduct
                  ? (!!matchedProduct.productDeadlineCompleted || !!matchedProduct.tarunSirApproval || matchedProduct.status === 'Completed')
                  : false;
                return isProductCompleted || a.status === 'Completed' || a.status === 'Delivered';
              } else if (a.column === 'design') {
                const isUiuxCompleted = matchedProduct
                  ? (!!matchedProduct.uiuxCompleted || matchedProduct.status === 'Completed')
                  : false;
                return isUiuxCompleted || a.status === 'Completed' || a.status === 'Delivered';
              } else if (a.column === 'dev') {
                const isDevCompleted = matchedProduct
                  ? (!!matchedProduct.deadlineCompleted || matchedProduct.status === 'Completed' || matchedProduct.clickupStatus?.toLowerCase() === 'closed')
                  : false;
                return isDevCompleted || a.status === 'Completed' || a.status === 'Delivered';
              }
              return false;
            };

            const manualColItems = filteredPlan.filter(item => col.statuses.includes(item.status));
            const autoColItems = filteredAuto.filter(a => a.column === col.id);

            const combinedItems = [
              ...autoColItems.map(a => ({
                type: 'auto' as const,
                id: a.id,
                isCompleted: getAutoItemCompleted(a),
                data: a
              })),
              ...manualColItems.map(item => ({
                type: 'manual' as const,
                id: item.id,
                isCompleted: !!item.completed,
                data: item
              }))
            ];

            combinedItems.sort((a, b) => (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0));

            const totalCount = combinedItems.length;

            return (
              <div
                key={col.id}
                className={`kanban-column ${draggedOverColumn === col.id ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className={`kanban-column-header ${col.headerClass}`}>
                  <div className="kanban-column-title">
                    {col.icon}
                    <span>{col.title}</span>
                  </div>
                  <span className="kanban-card-count">{totalCount}</span>
                </div>

                <div className="kanban-column-body">
                  {combinedItems.map(item => {
                    if (item.type === 'auto') {
                      const a = item.data;
                      const clr = sourceColors[a.source] || { bg: 'var(--panel-bg)', color: 'var(--text-secondary)' };
                      const isCompleted = item.isCompleted;
                      const matchedProduct = findMatchingProductItem(a.title);

                      return (
                        <div
                          key={a.id}
                          className={`kanban-card ${isCompleted ? 'completed-card' : ''}`}
                          style={{
                            borderLeft: isCompleted ? undefined : `3px solid ${clr.color}`,
                            cursor: 'pointer',
                            opacity: 1
                          }}
                          onClick={() => openPreviewForFeature(a.title, {
                            status: a.status as any,
                            priority: a.priority as any,
                            poc: a.poc,
                          })}
                        >
                          <div className="kanban-card-title" style={{ fontSize: '0.8rem', lineHeight: 1.35 }}>
                            {a.title}
                          </div>
                          <div className="kanban-card-footer" style={{ marginTop: '0.5rem' }}>
                            <div className="kanban-card-tags" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
                              {/* Source badge */}
                              <span style={{
                                background: clr.bg, color: clr.color,
                                border: `1px solid ${clr.color}44`,
                                borderRadius: '10px', padding: '1px 6px',
                                fontSize: '0.65rem', fontWeight: 700
                              }}>{a.source}</span>

                              {/* ClickUp Status badge */}
                              {(() => {
                                const clickupStatus = a.rawItem?.clickupStatus || matchedProduct?.clickupStatus;
                                if (clickupStatus) {
                                  return (
                                    <span style={{
                                      ...getClickupBadgeStyle(clickupStatus),
                                      fontSize: '0.65rem',
                                      padding: '1.5px 6px',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase',
                                      fontWeight: 750
                                    }}>
                                      {clickupStatus}
                                    </span>
                                  );
                                }
                                return null;
                              })()}

                              {/* Date label badge */}
                              {(() => {
                                const dynamicStyle = getDateSpanStyle(a.date, isCompleted);
                                const hasHighlight = Object.keys(dynamicStyle).length > 0;
                                return (
                                  <span style={{
                                    background: hasHighlight ? dynamicStyle.backgroundColor : 'var(--background)',
                                    color: hasHighlight ? dynamicStyle.color : 'var(--text-secondary)',
                                    border: hasHighlight ? 'none' : '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '1px 6px',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    <Clock size={9} />
                                    {a.dateLabel}: {formatDateToUserPattern(a.date)}
                                  </span>
                                );
                              })()}

                              {/* Priority */}
                              {a.priority && (
                                <span className={`badge badge-${a.priority.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                                  {a.priority}
                                </span>
                              )}

                              {/* Super Priority */}
                              {(a.rawItem?.raisedByTarunSir || matchedProduct?.raisedByTarunSir) && (
                                <span className="badge-super-priority" style={{ fontSize: '0.6rem', padding: '1px 5px', gap: '2px', display: 'inline-flex', alignItems: 'center' }}>
                                  <Sparkles size={8} /> Super Priority
                                </span>
                              )}
                            </div>
                            {a.poc && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {a.poc}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const manualItem = item.data;
                      const isCompleted = item.isCompleted;
                      return (
                        <div
                          key={manualItem.id}
                          className={`kanban-card ${isCompleted ? 'completed-card' : ''}`}
                          draggable={canUserEdit}
                          onDragStart={(e) => handleDragStart(e, manualItem.id)}
                          onClick={() => openPreviewForFeature(manualItem.task, { status: manualItem.status as any, clickupStatus: manualItem.status, taskLink: manualItem.link })}
                        >
                          <div className="kanban-card-title">{manualItem.task}</div>

                          <div className="kanban-card-footer">
                            <div className="kanban-card-tags">
                              <span className={`kanban-badge-category ${manualItem.category.toLowerCase().replace('/', '')}`}>
                                {manualItem.category}
                              </span>
                              <span className="kanban-badge-month">
                                <Clock size={10} />
                                {manualItem.month}
                              </span>
                              {(() => {
                                const matchedProduct = findMatchingProductItem(manualItem.task);
                                const clickupStatus = manualItem.clickupStatus || matchedProduct?.clickupStatus;
                                if (clickupStatus) {
                                  return (
                                    <span style={{
                                      ...getClickupBadgeStyle(clickupStatus),
                                      fontSize: '0.65rem',
                                      padding: '1.5px 6px',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase',
                                      fontWeight: 750
                                    }}>
                                      {clickupStatus}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {(() => {
                                const matchedProduct = findMatchingProductItem(manualItem.task);
                                if (matchedProduct?.raisedByTarunSir) {
                                  return (
                                    <span className="badge-super-priority" style={{ fontSize: '0.6rem', padding: '1px 5px', gap: '2px', display: 'inline-flex', alignItems: 'center' }}>
                                      <Sparkles size={8} /> Super Priority
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                              {canUserEdit && (
                                <button
                                  onClick={() => updatePlanItem(manualItem.id, { completed: !manualItem.completed })}
                                  className={`kanban-complete-btn ${isCompleted ? 'active' : ''}`}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: isCompleted ? 'var(--success)' : 'var(--text-muted)',
                                    display: 'inline-flex', alignItems: 'center', padding: '2px',
                                    transition: 'color 0.2s'
                                  }}
                                  title={isCompleted ? 'Mark Active' : 'Mark Completed'}
                                >
                                  <CheckCircle size={12} />
                                </button>
                              )}
                              {manualItem.link && (
                                <a
                                  href={manualItem.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="clickup-action-link"
                                  style={{ padding: '2px', borderRadius: '4px' }}
                                  title="Open Reference Link"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              {canUserEdit && (
                                <button
                                  onClick={async () => {
                                    if (await confirm('Are you sure you want to delete this sprint task?', 'Delete Sprint Task')) {
                                      deletePlanItem(manualItem.id);
                                    }
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '2px' }}
                                  title="Delete Task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}

                  {totalCount === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '1.5rem 0.5rem',
                      color: 'var(--text-muted)', fontSize: '0.75rem',
                      border: '1px dashed var(--border)', borderRadius: '8px'
                    }}>
                      No items for {selectedMonth}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </TabContainer>

      {editingItem && (
        <PlanDetailModal
          item={planItems.find(i => i.id === editingItem.id) || editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={updatePlanItem}
        />
      )}
    </>
  );
};


/* =========================================================================
   3. STUDENT PROJECTS TABLE MODAL & COMPONENT
   ========================================================================= */
// ProjectDetailModal is deprecated in favor of unified ProductDetailView

export const StudentProjectsTable: React.FC = () => {
  const { studentProjects, updateStudentProject, addStudentProject, deleteStudentProject, openPreviewForFeature, statuses, productItems, canUserEdit, currentUser, confirm } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof StudentProject | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const studentStatuses = statuses.map(s => s.label);
  const statusOptions = studentStatuses.length > 0 ? studentStatuses : ['Delivered', 'Cancelled', 'In-Progress'];

  const handleSort = (field: keyof StudentProject) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof StudentProject } | null>(null);
  const [inlineCellValue, setInlineCellValue] = useState('');
  const clickupInputRef = useRef<HTMLInputElement>(null);

  const startCellEdit = (p: StudentProject, field: keyof StudentProject) => {
    setEditingProjectId(null);
    setInlineCellValue(String(p[field] || ''));
    setEditingCell({ id: p.id, field });
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    updateStudentProject(editingCell.id, { [editingCell.field]: inlineCellValue } as Partial<StudentProject>);
    setEditingCell(null);
  };



  const renderClickupStatusCell = (p: StudentProject) => {
    const isEditing = editingCell?.id === p.id && editingCell.field === 'clickupStatus';
    if (isEditing) {
      return (
        <input
          autoFocus
          ref={clickupInputRef}
          type="text"
          value={inlineCellValue}
          onChange={(e) => setInlineCellValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveCellEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditingCell(null);
            }
          }}
          onBlur={saveCellEdit}
          style={{
            width: '100%',
            padding: '4px 6px',
            backgroundColor: 'var(--background)',
            border: '1.5px solid var(--primary)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
      );
    }

    const display = p.clickupStatus ? (
      <span style={getClickupBadgeStyle(p.clickupStatus)}>
        {p.clickupStatus}
      </span>
    ) : '—';

    return (
      <div 
        onClick={(e) => { e.stopPropagation(); startCellEdit(p, 'clickupStatus'); }}
        style={{ width: '100%', minHeight: '20px' }}
      >
        {display}
      </div>
    );
  };

  const filtered = studentProjects.filter(p => {
    const matchesSuperPriority = !filterSuperPriorityOnly || !!p.raisedByTarunSir;
    if (!matchesSuperPriority) return false;

    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(p.status);
    if (!matchesStatus) return false;
    
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.thingsWeBuild || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    const aComp = isCompletedStatus(a.status);
    const bComp = isCompletedStatus(b.status);
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (sortField) {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  useEffect(() => {
    if (editingProjectId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingProjectId]);

  const handleAddNew = () => {
    setSearchQuery('');
    setSortField(null);
    const newItem: StudentProject = {
      id: `proj-${Date.now()}`,
      title: 'New Project',
      description: '',
      thingsWeBuild: '',
      status: '',
      assigned: '',
      blocker: '',
      completeInfoDate: '',
      priority: undefined,
      poc: currentUser?.name || 'Akash Sharma',
      clickupStatus: '',
      taskLink: '',
      productDeadline: '',
      uiux: '',
      deadline: '',
      finalRelease: '',
      raisedByTarunSir: false,
      tarunSirApproval: false
    };
    addStudentProject(newItem);
    setTimeout(() => {
      openPreviewForFeature(newItem.title, { 
        id: newItem.id,
        description: newItem.description, 
        status: newItem.status as any, 
        priority: newItem.priority || '',
        poc: newItem.poc || '',
        clickupStatus: newItem.clickupStatus || '',
        taskLink: newItem.taskLink || '',
        blocker: newItem.blocker || '',
        deadline: newItem.deadline || newItem.completeInfoDate || '',
        uiux: newItem.uiux || '',
        finalRelease: newItem.finalRelease || '',
        productDeadline: newItem.productDeadline || '',
        raisedByTarunSir: newItem.raisedByTarunSir || false,
        tarunSirApproval: newItem.tarunSirApproval || false
      });
    }, 50);
  };

  return (
    <>
      <TabContainer
        title="Student Projects"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Project"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('title')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Project Title {sortField === 'title' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('priority')} style={{ width: '80px', cursor: 'pointer' }}>Priority {sortField === 'priority' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '120px' }}>Rating</th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>Release Date {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const matchedProduct = productItems.find(item => {
                  const cleanFeature = clean(item.feature);
                  const cleanTitle = clean(p.title);
                  return cleanFeature === cleanTitle || item.id === `prod-temp-${p.id}`;
                });

                return (
                  <tr 
                    key={p.id} 
                    onClick={() => {
                      if (editingProjectId !== p.id && p.title.trim()) {
                        openPreviewForFeature(p.title, { 
                          id: p.id,
                          description: p.description, 
                          status: p.status as any, 
                          priority: p.priority || '',
                          poc: p.poc || '',
                          clickupStatus: p.clickupStatus || '',
                          taskLink: p.taskLink || '',
                          blocker: p.blocker || '',
                          deadline: p.deadline || p.completeInfoDate || '',
                          uiux: p.uiux || '',
                          finalRelease: p.finalRelease || '',
                          productDeadline: p.productDeadline || '',
                          raisedByTarunSir: p.raisedByTarunSir || false,
                          tarunSirApproval: p.tarunSirApproval || false,
                          product: p.product || '',
                          module: p.module || '',
                          type: p.type || ''
                        } as Partial<ProductItem>);
                      }
                    }} 
                    style={{ cursor: 'pointer' }}
                  >
                  <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                      {editingProjectId === p.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const finalVal = inlineEditValue.trim() || 'New Student Project';
                              updateStudentProject(p.id, { title: finalVal });
                              setEditingProjectId(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingProjectId(null);
                            }
                          }}
                          onBlur={() => {
                            const finalVal = inlineEditValue.trim() || 'New Student Project';
                            updateStudentProject(p.id, { title: finalVal });
                            setEditingProjectId(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--background)',
                            border: '1.5px solid var(--primary)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            outline: 'none',
                            boxShadow: '0 0 0 2px var(--primary-glow)'
                          }}
                        />
                      ) : (
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>
                          {p.title || 'Untitled Project'}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>

                        {p.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Star size={10} fill="currentColor" /> Super Priority
                          </span>
                        )}
                        {p.tarunSirApproval && (
                          <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                            <CheckCircle size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{p.product || '—'}</td>
                  <td>
                    {p.priority ? (
                      <span className={`badge badge-${p.priority.toLowerCase()}`}>
                        {p.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {p.poc ? (
                      <span style={getPOCBadgeStyle(p.poc)}>
                        {p.poc}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {p.status ? (() => {
                      const matched = statuses.find(s => s.label === p.status);
                      if (matched) {
                        return (
                          <span className="badge" style={{
                            backgroundColor: `${matched.color}14`,
                            color: matched.color,
                            borderColor: `${matched.color}33`,
                            borderStyle: 'solid',
                            borderWidth: '1px'
                          }}>
                            {p.status}
                          </span>
                        );
                      }
                      return (
                        <span className={`badge ${
                          isCompletedStatus(p.status) ? 'status-completed' :
                          (p.status === 'Cancelled' || (p.status as string) === 'On Hold') ? 'status-hold' : 'status-progress'
                        }`}>
                          {p.status}
                        </span>
                      );
                    })() : '—'}
                  </td>
                  <td>
                    {renderClickupStatusCell(p)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <FeedbackRatingCell 
                      itemId={p.id} 
                      category="student-projects" 
                      onCellClick={(id, cat) => {
                        setDrawerItemId(id);
                        setDrawerCategory(cat);
                      }}
                    />
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {p.productDeadline ? (
                      <span style={getDateSpanStyle(p.productDeadline, isCompletedStatus(p.status) || !!matchedProduct?.productDeadlineCompleted)}>
                        {formatDateToUserPattern(p.productDeadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.productDeadline} currentDate={p.uiux} />
                    {p.uiux ? (
                      <span style={getDateSpanStyle(p.uiux, isCompletedStatus(p.status) || !!matchedProduct?.uiuxCompleted)}>
                        {formatDateToUserPattern(p.uiux)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.uiux || p.productDeadline} currentDate={p.deadline || p.completeInfoDate} />
                    {(p.deadline || p.completeInfoDate) ? (
                      <span style={getDateSpanStyle(p.deadline || p.completeInfoDate, isCompletedStatus(p.status) || !!matchedProduct?.deadlineCompleted)}>
                        {formatDateToUserPattern(p.deadline || p.completeInfoDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.deadline || p.completeInfoDate || p.uiux || p.productDeadline} currentDate={p.finalRelease} />
                    {p.finalRelease ? (
                      <span style={getDateSpanStyle(p.finalRelease, isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted)}>
                        {formatDateToUserPattern(p.finalRelease)}
                      </span>
                    ) : '—'}
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = `${window.location.origin}/?feedback=${p.id}&category=student-projects`;
                          navigator.clipboard.writeText(link).then(() => {
                            setCopiedId(p.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: copiedId === p.id ? 'var(--success)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px'
                        }}
                        title={copiedId === p.id ? "Link Copied!" : "Copy Feedback Link"}
                      >
                        {copiedId === p.id ? <Check size={12} /> : <Link size={12} />}
                      </button>
                      {canUserEdit && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirm("Are you sure you want to delete this project?", "Delete Project")) {
                              deleteStudentProject(p.id);
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </TabContainer>
      <FeedbackDrawer
        itemId={drawerItemId}
        category={drawerCategory}
        onClose={() => {
          setDrawerItemId(null);
          setDrawerCategory(null);
        }}
      />
    </>
  );
};

/* =========================================================================
   4. STUDENT MEETINGS SCHEDULE MODAL & COMPONENT
   ========================================================================= */

export interface StudentMeetingDetailModalProps {
  item: StudentMeeting;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<StudentMeeting>) => void;
}

export const StudentMeetingDetailModal: React.FC<StudentMeetingDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const { canUserEdit } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StudentMeeting>({ ...item });

  React.useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  const handleSave = () => {
    onUpdate(item.id, draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...item });
    setIsEditing(false);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit', color: 'var(--primary)' }}>
            {isEditing ? 'Edit Meeting feedback' : 'Cohort Feedback details'}
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isEditing ? (
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Meeting Date</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.date} 
                onChange={(e) => setDraft({ ...draft, date: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cohort / Programme</label>
              <input 
                type="text" 
                className="form-input" 
                value={draft.cohort} 
                onChange={(e) => setDraft({ ...draft, cohort: e.target.value })} 
              />
            </div>

            <div className="form-group form-group-full">
              <label className="form-label">Feedback Summary Points (Use hyphens for bullets)</label>
              <textarea 
                className="form-input" 
                style={{ height: '180px', resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.summary} 
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })} 
              />
            </div>
          </div>
        ) : (
          <div className="detail-grid">
            <div className="detail-group">
              <span className="detail-label">Cohort / Section</span>
              <span className="detail-value" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.cohort}</span>
            </div>

            <div className="detail-group">
              <span className="detail-label">Meeting Date</span>
              <span className="detail-value">{item.date}</span>
            </div>

            <div className="detail-group detail-group-full">
              <span className="detail-label">Feedback Minutes & Action Topics</span>
              <div className="detail-value-block">
                {item.summary}
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          {isEditing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              {canUserEdit && <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Details</button>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};



const programsList = ['UG', 'PGP', 'YLC', 'All'];
const allStandardCohorts = ['UG-27,28,29', 'UGTBM 1', 'UGTBM 2', 'UG-DSAI-2029', 'PGP TBM', 'PGP-26', 'PGP-27', 'YLC 27', 'YLC 28', 'All Cohorts'];

const programCohortsMap: Record<string, string[]> = {
  'UG': ['UG-27,28,29', 'UGTBM 1', 'UGTBM 2', 'UG-DSAI-2029'],
  'PGP': ['PGP TBM', 'PGP-26', 'PGP-27'],
  'YLC': ['YLC 27', 'YLC 28'],
  'All': ['All Cohorts']
};



const getProgramForCohort = (cohort: string): string => {
  for (const [prog, cohorts] of Object.entries(programCohortsMap)) {
    if (cohorts.includes(cohort)) {
      return prog;
    }
  }
  if (cohort.startsWith('UG')) return 'UG';
  if (cohort.startsWith('PGP')) return 'PGP';
  if (cohort.startsWith('YLC')) return 'YLC';
  return 'UG';
};

export const StudentMeetingsTable: React.FC = () => {
  const { 
    amaSessions, addAMASession, updateAMASession, deleteAMASession,
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers, statuses, currentUser, confirm
  } = useDashboard();

  // Derive speakers list from configuration context (live — updates when Config tab changes)
  const speakersList = configSpeakers.map(s => s.name);

  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  useEffect(() => {
    setFilterStatuses([]);
  }, [subTab]);

  // Sorting states
  const [amaSortField, setAmaSortField] = useState<keyof AMASession | null>(null);
  const [amaSortAsc, setAmaSortAsc] = useState(true);

  const [feedbackSortField, setFeedbackSortField] = useState<keyof ProductItem | 'amaDate' | 'amaProgram' | 'amaCohort' | 'amaSpeaker' | null>(null);
  const [feedbackSortAsc, setFeedbackSortAsc] = useState(true);

  const handleAmaSort = (field: keyof AMASession) => {
    if (amaSortField === field) {
      setAmaSortAsc(!amaSortAsc);
    } else {
      setAmaSortField(field);
      setAmaSortAsc(true);
    }
  };

  const handleFeedbackSort = (field: typeof feedbackSortField) => {
    if (feedbackSortField === field) {
      setFeedbackSortAsc(!feedbackSortAsc);
    } else {
      setFeedbackSortField(field);
      setFeedbackSortAsc(true);
    }
  };

  const statusOptions = statuses.map(s => s.label).length > 0 ? statuses.map(s => s.label) : ['Scheduled', 'Completed', 'Postponed', 'On Hold', 'In Progress', 'Ongoing'];

  // Dropdown other state
  const [showCustomProgramInput, setShowCustomProgramInput] = useState(false);
  const [showCustomCohortInput, setShowCustomCohortInput] = useState(false);

  // Inline editing states for AMA sessions
  const [editingAMATopicId, setEditingAMATopicId] = useState<string | null>(null);
  const [inlineAMATopicValue, setInlineAMATopicValue] = useState('');
  const editAMATopicInputRef = useRef<HTMLInputElement>(null);

  const [editingAMADateId, setEditingAMADateId] = useState<string | null>(null);
  const [inlineAMADateValue, setInlineAMADateValue] = useState('');
  const editAMADateInputRef = useRef<HTMLInputElement>(null);

  const [editingAMASpeakerId, setEditingAMASpeakerId] = useState<string | null>(null);
  const [inlineAMASpeakerValue, setInlineAMASpeakerValue] = useState('');

  const [editingAMACohortId, setEditingAMACohortId] = useState<string | null>(null);
  const [inlineAMACohortValue, setInlineAMACohortValue] = useState('');
  const [inlineAMAProgramValue, setInlineAMAProgramValue] = useState('');
  const editAMACohortInputRef = useRef<HTMLInputElement>(null);
  const editAMAProgramInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAMATopicId && editAMATopicInputRef.current) {
      editAMATopicInputRef.current.focus();
      editAMATopicInputRef.current.select();
    }
  }, [editingAMATopicId]);

  useEffect(() => {
    if (editingAMADateId && editAMADateInputRef.current) {
      editAMADateInputRef.current.focus();
    }
  }, [editingAMADateId]);

  useEffect(() => {
    if (editingAMACohortId && editAMAProgramInputRef.current) {
      editAMAProgramInputRef.current.focus();
      editAMAProgramInputRef.current.select();
    }
  }, [editingAMACohortId]);

  // Accordion state for AMA sessions
  const [expandedAMAId, setExpandedAMAId] = useState<string | null>(null);

  // Inline editing state for related features in expanded AMA session
  const [editingRelatedFeatureId, setEditingRelatedFeatureId] = useState<string | null>(null);
  const [inlineRelatedFeatureValue, setInlineRelatedFeatureValue] = useState('');
  const editRelatedFeatureInputRef = useRef<HTMLInputElement>(null);

  const getRelatedFeatures = (ama: AMASession) => {
    const matchesId = productItems.filter(item => 
      !item.id.startsWith('prod-temp-') && 
      item.notes && 
      item.notes.includes(`AMA Session ID: ${ama.id}`)
    );
    if (filterSuperPriorityOnly) {
      return matchesId.filter(feat => feat.raisedByTarunSir);
    }
    return matchesId;
  };



  // Helper to find the parent AMA session for a feedback item
  const getParentAma = (item: ProductItem): AMASession | undefined => {
    if (item.notes && item.notes.includes('AMA Session ID:')) {
      const match = item.notes.match(/AMA Session ID:\s*([^\s,;\]]+)/);
      if (match && match[1]) {
        return amaSessions.find(ama => ama.id === match[1]);
      }
    }
    return undefined;
  };

  // Inline editing for Feedback Features
  const [editingFeedbackFeatureId, setEditingFeedbackFeatureId] = useState<string | null>(null);
  const [inlineFeedbackFeatureValue, setInlineFeedbackFeatureValue] = useState('');
  const editFeedbackFeatureInputRef = useRef<HTMLInputElement>(null);


  // Inline editing for Feedback Dates
  const [editingFeedbackDateId, setEditingFeedbackDateId] = useState<string | null>(null);
  const [inlineFeedbackDateValue, setInlineFeedbackDateValue] = useState('');
  const editFeedbackDateInputRef = useRef<HTMLInputElement>(null);

  // Inline editing for Feedback Programs
  const [editingFeedbackProgramId, setEditingFeedbackProgramId] = useState<string | null>(null);
  const [inlineFeedbackProgramValue, setInlineFeedbackProgramValue] = useState('');
  const editFeedbackProgramInputRef = useRef<HTMLInputElement>(null);

  // Inline editing for Feedback Cohorts
  const [editingFeedbackCohortId, setEditingFeedbackCohortId] = useState<string | null>(null);
  const [inlineFeedbackCohortValue, setInlineFeedbackCohortValue] = useState('');
  const editFeedbackCohortInputRef = useRef<HTMLInputElement>(null);

  // Inline editing for Feedback Speakers
  const [editingFeedbackSpeakerId, setEditingFeedbackSpeakerId] = useState<string | null>(null);
  const [inlineFeedbackSpeakerValue, setInlineFeedbackSpeakerValue] = useState('');

  useEffect(() => {
    if (editingFeedbackFeatureId && editFeedbackFeatureInputRef.current) {
      editFeedbackFeatureInputRef.current.focus();
      editFeedbackFeatureInputRef.current.select();
    }
  }, [editingFeedbackFeatureId]);


  useEffect(() => {
    if (editingFeedbackDateId && editFeedbackDateInputRef.current) {
      editFeedbackDateInputRef.current.focus();
    }
  }, [editingFeedbackDateId]);

  useEffect(() => {
    if (editingFeedbackProgramId && editFeedbackProgramInputRef.current) {
      editFeedbackProgramInputRef.current.focus();
      editFeedbackProgramInputRef.current.select();
    }
  }, [editingFeedbackProgramId]);

  useEffect(() => {
    if (editingFeedbackCohortId && editFeedbackCohortInputRef.current) {
      editFeedbackCohortInputRef.current.focus();
      editFeedbackCohortInputRef.current.select();
    }
  }, [editingFeedbackCohortId]);




  useEffect(() => {
    if (editingRelatedFeatureId && editRelatedFeatureInputRef.current) {
      editRelatedFeatureInputRef.current.focus();
      editRelatedFeatureInputRef.current.select();
    }
  }, [editingRelatedFeatureId]);

  const filteredAMASessions = amaSessions.filter(ama => {
    const matchesSearch = 
      ama.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ama.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ama.cohort.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterStatuses.length > 0 && !filterStatuses.includes(ama.status)) return false;
    
    if (filterSuperPriorityOnly) {
      const related = getRelatedFeatures(ama);
      return related.length > 0;
    }
    
    return true;
  });

  const sortedAMASessions = [...filteredAMASessions];
  sortedAMASessions.sort((a, b) => {
    const aComp = a.status === 'Completed';
    const bComp = b.status === 'Completed';
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (amaSortField) {
      let valA = a[amaSortField];
      let valB = b[amaSortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return amaSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  const filteredFeedbackFeatures = productItems.filter(item => {
    if (item.id.startsWith('prod-temp-')) return false;
    // Admin Call features must never appear in the AMA Feedback tab
    if (item.id.startsWith('prod-call-') || item.id.startsWith('prod-tarun-')) return false;

    // If it is a prod-ama- task, it must have an active parent AMA session
    if (item.id.startsWith('prod-ama-')) {
      const parent = getParentAma(item);
      if (!parent) return false;
    }
    
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    if (!matchesSuperPriority) return false;
    
    if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;

    // Check if the item matches any AMA session
    const matchesAma = amaSessions.some(ama => {
      // If it is a prod-ama- task, it must match the AMA Session ID exactly
      if (item.id.startsWith('prod-ama-')) {
        return item.notes && item.notes.includes(`AMA Session ID: ${ama.id}`);
      }

      if (!ama.topic.trim() && !ama.cohort.trim()) return false;
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const topicWords = clean(ama.topic).split(/\s+/).filter(w => w.length > 3);
      const cohortWords = clean(ama.cohort).split(/\s+/).filter(w => w.length > 2);
      const searchTerms = [...topicWords, ...cohortWords];

      const productLower = (item.product || '').toLowerCase().trim();
      const moduleLower = (item.module || '').toLowerCase().trim();
      const notesLower = (item.notes || '').toLowerCase().trim();
      const cohortLower = (ama.cohort || '').toLowerCase().trim();
      
      const directCohortMatch = cohortLower && (
        (productLower && (productLower.includes(cohortLower) || cohortLower.includes(productLower))) ||
        (moduleLower && (moduleLower.includes(cohortLower) || cohortLower.includes(moduleLower))) ||
        (notesLower && notesLower.includes(cohortLower))
      );
      
      const text = clean(
        (item.feature || '') + ' ' + 
        (item.description || '') + ' ' + 
        (item.notes || '') + ' ' + 
        (item.product || '') + ' ' +
        (item.module || '')
      );
      const matchesKeyword = searchTerms.some(word => text.includes(word));
      return directCohortMatch || matchesKeyword;
    });

    if (!matchesAma) return false;

    // Filter by search query if any
    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.module || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const sortedFeedbackFeatures = [...filteredFeedbackFeatures];
  sortedFeedbackFeatures.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (feedbackSortField) {
      let valA: any = '';
      let valB: any = '';
      
      if (feedbackSortField === 'amaDate' || feedbackSortField === 'amaProgram' || feedbackSortField === 'amaCohort' || feedbackSortField === 'amaSpeaker') {
        const parentA = getParentAma(a);
        const parentB = getParentAma(b);
        if (feedbackSortField === 'amaDate') {
          valA = parentA?.date || '';
          valB = parentB?.date || '';
        } else if (feedbackSortField === 'amaProgram') {
          valA = parentA?.program || '';
          valB = parentB?.program || '';
        } else if (feedbackSortField === 'amaCohort') {
          valA = parentA?.cohort || '';
          valB = parentB?.cohort || '';
        } else if (feedbackSortField === 'amaSpeaker') {
          valA = parentA?.speaker || '';
          valB = parentB?.speaker || '';
        }
      } else {
        valA = a[feedbackSortField as keyof ProductItem] || '';
        valB = b[feedbackSortField as keyof ProductItem] || '';
      }
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return feedbackSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  const handleAddNew = () => {
    setSearchQuery('');
    setAmaSortField(null);
    if (subTab === 'schedule') {
      const newAMA: AMASession = {
        id: `ama-${Date.now()}`,
        date: new Date().toISOString().slice(0, 16),
        topic: 'New AMA Session',
        speaker: '',
        cohort: '',
        program: '',
        link: '',
        status: 'Scheduled'
      };
      addAMASession(newAMA);
      setInlineAMATopicValue('New AMA Session');
      setEditingAMATopicId(newAMA.id);
      setExpandedAMAId(newAMA.id);
    }
  };

  return (
    <>
      <TabContainer
        title="AMA & Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add AMA Session' : undefined}
        searchPlaceholder={subTab === 'schedule' ? 'Search AMA sessions...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >
        {/* Sub-tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            onClick={() => {
              setSubTab('schedule');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackCohortId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackProgramId(null);
              setEditingFeedbackSpeakerId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'schedule' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Schedule
          </button>
          <button
            onClick={() => {
              setSubTab('feedback');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackCohortId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackProgramId(null);
              setEditingFeedbackSpeakerId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'feedback' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'feedback' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Feedback
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleAmaSort('date')} style={{ width: '130px', cursor: 'pointer' }}>Date {amaSortField === 'date' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('topic')} style={{ cursor: 'pointer' }}>Topic / Theme {amaSortField === 'topic' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('speaker')} style={{ width: '220px', cursor: 'pointer' }}>Speaker(s) {amaSortField === 'speaker' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('cohort')} style={{ width: '150px', cursor: 'pointer' }}>Cohort {amaSortField === 'cohort' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleAmaSort('status')} style={{ width: '130px', cursor: 'pointer' }}>Status {amaSortField === 'status' ? (amaSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '120px' }}>Rating</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedAMASessions.map(ama => {
                  const related = getRelatedFeatures(ama);
                  const isExpanded = expandedAMAId === ama.id;
                  return (
                    <React.Fragment key={ama.id}>
                      <tr 
                        onClick={() => setExpandedAMAId(isExpanded ? null : ama.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAMADateId(ama.id);
                            setInlineAMADateValue(ama.date);
                          }}
                          title="Double click to edit Date/Time"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {editingAMADateId === ama.id ? (
                              <input
                                ref={editAMADateInputRef}
                                type="datetime-local"
                                value={formatToDatetimeLocalValue(inlineAMADateValue)}
                                onChange={(e) => setInlineAMADateValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineAMADateValue;
                                    updateAMASession(ama.id, { date: finalVal });
                                    setEditingAMADateId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingAMADateId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineAMADateValue;
                                  updateAMASession(ama.id, { date: finalVal });
                                  setEditingAMADateId(null);
                                }}
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <span>{formatDateWithTimeToUserPattern(ama.date)}</span>
                            )}
                          </div>
                        </td>
                        <td 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAMATopicId(ama.id);
                            setInlineAMATopicValue(ama.topic || '');
                          }}
                          style={{ fontWeight: 600 }}
                          title="Double click to edit Topic"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                            {editingAMATopicId === ama.id ? (
                              <input
                                ref={editAMATopicInputRef}
                                type="text"
                                value={inlineAMATopicValue}
                                onChange={(e) => setInlineAMATopicValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineAMATopicValue.trim() || 'New AMA Topic';
                                    updateAMASession(ama.id, { topic: finalVal });
                                    setEditingAMATopicId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingAMATopicId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineAMATopicValue.trim() || 'New AMA Topic';
                                  updateAMASession(ama.id, { topic: finalVal });
                                  setEditingAMATopicId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <>
                                <span>{ama.topic || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>

                                {related.length > 0 && (
                                  <span className="badge" style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 6px', 
                                    background: 'var(--primary-glow)', 
                                    color: 'var(--primary)', 
                                    border: '1px solid var(--primary-border)',
                                    fontWeight: 500
                                  }}>
                                    {related.length} {related.length === 1 ? 'feature' : 'features'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAMASpeakerId(ama.id);
                            setInlineAMASpeakerValue(ama.speaker || '');
                          }}
                          title="Click to edit Speaker(s)"
                        >
                          {editingAMASpeakerId === ama.id ? (
                            <select
                              autoFocus
                              value={inlineAMASpeakerValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineAMASpeakerValue(val);
                                if (val !== '__other__') {
                                  updateAMASession(ama.id, { speaker: val });
                                  setEditingAMASpeakerId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingAMASpeakerId(null);
                                }
                              }}
                              onBlur={() => setEditingAMASpeakerId(null)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">— Select Speaker —</option>
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineAMASpeakerValue && !speakersList.includes(inlineAMASpeakerValue) && (
                                <option value={inlineAMASpeakerValue}>{inlineAMASpeakerValue}</option>
                              )}
                            </select>
                          ) : (
                            ama.speaker ? (
                              <span style={getPOCBadgeStyle(ama.speaker)}>
                                {ama.speaker}
                              </span>
                            ) : '—'
                          )}
                        </td>
                        <td
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingAMACohortId(ama.id);
                            setInlineAMACohortValue(ama.cohort || '');
                            setInlineAMAProgramValue(ama.program || '');
                            setShowCustomProgramInput(ama.program ? !programsList.includes(ama.program) : false);
                            setShowCustomCohortInput(ama.cohort ? !allStandardCohorts.includes(ama.cohort) : false);
                          }}
                          title="Double click to edit Program/Cohort"
                        >
                          {editingAMACohortId === ama.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {!showCustomProgramInput ? (
                                <select
                                  value={inlineAMAProgramValue || 'UG'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomProgramInput(true);
                                      setInlineAMAProgramValue('');
                                    } else {
                                      setInlineAMAProgramValue(val);
                                      const cohorts = programCohortsMap[val] || [];
                                      if (cohorts.length > 0) {
                                        setInlineAMACohortValue(cohorts[0]);
                                        setShowCustomCohortInput(false);
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {programsList.map(prog => (
                                    <option key={prog} value={prog}>{prog}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editAMAProgramInputRef}
                                  type="text"
                                  placeholder="Prog"
                                  value={inlineAMAProgramValue}
                                  onChange={(e) => setInlineAMAProgramValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalCohort = inlineAMACohortValue.trim() || 'Cohort Name';
                                      const finalProgram = inlineAMAProgramValue.trim();
                                      updateAMASession(ama.id, { cohort: finalCohort, program: finalProgram });
                                      setEditingAMACohortId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingAMACohortId(null);
                                    }
                                  }}
                                  style={{
                                    width: '60px',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                              <span>-</span>
                              {!showCustomCohortInput ? (
                                <select
                                  value={inlineAMACohortValue || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomCohortInput(true);
                                      setInlineAMACohortValue('');
                                    } else {
                                      setInlineAMACohortValue(val);
                                      const mappedProg = getProgramForCohort(val);
                                      if (mappedProg && !showCustomProgramInput) {
                                        setInlineAMAProgramValue(mappedProg);
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {(programCohortsMap[inlineAMAProgramValue] || allStandardCohorts).map(coh => (
                                    <option key={coh} value={coh}>{coh}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editAMACohortInputRef}
                                  type="text"
                                  placeholder="Cohort"
                                  value={inlineAMACohortValue}
                                  onChange={(e) => setInlineAMACohortValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalCohort = inlineAMACohortValue.trim() || 'Cohort Name';
                                      const finalProgram = inlineAMAProgramValue.trim();
                                      updateAMASession(ama.id, { cohort: finalCohort, program: finalProgram });
                                      setEditingAMACohortId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingAMACohortId(null);
                                    }
                                  }}
                                  style={{
                                    width: '100px',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                              <button 
                                onClick={() => {
                                  const finalCohort = inlineAMACohortValue.trim() || 'Cohort Name';
                                  const finalProgram = inlineAMAProgramValue.trim();
                                  updateAMASession(ama.id, { cohort: finalCohort, program: finalProgram });
                                  setEditingAMACohortId(null);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingAMACohortId(null);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            ama.program ? `${ama.program} - ${ama.cohort}` : ama.cohort || '—'
                          )}
                        </td>
                        <td>
                          <select
                            value={ama.status || 'Scheduled'}
                            onChange={(e) => updateAMASession(ama.id, { status: e.target.value as any })}
                            onClick={(e) => e.stopPropagation()}
                            className={`badge ${
                              ama.status === 'Completed' ? 'status-completed' :
                              ama.status === 'Postponed' ? 'status-hold' : 'status-progress'
                            }`}
                            style={{ 
                              border: 'none', 
                              outline: 'none', 
                              cursor: 'pointer',
                              padding: '2px 6px',
                              fontFamily: 'inherit',
                              fontWeight: 'inherit',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            <option value="Scheduled" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Scheduled</option>
                            <option value="Completed" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Completed</option>
                            <option value="Postponed" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Postponed</option>
                          </select>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <FeedbackRatingCell 
                            itemId={ama.id} 
                            category="ama-meetings" 
                            onCellClick={(id, cat) => {
                              setDrawerItemId(id);
                              setDrawerCategory(cat);
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = `${window.location.origin}/?feedback=${ama.id}&category=ama-meetings`;
                                navigator.clipboard.writeText(link).then(() => {
                                  setCopiedId(ama.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                });
                              }}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: copiedId === ama.id ? 'var(--success)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title={copiedId === ama.id ? "Link Copied!" : "Copy Feedback Link"}
                            >
                              {copiedId === ama.id ? <Check size={12} /> : <Link size={12} />}
                            </button>
                            <button 
                              onClick={() => {
                                setEditingAMATopicId(ama.id);
                                setInlineAMATopicValue(ama.topic || '');
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Edit Topic Inline"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (await confirm("Are you sure you want to delete this AMA session?", "Delete AMA Session")) {
                                  deleteAMASession(ama.id);
                                }
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--danger)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Delete AMA Session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr style={{ background: 'var(--background)' }}>
                          <td colSpan={7} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '1.25rem',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                              {/* Header of expanded section */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newItem: ProductItem = {
                                      id: `prod-ama-${Date.now()}`,
                                      feature: '',
                                      description: '',
                                      tarunSirApproval: false,
                                      raisedByTarunSir: false,
                                      priority: '',
                                      poc: currentUser?.name || 'Akash Sharma',
                                      status: '',
                                      clickupStatus: '',
                                      taskLink: '',
                                      blocker: '',
                                      deadline: '',
                                      notes: `AMA Session ID: ${ama.id} | AMA Cohort: ${ama.cohort || ''}`,
                                      product: '',
                                      module: ama.cohort,
                                      uiux: '',
                                      finalRelease: '',
                                      productDeadline: ''
                                    };
                                    addProductItem(newItem);
                                    setInlineRelatedFeatureValue('');
                                    setEditingRelatedFeatureId(newItem.id);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  + Add Related Feature
                                </button>
                              </div>

                              {related.length > 0 ? (
                                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                                  <table className="grid-table" style={{ background: 'var(--background)' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--background-alt)' }}>
                                        <th>Feature</th>
                                        <th style={{ width: '150px' }}>Product</th>
                                        <th style={{ width: '80px' }}>Priority</th>
                                        <th style={{ width: '120px' }}>Status</th>
                                        <th style={{ width: '120px' }}>POC</th>
                                        <th style={{ width: '100px' }}>ClickUp</th>
                                        <th style={{ width: '120px' }}>Specs Date</th>
                                        <th style={{ width: '120px' }}>UI/UX Date</th>
                                        <th style={{ width: '120px' }}>Dev Date</th>
                                        <th style={{ width: '120px' }}>Release Date</th>
                                        <th style={{ width: '40px' }}></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {related.map(feat => (
                                        <tr 
                                          key={feat.id} 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editingRelatedFeatureId !== feat.id) {
                                              setPreviewProductId(feat.id);
                                            }
                                          }} 
                                          style={{ cursor: 'pointer' }}
                                        >
                                          <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>
                                            {editingRelatedFeatureId === feat.id ? (
                                              <input
                                                ref={editRelatedFeatureInputRef}
                                                type="text"
                                                value={inlineRelatedFeatureValue}
                                                onChange={(e) => setInlineRelatedFeatureValue(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const finalVal = inlineRelatedFeatureValue.trim() || 'New Feature';
                                                    updateProductItem(feat.id, { feature: finalVal });
                                                    setEditingRelatedFeatureId(null);
                                                    if (e.ctrlKey) {
                                                      setPreviewProductId(feat.id);
                                                    }
                                                  } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setEditingRelatedFeatureId(null);
                                                  }
                                                }}
                                                onBlur={() => {
                                                  const finalVal = inlineRelatedFeatureValue.trim() || 'New Feature';
                                                  updateProductItem(feat.id, { feature: finalVal });
                                                  setEditingRelatedFeatureId(null);
                                                }}
                                                style={{
                                                  width: '100%',
                                                  padding: '6px 8px',
                                                  backgroundColor: 'var(--background)',
                                                  border: '1.5px solid var(--primary)',
                                                  borderRadius: '6px',
                                                  color: 'var(--text-primary)',
                                                  fontSize: '0.8rem',
                                                  fontWeight: 600,
                                                  outline: 'none',
                                                  boxShadow: '0 0 0 2px var(--primary-glow)'
                                                }}
                                              />
                                            ) : (
                                              <>
                                                {feat.feature || '—'}
                                                {feat.raisedByTarunSir && (
                                                  <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                    <Sparkles size={8} /> Super Priority
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </td>
                                          <td>{feat.product || '—'}</td>
                                          <td>
                                            {feat.priority ? (
                                              <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                                                {feat.priority}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>
                                            {feat.status ? (
                                              <span className={`badge ${
                                                feat.status === 'On Hold' ? 'status-hold' :
                                                feat.status === 'In Progress' ? 'status-progress' :
                                                feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                                              }`}>
                                                {feat.status}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>
                                            {feat.poc ? (
                                              <span style={getPOCBadgeStyle(feat.poc)}>
                                                {feat.poc}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>
                                            {feat.clickupStatus ? (
                                              <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                {feat.clickupStatus}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {feat.productDeadline ? (
                                              <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                {formatDateToUserPattern(feat.productDeadline)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                                            {feat.uiux ? (
                                              <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                {formatDateToUserPattern(feat.uiux)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.uiux || feat.productDeadline} currentDate={feat.deadline} />
                                            {feat.deadline ? (
                                              <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                {formatDateToUserPattern(feat.deadline)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline} currentDate={feat.finalRelease} />
                                            {feat.finalRelease ? (
                                              <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                {formatDateToUserPattern(feat.finalRelease)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td>
                                            <button 
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                                                  deleteProductItem(feat.id);
                                                }
                                              }} 
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px' }}
                                              title="Delete Feature"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '1.5rem',
                                  border: '1px dashed var(--border)',
                                  borderRadius: '6px',
                                  color: 'var(--text-secondary)',
                                  gap: '0.5rem',
                                  background: 'var(--background)'
                                }}>
                                  <span style={{ fontSize: '0.8rem' }}>No associated feature requests found for this session.</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newItem: ProductItem = {
                                        id: `prod-ama-${Date.now()}`,
                                        feature: '',
                                        description: '',
                                        tarunSirApproval: false,
                                        raisedByTarunSir: false,
                                        priority: '',
                                        poc: currentUser?.name || 'Akash Sharma',
                                        status: '',
                                        clickupStatus: '',
                                        taskLink: '',
                                        blocker: '',
                                        deadline: '',
                                        notes: `AMA Session ID: ${ama.id} | AMA Cohort: ${ama.cohort || ''}`,
                                        product: '',
                                        module: ama.cohort,
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: ''
                                      };
                                      addProductItem(newItem);
                                      setInlineRelatedFeatureValue('');
                                      setEditingRelatedFeatureId(newItem.id);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                  >
                                    Create one now
                                  </button>
                                </div>
                              )}
                              

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>Feature {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaDate')} style={{ width: '180px', cursor: 'pointer' }}>Date-time {feedbackSortField === 'amaDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaProgram')} style={{ width: '100px', cursor: 'pointer' }}>Program {feedbackSortField === 'amaProgram' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaCohort')} style={{ width: '120px', cursor: 'pointer' }}>Cohort {feedbackSortField === 'amaCohort' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaSpeaker')} style={{ width: '160px', cursor: 'pointer' }}>Speaker {feedbackSortField === 'amaSpeaker' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('priority')} style={{ width: '80px', cursor: 'pointer' }}>Priority {feedbackSortField === 'priority' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedFeedbackFeatures.map(feat => {
                  const parentAma = getParentAma(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      onClick={() => {
                        if (
                          editingFeedbackFeatureId !== feat.id &&
                          editingFeedbackCohortId !== feat.id &&
                          editingFeedbackDateId !== feat.id &&
                          editingFeedbackProgramId !== feat.id &&
                          editingFeedbackSpeakerId !== feat.id
                        ) {
                          setPreviewProductId(feat.id);
                        }
                      }} 
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td className="sticky-col" style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                          {editingFeedbackFeatureId === feat.id ? (
                            <input
                              ref={editFeedbackFeatureInputRef}
                              type="text"
                              value={inlineFeedbackFeatureValue}
                              onChange={(e) => setInlineFeedbackFeatureValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                  updateProductItem(feat.id, { feature: finalVal });
                                  setEditingFeedbackFeatureId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackFeatureId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                updateProductItem(feat.id, { feature: finalVal });
                                setEditingFeedbackFeatureId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                outline: 'none',
                                boxShadow: '0 0 0 2px var(--primary-glow)'
                              }}
                            />
                          ) : (
                            <div 
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingFeedbackFeatureId(feat.id);
                                setInlineFeedbackFeatureValue(feat.feature || '');
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                              title="Double click to edit"
                            >
                              {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                              {feat.raisedByTarunSir && (
                                <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Sparkles size={10} /> Super Priority
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackDateId(feat.id);
                          setInlineFeedbackDateValue(parentAma.date);
                        }}
                        title={parentAma ? "Double click to edit Date/Time" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackDateId === feat.id ? (
                            <input
                              ref={editFeedbackDateInputRef}
                              type="datetime-local"
                              value={formatToDatetimeLocalValue(inlineFeedbackDateValue)}
                              onChange={(e) => setInlineFeedbackDateValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackDateValue;
                                  updateAMASession(parentAma.id, { date: finalVal });
                                  setEditingFeedbackDateId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackDateId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackDateValue;
                                updateAMASession(parentAma.id, { date: finalVal });
                                setEditingFeedbackDateId(null);
                              }}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            formatDateWithTimeToUserPattern(parentAma.date)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackProgramId(feat.id);
                          setInlineFeedbackProgramValue(parentAma.program || '');
                          setShowCustomProgramInput(parentAma.program ? !programsList.includes(parentAma.program) : false);
                        }}
                        title={parentAma ? "Double click to edit Program" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackProgramId === feat.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {!showCustomProgramInput ? (
                                <select
                                  value={inlineFeedbackProgramValue || 'UG'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomProgramInput(true);
                                      setInlineFeedbackProgramValue('');
                                    } else {
                                      setInlineFeedbackProgramValue(val);
                                      const cohorts = programCohortsMap[val] || [];
                                      const defaultCohort = cohorts.length > 0 ? cohorts[0] : '';
                                      updateAMASession(parentAma.id, { program: val, cohort: defaultCohort });
                                      setEditingFeedbackProgramId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!showCustomProgramInput) {
                                      setEditingFeedbackProgramId(null);
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {programsList.map(prog => (
                                    <option key={prog} value={prog}>{prog}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editFeedbackProgramInputRef}
                                  type="text"
                                  value={inlineFeedbackProgramValue}
                                  onChange={(e) => setInlineFeedbackProgramValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalVal = inlineFeedbackProgramValue.trim();
                                      updateAMASession(parentAma.id, { program: finalVal });
                                      setEditingFeedbackProgramId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingFeedbackProgramId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    const finalVal = inlineFeedbackProgramValue.trim();
                                    updateAMASession(parentAma.id, { program: finalVal });
                                    setEditingFeedbackProgramId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            parentAma.program || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackCohortId(feat.id);
                          setInlineFeedbackCohortValue(parentAma.cohort || '');
                          setInlineFeedbackProgramValue(parentAma.program || '');
                          setShowCustomCohortInput(parentAma.cohort ? !allStandardCohorts.includes(parentAma.cohort) : false);
                        }}
                        title={parentAma ? "Double click to edit Cohort" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackCohortId === feat.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {!showCustomCohortInput ? (
                                <select
                                  value={inlineFeedbackCohortValue || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      setShowCustomCohortInput(true);
                                      setInlineFeedbackCohortValue('');
                                    } else {
                                      setInlineFeedbackCohortValue(val);
                                      const mappedProg = getProgramForCohort(val);
                                      updateAMASession(parentAma.id, { cohort: val, program: mappedProg });
                                      setEditingFeedbackCohortId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!showCustomCohortInput) {
                                      setEditingFeedbackCohortId(null);
                                    }
                                  }}
                                  style={{
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                >
                                  {(programCohortsMap[inlineFeedbackProgramValue] || allStandardCohorts).map(coh => (
                                    <option key={coh} value={coh}>{coh}</option>
                                  ))}
                                  <option value="Other">Other...</option>
                                </select>
                              ) : (
                                <input
                                  ref={editFeedbackCohortInputRef}
                                  type="text"
                                  value={inlineFeedbackCohortValue}
                                  onChange={(e) => setInlineFeedbackCohortValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const finalVal = inlineFeedbackCohortValue.trim() || 'Cohort Name';
                                      const mappedProg = getProgramForCohort(finalVal);
                                      updateAMASession(parentAma.id, { cohort: finalVal, program: mappedProg });
                                      setEditingFeedbackCohortId(null);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditingFeedbackCohortId(null);
                                    }
                                  }}
                                  onBlur={() => {
                                    const finalVal = inlineFeedbackCohortValue.trim() || 'Cohort Name';
                                    const mappedProg = getProgramForCohort(finalVal);
                                    updateAMASession(parentAma.id, { cohort: finalVal, program: mappedProg });
                                    setEditingFeedbackCohortId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    backgroundColor: 'var(--background)',
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                    outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          ) : (
                            parentAma.cohort || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onClick={(e) => {
                          if (!parentAma) return;
                          e.stopPropagation();
                          setEditingFeedbackSpeakerId(feat.id);
                          setInlineFeedbackSpeakerValue(parentAma.speaker || '');
                        }}
                        title={parentAma ? "Click to edit Speaker" : undefined}
                      >
                        {parentAma ? (
                          editingFeedbackSpeakerId === feat.id ? (
                            <select
                              autoFocus
                              value={inlineFeedbackSpeakerValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineFeedbackSpeakerValue(val);
                                if (val !== '') {
                                  updateAMASession(parentAma.id, { speaker: val });
                                  setEditingFeedbackSpeakerId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackSpeakerId(null);
                                }
                              }}
                              onBlur={() => setEditingFeedbackSpeakerId(null)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">— Select Speaker —</option>
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineFeedbackSpeakerValue && !speakersList.includes(inlineFeedbackSpeakerValue) && (
                                <option value={inlineFeedbackSpeakerValue}>{inlineFeedbackSpeakerValue}</option>
                              )}
                            </select>
                          ) : (
                            parentAma.speaker ? (
                              <span style={getPOCBadgeStyle(parentAma.speaker)}>
                                {parentAma.speaker}
                              </span>
                            ) : '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{feat.product || '—'}</td>
                      <td>
                        {feat.priority ? (
                          <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                            {feat.priority}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.poc ? (
                          <span style={getPOCBadgeStyle(feat.poc)}>
                            {feat.poc}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.status ? (
                          <span className={`badge ${
                            feat.status === 'On Hold' ? 'status-hold' :
                            feat.status === 'In Progress' ? 'status-progress' :
                            feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                          }`}>
                            {feat.status}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.clickupStatus ? (
                          <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                            {feat.clickupStatus}
                          </span>
                        ) : '—'}
                      </td>
                       <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux || feat.productDeadline} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                          <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                            {formatDateToUserPattern(feat.finalRelease)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={async () => {
                              if (await confirm("Are you sure you want to delete this feedback feature?", "Delete Feedback Feature")) {
                                deleteProductItem(feat.id);
                              }
                            }} 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              color: 'var(--danger)', 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title="Delete Feedback Feature"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TabContainer>
      <FeedbackDrawer
        itemId={drawerItemId}
        category={drawerCategory}
        onClose={() => {
          setDrawerItemId(null);
          setDrawerCategory(null);
        }}
      />
    </>
  );
};

/* =========================================================================
   5. ADMIN CALLS LOGS (INLINE EDITING & RELATED FEATURES SYSTEM)
   ========================================================================= */
export const AdminCallsTable: React.FC = () => {
  const { 
    adminCalls, updateAdminCall, addAdminCall, deleteAdminCall, 
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers, statuses, currentUser, confirm
  } = useDashboard();
  
  const speakersList = configSpeakers.map(s => s.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  useEffect(() => {
    setFilterStatuses([]);
  }, [subTab]);

  // Sorting states
  const [callSortField, setCallSortField] = useState<keyof AdminCall | null>(null);
  const [callSortAsc, setCallSortAsc] = useState(true);

  const [feedbackSortField, setFeedbackSortField] = useState<keyof ProductItem | 'callDate' | 'callPoc' | 'callTopic' | null>(null);
  const [feedbackSortAsc, setFeedbackSortAsc] = useState(true);

  const handleCallSort = (field: keyof AdminCall) => {
    if (callSortField === field) {
      setCallSortAsc(!callSortAsc);
    } else {
      setCallSortField(field);
      setCallSortAsc(true);
    }
  };

  const handleFeedbackSort = (field: typeof feedbackSortField) => {
    if (feedbackSortField === field) {
      setFeedbackSortAsc(!feedbackSortAsc);
    } else {
      setFeedbackSortField(field);
      setFeedbackSortAsc(true);
    }
  };

  const statusOptions = statuses.map(s => s.label).length > 0 ? statuses.map(s => s.label) : ['Scheduled', 'Pending Actions', 'Completed', 'On Hold', 'In Progress', 'Ongoing'];

  // Inline editing states for Admin Calls
  const [editingCallDateId, setEditingCallDateId] = useState<string | null>(null);
  const [inlineCallDateValue, setInlineCallDateValue] = useState('');
  const editCallDateInputRef = useRef<HTMLInputElement>(null);

  const [editingCallPocId, setEditingCallPocId] = useState<string | null>(null);
  const [inlineCallPocValue, setInlineCallPocValue] = useState('');

  const [editingCallTopicId, setEditingCallTopicId] = useState<string | null>(null);
  const [inlineCallTopicValue, setInlineCallTopicValue] = useState('');
  const editCallTopicInputRef = useRef<HTMLInputElement>(null);

  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  // Related features state
  const [editingCallRelatedId, setEditingCallRelatedId] = useState<string | null>(null);
  const [inlineCallRelatedValue, setInlineCallRelatedValue] = useState('');
  const editCallRelatedInputRef = useRef<HTMLInputElement>(null);

  // Inline editing states for Feedback tab
  const [editingFeedbackFeatureId, setEditingFeedbackFeatureId] = useState<string | null>(null);
  const [inlineFeedbackFeatureValue, setInlineFeedbackFeatureValue] = useState('');
  const editFeedbackFeatureInputRef = useRef<HTMLInputElement>(null);

  const [editingFeedbackDateId, setEditingFeedbackDateId] = useState<string | null>(null);
  const [inlineFeedbackDateValue, setInlineFeedbackDateValue] = useState('');
  const editFeedbackDateInputRef = useRef<HTMLInputElement>(null);

  const [editingFeedbackPocId, setEditingFeedbackPocId] = useState<string | null>(null);
  const [inlineFeedbackPocValue, setInlineFeedbackPocValue] = useState('');

  const [editingFeedbackTopicId, setEditingFeedbackTopicId] = useState<string | null>(null);
  const [inlineFeedbackTopicValue, setInlineFeedbackTopicValue] = useState('');
  const editFeedbackTopicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCallTopicId && editCallTopicInputRef.current) {
      editCallTopicInputRef.current.focus();
      editCallTopicInputRef.current.select();
    }
  }, [editingCallTopicId]);

  useEffect(() => {
    if (editingCallDateId && editCallDateInputRef.current) {
      editCallDateInputRef.current.focus();
    }
  }, [editingCallDateId]);

  useEffect(() => {
    if (editingCallRelatedId && editCallRelatedInputRef.current) {
      editCallRelatedInputRef.current.focus();
      editCallRelatedInputRef.current.select();
    }
  }, [editingCallRelatedId]);

  useEffect(() => {
    if (editingFeedbackFeatureId && editFeedbackFeatureInputRef.current) {
      editFeedbackFeatureInputRef.current.focus();
      editFeedbackFeatureInputRef.current.select();
    }
  }, [editingFeedbackFeatureId]);

  useEffect(() => {
    if (editingFeedbackDateId && editFeedbackDateInputRef.current) {
      editFeedbackDateInputRef.current.focus();
    }
  }, [editingFeedbackDateId]);

  useEffect(() => {
    if (editingFeedbackTopicId && editFeedbackTopicInputRef.current) {
      editFeedbackTopicInputRef.current.focus();
      editFeedbackTopicInputRef.current.select();
    }
  }, [editingFeedbackTopicId]);

  const filtered = adminCalls.filter(c => {
    const matchesSearch = 
      c.adminPoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cohortTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.discussion.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterStatuses.length > 0 && !filterStatuses.includes(c.status)) return false;
    
    if (filterSuperPriorityOnly) {
      const related = getRelatedFeatures(c);
      return related.length > 0;
    }
    
    return true;
  });

  const sortedCalls = [...filtered];
  sortedCalls.sort((a, b) => {
    const aComp = a.status === 'Completed';
    const bComp = b.status === 'Completed';
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (callSortField) {
      let valA = a[callSortField];
      let valB = b[callSortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return callSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  const handleAddNew = () => {
    setSearchQuery('');
    const newCall: AdminCall = {
      id: `adm-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      adminPoc: currentUser?.name || (speakersList.length > 0 ? speakersList[0] : 'Akash Sharma'),
      cohortTopic: 'New Admin Call',
      discussion: '',
      actions: '',
      status: 'Scheduled'
    };
    addAdminCall(newCall);
    setInlineCallTopicValue('New Admin Call');
    setEditingCallTopicId(newCall.id);
    setExpandedCallId(newCall.id);
  };

  const getRelatedFeatures = (call: AdminCall) => {
    const matchesId = productItems.filter(item => 
      !item.id.startsWith('prod-temp-') && 
      item.notes && 
      item.notes.includes(`Admin Call ID: ${call.id}`)
    );
    return filterSuperPriorityOnly ? matchesId.filter(feat => feat.raisedByTarunSir) : matchesId;
  };

  const getParentCall = (item: ProductItem): AdminCall | undefined => {
    if (item.notes && item.notes.includes('Admin Call ID:')) {
      const match = item.notes.match(/Admin Call ID:\s*([^\s,;\]]+)/);
      if (match && match[1]) {
        return adminCalls.find(call => call.id === match[1]);
      }
    }
    // AMA features (prod-ama-) should never be matched to an Admin Call
    if (item.id.startsWith('prod-ama-')) return undefined;
    return undefined;
  };

  const filteredFeedbackFeatures = productItems.filter(item => {
    if (item.id.startsWith('prod-temp-')) return false;
    // AMA features must never appear in the Admin Calls Feedback tab
    if (item.id.startsWith('prod-ama-')) return false;
    const parent = getParentCall(item);
    if (!parent) return false;
    
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    if (!matchesSuperPriority) return false;
    
    if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;

    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.module || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const sortedFeedbackFeatures = [...filteredFeedbackFeatures];
  sortedFeedbackFeatures.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (feedbackSortField) {
      let valA: any = '';
      let valB: any = '';
      
      if (feedbackSortField === 'callDate' || feedbackSortField === 'callPoc' || feedbackSortField === 'callTopic') {
        const parentA = getParentCall(a);
        const parentB = getParentCall(b);
        if (feedbackSortField === 'callDate') {
          valA = parentA?.date || '';
          valB = parentB?.date || '';
        } else if (feedbackSortField === 'callPoc') {
          valA = parentA?.adminPoc || '';
          valB = parentB?.adminPoc || '';
        } else if (feedbackSortField === 'callTopic') {
          valA = parentA?.cohortTopic || '';
          valB = parentB?.cohortTopic || '';
        }
      } else {
        valA = a[feedbackSortField as keyof ProductItem] || '';
        valB = b[feedbackSortField as keyof ProductItem] || '';
      }
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return feedbackSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  return (
    <>
      <TabContainer
        title="Admin Calls"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add Admin Call' : undefined}
        searchPlaceholder={subTab === 'schedule' ? 'Search admin calls...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >
        {/* Sub-tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            onClick={() => {
              setSubTab('schedule');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackPocId(null);
              setEditingFeedbackTopicId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'schedule' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Schedule
          </button>
          <button
            onClick={() => {
              setSubTab('feedback');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackPocId(null);
              setEditingFeedbackTopicId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'feedback' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'feedback' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Feedback
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleCallSort('date')} style={{ width: '150px', cursor: 'pointer' }}>Call Date {callSortField === 'date' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('adminPoc')} style={{ width: '200px', cursor: 'pointer' }}>Admin / POC {callSortField === 'adminPoc' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('cohortTopic')} style={{ cursor: 'pointer' }}>Topic / Call Agenda {callSortField === 'cohortTopic' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('status')} style={{ width: '150px', cursor: 'pointer' }}>Status {callSortField === 'status' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '120px' }}>Rating</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedCalls.map(call => {
                  const related = getRelatedFeatures(call);
                  const isExpanded = expandedCallId === call.id;
                  
                  return (
                    <React.Fragment key={call.id}>
                      <tr 
                        onClick={() => setExpandedCallId(isExpanded ? null : call.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCallDateId(call.id);
                            setInlineCallDateValue(call.date);
                          }}
                          title="Double click to edit Date"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {editingCallDateId === call.id ? (
                              <input
                                ref={editCallDateInputRef}
                                type="date"
                                value={inlineCallDateValue}
                                onChange={(e) => setInlineCallDateValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    updateAdminCall(call.id, { date: inlineCallDateValue });
                                    setEditingCallDateId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingCallDateId(null);
                                  }
                                }}
                                onBlur={() => {
                                  updateAdminCall(call.id, { date: inlineCallDateValue });
                                  setEditingCallDateId(null);
                                }}
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <span>{formatDateToUserPattern(call.date)}</span>
                            )}
                          </div>
                        </td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCallPocId(call.id);
                            setInlineCallPocValue(call.adminPoc);
                          }}
                          title="Click to edit POC"
                        >
                          {editingCallPocId === call.id ? (
                            <select
                              autoFocus
                              value={inlineCallPocValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineCallPocValue(val);
                                updateAdminCall(call.id, { adminPoc: val });
                                setEditingCallPocId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setEditingCallPocId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingCallPocId(null);
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineCallPocValue && !speakersList.includes(inlineCallPocValue) && (
                                <option value={inlineCallPocValue}>{inlineCallPocValue}</option>
                              )}
                            </select>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{call.adminPoc}</span>
                          )}
                        </td>
                        <td
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCallTopicId(call.id);
                            setInlineCallTopicValue(call.cohortTopic);
                          }}
                          style={{ fontWeight: 500 }}
                          title="Double click to edit Topic"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                            {editingCallTopicId === call.id ? (
                              <input
                                ref={editCallTopicInputRef}
                                type="text"
                                value={inlineCallTopicValue}
                                onChange={(e) => setInlineCallTopicValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineCallTopicValue.trim() || 'New Call Topic';
                                    updateAdminCall(call.id, { cohortTopic: finalVal });
                                    setEditingCallTopicId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingCallTopicId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineCallTopicValue.trim() || 'New Call Topic';
                                  updateAdminCall(call.id, { cohortTopic: finalVal });
                                  setEditingCallTopicId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <>
                                <span>{call.cohortTopic || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>

                                {related.length > 0 && (
                                  <span className="badge" style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 6px', 
                                    background: 'var(--primary-glow)', 
                                    color: 'var(--primary)', 
                                    border: '1px solid var(--primary-border)',
                                    fontWeight: 500
                                  }}>
                                    {related.length} {related.length === 1 ? 'feature' : 'features'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            value={call.status || 'Scheduled'}
                            onChange={(e) => updateAdminCall(call.id, { status: e.target.value as any })}
                            onClick={(e) => e.stopPropagation()}
                            className={`badge ${
                              call.status === 'Completed' ? 'status-completed' :
                              call.status === 'Pending Actions' ? 'status-hold' : 'status-progress'
                            }`}
                            style={{ 
                              border: 'none', 
                              outline: 'none', 
                              cursor: 'pointer',
                              padding: '2px 6px',
                              fontFamily: 'inherit',
                              fontWeight: 'inherit',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            <option value="Scheduled" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Scheduled</option>
                            <option value="Completed" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Completed</option>
                            <option value="Pending Actions" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Pending Actions</option>
                          </select>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <FeedbackRatingCell 
                            itemId={call.id} 
                            category="admin-calls" 
                            onCellClick={(id, cat) => {
                              setDrawerItemId(id);
                              setDrawerCategory(cat);
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = `${window.location.origin}/?feedback=${call.id}&category=admin-calls`;
                                navigator.clipboard.writeText(link).then(() => {
                                  setCopiedId(call.id);
                                  setTimeout(() => setCopiedId(null), 2000);
                                });
                              }}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: copiedId === call.id ? 'var(--success)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title={copiedId === call.id ? "Link Copied!" : "Copy Feedback Link"}
                            >
                              {copiedId === call.id ? <Check size={12} /> : <Link size={12} />}
                            </button>
                            <button 
                              onClick={() => {
                                setEditingCallTopicId(call.id);
                                setInlineCallTopicValue(call.cohortTopic);
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Edit Topic Inline"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (await confirm("Are you sure you want to delete this Call?", "Delete Call")) {
                                  deleteAdminCall(call.id);
                                }
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--danger)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Delete Call"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Expansion */}
                      {isExpanded && (
                        <tr style={{ background: 'var(--background)' }}>
                          <td colSpan={6} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '1.25rem',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1.25rem'
                            }}>
                              {/* Top Split: Discussion & Actions */}
                              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Attendees</label>
                                  <textarea
                                    value={call.discussion}
                                    onChange={(e) => updateAdminCall(call.id, { discussion: e.target.value })}
                                    placeholder="Enter discussion details..."
                                    style={{
                                      width: '100%',
                                      height: '80px',
                                      padding: '8px 10px',
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.8rem',
                                      fontFamily: 'inherit',
                                      resize: 'vertical',
                                      outline: 'none'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>

                              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

                              {/* Bottom Section: Related Features table */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Related Feature Requests</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newItem: ProductItem = {
                                        id: `prod-call-${Date.now()}`,
                                        feature: '',
                                        description: '',
                                        tarunSirApproval: false,
                                        raisedByTarunSir: false,
                                        priority: '',
                                        poc: currentUser?.name || 'Akash Sharma',
                                        status: '',
                                        clickupStatus: '',
                                        taskLink: '',
                                        blocker: '',
                                        deadline: '',
                                        notes: `Admin Call ID: ${call.id} | Admin Call: ${call.cohortTopic || ''}`,
                                        product: '',
                                        module: '',
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: ''
                                      };
                                      addProductItem(newItem);
                                      setInlineCallRelatedValue('');
                                      setEditingCallRelatedId(newItem.id);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    + Add Related Feature
                                  </button>
                                </div>

                                {related.length > 0 ? (
                                  <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                                    <table className="grid-table" style={{ background: 'var(--background)' }}>
                                      <thead>
                                        <tr style={{ background: 'var(--background-alt)' }}>
                                          <th>Feature</th>
                                          <th style={{ width: '150px' }}>Product</th>
                                          <th style={{ width: '80px' }}>Priority</th>
                                          <th style={{ width: '120px' }}>Status</th>
                                          <th style={{ width: '120px' }}>POC</th>
                                          <th style={{ width: '100px' }}>ClickUp</th>
                                          <th style={{ width: '120px' }}>Specs Date</th>
                                          <th style={{ width: '120px' }}>UI/UX Date</th>
                                          <th style={{ width: '120px' }}>Dev Date</th>
                                          <th style={{ width: '120px' }}>Release Date</th>
                                          <th style={{ width: '40px' }}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {related.map(feat => (
                                          <tr 
                                            key={feat.id} 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (editingCallRelatedId !== feat.id) {
                                                setPreviewProductId(feat.id);
                                              }
                                            }} 
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>
                                              {editingCallRelatedId === feat.id ? (
                                                <input
                                                  ref={editCallRelatedInputRef}
                                                  type="text"
                                                  value={inlineCallRelatedValue}
                                                  onChange={(e) => setInlineCallRelatedValue(e.target.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      const finalVal = inlineCallRelatedValue.trim() || 'New Feature';
                                                      updateProductItem(feat.id, { feature: finalVal });
                                                      setEditingCallRelatedId(null);
                                                    } else if (e.key === 'Escape') {
                                                      e.preventDefault();
                                                      setEditingCallRelatedId(null);
                                                    }
                                                  }}
                                                  onBlur={() => {
                                                    const finalVal = inlineCallRelatedValue.trim() || 'New Feature';
                                                    updateProductItem(feat.id, { feature: finalVal });
                                                    setEditingCallRelatedId(null);
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    backgroundColor: 'var(--background)',
                                                    border: '1.5px solid var(--primary)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    boxShadow: '0 0 0 2px var(--primary-glow)'
                                                  }}
                                                />
                                              ) : (
                                                <>
                                                  {feat.feature || '—'}
                                                  {feat.raisedByTarunSir && (
                                                    <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                      <Sparkles size={8} /> Super Priority
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                            <td>{feat.product || '—'}</td>
                                            <td>
                                              {feat.priority ? (
                                                <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                                                  {feat.priority}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {feat.status ? (
                                                <span className={`badge ${
                                                  feat.status === 'On Hold' ? 'status-hold' :
                                                  feat.status === 'In Progress' ? 'status-progress' :
                                                  feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                                                }`}>
                                                  {feat.status}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {feat.poc ? (
                                                <span style={getPOCBadgeStyle(feat.poc)}>
                                                  {feat.poc}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {feat.clickupStatus ? (
                                                <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                  {feat.clickupStatus}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                              {feat.productDeadline ? (
                                                <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.productDeadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                                              {feat.uiux ? (
                                                <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                  {formatDateToUserPattern(feat.uiux)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.uiux} currentDate={feat.deadline} />
                                              {feat.deadline ? (
                                                <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.deadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.deadline} currentDate={feat.finalRelease} />
                                              {feat.finalRelease ? (
                                                <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                  {formatDateToUserPattern(feat.finalRelease)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              <button 
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                                                    deleteProductItem(feat.id);
                                                  }
                                                }} 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px' }}
                                                title="Delete Feature"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '1.5rem',
                                    border: '1px dashed var(--border)',
                                    borderRadius: '6px',
                                    color: 'var(--text-secondary)',
                                    gap: '0.5rem',
                                    background: 'var(--background)'
                                  }}>
                                    <span style={{ fontSize: '0.8rem' }}>No associated feature requests found for this discussion.</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newItem: ProductItem = {
                                          id: `prod-call-${Date.now()}`,
                                          feature: '',
                                          description: '',
                                          tarunSirApproval: false,
                                          raisedByTarunSir: false,
                                          priority: '',
                                          poc: 'Akash',
                                          status: '',
                                          clickupStatus: '',
                                          taskLink: '',
                                          blocker: '',
                                          deadline: '',
                                          notes: `Admin Call ID: ${call.id} | Admin Call: ${call.cohortTopic || ''}`,
                                          product: '',
                                          module: '',
                                          uiux: '',
                                          finalRelease: '',
                                          productDeadline: ''
                                        };
                                        addProductItem(newItem);
                                        setInlineCallRelatedValue('');
                                        setEditingCallRelatedId(newItem.id);
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                    >
                                      Create one now
                                    </button>
                                  </div>
                                )}
                              </div>
                              

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>Feature {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callDate')} style={{ width: '150px', cursor: 'pointer' }}>Call Date {feedbackSortField === 'callDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callPoc')} style={{ width: '180px', cursor: 'pointer' }}>Admin / POC {feedbackSortField === 'callPoc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callTopic')} style={{ width: '220px', cursor: 'pointer' }}>Topic / Call Agenda {feedbackSortField === 'callTopic' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('priority')} style={{ width: '80px', cursor: 'pointer' }}>Priority {feedbackSortField === 'priority' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedFeedbackFeatures.map(feat => {
                  const parentCall = getParentCall(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      onClick={() => {
                        if (
                          editingFeedbackFeatureId !== feat.id &&
                          editingFeedbackDateId !== feat.id &&
                          editingFeedbackPocId !== feat.id &&
                          editingFeedbackTopicId !== feat.id
                        ) {
                          setPreviewProductId(feat.id);
                        }
                      }} 
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td className="sticky-col" style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                          {editingFeedbackFeatureId === feat.id ? (
                            <input
                              ref={editFeedbackFeatureInputRef}
                              type="text"
                              value={inlineFeedbackFeatureValue}
                              onChange={(e) => setInlineFeedbackFeatureValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                  updateProductItem(feat.id, { feature: finalVal });
                                  setEditingFeedbackFeatureId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackFeatureId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                updateProductItem(feat.id, { feature: finalVal });
                                setEditingFeedbackFeatureId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                outline: 'none',
                                boxShadow: '0 0 0 2px var(--primary-glow)'
                              }}
                            />
                          ) : (
                            <div 
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingFeedbackFeatureId(feat.id);
                                setInlineFeedbackFeatureValue(feat.feature || '');
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                              title="Double click to edit"
                            >
                              {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                              {feat.raisedByTarunSir && (
                                <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Sparkles size={10} /> Super Priority
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentCall) return;
                          e.stopPropagation();
                          setEditingFeedbackDateId(feat.id);
                          setInlineFeedbackDateValue(parentCall.date);
                        }}
                        title={parentCall ? "Double click to edit Date" : undefined}
                      >
                        {parentCall ? (
                          editingFeedbackDateId === feat.id ? (
                            <input
                              ref={editFeedbackDateInputRef}
                              type="date"
                              value={inlineFeedbackDateValue}
                              onChange={(e) => setInlineFeedbackDateValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  updateAdminCall(parentCall.id, { date: inlineFeedbackDateValue });
                                  setEditingFeedbackDateId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackDateId(null);
                                }
                              }}
                              onBlur={() => {
                                updateAdminCall(parentCall.id, { date: inlineFeedbackDateValue });
                                setEditingFeedbackDateId(null);
                              }}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            formatDateToUserPattern(parentCall.date)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onClick={(e) => {
                          if (!parentCall) return;
                          e.stopPropagation();
                          setEditingFeedbackPocId(feat.id);
                          setInlineFeedbackPocValue(parentCall.adminPoc || '');
                        }}
                        title={parentCall ? "Click to edit POC" : undefined}
                      >
                        {parentCall ? (
                          editingFeedbackPocId === feat.id ? (
                            <select
                              autoFocus
                              value={inlineFeedbackPocValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineFeedbackPocValue(val);
                                updateAdminCall(parentCall.id, { adminPoc: val });
                                setEditingFeedbackPocId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackPocId(null);
                                }
                              }}
                              onBlur={() => setEditingFeedbackPocId(null)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineFeedbackPocValue && !speakersList.includes(inlineFeedbackPocValue) && (
                                <option value={inlineFeedbackPocValue}>{inlineFeedbackPocValue}</option>
                              )}
                            </select>
                          ) : (
                            parentCall.adminPoc || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentCall) return;
                          e.stopPropagation();
                          setEditingFeedbackTopicId(feat.id);
                          setInlineFeedbackTopicValue(parentCall.cohortTopic || '');
                        }}
                        title={parentCall ? "Double click to edit Topic" : undefined}
                      >
                        {parentCall ? (
                          editingFeedbackTopicId === feat.id ? (
                            <input
                              ref={editFeedbackTopicInputRef}
                              type="text"
                              value={inlineFeedbackTopicValue}
                              onChange={(e) => setInlineFeedbackTopicValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackTopicValue.trim() || 'New Topic';
                                  updateAdminCall(parentCall.id, { cohortTopic: finalVal });
                                  setEditingFeedbackTopicId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackTopicId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackTopicValue.trim() || 'New Topic';
                                updateAdminCall(parentCall.id, { cohortTopic: finalVal });
                                setEditingFeedbackTopicId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            parentCall.cohortTopic || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{feat.product || '—'}</td>
                      <td>
                        {feat.priority ? (
                          <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                            {feat.priority}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.poc ? (
                          <span style={getPOCBadgeStyle(feat.poc)}>
                            {feat.poc}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.status ? (
                          <span className={`badge ${
                            feat.status === 'On Hold' ? 'status-hold' :
                            feat.status === 'In Progress' ? 'status-progress' :
                            feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                          }`}>
                            {feat.status}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.clickupStatus ? (
                          <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                            {feat.clickupStatus}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                          <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                            {formatDateToUserPattern(feat.finalRelease)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={async () => {
                              if (await confirm("Are you sure you want to delete this feedback feature?", "Delete Feedback Feature")) {
                                deleteProductItem(feat.id);
                              }
                            }} 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              color: 'var(--danger)', 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title="Delete Feedback Feature"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TabContainer>
      <FeedbackDrawer
        itemId={drawerItemId}
        category={drawerCategory}
        onClose={() => {
          setDrawerItemId(null);
          setDrawerCategory(null);
        }}
      />
    </>
  );
};

export const TarunSirMeetingsTable: React.FC = () => {
  const { 
    tarunSirMeetings, updateTarunSirMeeting, addTarunSirMeeting, deleteTarunSirMeeting, 
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers, statuses, currentUser, confirm
  } = useDashboard();
  
  const speakersList = configSpeakers.map(s => s.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  useEffect(() => {
    setFilterStatuses([]);
  }, [subTab]);

  // Sorting states
  const [meetingSortField, setMeetingSortField] = useState<keyof TarunSirMeeting | null>(null);
  const [meetingSortAsc, setMeetingSortAsc] = useState(true);

  const [feedbackSortField, setFeedbackSortField] = useState<keyof ProductItem | 'meetingDate' | 'meetingPoc' | 'meetingTopic' | null>(null);
  const [feedbackSortAsc, setFeedbackSortAsc] = useState(true);

  const handleMeetingSort = (field: keyof TarunSirMeeting) => {
    if (meetingSortField === field) {
      setMeetingSortAsc(!meetingSortAsc);
    } else {
      setMeetingSortField(field);
      setMeetingSortAsc(true);
    }
  };

  const handleFeedbackSort = (field: typeof feedbackSortField) => {
    if (feedbackSortField === field) {
      setFeedbackSortAsc(!feedbackSortAsc);
    } else {
      setFeedbackSortField(field);
      setFeedbackSortAsc(true);
    }
  };

  const statusOptions = statuses.map(s => s.label).length > 0 ? statuses.map(s => s.label) : ['Scheduled', 'Pending Actions', 'Completed', 'On Hold', 'In Progress', 'Ongoing'];

  // Inline editing states for Tarun Sir Meetings
  const [editingMeetingDateId, setEditingMeetingDateId] = useState<string | null>(null);
  const [inlineMeetingDateValue, setInlineMeetingDateValue] = useState('');
  const editMeetingDateInputRef = useRef<HTMLInputElement>(null);

  const [editingMeetingPocId, setEditingMeetingPocId] = useState<string | null>(null);
  const [inlineMeetingPocValue, setInlineMeetingPocValue] = useState('');

  const [editingMeetingTopicId, setEditingMeetingTopicId] = useState<string | null>(null);
  const [inlineMeetingTopicValue, setInlineMeetingTopicValue] = useState('');
  const editMeetingTopicInputRef = useRef<HTMLInputElement>(null);

  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  // Related features state
  const [editingMeetingRelatedId, setEditingMeetingRelatedId] = useState<string | null>(null);
  const [inlineMeetingRelatedValue, setInlineMeetingRelatedValue] = useState('');
  const editMeetingRelatedInputRef = useRef<HTMLInputElement>(null);

  // Inline editing states for Feedback tab
  const [editingFeedbackFeatureId, setEditingFeedbackFeatureId] = useState<string | null>(null);
  const [inlineFeedbackFeatureValue, setInlineFeedbackFeatureValue] = useState('');
  const editFeedbackFeatureInputRef = useRef<HTMLInputElement>(null);

  const [editingFeedbackDateId, setEditingFeedbackDateId] = useState<string | null>(null);
  const [inlineFeedbackDateValue, setInlineFeedbackDateValue] = useState('');
  const editFeedbackDateInputRef = useRef<HTMLInputElement>(null);

  const [editingFeedbackPocId, setEditingFeedbackPocId] = useState<string | null>(null);
  const [inlineFeedbackPocValue, setInlineFeedbackPocValue] = useState('');

  const [editingFeedbackTopicId, setEditingFeedbackTopicId] = useState<string | null>(null);
  const [inlineFeedbackTopicValue, setInlineFeedbackTopicValue] = useState('');
  const editFeedbackTopicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMeetingTopicId && editMeetingTopicInputRef.current) {
      editMeetingTopicInputRef.current.focus();
      editMeetingTopicInputRef.current.select();
    }
  }, [editingMeetingTopicId]);

  useEffect(() => {
    if (editingMeetingDateId && editMeetingDateInputRef.current) {
      editMeetingDateInputRef.current.focus();
    }
  }, [editingMeetingDateId]);

  useEffect(() => {
    if (editingMeetingRelatedId && editMeetingRelatedInputRef.current) {
      editMeetingRelatedInputRef.current.focus();
      editMeetingRelatedInputRef.current.select();
    }
  }, [editingMeetingRelatedId]);

  useEffect(() => {
    if (editingFeedbackFeatureId && editFeedbackFeatureInputRef.current) {
      editFeedbackFeatureInputRef.current.focus();
      editFeedbackFeatureInputRef.current.select();
    }
  }, [editingFeedbackFeatureId]);

  useEffect(() => {
    if (editingFeedbackTopicId && editFeedbackTopicInputRef.current) {
      editFeedbackTopicInputRef.current.focus();
      editFeedbackTopicInputRef.current.select();
    }
  }, [editingFeedbackTopicId]);

  useEffect(() => {
    if (editingFeedbackDateId && editFeedbackDateInputRef.current) {
      editFeedbackDateInputRef.current.focus();
    }
  }, [editingFeedbackDateId]);

  // Handle Add New
  const handleAddNew = () => {
    setSearchQuery('');
    setMeetingSortField(null);
    setMeetingSortAsc(true);

    const newMeeting: TarunSirMeeting = {
      id: `meeting-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      adminPoc: currentUser?.name || (speakersList.length > 0 ? speakersList[0] : 'Akash'),
      cohortTopic: 'New Meeting Topic',
      discussion: '',
      actions: '',
      status: 'Scheduled'
    };
    addTarunSirMeeting(newMeeting);
    setExpandedMeetingId(newMeeting.id);
  };

  const getRelatedFeatures = (meeting: TarunSirMeeting) => {
    const matchesId = productItems.filter(item => 
      !item.id.startsWith('prod-temp-') && 
      item.notes && 
      item.notes.includes(`Tarun Sir Meeting ID: ${meeting.id}`)
    );
    return filterSuperPriorityOnly ? matchesId.filter(feat => feat.raisedByTarunSir) : matchesId;
  };

  const getParentMeeting = (item: ProductItem): TarunSirMeeting | undefined => {
    if (item.notes && item.notes.includes('Tarun Sir Meeting ID:')) {
      const match = item.notes.match(/Tarun Sir Meeting ID:\s*([^\s,;\]]+)/);
      if (match && match[1]) {
        return tarunSirMeetings.find(call => call.id === match[1]);
      }
    }
    return undefined;
  };

  const filteredFeedbackFeatures = productItems.filter(item => {
    if (item.id.startsWith('prod-temp-')) return false;
    if (!item.id.startsWith('prod-tarun-')) return false;

    const parent = getParentMeeting(item);
    if (!parent) return false;
    
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    if (!matchesSuperPriority) return false;
    
    if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;

    const matchesSearch = 
      item.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.module || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const sortedFeedbackFeatures = [...filteredFeedbackFeatures];
  sortedFeedbackFeatures.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (feedbackSortField) {
      let valA: any = '';
      let valB: any = '';
      
      if (feedbackSortField === 'meetingDate' || feedbackSortField === 'meetingPoc' || feedbackSortField === 'meetingTopic') {
        const parentA = getParentMeeting(a);
        const parentB = getParentMeeting(b);
        if (feedbackSortField === 'meetingDate') {
          valA = parentA?.date || '';
          valB = parentB?.date || '';
        } else if (feedbackSortField === 'meetingPoc') {
          valA = parentA?.adminPoc || '';
          valB = parentB?.adminPoc || '';
        } else if (feedbackSortField === 'meetingTopic') {
          valA = parentA?.cohortTopic || '';
          valB = parentB?.cohortTopic || '';
        }
      } else {
        valA = a[feedbackSortField as keyof ProductItem] || '';
        valB = b[feedbackSortField as keyof ProductItem] || '';
      }
      
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return feedbackSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  // Filter meetings
  const filteredMeetings = tarunSirMeetings.filter(meeting => {
    if (filterStatuses.length > 0 && !filterStatuses.includes(meeting.status)) return false;
    const matchesSearch = 
      meeting.cohortTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.adminPoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.discussion.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.actions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.date.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Sort meetings
  const sortedMeetings = [...filteredMeetings];
  if (meetingSortField) {
    sortedMeetings.sort((a, b) => {
      const aComp = a.status === 'Completed';
      const bComp = b.status === 'Completed';
      if (aComp !== bComp) return aComp ? 1 : -1;

      const valA = a[meetingSortField as keyof TarunSirMeeting] || '';
      const valB = b[meetingSortField as keyof TarunSirMeeting] || '';
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return meetingSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  } else {
    // Default sorting: Scheduled/Pending first, then by date descending
    sortedMeetings.sort((a, b) => {
      const aComp = a.status === 'Completed';
      const bComp = b.status === 'Completed';
      if (aComp !== bComp) return aComp ? 1 : -1;
      return b.date.localeCompare(a.date);
    });
  }

  return (
    <>
      <TabContainer
        title="Tarun Sir Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add Meeting' : undefined}
        searchPlaceholder={subTab === 'schedule' ? 'Search meetings...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >
        {/* Sub-tab Navigation */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            onClick={() => {
              setSubTab('schedule');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackPocId(null);
              setEditingFeedbackTopicId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'schedule' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Schedule
          </button>
          <button
            onClick={() => {
              setSubTab('feedback');
              setSearchQuery('');
              setEditingFeedbackFeatureId(null);
              setEditingFeedbackDateId(null);
              setEditingFeedbackPocId(null);
              setEditingFeedbackTopicId(null);
            }}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'feedback' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'feedback' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Feedback
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleMeetingSort('date')} style={{ width: '150px', cursor: 'pointer' }}>Meeting Date {meetingSortField === 'date' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('adminPoc')} style={{ width: '200px', cursor: 'pointer' }}>Admin / POC {meetingSortField === 'adminPoc' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('cohortTopic')} style={{ cursor: 'pointer' }}>Topic / Meeting Agenda {meetingSortField === 'cohortTopic' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('status')} style={{ width: '150px', cursor: 'pointer' }}>Status {meetingSortField === 'status' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedMeetings.map(meeting => {
                  const related = getRelatedFeatures(meeting);
                  const isExpanded = expandedMeetingId === meeting.id;
                  
                  return (
                    <React.Fragment key={meeting.id}>
                      <tr 
                        onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : 'transparent',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingMeetingDateId(meeting.id);
                            setInlineMeetingDateValue(meeting.date);
                          }}
                          title="Double click to edit Date"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {editingMeetingDateId === meeting.id ? (
                              <input
                                ref={editMeetingDateInputRef}
                                type="date"
                                value={inlineMeetingDateValue}
                                onChange={(e) => setInlineMeetingDateValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    updateTarunSirMeeting(meeting.id, { date: inlineMeetingDateValue });
                                    setEditingMeetingDateId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingMeetingDateId(null);
                                  }
                                }}
                                onBlur={() => {
                                  updateTarunSirMeeting(meeting.id, { date: inlineMeetingDateValue });
                                  setEditingMeetingDateId(null);
                                }}
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <span>{formatDateToUserPattern(meeting.date)}</span>
                            )}
                          </div>
                        </td>
                        <td
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMeetingPocId(meeting.id);
                            setInlineMeetingPocValue(meeting.adminPoc);
                          }}
                          title="Click to edit POC"
                        >
                          {editingMeetingPocId === meeting.id ? (
                            <select
                              autoFocus
                              value={inlineMeetingPocValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineMeetingPocValue(val);
                                updateTarunSirMeeting(meeting.id, { adminPoc: val });
                                setEditingMeetingPocId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => setEditingMeetingPocId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingMeetingPocId(null);
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineMeetingPocValue && !speakersList.includes(inlineMeetingPocValue) && (
                                <option value={inlineMeetingPocValue}>{inlineMeetingPocValue}</option>
                              )}
                            </select>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{meeting.adminPoc}</span>
                          )}
                        </td>
                        <td
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingMeetingTopicId(meeting.id);
                            setInlineMeetingTopicValue(meeting.cohortTopic);
                          }}
                          style={{ fontWeight: 500 }}
                          title="Double click to edit Topic"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                            {editingMeetingTopicId === meeting.id ? (
                              <input
                                ref={editMeetingTopicInputRef}
                                type="text"
                                value={inlineMeetingTopicValue}
                                onChange={(e) => setInlineMeetingTopicValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineMeetingTopicValue.trim() || 'New Meeting Topic';
                                    updateTarunSirMeeting(meeting.id, { cohortTopic: finalVal });
                                    setEditingMeetingTopicId(null);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingMeetingTopicId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineMeetingTopicValue.trim() || 'New Meeting Topic';
                                  updateTarunSirMeeting(meeting.id, { cohortTopic: finalVal });
                                  setEditingMeetingTopicId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <>
                                <span>{meeting.cohortTopic || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>
                                {related.length > 0 && (
                                  <span className="badge" style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '2px 6px', 
                                    background: 'var(--primary-glow)', 
                                    color: 'var(--primary)', 
                                    border: '1px solid var(--primary-border)',
                                    fontWeight: 500
                                  }}>
                                    {related.length} {related.length === 1 ? 'feature' : 'features'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            value={meeting.status || 'Scheduled'}
                            onChange={(e) => updateTarunSirMeeting(meeting.id, { status: e.target.value as any })}
                            onClick={(e) => e.stopPropagation()}
                            className={`badge ${
                              meeting.status === 'Completed' ? 'status-completed' :
                              meeting.status === 'Pending Actions' ? 'status-hold' : 'status-progress'
                            }`}
                            style={{ 
                              border: 'none', 
                              outline: 'none', 
                              cursor: 'pointer',
                              padding: '2px 6px',
                              fontFamily: 'inherit',
                              fontWeight: 'inherit',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            <option value="Scheduled" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Scheduled</option>
                            <option value="Completed" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Completed</option>
                            <option value="Pending Actions" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>Pending Actions</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                setEditingMeetingTopicId(meeting.id);
                                setInlineMeetingTopicValue(meeting.cohortTopic);
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Edit Topic Inline"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (await confirm("Are you sure you want to delete this Meeting?", "Delete Meeting")) {
                                  deleteTarunSirMeeting(meeting.id);
                                }
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: 'var(--danger)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px'
                              }}
                              title="Delete Meeting"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Accordion Expansion */}
                      {isExpanded && (
                        <tr style={{ background: 'var(--background)' }}>
                          <td colSpan={5} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                              background: 'var(--panel-bg)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '1.25rem',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1.25rem'
                            }}>
                              {/* Top Split: Discussion & Actions */}
                              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Discussion</label>
                                  <textarea
                                    value={meeting.discussion}
                                    onChange={(e) => updateTarunSirMeeting(meeting.id, { discussion: e.target.value })}
                                    placeholder="Enter discussion details..."
                                    style={{
                                      width: '100%',
                                      height: '80px',
                                      padding: '8px 10px',
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.8rem',
                                      fontFamily: 'inherit',
                                      resize: 'vertical',
                                      outline: 'none'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Action Items</label>
                                  <textarea
                                    value={meeting.actions}
                                    onChange={(e) => updateTarunSirMeeting(meeting.id, { actions: e.target.value })}
                                    placeholder="Enter action items/decisions..."
                                    style={{
                                      width: '100%',
                                      height: '80px',
                                      padding: '8px 10px',
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.8rem',
                                      fontFamily: 'inherit',
                                      resize: 'vertical',
                                      outline: 'none'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>

                              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

                              {/* Bottom Section: Related Features table */}
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Related Feature Requests</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newItem: ProductItem = {
                                        id: `prod-tarun-${Date.now()}`,
                                        feature: '',
                                        description: '',
                                        tarunSirApproval: false,
                                        raisedByTarunSir: false,
                                        priority: '',
                                        poc: currentUser?.name || '',
                                        status: '',
                                        clickupStatus: '',
                                        taskLink: '',
                                        blocker: '',
                                        deadline: '',
                                        notes: `Tarun Sir Meeting ID: ${meeting.id} | Meeting: ${meeting.cohortTopic || ''}`,
                                        product: '',
                                        module: '',
                                        uiux: '',
                                        finalRelease: '',
                                        productDeadline: ''
                                      };
                                      addProductItem(newItem);
                                      setInlineMeetingRelatedValue('');
                                      setEditingMeetingRelatedId(newItem.id);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    + Add Related Feature
                                  </button>
                                </div>

                                {related.length > 0 ? (
                                  <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '6px' }}>
                                    <table className="grid-table" style={{ background: 'var(--background)' }}>
                                      <thead>
                                        <tr style={{ background: 'var(--background-alt)' }}>
                                          <th>Feature</th>
                                          <th style={{ width: '150px' }}>Product</th>
                                          <th style={{ width: '80px' }}>Priority</th>
                                          <th style={{ width: '120px' }}>Status</th>
                                          <th style={{ width: '120px' }}>POC</th>
                                          <th style={{ width: '100px' }}>ClickUp</th>
                                          <th style={{ width: '120px' }}>Specs Date</th>
                                          <th style={{ width: '120px' }}>UI/UX Date</th>
                                          <th style={{ width: '120px' }}>Dev Date</th>
                                          <th style={{ width: '120px' }}>Release Date</th>
                                          <th style={{ width: '40px' }}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {related.map(feat => (
                                          <tr 
                                            key={feat.id} 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (editingMeetingRelatedId !== feat.id) {
                                                setPreviewProductId(feat.id);
                                              }
                                            }} 
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>
                                              {editingMeetingRelatedId === feat.id ? (
                                                <input
                                                  ref={editMeetingRelatedInputRef}
                                                  type="text"
                                                  value={inlineMeetingRelatedValue}
                                                  onChange={(e) => setInlineMeetingRelatedValue(e.target.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      const finalVal = inlineMeetingRelatedValue.trim() || 'New Feature';
                                                      updateProductItem(feat.id, { feature: finalVal });
                                                      setEditingMeetingRelatedId(null);
                                                    } else if (e.key === 'Escape') {
                                                      e.preventDefault();
                                                      setEditingMeetingRelatedId(null);
                                                    }
                                                  }}
                                                  onBlur={() => {
                                                    const finalVal = inlineMeetingRelatedValue.trim() || 'New Feature';
                                                    updateProductItem(feat.id, { feature: finalVal });
                                                    setEditingMeetingRelatedId(null);
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    backgroundColor: 'var(--background)',
                                                    border: '1.5px solid var(--primary)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    boxShadow: '0 0 0 2px var(--primary-glow)'
                                                  }}
                                                />
                                              ) : (
                                                <>
                                                  {feat.feature || '—'}
                                                  {feat.raisedByTarunSir && (
                                                    <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                      <Sparkles size={8} /> Super Priority
                                                    </span>
                                                  )}
                                                  {feat.tarunSirApproval && (
                                                    <span className="badge-verified" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                                                      <CheckCircle size={8} /> Verified
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                            <td>{feat.product || '—'}</td>
                                            <td>
                                              {feat.priority ? (
                                                <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                                                  {feat.priority}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {feat.status ? (
                                                <span className={`badge ${
                                                  feat.status === 'On Hold' ? 'status-hold' :
                                                  feat.status === 'In Progress' ? 'status-progress' :
                                                  feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                                                }`}>
                                                  {feat.status}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {feat.poc ? (
                                                <span style={getPOCBadgeStyle(feat.poc)}>
                                                  {feat.poc}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              {feat.clickupStatus ? (
                                                <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                  {feat.clickupStatus}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                              {feat.productDeadline ? (
                                                <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.productDeadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                                              {feat.uiux ? (
                                                <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                  {formatDateToUserPattern(feat.uiux)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.uiux} currentDate={feat.deadline} />
                                              {feat.deadline ? (
                                                <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.deadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.deadline} currentDate={feat.finalRelease} />
                                              {feat.finalRelease ? (
                                                <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                  {formatDateToUserPattern(feat.finalRelease)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td>
                                              <button 
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                                                    deleteProductItem(feat.id);
                                                  }
                                                }} 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '4px' }}
                                                title="Delete Feature"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '1.5rem',
                                    border: '1px dashed var(--border)',
                                    borderRadius: '6px',
                                    color: 'var(--text-secondary)',
                                    gap: '0.5rem',
                                    background: 'var(--background)'
                                  }}>
                                    <span style={{ fontSize: '0.8rem' }}>No associated feature requests found for this discussion.</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newItem: ProductItem = {
                                          id: `prod-tarun-${Date.now()}`,
                                          feature: '',
                                          description: '',
                                          tarunSirApproval: false,
                                          raisedByTarunSir: false,
                                          priority: '',
                                          poc: currentUser?.name || '',
                                          status: '',
                                          clickupStatus: '',
                                          taskLink: '',
                                          blocker: '',
                                          deadline: '',
                                          notes: `Tarun Sir Meeting ID: ${meeting.id} | Meeting: ${meeting.cohortTopic || ''}`,
                                          product: '',
                                          module: '',
                                          uiux: '',
                                          finalRelease: '',
                                          productDeadline: ''
                                        };
                                        addProductItem(newItem);
                                        setInlineMeetingRelatedValue('');
                                        setEditingMeetingRelatedId(newItem.id);
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                    >
                                      Create one now
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>Feature {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('meetingDate')} style={{ width: '150px', cursor: 'pointer' }}>Meeting Date {feedbackSortField === 'meetingDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('meetingPoc')} style={{ width: '180px', cursor: 'pointer' }}>Admin / POC {feedbackSortField === 'meetingPoc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('meetingTopic')} style={{ width: '220px', cursor: 'pointer' }}>Topic / Meeting Agenda {feedbackSortField === 'meetingTopic' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('priority')} style={{ width: '80px', cursor: 'pointer' }}>Priority {feedbackSortField === 'priority' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedFeedbackFeatures.map(feat => {
                  const parentMeeting = getParentMeeting(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      onClick={() => {
                        if (
                          editingFeedbackFeatureId !== feat.id &&
                          editingFeedbackDateId !== feat.id &&
                          editingFeedbackPocId !== feat.id &&
                          editingFeedbackTopicId !== feat.id
                        ) {
                          setPreviewProductId(feat.id);
                        }
                      }} 
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td className="sticky-col" style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                          {editingFeedbackFeatureId === feat.id ? (
                            <input
                              ref={editFeedbackFeatureInputRef}
                              type="text"
                              value={inlineFeedbackFeatureValue}
                              onChange={(e) => setInlineFeedbackFeatureValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                  updateProductItem(feat.id, { feature: finalVal });
                                  setEditingFeedbackFeatureId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackFeatureId(null);
                                }
                              }}
                              onBlur={() => {
                                  const finalVal = inlineFeedbackFeatureValue.trim() || 'New Feature';
                                  updateProductItem(feat.id, { feature: finalVal });
                                  setEditingFeedbackFeatureId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                outline: 'none',
                                boxShadow: '0 0 0 2px var(--primary-glow)'
                              }}
                            />
                          ) : (
                            <div 
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingFeedbackFeatureId(feat.id);
                                setInlineFeedbackFeatureValue(feat.feature || '');
                              }}
                              style={{ width: '100%', cursor: 'pointer' }}
                              title="Double click to edit"
                            >
                              <span style={{ display: 'block', wordBreak: 'break-word' }}>
                                {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                              </span>
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {feat.raisedByTarunSir && (
                                  <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <Sparkles size={10} /> Super Priority
                                  </span>
                                )}
                                {feat.tarunSirApproval && (
                                  <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                                    <CheckCircle size={10} /> Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentMeeting) return;
                          e.stopPropagation();
                          setEditingFeedbackDateId(feat.id);
                          setInlineFeedbackDateValue(parentMeeting.date);
                        }}
                        title={parentMeeting ? "Double click to edit Date" : undefined}
                      >
                        {parentMeeting ? (
                          editingFeedbackDateId === feat.id ? (
                            <input
                              ref={editFeedbackDateInputRef}
                              type="date"
                              value={inlineFeedbackDateValue}
                              onChange={(e) => setInlineFeedbackDateValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  updateTarunSirMeeting(parentMeeting.id, { date: inlineFeedbackDateValue });
                                  setEditingFeedbackDateId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackDateId(null);
                                }
                              }}
                              onBlur={() => {
                                updateTarunSirMeeting(parentMeeting.id, { date: inlineFeedbackDateValue });
                                setEditingFeedbackDateId(null);
                              }}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            formatDateToUserPattern(parentMeeting.date)
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onClick={(e) => {
                          if (!parentMeeting) return;
                          e.stopPropagation();
                          setEditingFeedbackPocId(feat.id);
                          setInlineFeedbackPocValue(parentMeeting.adminPoc || '');
                        }}
                        title={parentMeeting ? "Click to edit POC" : undefined}
                      >
                        {parentMeeting ? (
                          editingFeedbackPocId === feat.id ? (
                            <select
                              autoFocus
                              value={inlineFeedbackPocValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInlineFeedbackPocValue(val);
                                updateTarunSirMeeting(parentMeeting.id, { adminPoc: val });
                                setEditingFeedbackPocId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackPocId(null);
                                }
                              }}
                              onBlur={() => setEditingFeedbackPocId(null)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {speakersList.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {inlineFeedbackPocValue && !speakersList.includes(inlineFeedbackPocValue) && (
                                <option value={inlineFeedbackPocValue}>{inlineFeedbackPocValue}</option>
                              )}
                            </select>
                          ) : (
                            parentMeeting.adminPoc || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        onDoubleClick={(e) => {
                          if (!parentMeeting) return;
                          e.stopPropagation();
                          setEditingFeedbackTopicId(feat.id);
                          setInlineFeedbackTopicValue(parentMeeting.cohortTopic || '');
                        }}
                        title={parentMeeting ? "Double click to edit Topic" : undefined}
                      >
                        {parentMeeting ? (
                          editingFeedbackTopicId === feat.id ? (
                            <input
                              ref={editFeedbackTopicInputRef}
                              type="text"
                              value={inlineFeedbackTopicValue}
                              onChange={(e) => setInlineFeedbackTopicValue(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const finalVal = inlineFeedbackTopicValue.trim() || 'New Topic';
                                  updateTarunSirMeeting(parentMeeting.id, { cohortTopic: finalVal });
                                  setEditingFeedbackTopicId(null);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingFeedbackTopicId(null);
                                }
                              }}
                              onBlur={() => {
                                const finalVal = inlineFeedbackTopicValue.trim() || 'New Topic';
                                updateTarunSirMeeting(parentMeeting.id, { cohortTopic: finalVal });
                                setEditingFeedbackTopicId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                backgroundColor: 'var(--background)',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '6px',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                outline: 'none',
                              }}
                            />
                          ) : (
                            parentMeeting.cohortTopic || '—'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{feat.product || '—'}</td>
                      <td>
                        {feat.priority ? (
                          <span className={`badge badge-${feat.priority.toLowerCase()}`}>
                            {feat.priority}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.poc ? (
                          <span style={getPOCBadgeStyle(feat.poc)}>
                            {feat.poc}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.status ? (
                          <span className={`badge ${
                            feat.status === 'On Hold' ? 'status-hold' :
                            feat.status === 'In Progress' ? 'status-progress' :
                            feat.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                          }`}>
                            {feat.status}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {feat.clickupStatus ? (
                          <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                            {feat.clickupStatus}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                          <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                            {formatDateToUserPattern(feat.finalRelease)}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={async () => {
                              if (await confirm("Are you sure you want to delete this feedback feature?", "Delete Feedback Feature")) {
                                deleteProductItem(feat.id);
                              }
                            }} 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              color: 'var(--danger)', 
                              display: 'flex', 
                              alignItems: 'center',
                              padding: '4px'
                            }}
                            title="Delete Feedback Feature"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TabContainer>
    </>
  );
};

export const ContentTable: React.FC = () => {
  const { 
    contentItems, updateContentItem, addContentItem, deleteContentItem, 
    openPreviewForFeature, speakers: configSpeakers, productGroups, statuses: configStatuses, currentUser, confirm
  } = useDashboard();
  
  const speakersList = configSpeakers.map(s => s.name);
  const contentStatuses = configStatuses;
  const statusOptions = contentStatuses.length > 0 
    ? contentStatuses.map(s => s.label) 
    : ['Idea', 'Writing', 'In Progress', 'Scheduled', 'Published'];
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering states
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);

  const getStatusColor = (status: string) => {
    const matched = contentStatuses.find(s => s.label === status);
    if (matched) return matched.color;
    switch (status) {
      case 'Published': return '#10b981';
      case 'Scheduled': return '#3b82f6';
      case 'In Progress': return '#f59e0b';
      case 'Writing': return '#8b5cf6';
      case 'Idea': return '#6b7280';
      default: return 'var(--surface-elevated)';
    }
  };
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);

  // Sorting states
  const [sortField, setSortField] = useState<keyof ContentItem>('module');
  const [sortAsc, setSortAsc] = useState(true);


  // Inline editing states for Content Table
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [inlineModuleValue, setInlineModuleValue] = useState('');
  const editModuleInputRef = useRef<HTMLInputElement>(null);

  const [_editingSubjectId, _setEditingSubjectId] = useState<string | null>(null);
  const [_inlineSubjectValue, _setInlineSubjectValue] = useState('');
  const editSubjectInputRef = useRef<HTMLInputElement>(null);

  const [editingPocId, setEditingPocId] = useState<string | null>(null);
  const [inlinePocValue, setInlinePocValue] = useState('');

  const [_editingDateId, _setEditingDateId] = useState<string | null>(null); // targetDate / publishDate
  const [_inlineDateValue, _setInlineDateValue] = useState('');
  const editDateInputRef = useRef<HTMLInputElement>(null);

  // Aligned fields inline editing states
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [inlineProductValue, setInlineProductValue] = useState('');

  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null);
  const [inlinePriorityValue, setInlinePriorityValue] = useState('');

  const [editingClickupStatusId, setEditingClickupStatusId] = useState<string | null>(null);
  const [inlineClickupStatusValue, setInlineClickupStatusValue] = useState('');
  const editClickupStatusInputRef = useRef<HTMLInputElement>(null);

  const [editingSpecsDateId, setEditingSpecsDateId] = useState<string | null>(null);
  const [inlineSpecsDateValue, setInlineSpecsDateValue] = useState('');
  const editSpecsDateInputRef = useRef<HTMLInputElement>(null);

  const [editingUiuxDateId, setEditingUiuxDateId] = useState<string | null>(null);
  const [inlineUiuxDateValue, setInlineUiuxDateValue] = useState('');
  const editUiuxDateInputRef = useRef<HTMLInputElement>(null);

  const [editingDevDateId, setEditingDevDateId] = useState<string | null>(null);
  const [inlineDevDateValue, setInlineDevDateValue] = useState('');
  const editDevDateInputRef = useRef<HTMLInputElement>(null);

  const [editingReleaseDateId, setEditingReleaseDateId] = useState<string | null>(null);
  const [inlineReleaseDateValue, setInlineReleaseDateValue] = useState('');
  const editReleaseDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingModuleId && editModuleInputRef.current) {
      editModuleInputRef.current.focus();
      editModuleInputRef.current.select();
    }
  }, [editingModuleId]);

  useEffect(() => {
    if (_editingSubjectId && editSubjectInputRef.current) {
      editSubjectInputRef.current.focus();
      editSubjectInputRef.current.select();
    }
  }, [_editingSubjectId]);

  useEffect(() => {
    if (_editingDateId && editDateInputRef.current) {
      editDateInputRef.current.focus();
    }
  }, [_editingDateId]);



  useEffect(() => {
    if (editingClickupStatusId && editClickupStatusInputRef.current) {
      editClickupStatusInputRef.current.focus();
      editClickupStatusInputRef.current.select();
    }
  }, [editingClickupStatusId]);

  useEffect(() => {
    if (editingSpecsDateId && editSpecsDateInputRef.current) {
      editSpecsDateInputRef.current.focus();
    }
  }, [editingSpecsDateId]);

  useEffect(() => {
    if (editingUiuxDateId && editUiuxDateInputRef.current) {
      editUiuxDateInputRef.current.focus();
    }
  }, [editingUiuxDateId]);

  useEffect(() => {
    if (editingDevDateId && editDevDateInputRef.current) {
      editDevDateInputRef.current.focus();
    }
  }, [editingDevDateId]);

  useEffect(() => {
    if (editingReleaseDateId && editReleaseDateInputRef.current) {
      editReleaseDateInputRef.current.focus();
    }
  }, [editingReleaseDateId]);

  // Handle new item add inline
  const handleAddNew = () => {
    setSearchQuery('');
    setSortField('module');
    const newItem: ContentItem = {
      id: `cont-${Date.now()}`,
      module: 'New Content Topic',
      subject: '',
      type: 'Video',
      poc: currentUser?.name || 'Akash Sharma',
      draftLink: '',
      status: '',
      publishDate: '',
      product: '',
      priority: '',
      clickupStatus: '',
      productDeadline: '',
      uiux: '',
      deadline: '',
      finalRelease: '',
      productDeadlineCompleted: false,
      uiuxCompleted: false,
      deadlineCompleted: false,
      finalReleaseCompleted: false,
      raisedByTarunSir: false
    };
    addContentItem(newItem);
    setTimeout(() => {
      openPreviewForFeature(newItem.module, { 
        description: `Content topic: ${newItem.module}. Subject: ${newItem.subject || ''}. Type: ${newItem.type}.`, 
        status: newItem.status as any, 
        clickupStatus: newItem.clickupStatus || 'open',
        priority: newItem.priority || '',
        poc: newItem.poc || '',
        product: newItem.product || '',
        productDeadline: newItem.productDeadline || '',
        uiux: newItem.uiux || '',
        deadline: newItem.deadline || '',
        finalRelease: newItem.finalRelease || '',
        productDeadlineCompleted: newItem.productDeadlineCompleted || false,
        uiuxCompleted: newItem.uiuxCompleted || false,
        deadlineCompleted: newItem.deadlineCompleted || false,
        finalReleaseCompleted: newItem.finalReleaseCompleted || false,
        raisedByTarunSir: newItem.raisedByTarunSir || false
      });
    }, 50);
  };


  // 1. Search & Super Priority filter
  let filtered = contentItems.filter(item => {
    const matchesSearch = 
      item.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.product || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.poc.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    return matchesSearch && matchesSuperPriority;
  });

  // 3. Status filter
  if (filterStatuses.length > 0) {
    filtered = filtered.filter(item => filterStatuses.includes(item.status));
  }

  // 4. Header sorting
  const handleSort = (field: keyof ContentItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
    }
    return 0;
  });

  return (
    <>
      <TabContainer
        title="Content Pipeline"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNew}
        addLabel="Add Content Item"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                className="form-checkbox"
                checked={filterSuperPriorityOnly} 
                onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Super Priority Only
            </label>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>
                  Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('product')} style={{ width: '150px', cursor: 'pointer' }}>
                  Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('priority')} style={{ width: '80px', cursor: 'pointer' }}>
                  Priority {sortField === 'priority' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>
                  POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>
                  Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>
                  Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>
                  Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>
                  UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>
                  Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                  Release Date {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => {
                    if (
                      editingModuleId !== item.id &&
                      _editingSubjectId !== item.id &&
                      editingPocId !== item.id &&
                      _editingDateId !== item.id &&
                      editingProductId !== item.id &&
                      editingPriorityId !== item.id &&
                      editingClickupStatusId !== item.id &&
                      editingSpecsDateId !== item.id &&
                      editingUiuxDateId !== item.id &&
                      editingDevDateId !== item.id &&
                      editingReleaseDateId !== item.id
                    ) {
                      openPreviewForFeature(item.module, { 
                        id: item.id,
                        description: `Content topic: ${item.module}. Subject: ${item.subject || ''}. Type: ${item.type}.`, 
                        status: item.status as any, 
                        clickupStatus: item.clickupStatus || 'open',
                        priority: item.priority || '',
                        poc: item.poc || '',
                        product: item.product || '',
                        productDeadline: item.productDeadline || '',
                        uiux: item.uiux || '',
                        deadline: item.deadline || '',
                        finalRelease: item.finalRelease || '',
                        productDeadlineCompleted: item.productDeadlineCompleted || false,
                        uiuxCompleted: item.uiuxCompleted || false,
                        deadlineCompleted: item.deadlineCompleted || false,
                        finalReleaseCompleted: item.finalReleaseCompleted || false,
                        raisedByTarunSir: item.raisedByTarunSir || false
                      });
                    }
                  }} 
                  style={{ cursor: 'pointer' }}
                >
                  {/* Module Name (Feature) */}
                  <td 
                    className="sticky-col" 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingModuleId(item.id);
                      setInlineModuleValue(item.module || '');
                    }}
                    style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}
                    title="Double click to edit Title"
                  >
                    {editingModuleId === item.id ? (
                      <input
                        ref={editModuleInputRef}
                        type="text"
                        value={inlineModuleValue}
                        onChange={(e) => setInlineModuleValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const finalVal = inlineModuleValue.trim() || 'New Topic';
                            updateContentItem(item.id, { module: finalVal });
                            setEditingModuleId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingModuleId(null);
                          }
                        }}
                        onBlur={() => {
                          const finalVal = inlineModuleValue.trim() || 'New Topic';
                          updateContentItem(item.id, { module: finalVal });
                          setEditingModuleId(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <>
                        <span>{item.module || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>
                        {item.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '8px' }}>
                            <Sparkles size={10} /> Super Priority
                          </span>
                        )}
                      </>
                    )}
                  </td>

                  {/* Product Group */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProductId(item.id);
                      setInlineProductValue(item.product || '');
                    }}
                    title="Click to edit Product Group"
                  >
                    {editingProductId === item.id ? (
                      <select
                        autoFocus
                        value={inlineProductValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInlineProductValue(val);
                          updateContentItem(item.id, { product: val });
                          setEditingProductId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingProductId(null);
                          }
                        }}
                        onBlur={() => setEditingProductId(null)}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">— Select Product —</option>
                        {productGroups.map(g => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    ) : (
                      item.product || '—'
                    )}
                  </td>

                  {/* Priority */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPriorityId(item.id);
                      setInlinePriorityValue(item.priority || '');
                    }}
                    title="Click to edit Priority"
                  >
                    {editingPriorityId === item.id ? (
                      <select
                        autoFocus
                        value={inlinePriorityValue}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setInlinePriorityValue(val);
                          updateContentItem(item.id, { priority: val });
                          setEditingPriorityId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingPriorityId(null);
                          }
                        }}
                        onBlur={() => setEditingPriorityId(null)}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">— Select Priority —</option>
                        <option value="P0">P0</option>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                        <option value="P4">P4</option>
                      </select>
                    ) : (
                      item.priority ? (
                        <span className={`badge badge-${item.priority.toLowerCase()}`}>
                          {item.priority}
                        </span>
                      ) : '—'
                    )}
                  </td>

                  {/* POC Owner */}
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPocId(item.id);
                      setInlinePocValue(item.poc || '');
                    }}
                    title="Click to edit POC"
                  >
                    {editingPocId === item.id ? (
                      <select
                        autoFocus
                        value={inlinePocValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInlinePocValue(val);
                          updateContentItem(item.id, { poc: val });
                          setEditingPocId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingPocId(null);
                          }
                        }}
                        onBlur={() => setEditingPocId(null)}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {speakersList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        {inlinePocValue && !speakersList.includes(inlinePocValue) && (
                          <option value={inlinePocValue}>{inlinePocValue}</option>
                        )}
                      </select>
                    ) : (
                      item.poc ? (
                        <span style={getPOCBadgeStyle(item.poc)}>
                          {item.poc}
                        </span>
                      ) : '—'
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <select
                      value={item.status || ''}
                      onChange={(e) => updateContentItem(item.id, { status: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="badge"
                      style={{ 
                        border: 'none', 
                        outline: 'none', 
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontFamily: 'inherit',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        appearance: 'none',
                        textAlign: 'center',
                        backgroundColor: getStatusColor(item.status),
                        color: '#fff'
                      }}
                    >
                      <option value="" style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>— Select Status —</option>
                      {statusOptions.map(opt => (
                        <option key={opt} value={opt} style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>
                          {opt}
                        </option>
                      ))}
                      {item.status && !statusOptions.includes(item.status) && (
                        <option value={item.status} style={{ color: 'var(--text-primary)', background: 'var(--panel-bg)' }}>
                          {item.status}
                        </option>
                      )}
                    </select>
                  </td>

                  {/* ClickUp Status */}
                  <td
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingClickupStatusId(item.id);
                      setInlineClickupStatusValue(item.clickupStatus || '');
                    }}
                    title="Double click to edit ClickUp Status"
                  >
                    {editingClickupStatusId === item.id ? (
                      <input
                        ref={editClickupStatusInputRef}
                        type="text"
                        value={inlineClickupStatusValue}
                        onChange={(e) => setInlineClickupStatusValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const finalVal = inlineClickupStatusValue.trim();
                            updateContentItem(item.id, { clickupStatus: finalVal });
                            setEditingClickupStatusId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingClickupStatusId(null);
                          }
                        }}
                        onBlur={() => {
                          const finalVal = inlineClickupStatusValue.trim();
                          updateContentItem(item.id, { clickupStatus: finalVal });
                          setEditingClickupStatusId(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      item.clickupStatus ? (
                        <span style={getClickupBadgeStyle(item.clickupStatus)}>
                          {item.clickupStatus}
                        </span>
                      ) : '—'
                    )}
                  </td>

                  {/* Specs Date (productDeadline) */}
                  <td
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingSpecsDateId(item.id);
                      setInlineSpecsDateValue(item.productDeadline || '');
                    }}
                    title="Double click to edit Specs Date"
                  >
                    {editingSpecsDateId === item.id ? (
                      <input
                        ref={editSpecsDateInputRef}
                        type="date"
                        value={inlineSpecsDateValue}
                        onChange={(e) => setInlineSpecsDateValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            updateContentItem(item.id, { productDeadline: inlineSpecsDateValue });
                            setEditingSpecsDateId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingSpecsDateId(null);
                          }
                        }}
                        onBlur={() => {
                          updateContentItem(item.id, { productDeadline: inlineSpecsDateValue });
                          setEditingSpecsDateId(null);
                        }}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      item.productDeadline ? (
                        <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                          {formatDateToUserPattern(item.productDeadline)}
                        </span>
                      ) : '—'
                    )}
                  </td>

                  {/* UI/UX Date */}
                  <td
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingUiuxDateId(item.id);
                      setInlineUiuxDateValue(item.uiux || '');
                    }}
                    style={{ position: 'relative' }}
                    title="Double click to edit UI/UX Date"
                  >
                    <DateDiffBadge prevDate={item.productDeadline} currentDate={item.uiux} />
                    {editingUiuxDateId === item.id ? (
                      <input
                        ref={editUiuxDateInputRef}
                        type="date"
                        value={inlineUiuxDateValue}
                        onChange={(e) => setInlineUiuxDateValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            updateContentItem(item.id, { uiux: inlineUiuxDateValue });
                            setEditingUiuxDateId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingUiuxDateId(null);
                          }
                        }}
                        onBlur={() => {
                          updateContentItem(item.id, { uiux: inlineUiuxDateValue });
                          setEditingUiuxDateId(null);
                        }}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      item.uiux ? (
                        <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                          {formatDateToUserPattern(item.uiux)}
                        </span>
                      ) : '—'
                    )}
                  </td>

                  {/* Dev Date */}
                  <td
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingDevDateId(item.id);
                      setInlineDevDateValue(item.deadline || '');
                    }}
                    style={{ position: 'relative' }}
                    title="Double click to edit Dev Date"
                  >
                    <DateDiffBadge prevDate={item.uiux || item.productDeadline} currentDate={item.deadline} />
                    {editingDevDateId === item.id ? (
                      <input
                        ref={editDevDateInputRef}
                        type="date"
                        value={inlineDevDateValue}
                        onChange={(e) => setInlineDevDateValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            updateContentItem(item.id, { deadline: inlineDevDateValue });
                            setEditingDevDateId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingDevDateId(null);
                          }
                        }}
                        onBlur={() => {
                          updateContentItem(item.id, { deadline: inlineDevDateValue });
                          setEditingDevDateId(null);
                        }}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      item.deadline ? (
                        <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                          {formatDateToUserPattern(item.deadline)}
                        </span>
                      ) : '—'
                    )}
                  </td>

                  {/* Release Date */}
                  <td
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingReleaseDateId(item.id);
                      setInlineReleaseDateValue(item.finalRelease || '');
                    }}
                    style={{ position: 'relative' }}
                    title="Double click to edit Release Date"
                  >
                    <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline} currentDate={item.finalRelease} />
                    {editingReleaseDateId === item.id ? (
                      <input
                        ref={editReleaseDateInputRef}
                        type="date"
                        value={inlineReleaseDateValue}
                        onChange={(e) => setInlineReleaseDateValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            updateContentItem(item.id, { finalRelease: inlineReleaseDateValue });
                            setEditingReleaseDateId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingReleaseDateId(null);
                          }
                        }}
                        onBlur={() => {
                          updateContentItem(item.id, { finalRelease: inlineReleaseDateValue });
                          setEditingReleaseDateId(null);
                        }}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'var(--background)',
                          border: '1.5px solid var(--primary)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      item.finalRelease ? (
                        <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                          {formatDateToUserPattern(item.finalRelease)}
                        </span>
                      ) : '—'
                    )}
                  </td>



                  {/* Actions */}
                  <td>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirm("Are you sure you want to delete this content item?", "Delete Content Item")) {
                          deleteContentItem(item.id);
                        }
                      }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabContainer>

    </>
  );
};

export const ProductWiseSheet: React.FC = () => {
  const {
    productItems,
    studentProjects,
    contentItems,
    studentMeetings,
    dailyIssues,
    addProductItem,
    updateProductItem,
    deleteProductItem,
    setPreviewProductId,
    openPreviewForFeature,
    productGroups,
    statuses,
    speakers,
    currentUser,
    confirm,
    alert
  } = useDashboard();
  const products = productGroups.map(g => g.name);
  const NO_GROUP_TAB = 'No Product Group Assigned';
  const allTabs = [...products, NO_GROUP_TAB];
  const pocList = speakers.map(s => s.name);

  const getProductFeatureCount = (prodName: string) => {
    const isSpecial = prodName === NO_GROUP_TAB;
    
    const countProductItems = productItems.filter(item => 
      !item.id.startsWith('prod-temp-') && 
      (isSpecial ? (!item.product || item.product.trim() === '') : item.product === prodName)
    ).length;
    
    const countProjects = studentProjects.filter(item => 
      isSpecial ? (!item.product || item.product.trim() === '') : item.product === prodName
    ).length;
    
    const countContent = contentItems.filter(item => 
      isSpecial ? (!item.product || item.product.trim() === '') : item.product === prodName
    ).length;
    
    const countMeetings = studentMeetings.filter(item => 
      isSpecial ? (!item.product || item.product.trim() === '') : item.product === prodName
    ).length;
    
    const countIssues = dailyIssues.filter(item => 
      isSpecial ? (!item.product || item.product.trim() === '') : item.product === prodName
    ).length;
    
    return countProductItems + countProjects + countContent + countMeetings + countIssues;
  };

  const [activeProductTab, setActiveProductTab] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);

  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];

  // Sorting state
  const [sortField, setSortField] = useState<keyof BreakdownFeature | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: keyof BreakdownFeature) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };


  useEffect(() => {
    if (editingFeatureId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFeatureId]);
  
  const isNoGroupTab = activeProductTab === NO_GROUP_TAB;
  const activeProduct = activeProductTab === NO_GROUP_TAB
    ? NO_GROUP_TAB
    : (activeProductTab && products.includes(activeProductTab) ? activeProductTab : products[0] || '');

  type BreakdownFeature = ProductItem & {
    sourceLabel: string;
    sourceId: string;
    openPreview: () => void;
    canDelete: boolean;
  };

  const toProductStatus = (status?: string): ProductItem['status'] => {
    const cleanStatus = (status || '').toLowerCase();
    if (['completed', 'delivered', 'done', 'closed', 'tested', 'used'].includes(cleanStatus)) return 'Completed';
    if (['cancelled', 'canceled', 'on hold', 'not used'].includes(cleanStatus)) return 'On Hold';
    if (['in-progress', 'in progress', 'development', 'testing'].includes(cleanStatus)) return 'In Progress';
    if (cleanStatus === 'ongoing') return 'Ongoing';
    return '';
  };

  const features: BreakdownFeature[] = [
    ...productItems
      .filter(item => !item.id.startsWith('prod-temp-') && (
        isNoGroupTab ? (!item.product || item.product.trim() === '') : item.product === activeProduct
      ))
      .map(item => ({
        ...item,
        productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
        uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
        deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
        finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        sourceLabel: 
          item.id.startsWith('prod-ama-') || item.id.startsWith('prod-call-') || item.id.startsWith('prod-tarun-')
            ? 'Feedback' 
            : item.id.startsWith('prod-breakdown-')
              ? 'Product Breakdown'
              : 'Priority Requests',
        sourceId: item.id,
        openPreview: () => setPreviewProductId(item.id),
        canDelete: true
      })),
    ...studentProjects
      .filter(item => isNoGroupTab ? (!item.product || item.product.trim() === '') : item.product === activeProduct)
      .map(item => ({
        id: `breakdown-project-${item.id}`,
        feature: item.title,
        description: item.description || item.thingsWeBuild || '',
        tarunSirApproval: item.tarunSirApproval || false,
        raisedByTarunSir: item.raisedByTarunSir || false,
        priority: (item.priority || '') as ProductItem['priority'],
        poc: item.poc || '',
        status: toProductStatus(item.status),
        clickupStatus: item.clickupStatus || item.status || '',
        taskLink: item.taskLink || '',
        blocker: item.blocker || '',
        deadline: item.deadline || item.completeInfoDate || '',
        notes: item.thingsWeBuild || '',
        product: item.product || '',
        module: item.module || '',
        type: item.type || 'Student Project',
        uiux: item.uiux || '',
        finalRelease: item.finalRelease || '',
        productDeadline: item.productDeadline || '',
        productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
        uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
        deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
        finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        sourceLabel: 'Student Projects',
        sourceId: item.id,
        openPreview: () => openPreviewForFeature(item.title, item as unknown as Partial<ProductItem>),
        canDelete: false
      })),
    ...contentItems
      .filter(item => isNoGroupTab ? (!item.product || item.product.trim() === '') : item.product === activeProduct)
      .map(item => ({
        id: `breakdown-content-${item.id}`,
        feature: item.module,
        description: `Content topic: ${item.module}. Subject: ${item.subject || ''}. Type: ${item.type}.`,
        tarunSirApproval: false,
        raisedByTarunSir: false,
        priority: (item.priority || '') as ProductItem['priority'],
        poc: item.poc || '',
        status: toProductStatus(item.status),
        clickupStatus: item.clickupStatus || item.status || '',
        taskLink: item.draftLink || '',
        blocker: '',
        deadline: item.deadline || '',
        notes: item.subject || '',
        product: item.product || '',
        module: item.module || '',
        type: item.type || 'Content',
        uiux: item.uiux || '',
        finalRelease: item.finalRelease || item.publishDate || '',
        productDeadline: item.productDeadline || '',
        productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
        uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
        deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
        finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        sourceLabel: 'Content Pipeline',
        sourceId: item.id,
        openPreview: () => openPreviewForFeature(item.module, {
          description: `Content topic: ${item.module}. Subject: ${item.subject || ''}. Type: ${item.type}.`,
          status: item.status as any,
          clickupStatus: item.clickupStatus || item.status || '',
          priority: item.priority || '',
          poc: item.poc || '',
          product: item.product || '',
          productDeadline: item.productDeadline || '',
          uiux: item.uiux || '',
          deadline: item.deadline || '',
          finalRelease: item.finalRelease || item.publishDate || '',
          productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
          uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
          deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
          finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        }),
        canDelete: false
      })),
    ...studentMeetings
      .filter(item => isNoGroupTab ? (!item.product || item.product.trim() === '') : item.product === activeProduct)
      .map(item => ({
        id: `breakdown-meeting-${item.id}`,
        feature: item.cohort,
        description: item.summary || '',
        tarunSirApproval: item.tarunSirApproval || false,
        raisedByTarunSir: item.raisedByTarunSir || false,
        priority: (item.priority || '') as ProductItem['priority'],
        poc: item.poc || '',
        status: toProductStatus(item.status),
        clickupStatus: item.clickupStatus || item.status || '',
        taskLink: item.taskLink || '',
        blocker: item.blocker || '',
        deadline: item.deadline || '',
        notes: item.notes || item.summary || '',
        product: item.product || '',
        module: item.module || '',
        type: item.type || 'Student Meeting',
        uiux: item.uiux || '',
        finalRelease: item.finalRelease || '',
        productDeadline: item.productDeadline || '',
        productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
        uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
        deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
        finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        sourceLabel: 'Student Meetings',
        sourceId: item.id,
        openPreview: () => openPreviewForFeature(item.module || item.cohort, item as unknown as Partial<ProductItem>),
        canDelete: false
      })),
    ...dailyIssues
      .filter(item => isNoGroupTab ? (!item.product || item.product.trim() === '') : item.product === activeProduct)
      .map(item => ({
        id: `breakdown-issue-${item.id}`,
        feature: item.module || `Issue #${item.id}`,
        description: item.issues || '',
        tarunSirApproval: item.tarunSirApproval || false,
        raisedByTarunSir: item.raisedByTarunSir || false,
        priority: (item.priority || '') as ProductItem['priority'],
        poc: item.poc || item.contact || '',
        status: (item.status || '') as ProductItem['status'],
        clickupStatus: item.clickupStatus || item.type || '',
        taskLink: item.taskLink || '',
        blocker: item.blocker || '',
        deadline: item.deadline || '',
        notes: item.notes || item.issues || '',
        product: item.product || '',
        module: item.module || '',
        type: item.type || 'Daily Issue',
        uiux: item.uiux || '',
        finalRelease: item.finalRelease || '',
        productDeadline: item.productDeadline || '',
        productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
        uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
        deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
        finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        sourceLabel: 'Daily Issues',
        sourceId: item.id,
        openPreview: () => openPreviewForFeature(item.module || `${item.cohort} - ${item.id}`, {
          description: item.issues,
          product: item.product,
          module: item.module,
          notes: item.cohort,
          clickupStatus: item.type,
          productDeadlineCompleted: item.productDeadlineCompleted || isCompletedStatus(item.status),
          uiuxCompleted: item.uiuxCompleted || isCompletedStatus(item.status),
          deadlineCompleted: item.deadlineCompleted || isCompletedStatus(item.status),
          finalReleaseCompleted: item.finalReleaseCompleted || isCompletedStatus(item.status),
        }),
        canDelete: false
      }))
  ];

  const handleAddNewFeature = async () => {
    if (!activeProduct || isNoGroupTab) {
      await alert(
        isNoGroupTab ? "Cannot add a feature without a product group. Please switch to a product tab." : "Please select a product category tab first.",
        "Unable to Add Feature",
        "OK",
        "warning"
      );
      return;
    }
    
    setSearchQuery('');

    const newItem: ProductItem = {
      id: `prod-breakdown-${Date.now()}`,
      feature: 'New Feature Request',
      description: '',
      tarunSirApproval: false,
      raisedByTarunSir: false,
      priority: '',
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      product: activeProduct,
      uiux: '',
      finalRelease: '',
      productDeadline: ''
    };
    
    addProductItem(newItem);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };

  const filteredFeatures = features.filter(item => {
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    if (!matchesSuperPriority) return false;

    if (filterStatuses.length > 0 && !filterStatuses.includes(item.status)) return false;

    if (filterPocs.length > 0) {
      const itemPoc = (item.poc || '').trim();
      const hasMatchingPoc = filterPocs.some(p => {
        if (p === 'No POC') {
          return !itemPoc;
        }
        return itemPoc.toLowerCase() === p.toLowerCase();
      });
      if (!hasMatchingPoc) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.feature || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.poc || '').toLowerCase().includes(q) ||
      (item.sourceLabel || '').toLowerCase().includes(q)
    );
  });

  const sortedFeatures = [...filteredFeatures];
  sortedFeatures.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (sortField) {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    }
    return 0;
  });

  return (
    <div className="full-canvas-workspace">
      {products.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          No products configured. Please add products in the Configuration tab.
        </div>
      ) : (
        <>
          {/* Top Tabs & Search Toolbar */}
          <div className="sheet-toolbar" style={{ borderBottom: allTabs.length > 2 ? 'none' : '1px solid var(--border)' }}>
            <div className="toolbar-left" style={{ flex: 1, overflow: 'hidden', flexWrap: 'nowrap' }}>
              <h2 style={{ fontSize: '1.25rem', marginRight: '1.5rem', whiteSpace: 'nowrap' }}>Product Breakdown</h2>
              
              {/* Product Tabs inline in toolbar-left (only when <= 2 products) */}
              {allTabs.length <= 2 && (
                <div style={{ 
                  display: 'flex', 
                  gap: '1.25rem',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  flex: 1,
                  alignSelf: 'stretch',
                  alignItems: 'center',
                  paddingTop: '2px'
                }}>
                  {allTabs.map((prod) => {
                    const isActive = prod === activeProduct;
                    const isSpecial = prod === NO_GROUP_TAB;
                    return (
                      <button
                        key={prod}
                        onClick={() => setActiveProductTab(prod)}
                        style={{
                          padding: '0.5rem 0.25rem',
                          border: 'none',
                          background: 'none',
                          borderBottom: isActive ? `2px solid ${isSpecial ? 'var(--warning)' : 'var(--primary)'}` : '2px solid transparent',
                          color: isActive ? (isSpecial ? 'var(--warning)' : 'var(--text-primary)') : 'var(--text-secondary)',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          height: '100%',
                          transform: 'translateY(1px)'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {prod}
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: '8px',
                            backgroundColor: isActive 
                              ? (isSpecial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(124, 58, 237, 0.12)') 
                              : 'var(--bg-hover)',
                            color: isActive 
                              ? (isSpecial ? 'var(--warning)' : 'var(--primary)') 
                              : 'var(--text-secondary)',
                            border: isActive
                              ? `1px solid ${isSpecial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(124, 58, 237, 0.2)'}`
                              : '1px solid var(--border)',
                            fontWeight: 600
                          }}>
                            {getProductFeatureCount(prod)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="toolbar-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
              <MultiSelectDropdown
                options={statusOptions}
                selectedValues={filterStatuses}
                onChange={setFilterStatuses}
                placeholder="Status"
              />
              <MultiSelectDropdown
                options={[...pocList, 'No POC']}
                selectedValues={filterPocs}
                onChange={setFilterPocs}
                placeholder="POC"
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                <input 
                  type="checkbox" 
                  className="form-checkbox"
                  checked={filterSuperPriorityOnly} 
                  onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
                  style={{ cursor: 'pointer' }}
                />
                Super Priority Only
              </label>
              <div className="search-input-wrapper">
                <Search size={16} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search features..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddNewFeature}
                disabled={isNoGroupTab}
                title={isNoGroupTab ? 'Switch to a product tab to add features' : undefined}
                style={{ whiteSpace: 'nowrap', flexShrink: 0, opacity: isNoGroupTab ? 0.45 : 1, cursor: isNoGroupTab ? 'not-allowed' : 'pointer' }}
              >
                <Plus size={14} /> Add Feature
              </button>
            </div>
          </div>

          {/* Product Tabs on next line if > 2 products */}
          {allTabs.length > 2 && (
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              padding: '0 1.5rem 0.75rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--panel-bg)',
              alignItems: 'center'
            }}>
              {allTabs.map((prod) => {
                const isActive = prod === activeProduct;
                const isSpecial = prod === NO_GROUP_TAB;
                return (
                  <button
                    key={prod}
                    onClick={() => setActiveProductTab(prod)}
                    style={{
                      padding: '0.5rem 0.25rem',
                      border: 'none',
                      background: 'none',
                      borderBottom: isActive ? `2px solid ${isSpecial ? 'var(--warning)' : 'var(--primary)'}` : '2px solid transparent',
                      color: isActive ? (isSpecial ? 'var(--warning)' : 'var(--text-primary)') : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {prod}
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '1px 5px',
                        borderRadius: '8px',
                        backgroundColor: isActive 
                          ? (isSpecial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(124, 58, 237, 0.12)') 
                          : 'var(--bg-hover)',
                        color: isActive 
                          ? (isSpecial ? 'var(--warning)' : 'var(--primary)') 
                          : 'var(--text-secondary)',
                        border: isActive
                          ? `1px solid ${isSpecial ? 'rgba(245, 158, 11, 0.2)' : 'rgba(124, 58, 237, 0.2)'}`
                          : '1px solid var(--border)',
                        fontWeight: 600
                      }}>
                        {getProductFeatureCount(prod)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Product Details Content - Full Canvas Table */}
          {activeProduct && (
            <div className="table-responsive" style={{ flex: 1, width: '100%', border: 'none', borderRadius: 0 }}>
              {filteredFeatures.length > 0 ? (
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('priority')} style={{ width: '80px', cursor: 'pointer' }}>Priority {sortField === 'priority' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('sourceLabel')} style={{ width: '140px', cursor: 'pointer' }}>Source {sortField === 'sourceLabel' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>Release Date {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFeatures.map(item => (
                      <tr key={item.id} onClick={() => {
                        if (editingFeatureId !== item.id) {
                          item.openPreview();
                        }
                      }} style={{ cursor: 'pointer' }}>
                        <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                            {editingFeatureId === item.id ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={inlineEditValue}
                                onChange={(e) => setInlineEditValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const finalVal = inlineEditValue.trim() || 'New Feature Request';
                                    updateProductItem(item.sourceId, { feature: finalVal });
                                    setEditingFeatureId(null);
                                    if (e.ctrlKey) {
                                      item.openPreview();
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingFeatureId(null);
                                  }
                                }}
                                onBlur={() => {
                                  const finalVal = inlineEditValue.trim() || 'New Feature Request';
                                  updateProductItem(item.sourceId, { feature: finalVal });
                                  setEditingFeatureId(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  backgroundColor: 'var(--background)',
                                  border: '1.5px solid var(--primary)',
                                  borderRadius: '6px',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  outline: 'none',
                                  boxShadow: '0 0 0 2px var(--primary-glow)'
                                }}
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => {
                                  if (item.canDelete) {
                                    e.stopPropagation();
                                    setEditingFeatureId(item.id);
                                    setInlineEditValue(item.feature || '');
                                  }
                                }}
                                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}
                              >
                                {item.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                              </span>
                            )}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                              {item.raisedByTarunSir && (
                                <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <Star size={10} fill="currentColor" /> Super Priority
                                </span>
                              )}
                              {item.tarunSirApproval && (
                                <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                                  <CheckCircle size={10} /> Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          {item.priority ? (
                            <span className={`badge badge-${item.priority.toLowerCase()}`}>
                              {item.priority}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {item.sourceLabel}
                        </td>
                        <td>
                          {item.poc ? (
                            <span style={getPOCBadgeStyle(item.poc)}>
                              {item.poc}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {item.status ? (() => {
                            const matched = statuses.find(s => s.label === item.status);
                            if (matched) {
                              return (
                                <span className="badge" style={{
                                  backgroundColor: `${matched.color}14`,
                                  color: matched.color,
                                  borderColor: `${matched.color}33`,
                                  borderStyle: 'solid',
                                  borderWidth: '1px'
                                }}>
                                  {item.status}
                                </span>
                              );
                            }
                            return (
                              <span className={`badge ${
                                item.status === 'On Hold' ? 'status-hold' :
                                item.status === 'In Progress' ? 'status-progress' :
                                item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                              }`}>
                                {item.status}
                              </span>
                            );
                          })() : '—'}
                        </td>
                        <td>
                          {item.clickupStatus ? (
                            <span style={getClickupBadgeStyle(item.clickupStatus)}>
                              {item.clickupStatus}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.productDeadline ? (
                            <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                              {formatDateToUserPattern(item.productDeadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.productDeadline} currentDate={item.uiux} />
                          {item.uiux ? (
                            <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                              {formatDateToUserPattern(item.uiux)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.uiux || item.productDeadline} currentDate={item.deadline} />
                          {item.deadline ? (
                            <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                              {formatDateToUserPattern(item.deadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline} currentDate={item.finalRelease} />
                          {item.finalRelease ? (
                            <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                              {formatDateToUserPattern(item.finalRelease)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {item.canDelete && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (await confirm("Are you sure you want to delete this feature?", "Delete Feature")) {
                                  deleteProductItem(item.sourceId);
                                }
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {isNoGroupTab
                    ? 'All tasks have a product group assigned. Great job!'
                    : 'No priority features mapped to this product.'}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* =========================================================================
   8. DAILY ISSUES / IMPROVEMENTS LOG MODAL & COMPONENT
   ========================================================================= */
// DailyIssueDetailModal is deprecated in favor of unified ProductDetailView

export const IssuesTable: React.FC = () => {
  const { dailyIssues, addDailyIssue, deleteDailyIssue, statuses, setPreviewProductId, currentUser, confirm } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];
  const [sortField, setSortField] = useState<keyof DailyIssue | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: keyof DailyIssue) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filtered = dailyIssues.filter(item => {
    const matchesSearch = 
      (item.module || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.poc || item.contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes || item.issues || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.product || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesPriority = filterPriority === 'All' || item.priority === filterPriority;
    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(item.status || '');
    const matchesSuperPriority = !filterSuperPriorityOnly || !!item.raisedByTarunSir;
    
    return matchesSearch && matchesPriority && matchesStatus && matchesSuperPriority;
  });

  filtered.sort((a, b) => {
    const aComp = !!a.finalReleaseCompleted;
    const bComp = !!b.finalReleaseCompleted;
    if (aComp !== bComp) return aComp ? 1 : -1;
    if (sortField) {
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return 0;
  });

  const handleAddNew = () => {
    const newId = String(Math.max(...dailyIssues.map(i => parseInt(i.id) || 0), 0) + 1);
    const newItem: DailyIssue = {
      id: newId,
      cohort: '',
      product: '',
      module: 'New Daily Issue',
      type: 'Bug/Defect',
      issues: '',
      contact: '',
      priority: '',
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: '',
      uiux: '',
      finalRelease: '',
      productDeadline: '',
      raisedByTarunSir: false,
      tarunSirApproval: false
    };
    addDailyIssue(newItem);
    setSearchQuery('');
    setSortField(null);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };

  const renderTextCell = (item: DailyIssue, field: keyof DailyIssue, fallback = '—') => {
    const val = String(item[field] || fallback);
    if (field === 'poc' && item[field]) {
      return (
        <span style={getPOCBadgeStyle(String(item[field]))}>
          {val}
        </span>
      );
    }
    return <span>{val}</span>;
  };

  const renderDateCell = (item: DailyIssue, field: keyof DailyIssue, previousField?: keyof DailyIssue) => {
    const value = String(item[field] || '');
    const completedField = `${String(field)}Completed` as keyof DailyIssue;
    const completed = Boolean(item[completedField]);
    return (
      <>
        {previousField && <DateDiffBadge prevDate={String(item[previousField] || '')} currentDate={value} />}
        <span style={getDateSpanStyle(value, completed)}>
          {value ? formatDateToUserPattern(value) : '—'}
        </span>
      </>
    );
  };

  return (
    <TabContainer
      title="Daily Issues Log"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onAddClick={handleAddNew}
      addLabel="Add Feature"
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="P0">P0 (Critical)</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>
          <MultiSelectDropdown
            options={statusOptions}
            selectedValues={filterStatuses}
            onChange={setFilterStatuses}
            placeholder="Status"
          />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
            <input 
              type="checkbox" 
              className="form-checkbox"
              checked={filterSuperPriorityOnly} 
              onChange={(e) => setFilterSuperPriorityOnly(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            Super Priority Only
          </label>
        </div>
      }
    >
      <div className="table-responsive">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('product')} style={{ cursor: 'pointer' }}>Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>Priority {sortField === 'priority' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('poc')} style={{ cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('clickupStatus')} style={{ cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('productDeadline')} style={{ cursor: 'pointer' }}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('uiux')} style={{ cursor: 'pointer' }}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('deadline')} style={{ cursor: 'pointer' }}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th onClick={() => handleSort('finalRelease')} style={{ cursor: 'pointer' }}>Final {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr 
                key={item.id} 
                onClick={() => setPreviewProductId(item.id)} 
                style={{ cursor: 'pointer' }}
              >
                <td
                  className="sticky-col"
                  style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' }}>
                        {item.module || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                      </span>
                      {item.raisedByTarunSir && (
                        <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Star size={10} fill="currentColor" /> Super Priority
                        </span>
                      )}
                      {item.tarunSirApproval && (
                        <span className="badge-verified" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 650 }}>
                          <CheckCircle size={10} /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  {item.product || '—'}
                </td>
                <td>
                  {item.priority ? (
                    <span className={`badge badge-${item.priority.toLowerCase()}`}>{item.priority}</span>
                  ) : '—'}
                </td>
                <td style={{ fontWeight: 500 }}>{renderTextCell(item, 'poc', item.contact || '—')}</td>
                <td>
                  {item.status ? (() => {
                    const matched = statuses.find(s => s.label === item.status);
                    if (matched) {
                      return (
                        <span className="badge" style={{
                          backgroundColor: `${matched.color}14`,
                          color: matched.color,
                          borderColor: `${matched.color}33`,
                          borderStyle: 'solid',
                          borderWidth: '1px'
                        }}>
                          {item.status}
                        </span>
                      );
                    }
                    return (
                      <span className={`badge ${
                        item.status === 'On Hold' ? 'status-hold' :
                        item.status === 'In Progress' ? 'status-progress' :
                        item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                      }`}>
                        {item.status}
                      </span>
                    );
                  })() : '—'}
                </td>
                <td>
                  {item.clickupStatus ? (
                    <span style={getClickupBadgeStyle(item.clickupStatus)}>
                      {item.clickupStatus}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {renderDateCell(item, 'productDeadline')}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                  {renderDateCell(item, 'uiux', 'productDeadline')}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                  {renderDateCell(item, 'deadline', 'uiux')}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                  {renderDateCell(item, 'finalRelease', 'deadline')}
                </td>
                <td>
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (await confirm("Are you sure you want to delete this daily issue?", "Delete Daily Issue")) {
                        deleteDailyIssue(item.id);
                      }
                    }} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TabContainer>
  );
};


export const AdoptionTable: React.FC = () => {
  const { 
    featureAdoptions, updateFeatureAdoption, addFeatureAdoption, deleteFeatureAdoption, 
    programs, cohorts, productGroups, confirm, alert
  } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };
  
  // Inline editing states
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FeatureAdoption | null>(null);

  // Add feature state
  const [isAddingFeature, setIsAddingFeature] = useState(false);

  // Filtering states
  const [filterProgram, setFilterProgram] = useState('All');
  const [filterCohort, setFilterCohort] = useState('All');

  // Only show active cohorts and programs that have at least one active cohort
  const activeCohorts = cohorts.filter(c => c.active !== false);
  const activePrograms = programs.filter(p => activeCohorts.some(c => c.programId === p.id));

  // Determine cohorts to display based on filters
  const displayCohorts = (() => {
    if (filterCohort !== 'All') {
      return activeCohorts.filter(c => c.name === filterCohort);
    }
    if (filterProgram !== 'All') {
      const parentProgram = activePrograms.find(p => p.name === filterProgram);
      return parentProgram 
        ? activeCohorts.filter(c => c.programId === parentProgram.id)
        : activeCohorts;
    }
    return activeCohorts;
  })();

  // Group cohorts by program
  const cohortsByProgram = activePrograms.map(p => {
    return {
      program: p,
      cohorts: displayCohorts.filter(c => c.programId === p.id)
    };
  }).filter(group => group.cohorts.length > 0);

  // Cohorts list filter dropdown should show cohorts of selected program
  const filteredCohortsForSelect = filterProgram === 'All'
    ? activeCohorts
    : activeCohorts.filter(c => {
        const parentProgram = activePrograms.find(p => p.name === filterProgram);
        return parentProgram ? c.programId === parentProgram.id : true;
      });

  const filtered = featureAdoptions.filter(adopt => {
    const matchesSearch = 
      adopt.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adopt.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (adopt.program || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (adopt.cohort || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const sorted = [...filtered];
  if (sortField) {
    sorted.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      
      if (sortField === 'feature') {
        valA = a.feature;
        valB = b.feature;
      } else if (sortField === 'product') {
        valA = a.product;
        valB = b.product;
      } else if (sortField === 'adoptionRate') {
        const getRate = (item: FeatureAdoption) => {
          const current = (item.cohort || '').split(',').map(s => s.trim()).filter(Boolean);
          const checkedCount = displayCohorts.filter(c => current.includes(c.name)).length;
          return displayCohorts.length > 0 ? (checkedCount / displayCohorts.length) : 0;
        };
        valA = getRate(a);
        valB = getRate(b);
      } else if (sortField.startsWith('cohort-')) {
        const cohortName = sortField.replace('cohort-', '');
        valA = (a.cohort || '').split(',').map(s => s.trim()).includes(cohortName) ? 1 : 0;
        valB = (b.cohort || '').split(',').map(s => s.trim()).includes(cohortName) ? 1 : 0;
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  const handleCohortToggle = (cohortName: string, isChecked: boolean, target: FeatureAdoption) => {
    const cohortsList = (target.cohort || '').split(',').map(s => s.trim()).filter(Boolean);
    const updatedCohorts = isChecked 
      ? [...cohortsList, cohortName] 
      : cohortsList.filter(x => x !== cohortName);
    
    // Find unique program names for these cohorts
    const updatedPrograms: string[] = [];
    updatedCohorts.forEach(cName => {
      const coh = cohorts.find(c => c.name === cName);
      if (coh) {
        const prog = programs.find(p => p.id === coh.programId);
        if (prog && !updatedPrograms.includes(prog.name)) {
          updatedPrograms.push(prog.name);
        }
      }
    });

    // Dynamic adoption rate across ALL active cohorts (global state rate)
    const rate = activeCohorts.length > 0 
      ? Math.round((updatedCohorts.length / activeCohorts.length) * 100)
      : 0;

    return {
      cohort: updatedCohorts.join(', '),
      program: updatedPrograms.join(', '),
      adoptionRate: rate
    };
  };

  const handleAddNewClick = () => {
    const draft: FeatureAdoption = {
      id: `adopt-${Date.now()}`,
      feature: '',
      product: productGroups[0]?.name || '',
      launchDate: new Date().toISOString().slice(0, 10),
      targetAudience: 'All Cohorts',
      adoptionRate: 0,
      activeUsers: 0,
      sentiment: 3.0,
      program: '',
      cohort: ''
    };
    setSearchQuery('');
    setEditDraft(draft);
    setEditingRowId(draft.id);
    setIsAddingFeature(true);
  };

  const handleSaveInline = async () => {
    if (!editDraft) return;
    if (!editDraft.feature.trim()) {
      await alert("Feature name is required.", "Validation Error", "OK", "warning");
      return;
    }
    if (isAddingFeature) {
      addFeatureAdoption(editDraft);
      setIsAddingFeature(false);
    } else {
      updateFeatureAdoption(editDraft.id, editDraft);
    }
    setEditingRowId(null);
    setEditDraft(null);
  };

  const handleCancelInline = () => {
    setIsAddingFeature(false);
    setEditingRowId(null);
    setEditDraft(null);
  };

  return (
    <>
      <TabContainer
        title="Adoption Tracker"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={handleAddNewClick}
        addLabel="Track Feature"
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              className="filter-select" 
              value={filterProgram} 
              onChange={(e) => {
                setFilterProgram(e.target.value);
                setFilterCohort('All');
              }}
            >
              <option value="All">All Programs</option>
              {activePrograms.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <select 
              className="filter-select" 
              value={filterCohort} 
              onChange={(e) => setFilterCohort(e.target.value)}
            >
              <option value="All">All Cohorts</option>
              {filteredCohortsForSelect.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        }
      >
        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <th rowSpan={2} onClick={() => handleSort('feature')} style={{ verticalAlign: 'middle', cursor: 'pointer' }}>Feature Name {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th rowSpan={2} onClick={() => handleSort('product')} style={{ verticalAlign: 'middle', width: 130, cursor: 'pointer' }}>Product {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
                {cohortsByProgram.map(g => (
                  <th 
                    key={g.program.id} 
                    colSpan={g.cohorts.length} 
                    style={{ 
                      textAlign: 'center', 
                      borderBottom: '1px solid var(--border)', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}
                  >
                    {g.program.name}
                  </th>
                ))}
                <th rowSpan={2} onClick={() => handleSort('adoptionRate')} style={{ width: '150px', verticalAlign: 'middle', cursor: 'pointer' }}>Adoption Rate (%) {sortField === 'adoptionRate' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th rowSpan={2} style={{ width: '80px', verticalAlign: 'middle' }}></th>
              </tr>
              <tr>
                {displayCohorts.map(c => (
                  <th key={c.id} onClick={() => handleSort(`cohort-${c.name}`)} style={{ fontSize: '0.725rem', textAlign: 'center', padding: '6px 8px', fontWeight: 600, cursor: 'pointer' }}>{c.name} {sortField === `cohort-${c.name}` ? (sortAsc ? '▲' : '▼') : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(isAddingFeature && editDraft ? [editDraft, ...sorted] : sorted).map(adopt => {
                const isEditing = editingRowId === adopt.id;
                
                return (
                  <React.Fragment key={adopt.id}>
                    <tr 
                      style={{ 
                        backgroundColor: isEditing ? 'rgba(99, 102, 241, 0.05)' : undefined,
                        borderLeft: isEditing ? '3px solid var(--primary)' : undefined
                      }}
                    >
                      {/* Feature Name */}
                      <td style={{ fontWeight: 600 }}>
                        {isEditing && editDraft ? (
                          <input
                            autoFocus
                            type="text"
                            value={editDraft.feature}
                            onChange={(e) => setEditDraft({ ...editDraft, feature: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInline();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelInline();
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                            placeholder="Enter feature name..."
                          />
                        ) : (
                          adopt.feature
                        )}
                      </td>

                      {/* Product column */}
                      <td style={{ fontSize: '0.78rem' }}>
                        {isEditing && editDraft ? (
                          <select
                            value={editDraft.product}
                            onChange={(e) => setEditDraft({ ...editDraft, product: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInline();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelInline();
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                            }}
                          >
                            {productGroups.map(pg => (
                              <option key={pg.id} value={pg.name}>{pg.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            background: (() => { const g = productGroups.find(g => g.name === adopt.product); return g ? g.color + '22' : 'var(--surface-elevated)'; })(),
                            color: (() => { const g = productGroups.find(g => g.name === adopt.product); return g ? g.color : 'var(--text-secondary)'; })(),
                            border: `1px solid ${(() => { const g = productGroups.find(g => g.name === adopt.product); return g ? g.color + '55' : 'var(--border)'; })()}`,
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                          }}>{adopt.product || '—'}</span>
                        )}
                      </td>
                      
                      {/* Cohorts Columns Checkboxes */}
                      {displayCohorts.map(c => {
                        const current = ((isEditing ? editDraft?.cohort : adopt.cohort) || '')
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean);
                        const isChecked = current.includes(c.name);
                        
                        return (
                          <td key={c.id} style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {
                                if (isEditing && editDraft) {
                                  const changes = handleCohortToggle(c.name, !isChecked, editDraft);
                                  setEditDraft({ ...editDraft, ...changes });
                                } else {
                                  const changes = handleCohortToggle(c.name, !isChecked, adopt);
                                  updateFeatureAdoption(adopt.id, changes);
                                }
                              }}
                              style={{ 
                                cursor: 'pointer', 
                                width: '15px', 
                                height: '15px', 
                                accentColor: 'var(--primary)'
                              }}
                            />
                          </td>
                        );
                      })}

                      {/* Adoption Rate Column */}
                      <td>
                        {(() => {
                          const displayRate = (() => {
                            const current = ((isEditing ? editDraft?.cohort : adopt.cohort) || '')
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean);
                            const checkedVisibleCount = displayCohorts.filter(c => current.includes(c.name)).length;
                            return displayCohorts.length > 0 
                              ? Math.round((checkedVisibleCount / displayCohorts.length) * 100)
                              : 0;
                          })();
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="progress-bar-container" style={{ width: '80px', height: '8px' }}>
                                <div className="progress-bar-fill" style={{ width: `${displayRate}%` }}></div>
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.8rem', width: '32px' }}>{displayRate}%</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions Column */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {isEditing ? (
                            <>
                              <button 
                                onClick={handleSaveInline}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success, #10b981)', display: 'flex', alignItems: 'center' }}
                                title="Save Changes"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button 
                                onClick={handleCancelInline}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setEditingRowId(adopt.id);
                                  setEditDraft({ ...adopt });
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                                title="Edit Details Inline"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (await confirm("Are you sure you want to delete this launch metrics tracker?", "Delete Launch Tracker")) {
                                    deleteFeatureAdoption(adopt.id);
                                  }
                                }} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                title="Delete Tracker"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </TabContainer>

    </>
  );
};


