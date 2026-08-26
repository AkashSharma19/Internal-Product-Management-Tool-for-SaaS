import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { RichTextEditor } from './RichTextEditor';
import { ensureHtmlDescription, stripHtml } from '../utils/text';
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
  Phone,
  MessageCircle,
  Flag,
  CheckSquare,
  Star,
  Link,
  Inbox,
  CheckCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Plus,
  Pin,
  Rocket,
  MessageSquare,
  Layers,
  ClipboardList,
  Copy,
  History,
  Eye,
  Download,
  Upload,
  Mail
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
  FeatureAdoption,
  FeedbackSubmission,
  FeedbackFormField,
  FeedbackFormConfig,
  DirectoryContact,
  Challenge
} from '../types';

import { triggerReleaseConfetti } from '../utils/confetti';
import { playPopSound } from '../utils/audio';

const isTaskLinked = (notes: string | undefined, taskId?: string): boolean => {
  if (!notes) return false;
  if (notes.includes("Linked Task: true")) return true;
  
  const amaCount = (notes.match(/AMA Session ID:/g) || []).length;
  const callCount = (notes.match(/Admin Call ID:/g) || []).length;
  const meetingCount = (notes.match(/Tarun Sir Meeting ID:/g) || []).length;
  const totalCount = amaCount + callCount + meetingCount;
  
  if (totalCount > 1) return true;
  
  if (totalCount === 1 && taskId) {
    if (notes.includes("Admin Call ID:") && !taskId.startsWith("prod-call-") && !taskId.startsWith("prod-temp-")) return true;
    if (notes.includes("AMA Session ID:") && !taskId.startsWith("prod-ama-") && !taskId.startsWith("prod-temp-")) return true;
    if (notes.includes("Tarun Sir Meeting ID:") && !taskId.startsWith("prod-tarun-") && !taskId.startsWith("prod-temp-")) return true;
  }
  
  return false;
};

interface DiscussionTextAreaProps {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const DiscussionTextArea: React.FC<DiscussionTextAreaProps> = ({ initialValue, onSave, placeholder, style }) => {
  const [val, setVal] = useState(initialValue);
  
  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  return (
    <textarea
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val !== initialValue) {
          onSave(val);
        }
      }}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
      }}
      ref={(el) => {
        if (el) {
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }
      }}
      placeholder={placeholder}
      style={style}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

interface AIMeetingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingText: string;
  meetingId: string;
  meetingTitle: string;
  meetingType: 'ama' | 'call' | 'tarun';
  onApplySummary: (summary: string) => void;
}

const AIMeetingAssistantModal: React.FC<AIMeetingAssistantModalProps> = ({
  isOpen,
  onClose,
  meetingText,
  meetingId,
  meetingTitle,
  meetingType,
  onApplySummary
}) => {
  const { addProductItem, currentUser, geminiModel } = useDashboard();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState<Array<{
    feature: string;
    description: string;
    priority: string;
    selected: boolean;
  }>>([]);

  const autoExpandRef = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (isOpen && meetingText.trim()) {
      generateAIReport();
    }
  }, [isOpen, meetingText]);

  const generateAIReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      
      const response = await fetch('/api/data?action=ai-meeting-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({ data: { text: meetingText, model: geminiModel } })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze meeting');
      }

      const resData = await response.json();
      if (resData.success && resData.result) {
        setSummary(resData.result.summary || '');
        const items = (resData.result.actionItems || []).map((item: any) => ({
          feature: item.feature || '',
          description: item.description || '',
          priority: item.priority || 'P2',
          selected: true
        }));
        setActionItems(items);
      } else {
        throw new Error('Invalid response structure from AI');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during AI processing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFeatures = () => {
    const selectedItems = actionItems.filter(item => item.selected && item.feature.trim() !== '');
    if (selectedItems.length === 0) return;

    let prefix = 'prod-temp';
    let noteText = '';
    if (meetingType === 'ama') {
      prefix = 'prod-ama';
      noteText = `AMA Session ID: ${meetingId} | AMA: ${meetingTitle}`;
    } else if (meetingType === 'call') {
      prefix = 'prod-call';
      noteText = `Admin Call ID: ${meetingId} | Admin Call: ${meetingTitle}`;
    } else if (meetingType === 'tarun') {
      prefix = 'prod-tarun';
      noteText = `Tarun Sir Meeting ID: ${meetingId} | Meeting: ${meetingTitle}`;
    }

    selectedItems.forEach((item, idx) => {
      const newItem: ProductItem = {
        id: `${prefix}-${Date.now()}-${idx}`,
        feature: item.feature.trim(),
        description: item.description.trim(),
        tarunSirApproval: false,
        raisedByTarunSir: meetingType === 'tarun' || item.priority === 'P0',
        priority: item.priority as "" | "P0" | "P1" | "P2" | "P3" | "P4",
        poc: '',
        status: '',
        clickupStatus: '',
        taskLink: '',
        blocker: '',
        deadline: '',
        notes: noteText,
        product: '',
        module: '',
        uiux: '',
        finalRelease: '',
        productDeadline: '',
        createdAt: new Date().toISOString()
      };
      addProductItem(newItem);
    });

    triggerReleaseConfetti();
    playPopSound();
    onApplySummary(summary);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 10005,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }} 
      onClick={onClose}
    >
      <div 
        className="detail-content" 
        style={{ 
          maxWidth: '850px', 
          width: '100%', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'var(--panel-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          padding: 0
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontFamily: 'inherit', margin: 0 }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            AI Meeting Summary & Features Extractor
          </h3>
          <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
              <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Analyzing notes and generating summary with Gemini AI...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>Error Generating Report</p>
              <p style={{ margin: 0 }}>{error}</p>
              <button 
                onClick={generateAIReport} 
                className="btn btn-secondary" 
                style={{ marginTop: '0.75rem', padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Summary Block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Generated Bulleted Summary
                </label>
                <textarea
                  ref={autoExpandRef}
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    autoExpandRef(e.target);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    lineHeight: '1.5',
                    resize: 'none',
                    overflowY: 'hidden',
                    outline: 'none'
                  }}
                  placeholder="Summarized bullet points will appear here..."
                />
              </div>

              {/* Action Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Extracted Action Items ({actionItems.filter(i => i.selected).length} selected)
                </label>
                
                {actionItems.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No action items or features extracted by AI.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {actionItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          gap: '0.75rem', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border)', 
                          backgroundColor: item.selected ? 'rgba(99,102,241,0.04)' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const copy = [...actionItems];
                            copy[idx].selected = e.target.checked;
                            setActionItems(copy);
                          }}
                          style={{ marginTop: '4px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={item.feature}
                              onChange={(e) => {
                                const copy = [...actionItems];
                                copy[idx].feature = e.target.value;
                                setActionItems(copy);
                              }}
                              placeholder="Feature title"
                              style={{
                                flex: 1,
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                padding: '4px 8px',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                              }}
                              disabled={!item.selected}
                            />
                            <select
                              value={item.priority}
                              onChange={(e) => {
                                const copy = [...actionItems];
                                copy[idx].priority = e.target.value;
                                setActionItems(copy);
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--background)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                              disabled={!item.selected}
                            >
                              <option value="P0">P0 (Critical)</option>
                              <option value="P1">P1 (High)</option>
                              <option value="P2">P2 (Medium)</option>
                              <option value="P3">P3 (Low)</option>
                              <option value="P4">P4 (Trivial)</option>
                            </select>
                          </div>
                          
                          <textarea
                            ref={autoExpandRef}
                            value={item.description}
                            onChange={(e) => {
                              const copy = [...actionItems];
                              copy[idx].description = e.target.value;
                              setActionItems(copy);
                              autoExpandRef(e.target);
                            }}
                            placeholder="Feature description"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: '0.8rem',
                              border: '1px solid var(--border)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--background)',
                              color: 'var(--text-secondary)',
                              fontFamily: 'inherit',
                              resize: 'none',
                              overflowY: 'hidden',
                              outline: 'none'
                            }}
                            disabled={!item.selected}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="form-actions" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--background-alt)', margin: 0, borderRadius: '0 0 16px 16px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          
          {!isLoading && !error && (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  onApplySummary(summary);
                  onClose();
                }}
                disabled={!summary.trim()}
              >
                Apply Summary Only
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={handleCreateFeatures}
                disabled={actionItems.filter(i => i.selected).length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={14} />
                Create {actionItems.filter(i => i.selected).length} Features & Apply Summary
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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

export const downloadCSV = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return '""';
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    )
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportItemFeedbackToExcel = (
  itemId: string,
  category: 'admin-calls' | 'ama-meetings' | 'student-projects',
  feedbackSubmissions: FeedbackSubmission[],
  formConfigs: FeedbackFormConfig[]
) => {
  const config = formConfigs.find(c => c.category === category);
  if (!config || !config.fields || config.fields.length === 0) {
    alert('No form configuration found for this category.');
    return;
  }

  const sortedFields = [...config.fields].sort((a, b) => a.order - b.order);
  const submissions = feedbackSubmissions.filter(sub => sub.itemId === itemId);

  if (submissions.length === 0) {
    alert('No feedback submissions to export for this item.');
    return;
  }

  const headers = [
    'Submission ID',
    'Respondent Name',
    'Respondent Email',
    'Submitted At',
    ...sortedFields.map(f => f.label)
  ];

  const rows = submissions.map(sub => {
    const fieldAnswers = sortedFields.map(f => {
      const val = sub.answers[f.id];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    });

    return [
      sub.id,
      sub.submittedBy || 'Anonymous',
      sub.submittedByEmail || '',
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '',
      ...fieldAnswers
    ];
  });

  const fileName = `Feedback_${itemId}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(fileName, headers, rows);
};

export const exportAttendeeFeedbackToExcel = (
  category: 'admin-calls' | 'ama-meetings' | 'student-projects',
  feedbackSubmissions: FeedbackSubmission[],
  formConfigs: FeedbackFormConfig[],
  adminCalls: AdminCall[] = [],
  studentMeetings: any[] = [],
  studentProjects: StudentProject[] = []
) => {
  const config = formConfigs.find(c => c.category === category);
  if (!config || !config.fields || config.fields.length === 0) {
    alert('No form configuration found for this category.');
    return;
  }

  const sortedFields = [...config.fields].sort((a, b) => a.order - b.order);
  const submissions = feedbackSubmissions.filter(sub => sub.category === category);

  if (submissions.length === 0) {
    alert(`No attendee feedback submissions found for ${category.replace('-', ' ')}.`);
    return;
  }

  const headers = [
    'Submission ID',
    'Item ID',
    'Item Name / Topic',
    'Date / POC',
    'Program',
    'Respondent Name',
    'Respondent Email',
    'Submitted At',
    ...sortedFields.map(f => f.label)
  ];

  const rows = submissions.map(sub => {
    let itemName = sub.itemId;
    let itemMeta = '';
    let itemProgram = '';

    if (category === 'admin-calls') {
      const call = adminCalls.find(c => c.id === sub.itemId);
      if (call) {
        itemName = call.cohortTopic;
        itemMeta = `${call.date} • ${call.adminPoc}`;
        itemProgram = call.program || '';
      }
    } else if (category === 'ama-meetings') {
      const meeting = studentMeetings.find(m => m.id === sub.itemId);
      if (meeting) {
        itemName = meeting.cohort || meeting.topic || sub.itemId;
        itemMeta = `${meeting.date || ''} • ${meeting.poc || meeting.speaker || ''}`;
        itemProgram = meeting.program || '';
      }
    } else if (category === 'student-projects') {
      const project = studentProjects.find(p => p.id === sub.itemId);
      if (project) {
        itemName = project.title;
        itemMeta = `${project.poc || ''}`;
        itemProgram = (project as any).program || '';
      }
    }

    const fieldAnswers = sortedFields.map(f => {
      const val = sub.answers[f.id];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.join(', ');
      return String(val);
    });

    return [
      sub.id,
      sub.itemId,
      itemName,
      itemMeta,
      itemProgram,
      sub.submittedBy || 'Anonymous',
      sub.submittedByEmail || '',
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : '',
      ...fieldAnswers
    ];
  });

  const categoryLabel = category === 'admin-calls' ? 'Admin_Calls' : category === 'ama-meetings' ? 'AMA_Meetings' : 'Student_Projects';
  const fileName = `Overall_Feedback_${categoryLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(fileName, headers, rows);
};

const ExpandableTextCell: React.FC<{ text: string; maxLength?: number }> = ({ text, maxLength = 75 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text || text.trim() === '') return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const plainText = stripHtml(text);
  const isLong = plainText.length > maxLength || 
                 text.includes('\n') || 
                 text.includes('<br>') || 
                 text.includes('</p>') || 
                 text.includes('</li>') ||
                 text.includes('</h1>') ||
                 text.includes('</h2>') ||
                 text.includes('</h3>');

  return (
    <div 
      style={{ 
        minWidth: '180px', 
        maxWidth: isExpanded ? '500px' : '300px', 
        position: 'relative',
        transition: 'max-width 0.2s ease-in-out'
      }} 
      title={isExpanded ? '' : plainText}
    >
      <div 
        style={{ 
          display: isExpanded ? 'block' : '-webkit-box',
          WebkitLineClamp: isExpanded ? 'none' : 3,
          WebkitBoxOrient: 'vertical',
          overflow: isExpanded ? 'visible' : 'hidden',
          wordBreak: 'break-word',
          lineHeight: 1.45,
          fontSize: '0.75rem',
          color: 'var(--text-primary)'
        }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
      {isLong && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '4px',
            padding: '2px 7px',
            fontSize: '0.65rem',
            fontWeight: 650,
            color: 'var(--primary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            marginTop: '4px',
            transition: 'all 0.15s'
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={10} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={10} /> Read full description
            </>
          )}
        </button>
      )}
    </div>
  );
};

const FeedbackSubmissionModal: React.FC<{
  submission: FeedbackSubmission | null;
  fields: FeedbackFormField[];
  onClose: () => void;
}> = ({ submission, fields, onClose }) => {
  if (!submission) return null;

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '85vh',
          backgroundColor: 'var(--panel-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--background-alt)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} color="var(--primary)" /> Feedback Submission Details
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Submitted by <strong>{submission.submittedBy || 'Anonymous'}</strong> {submission.submittedByEmail && `(${submission.submittedByEmail})`} on {submission.createdAt ? new Date(submission.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            </p>
          </div>
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

        {/* Modal Body */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {sortedFields.map((field) => {
            const ans = submission.answers[field.id];
            return (
              <div 
                key={field.id} 
                style={{ 
                  background: 'var(--background-alt)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  padding: '1rem' 
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {field.label}
                </div>
                <div>
                  {ans === undefined || ans === null || ans === '' ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No response provided</span>
                  ) : field.type === 'rating' ? (
                    <span style={{ color: '#d97706', fontWeight: 800, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {ans} <Star size={14} fill="#fbbf24" color="#fbbf24" />
                    </span>
                  ) : Array.isArray(ans) ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {ans.map((item: string, i: number) => (
                        <span key={i} className="badge" style={{ fontSize: '0.75rem', background: 'var(--panel-bg)', border: '1px solid var(--border)' }}>{item}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      fontSize: '0.825rem', 
                      color: 'var(--text-primary)', 
                      lineHeight: '1.55',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      background: 'var(--panel-bg)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)'
                    }}>
                      {String(ans)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--background-alt)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const AttendeeFeedbackDetails: React.FC<{
  itemId: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
}> = ({ itemId, category }) => {
  const { formConfigs, feedbackSubmissions, currentUser, confirm, deleteFeedbackSubmission } = useDashboard();
  const [copied, setCopied] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<FeedbackSubmission | null>(null);
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {submissions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportItemFeedbackToExcel(itemId, category, feedbackSubmissions, formConfigs);
              }}
              style={{
                background: 'var(--panel-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
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
              title="Download Feedback as Excel (CSV)"
            >
              <Download size={12} /> Download Feedback Excel
            </button>
          )}
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
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', position: 'sticky', left: 0, background: 'var(--panel-bg)', zIndex: 1, minWidth: '110px' }}>Respondent</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', minWidth: '110px' }}>Date</th>
                {sortedFields.map(field => (
                  <th key={field.id} title={field.label} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', borderRight: '1px solid var(--border)', minWidth: field.type === 'rating' ? '70px' : '220px', maxWidth: '320px', lineHeight: '1.35' }}>
                    {field.label}
                  </th>
                ))}
                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: '95px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--background)' : 'var(--background-alt)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--background)' : 'var(--background-alt)', zIndex: 1, verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{sub.submittedBy || 'Anonymous'}</span>
                      {sub.submittedByEmail && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>{sub.submittedByEmail}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)', verticalAlign: 'top' }}>
                    {sub.createdAt ? new Date(sub.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  {sortedFields.map(field => {
                    const ans = sub.answers[field.id];
                    return (
                      <td key={field.id} style={{ padding: '7px 10px', borderRight: '1px solid var(--border)', color: 'var(--text-primary)', verticalAlign: 'top' }}>
                        {ans === undefined || ans === null || ans === '' ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : field.type === 'rating' ? (
                          <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {ans} <Star size={10} fill="#fbbf24" color="#fbbf24" />
                          </span>
                        ) : Array.isArray(ans) ? (
                          <span>{ans.join(', ')}</span>
                        ) : (
                          <ExpandableTextCell text={String(ans)} maxLength={75} />
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '7px 10px', textAlign: 'center', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingSubmission(sub);
                        }}
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          cursor: 'pointer',
                          color: 'var(--primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.675rem',
                          fontWeight: 650,
                          transition: 'all 0.15s'
                        }}
                        title="View full submission details"
                      >
                        <Eye size={12} /> View
                      </button>
                      {isCurrentUserAdmin && (
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
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingSubmission && (
        <FeedbackSubmissionModal
          submission={viewingSubmission}
          fields={config.fields}
          onClose={() => setViewingSubmission(null)}
        />
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
          maxWidth: '78vw',
          minWidth: '600px',
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
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif" }}>
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

export const getClickupBadgeStyle = (status: string) => {
  if (!status) return {};
  
  const cleanStatus = status.trim().toLowerCase();
  
  // Custom HSL colors for known ClickUp statuses
  const CLICKUP_COLORS: Record<string, { h: number; s: number; l: number }> = {
    'open': { h: 215, s: 15, l: 60 },
    'todo': { h: 215, s: 15, l: 60 },
    'to do': { h: 215, s: 15, l: 60 },
    'backlog': { h: 215, s: 15, l: 60 },
    'unstarted': { h: 215, s: 15, l: 60 },
    
    'in progress': { h: 205, s: 85, l: 55 },
    'in-progress': { h: 205, s: 85, l: 55 },
    'active': { h: 205, s: 85, l: 55 },
    'development': { h: 205, s: 85, l: 55 },
    'dev': { h: 205, s: 85, l: 55 },
    'in design': { h: 205, s: 85, l: 55 },
    'design': { h: 205, s: 85, l: 55 },
    'building': { h: 205, s: 85, l: 55 },
    
    'under review': { h: 28, s: 90, l: 55 },
    'review': { h: 28, s: 90, l: 55 },
    'discuss': { h: 28, s: 90, l: 55 },
    'discussing': { h: 28, s: 90, l: 55 },
    'discuss/review': { h: 28, s: 90, l: 55 },
    'in review': { h: 28, s: 90, l: 55 },
    'to review': { h: 28, s: 90, l: 55 },
    
    'testing': { h: 270, s: 75, l: 60 },
    'tested': { h: 270, s: 75, l: 60 },
    'qa': { h: 270, s: 75, l: 60 },
    'quality assurance': { h: 270, s: 75, l: 60 },
    'bug verification': { h: 270, s: 75, l: 60 },
    
    'on hold': { h: 0, s: 80, l: 60 },
    'hold': { h: 0, s: 80, l: 60 },
    'paused': { h: 0, s: 80, l: 60 },
    'blocked': { h: 0, s: 80, l: 60 },
    'stuck': { h: 0, s: 80, l: 60 },
    'cancelled': { h: 0, s: 80, l: 60 },
    
    'closed': { h: 142, s: 70, l: 45 },
    'done': { h: 142, s: 70, l: 45 },
    'completed': { h: 142, s: 70, l: 45 },
    'delivered': { h: 142, s: 70, l: 45 },
    'complete': { h: 142, s: 70, l: 45 },
    'resolved': { h: 142, s: 70, l: 45 },
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

const formatClickupAssignee = (assigneesStr: string) => {
  if (!assigneesStr) return '';
  const parts = assigneesStr.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} +${parts.length - 1}`;
};

export const extractClickupTaskId = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9\-_]{7,12}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('clickup.com')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const tIndex = pathParts.indexOf('t');
      if (tIndex !== -1 && tIndex < pathParts.length - 1) {
        const nextPart = pathParts[tIndex + 1];
        if (nextPart === 'h' && tIndex < pathParts.length - 2) {
          return pathParts[tIndex + 2];
        }
        const lastPart = pathParts[pathParts.length - 1];
        if (/^[a-zA-Z0-9\-_]{7,12}$/.test(lastPart)) {
          return lastPart;
        }
      }
    }
  } catch (e) {}
  return null;
};

const isDateOverdue = (dateStr: string | undefined, isCompleted: boolean | undefined): boolean => {
  if (!dateStr || isCompleted) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    d.setHours(23, 59, 59, 999);
    const today = new Date();
    return d.getTime() < today.getTime();
  } catch (e) {
    return false;
  }
};

interface FieldHistoryModalProps {
  itemId: string;
  fieldName: string;
  fieldLabel: string;
  onClose: () => void;
}

export const FieldHistoryModal: React.FC<FieldHistoryModalProps> = ({ itemId, fieldName, fieldLabel, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const savedUserId = localStorage.getItem('logged-in-user-id') || '';
        const response = await fetch(`/api/data?action=get-change-history&itemId=${encodeURIComponent(itemId)}`, {
          headers: {
            'x-user-id': savedUserId
          }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && Array.isArray(resData.data)) {
            const filtered = resData.data.filter((log: any) => log.fieldName === fieldName);
            // Deduplicate logs created within a 2-second window
            const uniqueLogs: any[] = [];
            for (let i = 0; i < filtered.length; i++) {
              const current = filtered[i];
              let isDup = false;
              for (let j = i + 1; j < filtered.length; j++) {
                const other = filtered[j];
                const timeDiff = Math.abs(new Date(current.createdAt).getTime() - new Date(other.createdAt).getTime());
                if (
                  current.oldValue === other.oldValue &&
                  current.newValue === other.newValue &&
                  current.changedBy === other.changedBy &&
                  timeDiff < 2000
                ) {
                  isDup = true;
                  break;
                }
              }
              if (!isDup) {
                uniqueLogs.push(current);
              }
            }
            setLogs(uniqueLogs);
          } else {
            setError(resData.error || 'Failed to fetch history logs');
          }
        } else {
          setError('Failed to fetch history logs from server');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading history logs');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [itemId, fieldName]);

  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return 'empty';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    return dateStr;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        style={{
          width: '450px',
          maxWidth: '92vw',
          maxHeight: '75vh',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            History of Changes: {fieldLabel}
          </h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.75rem', paddingRight: '4px' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>Loading change history...</div>}
          {error && <div style={{ color: 'var(--danger)', padding: '0.5rem', textAlign: 'center' }}>{error}</div>}
          {!loading && !error && logs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No change history recorded yet.</div>
          )}
          {!loading && !error && logs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px', backgroundColor: 'var(--background-alt)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {log.changedBy}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', marginTop: '2px', lineHeight: '1.4' }}>
                    Changed from <strong style={{ color: 'var(--text-secondary)' }}>"{formatDateString(log.oldValue)}"</strong> to <strong style={{ color: 'var(--success, #10b981)' }}>"{formatDateString(log.newValue)}"</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ClickupSubtasksModalProps {
  taskLink: string;
  onClose: () => void;
}

export const ClickupSubtasksModal: React.FC<ClickupSubtasksModalProps> = ({ taskLink, onClose }) => {
  const { clickupApiKey } = useDashboard();
  const [subtasks, setSubtasks] = useState<{ id: string; name: string; status: { status: string; color: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubtasks = async () => {
      const taskId = extractClickupTaskId(taskLink);
      if (!taskId) {
        setError('Invalid ClickUp Task Link');
        setLoading(false);
        return;
      }
      if (!clickupApiKey) {
        setError('ClickUp API Key not configured in Settings');
        setLoading(false);
        return;
      }
      try {
        const savedUserId = localStorage.getItem('logged-in-user-id') || '';
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': savedUserId
          },
          body: JSON.stringify({
            action: 'clickup-sync',
            type: 'settings',
            id: null,
            data: { taskId }
          })
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data && resData.data.subtasks) {
            setSubtasks(resData.data.subtasks);
          } else {
            setSubtasks([]);
          }
        } else {
          setError('Could not fetch task details from ClickUp API via backend proxy');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching subtasks');
      } finally {
        setLoading(false);
      }
    };
    fetchSubtasks();
  }, [taskLink, clickupApiKey]);

  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        style={{
          width: '420px',
          maxWidth: '92vw',
          maxHeight: '80vh',
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>ClickUp Subtasks</h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.75rem' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>Loading subtasks from ClickUp...</div>}
          {error && <div style={{ color: 'var(--danger)', padding: '0.5rem', textAlign: 'center' }}>{error}</div>}
          {!loading && !error && subtasks.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No subtasks found for this task.</div>
          )}
          {!loading && !error && subtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {subtasks.map(sub => {
                const isClosed = sub.status?.status?.toLowerCase() === 'closed';
                return (
                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--background-alt)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ color: isClosed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isClosed ? 'line-through' : 'none', fontWeight: 500 }}>
                      {sub.name}
                    </span>
                    <span 
                      style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        backgroundColor: sub.status?.color || '#cbd5e1', 
                        color: '#fff' 
                      }}
                    >
                      {sub.status?.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ClickUpStatusBadge: React.FC<{ status: string; subtasksCount?: number; taskLink?: string }> = ({ status, subtasksCount, taskLink }) => {
  const { setActiveSubtasksTaskLink } = useDashboard();
  if (!status) return <span>—</span>;
  const hasSubtasks = subtasksCount !== undefined && subtasksCount > 0;
  return (
    <span 
      style={{ 
        ...getClickupBadgeStyle(status), 
        cursor: hasSubtasks && taskLink ? 'pointer' : 'default' 
      }}
      onClick={(e) => {
        if (hasSubtasks && taskLink) {
          e.stopPropagation();
          setActiveSubtasksTaskLink(taskLink);
        }
      }}
      title={hasSubtasks && taskLink ? "Click to view subtasks breakdown" : ""}
    >
      {status}{hasSubtasks ? ` (${subtasksCount})` : ""}
    </span>
  );
};

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


interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, onClose, align = 'left' }) => {
  const initialDate = value ? new Date(value) : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-indexed

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(i);
  }

  const handleDayClick = (day: number) => {
    const paddedMonth = (currentMonth + 1).toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');
    const dateStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
    onChange(dateStr);
    onClose();
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
  };

  const calendarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div 
      ref={calendarRef}
      style={{
        position: 'absolute',
        top: '110%',
        left: align === 'left' ? 0 : undefined,
        right: align === 'right' ? 0 : undefined,
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow)',
        padding: '12px',
        width: '240px',
        zIndex: 10005,
        fontFamily: 'inherit',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <button 
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
          {months[currentMonth]} {currentYear}
        </span>
        <button 
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
        {weekdays.map(day => (
          <span key={day} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {day}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {cells.map((cell, index) => {
          if (cell === null) {
            return <div key={`empty-${index}`} />;
          }

          const selected = isSelected(cell);
          const current = isToday(cell);

          return (
            <div 
              key={`day-${cell}`}
              onClick={() => handleDayClick(cell)}
              style={{
                fontSize: '0.75rem',
                fontWeight: selected ? '700' : '500',
                padding: '4px 0',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: selected ? 'var(--primary)' : 'transparent',
                color: selected ? '#ffffff' : current ? 'var(--accent)' : 'var(--text-primary)',
                transition: 'background-color 0.15s, color 0.15s',
                border: current && !selected ? '1px solid var(--accent)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = 'var(--background-alt)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {cell}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
        <button 
          onClick={() => {
            const today = new Date();
            const paddedMonth = (today.getMonth() + 1).toString().padStart(2, '0');
            const paddedDay = today.getDate().toString().padStart(2, '0');
            const dateStr = `${today.getFullYear()}-${paddedMonth}-${paddedDay}`;
            onChange(dateStr);
            onClose();
          }}
          style={{
            background: 'var(--primary-glow)',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--primary)',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '4px 8px',
            cursor: 'pointer'
          }}
        >
          Today
        </button>
        <button 
          onClick={() => {
            onChange('');
            onClose();
          }}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--danger)',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '4px 8px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export const formatDateToShortPattern = (dateStr: string): string => {
  if (!dateStr) return '';
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear().toString();
      const monthIndex = d.getMonth();
      const day = d.getDate().toString();
      return `${day} ${monthsShort[monthIndex]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
};

export const formatDateToUserPattern = (dateStr: string): string => {
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
  const s = status.toLowerCase().trim();
  return ['delivered', 'completed', 'done', 'closed', 'tested', 'released'].includes(s);
};

export const getDateSpanStyle = (dateStr: string | undefined, isCompleted: boolean | undefined) => {
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

export const getDateDiffDays = (dateStr1: string | undefined, dateStr2: string | undefined): string => {
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

export const DateDiffBadge: React.FC<{ prevDate?: string; currentDate?: string }> = ({ prevDate, currentDate }) => {
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
  const { studentProjects, speakers: configSpeakers, productGroups, statuses: configStatuses, clickupApiKey, syncClickupTask, activeTab, canUserEdit, currentUser, productItems, contentItems, dailyIssues, studentMeetings, setActiveSubtasksTaskLink, setPreviewProductId, deleteProductItem, comments, addComment, confirm } = useDashboard();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copiedClickup, setCopiedClickup] = useState(false);
  const [historyField, setHistoryField] = useState<{ name: string; label: string } | null>(null);
  const handleCopyClickupLink = async () => {
    if (!item.taskLink) return;
    try {
      await navigator.clipboard.writeText(item.taskLink);
      setCopiedClickup(true);
      setTimeout(() => setCopiedClickup(false), 2000);
    } catch (err) {
      console.error('Failed to copy clickup link', err);
    }
  };
  const [isEditingCreatedAt, setIsEditingCreatedAt] = useState(false);
  const [isEditingSpecsDate, setIsEditingSpecsDate] = useState(false);
  const [isEditingUiuxDate, setIsEditingUiuxDate] = useState(false);
  const [isEditingDevDate, setIsEditingDevDate] = useState(false);
  const [isEditingReleaseDate, setIsEditingReleaseDate] = useState(false);
  const [isEditingCommittedDate, setIsEditingCommittedDate] = useState(false);

  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handlePostComment = async () => {
    if (!newCommentText.trim()) return;
    setIsPostingComment(true);
    setCommentError('');
    try {
      const res = await addComment(item.id, newCommentText);
      if (res.success) {
        setNewCommentText('');
      } else {
        setCommentError(res.error || 'Failed to post comment');
      }
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };



  const [isLinkingSearchOpen, setIsLinkingSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTasks, setSearchedTasks] = useState<ProductItem[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [isSearchingLink, setIsSearchingLink] = useState(false);
  const SEARCH_PAGE_SIZE = 5;

  // DB-backed search with debounce + pagination for the "Link to Task" widget
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchedTasks([]);
      setSearchTotal(0);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingLink(true);
      try {
        const headers: Record<string, string> = {};
        const savedUserId = localStorage.getItem('logged-in-user-id');
        if (savedUserId) headers['x-user-id'] = savedUserId;
        const res = await fetch(
          `/api/data?action=suggest-similar&query=${encodeURIComponent(q)}&excludeId=${item.id}&page=${searchPage}`,
          { headers }
        );
        if (!cancelled && res.ok) {
          const json = await res.json();
          if (json.success) {
            setSearchedTasks(json.data || []);
            setSearchTotal(json.total ?? 0);
          }
        }
      } catch (err) {
        console.error('Link search failed:', err);
      } finally {
        if (!cancelled) setIsSearchingLink(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, searchPage, item.id]);

  const [featureText, setFeatureText] = useState(item.feature || '');
  const [isFocused, setIsFocused] = useState(false);

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [featureText]);

  useEffect(() => {
    setFeatureText(item.feature || '');
  }, [item.feature]);

  const [similarTasks, setSimilarTasks] = useState<ProductItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = featureText.trim();
    if (query.length < 3) {
      setSimilarTasks([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const headers: Record<string, string> = {};
        const savedUserId = localStorage.getItem('logged-in-user-id');
        if (savedUserId) {
          headers['x-user-id'] = savedUserId;
        }

        const response = await fetch(`/api/data?action=suggest-similar&query=${encodeURIComponent(query)}&excludeId=${item.id}`, { headers });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            setSimilarTasks(resData.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch similar task suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [featureText, item.id]);

  const sessionInfo = useMemo(() => {
    const notesStr = item.notes || '';
    const match = notesStr.match(/(AMA Session|Admin Call|Tarun Sir Meeting) ID:\s*([^\s|]+)/);
    if (!match) return null;
    return {
      type: match[1],
      id: match[2],
      fullTag: `${match[1]} ID: ${match[2]}`
    };
  }, [item.notes]);

  const handleLinkTask = (targetTask: ProductItem) => {
    const existingNotes = targetTask.notes || '';
    const newNotes = existingNotes 
      ? `${existingNotes} | ${item.notes} | Linked Task: true` 
      : `${item.notes} | Linked Task: true`;
    
    // Update target task notes
    onUpdate(targetTask.id, { notes: newNotes });
    // Switch preview to target task
    setPreviewProductId(targetTask.id);
    // Delete placeholder task
    deleteProductItem(item.id);
  };



  const pocList = configSpeakers.map(s => s.name);
  const productList = productGroups.map(g => g.name);
  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;

  // Visual Workload Indicators mapping
  const pocActiveTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pocList.forEach(name => {
      counts[name] = 0;
    });

    const isTaskActive = (task: any) => {
      return !task.finalReleaseCompleted;
    };

    productItems.forEach((pi: ProductItem) => {
      if (pi.poc && isTaskActive(pi)) {
        counts[pi.poc] = (counts[pi.poc] || 0) + 1;
      }
    });

    if (Array.isArray(studentProjects)) {
      studentProjects.forEach((pi: any) => {
        if (pi.poc && isTaskActive(pi)) {
          counts[pi.poc] = (counts[pi.poc] || 0) + 1;
        }
      });
    }

    if (Array.isArray(contentItems)) {
      contentItems.forEach((pi: any) => {
        if (pi.poc && isTaskActive(pi)) {
          counts[pi.poc] = (counts[pi.poc] || 0) + 1;
        }
      });
    }

    if (Array.isArray(dailyIssues)) {
      dailyIssues.forEach((pi: any) => {
        const poc = pi.poc || pi.contact;
        if (poc && isTaskActive(pi)) {
          counts[poc] = (counts[poc] || 0) + 1;
        }
      });
    }

    if (Array.isArray(studentMeetings)) {
      studentMeetings.forEach((pi: any) => {
        if (pi.poc && isTaskActive(pi)) {
          counts[pi.poc] = (counts[pi.poc] || 0) + 1;
        }
      });
    }

    return counts;
  }, [productItems, studentProjects, contentItems, dailyIssues, studentMeetings, pocList]);

  // Overdue milestones flags
  const specsOverdue = isDateOverdue(item.productDeadline, item.productDeadlineCompleted);
  const uiuxOverdue = isDateOverdue(item.uiux, item.uiuxCompleted);
  const devOverdue = isDateOverdue(item.deadline, item.deadlineCompleted);
  const releaseOverdue = isDateOverdue(item.finalRelease, item.finalReleaseCompleted);
  const isOverallCompleted = isCompletedStatus(item.status);
  const committedOverdue = isDateOverdue(item.committedDate, !!item.finalReleaseCompleted || isOverallCompleted);
  
  const realProjectId = item.id.startsWith('prod-temp-') ? item.id.replace('prod-temp-', '') : item.id;
  const isProject = item.id.startsWith('proj-') || studentProjects.some(p => p.id === realProjectId);

  const productStatuses = configStatuses;




  const getClickupStatusColor = (status: string) => {
    if (!status) return 'var(--text-secondary)';
    const s = status.toLowerCase().trim();
    if (['closed', 'done', 'completed', 'delivered', 'complete', 'resolved'].includes(s)) return '#10b981'; // Green
    if (['open', 'todo', 'to do', 'backlog', 'unstarted'].includes(s)) return '#6b7280'; // Grey
    if (['in progress', 'active', 'development', 'dev', 'in design', 'design', 'building'].includes(s)) return '#3b82f6'; // Blue
    if (['under review', 'review', 'discuss', 'discussing', 'discuss/review', 'in review', 'to review'].includes(s)) return '#f97316'; // Orange
    if (['testing', 'tested', 'qa', 'quality assurance', 'bug verification'].includes(s)) return '#a855f7'; // Purple
    if (['on hold', 'hold', 'paused', 'blocked', 'stuck', 'cancelled'].includes(s)) return '#ef4444'; // Red
    
    // Fallback to a stable hex color using hash
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hexColors = [
      '#7c3aed', '#db2777', '#0284c7', '#059669', '#ea580c', '#e11d48', '#4f46e5', '#0891b2', '#ca8a04'
    ];
    return hexColors[Math.abs(hash) % hexColors.length];
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
      const res = await syncClickupTask(taskLinkValue);
      if (res) {
        const updates: Partial<ProductItem> = { 
          clickupStatus: res.status, 
          clickupSubtasksCount: res.subtasksCount,
          clickupAssignee: res.assignee
        };
        const currentName = (item.feature || '').trim();
        const isDefaultName = 
          currentName === '' || 
          currentName === 'New Priority Request' || 
          currentName === 'New Project' || 
          currentName === 'New Task' || 
          currentName === 'New Sprint Task Description' || 
          currentName === 'New Issue Logged' || 
          currentName.startsWith('Issue #') || 
          currentName.startsWith('Request #') || 
          currentName.toLowerCase().startsWith('new ') ||
          currentName.toLowerCase().startsWith('feature for ') ||
          currentName.toLowerCase().startsWith('related feature');
        if (res.name && isDefaultName) {
          updates.feature = res.name;
          setFeatureText(res.name);
        }
        onUpdate(item.id, updates);
      } else {
        setSyncError('Could not fetch status from ClickUp API. Please check your credentials or connection.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  

  

  

  const steps = [
    {
      label: 'Created',
      date: item.createdAt,
      dateVal: item.createdAt ? formatDateToShortPattern(item.createdAt) : 'Set Date',
      completed: true,
      classStr: 'completed',
      isEditing: isEditingCreatedAt,
      setIsEditing: setIsEditingCreatedAt,
      icon: <CheckCircle size={14} />,
      historyField: null,
      completedKey: null
    },
    {
      label: 'Specs Date',
      date: item.productDeadline,
      dateVal: item.productDeadline ? formatDateToShortPattern(item.productDeadline) : 'Set Date',
      completed: !!item.productDeadlineCompleted,
      classStr: item.productDeadlineCompleted ? 'completed' : specsOverdue ? 'overdue' : 'active',
      isEditing: isEditingSpecsDate,
      setIsEditing: setIsEditingSpecsDate,
      icon: item.productDeadlineCompleted ? <Check size={14} /> : <Calendar size={14} />,
      historyField: 'productDeadline',
      historyLabel: 'Specs Date',
      completedKey: 'productDeadlineCompleted',
      diffDays: item.productDeadline ? getDateDiffDays(item.createdAt, item.productDeadline) : null,
      diffTitle: 'Days since Created Date'
    },
    {
      label: 'UI/UX Date',
      date: item.uiux,
      dateVal: item.uiux ? formatDateToShortPattern(item.uiux) : 'Set Date',
      completed: !!item.uiuxCompleted,
      classStr: item.uiuxCompleted ? 'completed' : uiuxOverdue ? 'overdue' : (item.productDeadlineCompleted ? 'active' : 'pending'),
      isEditing: isEditingUiuxDate,
      setIsEditing: setIsEditingUiuxDate,
      icon: item.uiuxCompleted ? <Check size={14} /> : <Palette size={14} />,
      historyField: 'uiux',
      historyLabel: 'UI/UX Date',
      completedKey: 'uiuxCompleted',
      diffDays: item.uiux ? getDateDiffDays(item.productDeadline || item.createdAt, item.uiux) : null,
      diffTitle: item.productDeadline ? 'Days since Specs Date' : 'Days since Created Date'
    },
    {
      label: 'Dev Date',
      date: item.deadline,
      dateVal: item.deadline ? formatDateToShortPattern(item.deadline) : 'Set Date',
      completed: !!item.deadlineCompleted,
      classStr: item.deadlineCompleted ? 'completed' : devOverdue ? 'overdue' : (item.uiuxCompleted ? 'active' : 'pending'),
      isEditing: isEditingDevDate,
      setIsEditing: setIsEditingDevDate,
      icon: item.deadlineCompleted ? <Check size={14} /> : <Code size={14} />,
      historyField: 'deadline',
      historyLabel: 'Dev Date',
      completedKey: 'deadlineCompleted',
      diffDays: item.deadline ? getDateDiffDays(item.uiux || item.productDeadline || item.createdAt, item.deadline) : null,
      diffTitle: item.uiux ? 'Days since UI/UX Date' : item.productDeadline ? 'Days since Specs Date' : 'Days since Created Date'
    },
    {
      label: 'Release Date',
      date: item.finalRelease,
      dateVal: item.finalRelease ? formatDateToShortPattern(item.finalRelease) : 'Set Date',
      completed: !!item.finalReleaseCompleted,
      classStr: item.finalReleaseCompleted ? 'completed' : releaseOverdue ? 'overdue' : (item.deadlineCompleted ? 'active' : 'pending'),
      isEditing: isEditingReleaseDate,
      setIsEditing: setIsEditingReleaseDate,
      icon: item.finalReleaseCompleted ? <Check size={14} /> : <Sparkles size={14} />,
      historyField: 'finalRelease',
      historyLabel: 'Release Date',
      completedKey: 'finalReleaseCompleted',
      diffDays: item.finalRelease ? getDateDiffDays(item.deadline || item.uiux || item.productDeadline || item.createdAt, item.finalRelease) : null,
      diffTitle: item.deadline ? 'Days since Dev Date' : item.uiux ? 'Days since UI/UX Date' : item.productDeadline ? 'Days since Specs Date' : 'Days since Created Date'
    },
    {
      label: 'Commited Date',
      date: item.committedDate,
      dateVal: item.committedDate ? formatDateToShortPattern(item.committedDate) : 'Set Date',
      completed: !!item.finalReleaseCompleted,
      classStr: item.finalReleaseCompleted ? 'completed' : committedOverdue ? 'overdue' : 'active',
      isEditing: isEditingCommittedDate,
      setIsEditing: setIsEditingCommittedDate,
      icon: item.finalReleaseCompleted ? <Check size={14} /> : <Calendar size={14} />,
      historyField: 'committedDate',
      historyLabel: 'Commited Date',
      completedKey: 'committedDateCompleted',
      diffDays: item.committedDate ? getDateDiffDays(item.finalRelease || item.deadline || item.uiux || item.productDeadline || item.createdAt, item.committedDate) : null,
      diffTitle: item.finalRelease ? 'Days since Release Date' : 'Days since Created Date'
    }
  ];

  return (
    <div className="premium-workspace animate-fade-in" key={item.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', height: '100%', overflow: 'hidden' }}>
      
      {/* Top Navigation & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', flexShrink: 0 }}>
        <div className="premium-breadcrumb">
          <button className="btn-back" style={{ width: '24px', height: '24px', borderRadius: '6px', marginRight: '0.25rem' }} onClick={onBack} title="Back to Table">
            <ArrowLeft size={12} />
          </button>
          <span>
            {activeTab === 'issues' ? 'Daily Issues Log' : 
             activeTab === 'projects' ? 'Student Projects' : 
             activeTab === 'meetings' ? 'Student Meetings' : 
             activeTab === 'admin' ? 'Admin Meetings' : 
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
          {canUserEdit && (
            <button
              onClick={async () => {
                const confirmed = await confirm("Are you sure you want to delete this feature?", "Delete Feature");
                if (confirmed) {
                  deleteProductItem(item.id);
                  onBack();
                }
              }}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.725rem',
                fontWeight: 600,
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginRight: '0.5rem'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
              title="Delete Feature"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
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

      {/* TWO COLUMN CONTENT LAYOUT */}
      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0, marginTop: '1rem' }}>
        
        {/* LEFT COLUMN: Main details (scrollable) */}
        <div style={{ flex: '1 1 0%', overflowY: 'auto', paddingRight: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          <div style={{ pointerEvents: canUserEdit ? 'auto' : 'none', opacity: canUserEdit ? 1 : 0.95, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Task Title (Editable) + inline link button */}
            <div style={{ position: 'relative' }}>
              <textarea
                ref={titleTextareaRef}
                className="premium-title-input"
                style={{ paddingLeft: 0, fontSize: '1.5rem', borderBottom: '2px solid transparent', width: '100%', height: 'auto', resize: 'none', overflow: 'hidden', fontFamily: 'inherit', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  if (featureText.trim() && featureText !== item.feature) {
                    handleFieldUpdate('feature', featureText.trim());
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                value={featureText}
                onChange={(e) => setFeatureText(e.target.value)}
                placeholder="Task name"
                rows={1}
              />
              {/* Inline "Link to task" button — sits right below the title, no separate row */}
              {!isLinkingSearchOpen && (
                <button
                  onClick={() => setIsLinkingSearchOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.675rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                    opacity: 0.65,
                    transition: 'opacity 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.65'}
                >
                  🔗 Link to a Task with different name
                </button>
              )}
              {isFocused && (similarTasks.length > 0 || isSearching) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--panel-bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--background-alt)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Similar Tasks Found ({similarTasks.length})</span>
                    {isSearching && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>Searching DB...</span>}
                  </div>
                  {isSearching && similarTasks.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <style>{`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                      <div className="spinner-loader" style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid var(--text-muted)',
                        borderTop: '2px solid var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      <span>Searching similar features...</span>
                    </div>
                  ) : (
                    similarTasks.map(t => {
                      const isAlreadyLinked = sessionInfo && t.notes && t.notes.includes(sessionInfo.fullTag);
                      return (
                        <div 
                          key={t.id}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border)',
                            transition: 'background-color 0.15s ease'
                          }}
                          className="similar-task-item"
                        >
                          <div 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setPreviewProductId(t.id);
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%', cursor: 'pointer' }}
                            title="Click to view task details"
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {t.feature}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Product: {t.product || '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {t.status && (
                              <span className={`badge badge-${t.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.65rem' }}>
                                {t.status}
                              </span>
                            )}
                            {sessionInfo && (
                              isAlreadyLinked ? (
                                <span style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  🔗 Linked
                                </span>
                              ) : (
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleLinkTask(t);
                                  }}
                                  className="btn btn-primary"
                                  style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                >
                                  🔗 Link Task
                                </button>
                              )
                            )}
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setPreviewProductId(t.id);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Inline Search & Link Widget — DB-backed with pagination */}
            {isLinkingSearchOpen && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px dashed var(--primary-light)', backgroundColor: 'var(--primary-glow)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>🔗 Search & Link Any Task</span>
                  <button
                    onClick={() => { setIsLinkingSearchOpen(false); setSearchQuery(''); setSearchPage(1); setSearchedTasks([]); setSearchTotal(0); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    className="premium-input"
                    style={{ width: '100%', padding: '6px 28px 6px 10px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                    placeholder="Search across all tasks in DB..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchPage(1); }}
                    autoFocus
                  />
                  {isSearchingLink && (
                    <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', border: '2px solid var(--border)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  )}
                  {searchQuery && !isSearchingLink && (
                    <button className="search-clear-btn" onClick={() => { setSearchQuery(''); setSearchPage(1); setSearchedTasks([]); setSearchTotal(0); }} title="Clear search" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                {searchQuery.trim().length >= 2 && (
                  <div style={{ marginTop: '6px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                    {isSearchingLink && searchedTasks.length === 0 ? (
                      <div style={{ padding: '16px 12px', fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center' }}>Searching…</div>
                    ) : searchedTasks.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>No tasks found matching "{searchQuery}"</div>
                    ) : (
                      <>
                        {searchedTasks.map(t => {
                          const isAlreadyLinked = sessionInfo && t.notes && t.notes.includes(sessionInfo.fullTag);
                          return (
                            <div key={t.id} style={{ padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '72%' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.feature}</span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  #{t.id} · {t.product || '—'}
                                  {t.status ? <span style={{ marginLeft: '6px', backgroundColor: 'var(--background-alt)', border: '1px solid var(--border-light)', borderRadius: '3px', padding: '0 4px', fontSize: '0.65rem', fontWeight: 600 }}>{t.status}</span> : null}
                                </span>
                              </div>
                              <div>
                                {isAlreadyLinked ? (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🔗 Linked</span>
                                ) : (
                                  <button onMouseDown={(e) => { e.preventDefault(); handleLinkTask(t); setIsLinkingSearchOpen(false); setSearchQuery(''); setSearchPage(1); setSearchedTasks([]); setSearchTotal(0); }} className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Link</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Pagination bar */}
                        {searchTotal > SEARCH_PAGE_SIZE && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background-alt)' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {((searchPage - 1) * SEARCH_PAGE_SIZE) + 1}–{Math.min(searchPage * SEARCH_PAGE_SIZE, searchTotal)} of {searchTotal}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                disabled={searchPage <= 1 || isSearchingLink}
                                onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: searchPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: searchPage <= 1 ? 'default' : 'pointer', fontWeight: 600, opacity: searchPage <= 1 ? 0.5 : 1 }}
                              >← Prev</button>
                              <button
                                disabled={searchPage * SEARCH_PAGE_SIZE >= searchTotal || isSearchingLink}
                                onClick={() => setSearchPage(p => p + 1)}
                                style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: searchPage * SEARCH_PAGE_SIZE >= searchTotal ? 'var(--text-muted)' : 'var(--text-primary)', cursor: searchPage * SEARCH_PAGE_SIZE >= searchTotal ? 'default' : 'pointer', fontWeight: 600, opacity: searchPage * SEARCH_PAGE_SIZE >= searchTotal ? 0.5 : 1 }}
                              >Next →</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* HORIZONTAL TIMELINE FOR MILESTONES */}
            <div className="premium-timeline-container" style={{ position: 'relative', zIndex: steps.some(s => s.isEditing) ? 50 : 20 }}>
              <h4 className="premium-timeline-title">Milestone Checkpoints</h4>
              <div className="premium-timeline-track-wrapper">
                <div className="premium-timeline-line-connector">
                  <div 
                    className="premium-timeline-progress-line" 
                    style={{ 
                      width: (() => {
                        const stepStates = [
                          true,
                          !!item.productDeadlineCompleted,
                          !!item.uiuxCompleted,
                          !!item.deadlineCompleted,
                          !!item.finalReleaseCompleted,
                          !!item.finalReleaseCompleted
                        ];
                        const completedCount = stepStates.filter(Boolean).length;
                        return `${((completedCount - 1) / (stepStates.length - 1)) * 100}%`;
                      })() 
                    }} 
                  />
                </div>
                <div className="premium-timeline-track">
                  {steps.map((step, idx) => (
                    <div key={idx} className={`premium-timeline-node ${step.classStr}`} style={{ position: 'relative', zIndex: step.isEditing ? 100 : 2 }}>
                      <div 
                        className="premium-timeline-circle"
                        onClick={() => step.setIsEditing(true)}
                        title={`Click to edit ${step.label}`}
                      >
                        {step.icon}
                      </div>
                      <div className="premium-timeline-content">
                        <span className="premium-timeline-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {step.label.replace(' Date', '')}
                          {step.historyField && (
                            <span 
                              title="View Change History" 
                              style={{ display: 'inline-flex', cursor: 'pointer', opacity: 0.6 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setHistoryField({ name: step.historyField!, label: step.historyLabel! });
                              }}
                            >
                              <History size={10} />
                            </span>
                          )}
                        </span>
                        
                        <span 
                          className="premium-timeline-date" 
                          onClick={() => step.setIsEditing(true)}
                        >
                          {step.label === 'Created' ? (item.createdAt ? formatDateToShortPattern(item.createdAt) : 'Set Date') : step.dateVal}
                        </span>

                        {step.isEditing && (
                          <CustomDatePicker
                            value={step.label === 'Created' ? (item.createdAt ? item.createdAt.substring(0, 10) : '') : (step.date || '')}
                            onChange={(date) => handleFieldUpdate(step.label === 'Created' ? 'createdAt' : step.historyField as any, date)}
                            onClose={() => step.setIsEditing(false)}
                            align={idx <= 1 ? 'left' : 'right'}
                          />
                        )}

                        <div className="premium-timeline-meta">
                          {step.completedKey && (
                            <input
                              type="checkbox"
                              className="premium-timeline-checkbox"
                              checked={step.completed}
                              onChange={(e) => {
                                if (step.label !== 'Commited Date') {
                                  handleFieldUpdate(step.completedKey as any, e.target.checked);
                                }
                              }}
                              disabled={step.label === 'Commited Date'}
                              style={step.label === 'Commited Date' ? { cursor: 'not-allowed', opacity: 0.8 } : undefined}
                              title={step.label === 'Commited Date' ? "Auto-checked when Release is completed" : `Mark ${step.label} as Completed`}
                            />
                          )}
                          {step.diffDays && (
                            <span className={`premium-timeline-diff-tag ${step.classStr === 'overdue' ? 'overdue' : ''}`} title={step.diffTitle}>
                              {step.diffDays}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2-COLUMN PROPERTIES GRID DASHBOARD */}
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', marginLeft: '6px' }}>
                        <a href={item.taskLink} target="_blank" rel="noreferrer" title="Open ClickUp Task" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
                        </a>
                        <button
                          onClick={handleCopyClickupLink}
                          title={copiedClickup ? "Copied!" : "Copy ClickUp Link"}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: 0,
                            color: copiedClickup ? '#10b981' : 'var(--text-muted)',
                            transition: 'color 0.15s ease'
                          }}
                        >
                          {copiedClickup ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
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
                      <span
                        className="premium-clickup-badge"
                        style={{ 
                          borderColor: getClickupStatusColor(item.clickupStatus), 
                          color: getClickupStatusColor(item.clickupStatus),
                          fontSize: '0.675rem',
                          padding: '3px 8px',
                          width: 'auto',
                          minWidth: '70px',
                          textAlign: 'center',
                          fontWeight: 700,
                          borderRadius: '6px',
                          backgroundColor: 'var(--background)',
                          border: '1px solid',
                          display: 'inline-block'
                        }}
                      >
                        {item.clickupStatus || 'None'}
                      </span>
                      {item.clickupSubtasksCount !== undefined && item.clickupSubtasksCount > 0 && (
                        <span 
                          onClick={() => setActiveSubtasksTaskLink(item.taskLink)}
                          style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '4px', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                          title="Click to view subtasks breakdown"
                        >
                          ({item.clickupSubtasksCount} subtasks)
                        </span>
                      )}
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

                {/* ClickUp Assignee */}
                {item.taskLink && (
                  <div className="property-row-flat">
                    <span className="premium-property-label">
                      <User size={13} /> ClickUp Assignee
                    </span>
                    <div className="premium-property-value">
                      {item.clickupAssignee ? (
                        <div className="cu-tooltip-container" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            borderBottom: '1px dashed var(--text-muted)',
                            cursor: 'help'
                          }}>
                            {formatClickupAssignee(item.clickupAssignee)}
                          </span>
                          <span className="cu-tooltip-text" style={{ left: 'auto', right: '105%', transform: 'translateY(-50%) translateX(4px)' }}>
                            {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PANEL 2: Governance & Ownership */}
              <div className="properties-panel">
                <h4 className="properties-panel-title">Governance & Ownership</h4>
                
                {/* Assignees */}
                <div className="property-row-flat">
                  <span className="premium-property-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} /> assignees
                    <span title="View Change History" style={{ display: 'inline-flex' }}>
                      <History 
                        size={12} 
                        style={{ cursor: 'pointer', opacity: 0.6 }} 
                        onClick={() => setHistoryField({ name: 'poc', label: 'POC Owner' })}
                      />
                    </span>
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
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                        {item.poc && !pocList.includes(item.poc) && (
                          <option value={item.poc}>{item.poc}</option>
                        )}
                      </select>
                    </div>
                    {item.poc && (
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          marginLeft: '6px', 
                          backgroundColor: 'var(--primary-glow)', 
                          border: '1px solid var(--primary-border)', 
                          borderRadius: '10px', 
                          padding: '2px 8px',
                          color: 'var(--primary)',
                          fontWeight: 700
                        }}
                        title="Total active tasks managed by this POC"
                      >
                        {pocActiveTaskCounts[item.poc] || 0} active
                      </span>
                    )}
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

            {/* Blocker Alert Banner */}
            {item.blocker && (
              <div style={{ backgroundColor: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.15)', borderLeft: '4px solid var(--danger)', borderRadius: '6px', padding: '0.4rem 0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem' }}>🛑</span>
                <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>
                  <strong style={{ color: 'var(--danger)' }}>Blocker active:</strong> {item.blocker}
                </p>
              </div>
            )}

            {/* Description card */}
            <div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>
                Description
              </p>
              <RichTextEditor
                value={item.description || ''}
                itemId={item.id}
                featureName={item.feature || ''}
                onChange={(newValue) => {
                  if (newValue !== item.description) {
                    handleFieldUpdate('description', newValue);
                  }
                }}
                placeholder="Enter feature description..."
                canEdit={canUserEdit}
              />
            </div>

            {isProject && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                <AttendeeFeedbackDetails itemId={realProjectId} category="student-projects" />
              </>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Pinned Chat / Discussion sidebar */}
        <div style={{ width: '380px', flexShrink: 0, height: '100%', minHeight: 0 }}>
          <div className="premium-discussion-sidebar">
            <div className="discussion-sidebar-header">
              <h4 className="discussion-sidebar-title">Discussion</h4>
              <span className="discussion-sidebar-count">
                {(() => {
                  const taskComments = comments.filter((c: any) => c.itemId === item.id);
                  return taskComments.length;
                })()}
              </span>
            </div>

            {/* Comments list */}
            <div className="discussion-messages-container">
              {(() => {
                const taskComments = comments.filter((c: any) => c.itemId === item.id);
                return taskComments.length === 0 ? (
                  <div style={{
                    padding: '1.5rem',
                    background: 'var(--background-alt)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-light)',
                    color: 'var(--text-muted)',
                    fontSize: '0.775rem',
                    textAlign: 'center',
                    margin: 'auto 0'
                  }}>
                    No comments yet on this task.
                  </div>
                ) : (
                  taskComments.map((comment: any) => (
                    <div key={comment.id} className="discussion-message-card">
                      <div className="discussion-message-header">
                        <span className="discussion-message-author">
                          {comment.authorName}
                        </span>
                        <span className="discussion-message-time">
                          {new Date(comment.createdAt).toLocaleDateString('default', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="discussion-message-content">
                        {comment.content}
                      </div>
                    </div>
                  ))
                );
              })()}
            </div>

            {/* Add comment textarea */}
            <div className="discussion-input-area">
              <textarea
                className="discussion-textarea"
                placeholder="Post a reply..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={2}
              />
              {commentError && (
                <span style={{ fontSize: '0.725rem', color: 'var(--danger, #ef4444)' }}>
                  {commentError}
                </span>
              )}
              <button
                onClick={handlePostComment}
                disabled={isPostingComment || !newCommentText.trim()}
                className="btn btn-primary discussion-submit-btn"
              >
                {isPostingComment ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {historyField && (
        <FieldHistoryModal 
          itemId={item.id}
          fieldName={historyField.name}
          fieldLabel={historyField.label}
          onClose={() => setHistoryField(null)}
        />
      )}
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPriority, filterStatuses, filterSuperPriorityOnly]);

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

  // Slice for pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const completedFinalCount = filtered.filter(item => !!item.finalReleaseCompleted).length;
  const totalFinalCount = filtered.length;


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
      productDeadline: '',
      committedDate: '',
      createdAt: new Date().toISOString()
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
        description: row[15] || '',
        createdAt: new Date().toISOString()
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
                <th onClick={() => handleSort('poc')} style={{ cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ cursor: 'pointer' }}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ cursor: 'pointer' }}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ cursor: 'pointer' }}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ cursor: 'pointer' }}>Final ({completedFinalCount}/{totalFinalCount}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => {
                    if (editingFeatureId !== item.id) {
                      setPreviewProductId(item.id);
                    }
                  }} 
                  className={`${deletingIds.has(item.id) ? 'row-deleting' : ''} ${item.blocker ? 'row-blocked' : ''}`}
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
                        {item.priority && (
                          <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                            {item.priority}
                          </span>
                        )}
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
                        {isTaskLinked(item.notes, item.id) && (
                          <span className="badge-linked" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)', fontWeight: 650 }}>
                            <Link size={10} /> Linked
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{item.product || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      {item.poc ? (
                          <span style={{ ...getPOCBadgeStyle(item.poc) }}>
                              {item.poc}
                          </span>
                      ) : '—'}
                      {item.clickupAssignee && (
                        <div className="cu-tooltip-container">
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            CU: {formatClickupAssignee(item.clickupAssignee)}
                          </span>
                          <span className="cu-tooltip-text">
                            {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                          </span>
                        </div>
                      )}
                    </div>
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
                        {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.createdAt} currentDate={item.productDeadline} />
                    {item.productDeadline ? (
                      <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                        {formatDateToUserPattern(item.productDeadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.productDeadline || item.createdAt} currentDate={item.uiux} />
                    {item.uiux ? (
                      <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                        {formatDateToUserPattern(item.uiux)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.uiux || item.productDeadline || item.createdAt} currentDate={item.deadline} />
                    {item.deadline ? (
                      <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                        {formatDateToUserPattern(item.deadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline || item.createdAt} currentDate={item.finalRelease} />
                    {item.finalRelease ? (
                      <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                        {formatDateToUserPattern(item.finalRelease)}
                      </span>
                    ) : item.finalReleaseCompleted ? (
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        Delivered
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

        {/* Pagination Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--panel-bg)',
          borderRadius: '0 0 12px 12px',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          userSelect: 'none',
          marginTop: '-1px'
        }}>
          <div>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-select"
                style={{
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  height: '26px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {[20, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--background-alt)'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              
              <span style={{ margin: '0 4px', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--background-alt)'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
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
          <h3 className="modal-title" style={{ fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", color: 'var(--primary)' }}>
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
                <option value="Release">Release</option>
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
                <option value="released">Released</option>
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
                  item.status === 'released' ? 'status-released' :
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
                    {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
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
    dailyIssues,
    openPreviewForFeature, canUserEdit, confirm, comments, lastOpenedMap,
    isLoadingSprint, fetchSprintData
  } = useDashboard();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
  });

  useEffect(() => {
    fetchSprintData(selectedMonth);
  }, [selectedMonth, fetchSprintData]);

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

  const currentIndex = allMonths.indexOf(selectedMonth);

  const handlePrevMonth = () => {
    if (currentIndex > 0) {
      setSelectedMonth(allMonths[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    if (currentIndex < allMonths.length - 1) {
      setSelectedMonth(allMonths[currentIndex + 1]);
    }
  };

  const handleToday = () => {
    const now = new Date();
    const todayMonthStr = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    setSelectedMonth(todayMonthStr);
  };

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
    source: 'Priority Requests' | 'Student Projects' | 'Content Pipeline' | 'AMA & Meetings' | 'Admin Calls' | 'Tarun Sir Meetings' | 'Product Breakdown' | 'Feature Requests';
    column: 'product' | 'design' | 'dev' | 'release';
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
      if (dateInSelectedMonth(item.finalRelease)) {
        autoItems.push({
          id: `auto-prod-release-${item.id}`,
          title: item.feature,
          source: itemSource,
          column: 'release',
          priority: item.priority,
          poc: item.poc,
          status: item.status,
          date: item.finalRelease,
          dateLabel: 'Release',
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

    // Feature Requests (from dailyIssues)
    dailyIssues.forEach(item => {
      if (item.type !== 'Feature Gap' && item.type !== 'Enhancement') return;
      if (item.status === 'Completed') return;
      
      const itemSource = 'Feature Requests';
      if (dateInSelectedMonth(item.productDeadline)) {
        autoItems.push({
          id: `auto-req-specs-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'product',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.productDeadline!,
          dateLabel: 'Specs',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.uiux)) {
        autoItems.push({
          id: `auto-req-uiux-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'design',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.uiux!,
          dateLabel: 'UI/UX',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.deadline)) {
        autoItems.push({
          id: `auto-req-dev-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'dev',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.deadline!,
          dateLabel: 'Dev',
          rawItem: item
        });
      }
      if (dateInSelectedMonth(item.finalRelease)) {
        autoItems.push({
          id: `auto-req-release-${item.id}`,
          title: item.module || `Request #${item.id}`,
          source: itemSource,
          column: 'release',
          priority: item.priority,
          poc: item.poc || item.contact || '',
          status: item.status,
          date: item.finalRelease!,
          dateLabel: 'Release',
          rawItem: item
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
      dev: 'development',
      release: 'released'
    };
    if (statusMap[targetColId]) updatePlanItem(itemId, { status: statusMap[targetColId] as any });
  };

  const COLUMNS = [
    { id: 'product', title: 'Product Specs', statuses: ['open'], headerClass: 'product', icon: <Inbox size={14} style={{ color: 'var(--text-muted)' }} /> },
    { id: 'design', title: 'UI/UX Design', statuses: ['in design'], headerClass: 'design', icon: <Palette size={14} style={{ color: 'var(--primary)' }} /> },
    { id: 'dev', title: 'Development', statuses: ['development', 'testing', 'tested'], headerClass: 'dev', icon: <Code size={14} style={{ color: 'var(--info)' }} /> },
    { id: 'release', title: 'Release', statuses: ['released', 'closed', 'Done'], headerClass: 'release', icon: <Rocket size={14} style={{ color: 'hsl(142,65%,38%)' }} /> }
  ];

  // Source badge colour map
  const sourceColors: Record<string, { bg: string; color: string }> = {
    'Priority Requests': { bg: 'hsla(245,80%,60%,0.12)', color: 'hsl(245,70%,50%)' },
    'Student Projects':  { bg: 'hsla(199,80%,50%,0.12)', color: 'hsl(199,80%,38%)' },
    'Content Pipeline':  { bg: 'hsla(38,90%,50%,0.12)',  color: 'hsl(38,85%,38%)' },
    'AMA & Meetings':    { bg: 'hsla(142,70%,45%,0.12)', color: 'hsl(142,65%,32%)' },
    'Student Meetings':  { bg: 'hsla(142,70%,45%,0.12)', color: 'hsl(142,65%,32%)' },
    'Admin Calls':       { bg: 'hsla(342,80%,55%,0.12)', color: 'hsl(342,70%,45%)' },
    'Admin Meetings':    { bg: 'hsla(342,80%,55%,0.12)', color: 'hsl(342,70%,45%)' },
    'Product Breakdown': { bg: 'hsla(271,80%,60%,0.12)', color: 'hsl(271,70%,50%)' },
    'Feature Requests':  { bg: 'hsla(325,80%,60%,0.12)', color: 'hsl(325,70%,50%)' },
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
            <div className="calendar-nav-buttons" style={{ height: '32px' }}>
              <button 
                type="button"
                className="calendar-nav-btn" 
                onClick={handlePrevMonth} 
                disabled={currentIndex <= 0}
                style={{ height: '100%', minWidth: '30px', opacity: currentIndex <= 0 ? 0.5 : 1, cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer' }}
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>
              <button 
                type="button"
                className="calendar-nav-btn" 
                onClick={handleToday}
                style={{ height: '100%', minWidth: '120px', textAlign: 'center' }}
                title="Jump to Current Month"
              >
                {selectedMonth}
              </button>
              <button 
                type="button"
                className="calendar-nav-btn" 
                onClick={handleNextMonth} 
                disabled={currentIndex >= allMonths.length - 1}
                style={{ height: '100%', minWidth: '30px', opacity: currentIndex >= allMonths.length - 1 ? 0.5 : 1, cursor: currentIndex >= allMonths.length - 1 ? 'not-allowed' : 'pointer' }}
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
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

        {isLoadingSprint ? (
          <div className="kanban-board-container animate-pulse" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', height: '100%', minHeight: '500px' }}>
            {[1, 2, 3, 4].map(col => (
              <div key={col} style={{
                backgroundColor: 'var(--background-alt)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ width: '50%', height: '18px', backgroundColor: 'var(--border-light)', borderRadius: '4px' }} />
                {[1, 2, 3].map(row => (
                  <div key={row} style={{
                    backgroundColor: 'var(--panel-bg)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    height: '80px'
                  }}>
                    <div style={{ width: '85%', height: '14px', backgroundColor: 'var(--border-light)', borderRadius: '3px' }} />
                    <div style={{ width: '40%', height: '10px', backgroundColor: 'var(--border-light)', borderRadius: '3px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--border-light)' }} />
                      <div style={{ width: '40px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--border-light)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="kanban-board-container">
            {COLUMNS.map(col => {
            const getAutoItemCompleted = (a: any) => {
              const isFeatureRequest = a.rawItem && (a.rawItem.type === 'Feature Gap' || a.rawItem.type === 'Enhancement');
              
              if (isFeatureRequest) {
                const isOverallCompleted = a.rawItem.status === 'Completed';
                if (a.column === 'product') {
                  return !!a.rawItem.productDeadlineCompleted || isOverallCompleted;
                } else if (a.column === 'design') {
                  return !!a.rawItem.uiuxCompleted || isOverallCompleted;
                } else if (a.column === 'dev') {
                  return !!a.rawItem.deadlineCompleted || isOverallCompleted;
                } else if (a.column === 'release') {
                  return !!a.rawItem.finalReleaseCompleted || isOverallCompleted;
                }
                return false;
              }

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
              } else if (a.column === 'release') {
                const isReleased = matchedProduct
                  ? (!!matchedProduct.finalReleaseCompleted || matchedProduct.status === 'Completed')
                  : false;
                return isReleased || a.status === 'Completed' || a.status === 'Delivered';
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
            const completedCount = combinedItems.filter(item => item.isCompleted).length;

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
                  <span className="kanban-card-count">{completedCount}/{totalCount}</span>
                </div>

                <div className="kanban-column-body">
                  {combinedItems.map(item => {
                    if (item.type === 'auto') {
                      const a = item.data;
                      const clr = sourceColors[a.source] || { bg: 'var(--panel-bg)', color: 'var(--text-secondary)' };
                      const isCompleted = item.isCompleted;
                      const isFeatureRequest = a.rawItem && (a.rawItem.type === 'Feature Gap' || a.rawItem.type === 'Enhancement');
                      const matchedProduct = isFeatureRequest ? null : findMatchingProductItem(a.title);

                      const baseId = a.rawItem?.id || matchedProduct?.id;
                      let unreadCount = 0;
                      if (baseId) {
                        const itemComments = comments.filter((c: any) => c.itemId === baseId);
                        const lastOpened = lastOpenedMap[baseId];
                        unreadCount = itemComments.filter((c: any) => {
                          if (!lastOpened) return true;
                          return new Date(c.createdAt).getTime() > lastOpened;
                        }).length;
                      }

                      return (
                        <div
                          key={a.id}
                          className={`kanban-card ${isCompleted ? 'completed-card' : ''}`}
                          style={{
                            borderLeft: isCompleted ? undefined : `3px solid ${clr.color}`,
                            cursor: 'pointer',
                            opacity: 1
                          }}
                          onClick={() => {
                            if (a.rawItem) {
                              openPreviewForFeature(a.title || a.rawItem.feature || a.rawItem.module, {
                                ...a.rawItem,
                                status: (a.status || a.rawItem.status) as any,
                                priority: (a.priority || a.rawItem.priority) as any,
                                poc: a.poc || a.rawItem.poc,
                              });
                            } else {
                              openPreviewForFeature(a.title, {
                                status: a.status as any,
                                priority: a.priority as any,
                                poc: a.poc,
                              });
                            }
                          }}
                        >
                          <div className="kanban-card-title" style={{ fontSize: '0.8rem', lineHeight: 1.35, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span>{a.title}</span>
                            {unreadCount > 0 && (
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger, #ef4444)',
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  padding: '1.5px 5px',
                                  borderRadius: '6px',
                                  lineHeight: 1,
                                  flexShrink: 0
                                }}
                                title={`${unreadCount} unread comments`}
                              >
                                <MessageSquare size={9} fill="var(--danger, #ef4444)" />
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="kanban-card-footer" style={{ marginTop: '0.5rem' }}>
                            <div className="kanban-card-tags" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
                              {/* Source badge */}
                              <span style={{
                                background: clr.bg, color: clr.color,
                                border: `1px solid ${clr.color}44`,
                                borderRadius: '10px', padding: '1px 6px',
                                fontSize: '0.65rem', fontWeight: 700
                              }}>{a.source === 'AMA & Meetings' ? 'Student Meetings' : a.source === 'Admin Calls' ? 'Admin Meetings' : a.source}</span>

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
                      const matchedProduct = findMatchingProductItem(manualItem.task);
                      const baseId = matchedProduct?.id;
                      let unreadCount = 0;
                      if (baseId) {
                        const itemComments = comments.filter((c: any) => c.itemId === baseId);
                        const lastOpened = lastOpenedMap[baseId];
                        unreadCount = itemComments.filter((c: any) => {
                          if (!lastOpened) return true;
                          return new Date(c.createdAt).getTime() > lastOpened;
                        }).length;
                      }

                      return (
                        <div
                          key={manualItem.id}
                          className={`kanban-card ${isCompleted ? 'completed-card' : ''}`}
                          draggable={canUserEdit}
                          onDragStart={(e) => handleDragStart(e, manualItem.id)}
                          onClick={() => openPreviewForFeature(manualItem.task, { status: manualItem.status as any, clickupStatus: manualItem.status, taskLink: manualItem.link })}
                        >
                          <div className="kanban-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span>{manualItem.task}</span>
                            {unreadCount > 0 && (
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger, #ef4444)',
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  padding: '1.5px 5px',
                                  borderRadius: '6px',
                                  lineHeight: 1,
                                  flexShrink: 0
                                }}
                                title={`${unreadCount} unread comments`}
                              >
                                <MessageSquare size={9} fill="var(--danger, #ef4444)" />
                                {unreadCount}
                              </span>
                            )}
                          </div>

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
        )}
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
        {p.clickupStatus}{p.clickupSubtasksCount ? ` (${p.clickupSubtasksCount})` : ""}
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
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '120px' }}>Rating</th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                  Release Date ({(() => {
                    const comp = filtered.filter(p => {
                      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const matchedProduct = productItems.find(item => clean(item.feature) === clean(p.title));
                      return isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted;
                    }).length;
                    return `${comp}/${filtered.length}`;
                  })()}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
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
                    className={p.blocker ? 'row-blocked' : ''}
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
                        {p.priority && (
                          <span className={`badge badge-${p.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                            {p.priority}
                          </span>
                        )}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      {p.poc ? (
                          <span style={{ ...getPOCBadgeStyle(p.poc) }}>
                              {p.poc}
                          </span>
                      ) : '—'}
                      {p.clickupAssignee && (
                        <div className="cu-tooltip-container">
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            CU: {formatClickupAssignee(p.clickupAssignee)}
                          </span>
                          <span className="cu-tooltip-text">
                            {p.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                          </span>
                        </div>
                      )}
                    </div>
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
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.createdAt} currentDate={p.productDeadline} />
                    {p.productDeadline ? (
                      <span style={getDateSpanStyle(p.productDeadline, isCompletedStatus(p.status) || !!matchedProduct?.productDeadlineCompleted)}>
                        {formatDateToUserPattern(p.productDeadline)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.productDeadline || p.createdAt} currentDate={p.uiux} />
                    {p.uiux ? (
                      <span style={getDateSpanStyle(p.uiux, isCompletedStatus(p.status) || !!matchedProduct?.uiuxCompleted)}>
                        {formatDateToUserPattern(p.uiux)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.uiux || p.productDeadline || p.createdAt} currentDate={p.deadline || p.completeInfoDate} />
                    {(p.deadline || p.completeInfoDate) ? (
                      <span style={getDateSpanStyle(p.deadline || p.completeInfoDate, isCompletedStatus(p.status) || !!matchedProduct?.deadlineCompleted)}>
                        {formatDateToUserPattern(p.deadline || p.completeInfoDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                    <DateDiffBadge prevDate={p.deadline || p.completeInfoDate || p.uiux || p.productDeadline || p.createdAt} currentDate={p.finalRelease} />
                    {p.finalRelease ? (
                      <span style={getDateSpanStyle(p.finalRelease, isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted)}>
                        {formatDateToUserPattern(p.finalRelease)}
                      </span>
                    ) : (isCompletedStatus(p.status) || !!matchedProduct?.finalReleaseCompleted) ? (
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        Delivered
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
          <h3 className="modal-title" style={{ fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", color: 'var(--primary)' }}>
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
    speakers: configSpeakers, statuses, currentUser, confirm,
    programs, fetchPaginatedMeetingsData,
    meetingSearchQuery, setMeetingSearchQuery,
    highlightedCallId, setHighlightedCallId,
    feedbackSubmissions, formConfigs
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
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setFilterStatuses([]);
    setFilterPrograms([]);
    setFilterPocs([]);
    setCurrentPage(1);
  }, [subTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSuperPriorityOnly, filterStatuses, filterPrograms, filterPocs]);

  // Sorting states
  const [amaSortField, setAmaSortField] = useState<keyof AMASession | null>('date');
  const [amaSortAsc, setAmaSortAsc] = useState(false);

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

  const [paginatedAMASessions, setPaginatedAMASessions] = useState<AMASession[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (meetingSearchQuery) {
      setSearchQuery(meetingSearchQuery);
      setMeetingSearchQuery('');
    }
  }, [meetingSearchQuery, setMeetingSearchQuery]);

  useEffect(() => {
    if (highlightedCallId && paginatedAMASessions.length > 0) {
      const hasItem = paginatedAMASessions.some(ama => ama.id === highlightedCallId);
      if (hasItem) {
        setExpandedAMAId(highlightedCallId);
        setHighlightedCallId(null);
        setTimeout(() => {
          const el = document.getElementById(`call-row-${highlightedCallId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => {
              el.classList.remove('highlight-pulse');
            }, 3000);
          }
        }, 150);
      }
    }
  }, [highlightedCallId, paginatedAMASessions, setHighlightedCallId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'amaSessions',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: amaSortField || undefined,
        sortAsc: amaSortAsc
      });
      if (active) {
        if (res.success) {
          setPaginatedAMASessions(res.data);
          setTotalItems(res.totalItems);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    amaSortField,
    amaSortAsc,
    amaSessions,
    fetchPaginatedMeetingsData
  ]);

  const [paginatedFeedbackFeatures, setPaginatedFeedbackFeatures] = useState<ProductItem[]>([]);
  const [feedbackTotalItems, setFeedbackTotalItems] = useState(0);
  const [feedbackCompletedItems, setFeedbackCompletedItems] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (subTab === 'feedback') {
        setIsFetchingFeedback(true);
      }
      const res = await fetchPaginatedMeetingsData({
        type: 'amaFeedback',
        page: subTab === 'feedback' ? currentPage : 1,
        limit: subTab === 'feedback' ? pageSize : 1,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: feedbackSortField || undefined,
        sortAsc: feedbackSortAsc
      });
      if (active) {
        if (res.success) {
          if (subTab === 'feedback') {
            setPaginatedFeedbackFeatures(res.data);
            setFeedbackTotalPages(res.totalPages);
          }
          setFeedbackTotalItems(res.totalItems);
          setFeedbackCompletedItems(res.completedItems || 0);
        }
        if (subTab === 'feedback') {
          setIsFetchingFeedback(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    subTab,
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    feedbackSortField,
    feedbackSortAsc,
    productItems,
    fetchPaginatedMeetingsData
  ]);

  const feedbackActivePage = Math.min(currentPage, feedbackTotalPages);
  const feedbackStartIndex = feedbackTotalItems === 0 ? 0 : (feedbackActivePage - 1) * pageSize;
  const feedbackEndIndex = Math.min(feedbackStartIndex + pageSize, feedbackTotalItems);

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
        title="Student Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add AMA' : undefined}
        onExportFeedbackCSV={() => {
          exportAttendeeFeedbackToExcel('ama-meetings', feedbackSubmissions, formConfigs, [], amaSessions);
        }}
        searchPlaceholder={subTab === 'schedule' ? 'Search AMA sessions...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <MultiSelectDropdown
              options={programs.map(p => p.name)}
              selectedValues={filterPrograms}
              onChange={setFilterPrograms}
              placeholder="Program"
            />
            <MultiSelectDropdown
              options={speakersList}
              selectedValues={filterPocs}
              onChange={setFilterPocs}
              placeholder="Feature POC"
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
            Feedback {feedbackTotalItems > 0 ? `(${feedbackCompletedItems}/${feedbackTotalItems})` : ''}
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
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
                {isFetching ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '90%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '120px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '50px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedAMASessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No AMA sessions found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedAMASessions.map(ama => {
                  const related = getRelatedFeatures(ama);
                  const isExpanded = expandedAMAId === ama.id;
                  return (
                    <React.Fragment key={ama.id}>
                      <tr 
                        id={`call-row-${ama.id}`}
                        onClick={() => setExpandedAMAId(isExpanded ? null : ama.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : (ama.pinned ? 'var(--primary-glow)' : 'transparent'),
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
                            {ama.pinned && (
                              <Pin size={12} style={{ marginRight: '6px', color: 'var(--primary)', fill: 'var(--primary)', flexShrink: 0 }} />
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
                              <span>{formatDateToUserPattern(ama.date)}</span>
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

                                {related.length > 0 && (() => {
                                  const doneCount = related.filter(feat => feat.finalReleaseCompleted || isCompletedStatus(feat.status)).length;
                                  const clickupCount = related.filter(feat => !!feat.taskLink).length;
                                  const isAllDone = doneCount === related.length;
                                  const isAllClickup = clickupCount === related.length;
                                  return (
                                    <>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--primary-glow)', 
                                        color: isAllDone ? '#10b981' : 'var(--primary)', 
                                        border: isAllDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--primary-border)',
                                        fontWeight: 500
                                      }}>
                                        {doneCount}/{related.length} {related.length === 1 ? 'feature' : 'features'}
                                      </span>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllClickup ? 'rgba(16, 185, 129, 0.08)' : 'rgba(123, 97, 255, 0.08)', 
                                        color: isAllClickup ? '#10b981' : '#7b61ff', 
                                        border: isAllClickup ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(123, 97, 255, 0.25)',
                                        fontWeight: 500
                                      }}>
                                        {clickupCount}/{related.length} on ClickUp
                                      </span>
                                    </>
                                  );
                                })()}
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
                              onClick={() => {
                                updateAMASession(ama.id, { pinned: !ama.pinned });
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: ama.pinned ? 'var(--primary)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              title={ama.pinned ? "Unpin Session" : "Pin Session"}
                            >
                              <Pin 
                                size={12} 
                                style={{ 
                                  transform: ama.pinned ? 'rotate(0deg)' : 'rotate(45deg)',
                                  fill: ama.pinned ? 'var(--primary)' : 'none',
                                  transition: 'transform 0.2s/fill 0.2s ease'
                                }} 
                              />
                            </button>
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
                                      productDeadline: '',
                                      createdAt: new Date().toISOString()
                                    };
                                    addProductItem(newItem);
                                    setInlineRelatedFeatureValue('');
                                    setTimeout(() => {
                                      setPreviewProductId(newItem.id);
                                    }, 50);
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
                                        <th style={{ width: '120px' }}>Status</th>
                                        <th style={{ width: '120px' }}>POC</th>
                                        <th style={{ width: '100px' }}>ClickUp</th>
                                        <th style={{ width: '120px' }}>Specs Date</th>
                                        <th style={{ width: '120px' }}>UI/UX Date</th>
                                        <th style={{ width: '120px' }}>Dev Date</th>
                                        <th style={{ width: '120px' }}>Release Date ({related.filter(feat => !!feat.finalReleaseCompleted).length}/{related.length})</th>
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
                                                {feat.priority && (
                                                  <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                                    {feat.priority}
                                                  </span>
                                                )}
                                                {feat.raisedByTarunSir && (
                                                  <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                    <Sparkles size={8} /> Super Priority
                                                  </span>
                                                )}
                                                {isTaskLinked(feat.notes, feat.id) && (
                                                  <span className="badge-linked" style={{ padding: '2px 6px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 650 }}>
                                                    <Link size={8} /> Linked
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                              {feat.poc ? (
                                                  <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                                      {feat.poc}
                                                  </span>
                                              ) : '—'}
                                              {feat.clickupAssignee && (
                                                <div className="cu-tooltip-container">
                                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                                    CU: {formatClickupAssignee(feat.clickupAssignee)}
                                                  </span>
                                                  <span className="cu-tooltip-text">
                                                    {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          <td>
                                            {feat.clickupStatus ? (
                                              <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                                            {feat.productDeadline ? (
                                              <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                {formatDateToUserPattern(feat.productDeadline)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                                            {feat.uiux ? (
                                              <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                {formatDateToUserPattern(feat.uiux)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                                            {feat.deadline ? (
                                              <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                {formatDateToUserPattern(feat.deadline)}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                            <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                                            {feat.finalRelease ? (
                                              <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                {formatDateToUserPattern(feat.finalRelease)}
                                              </span>
                                            ) : feat.finalReleaseCompleted ? (
                                              <span style={{
                                                fontSize: '0.68rem',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: 700,
                                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                color: '#10b981',
                                                display: 'inline-block',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                Delivered
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
                                        productDeadline: '',
                                        createdAt: new Date().toISOString()
                                      };
                                      addProductItem(newItem);
                                      setInlineRelatedFeatureValue('');
                                      setTimeout(() => {
                                        setPreviewProductId(newItem.id);
                                      }, 50);
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls */}
            {(() => {
              const activePage = Math.min(currentPage, totalPages);
              const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
              const endIndex = Math.min(startIndex + pageSize, totalItems);
              return totalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--panel-bg)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startIndex + 1}</span> to{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> meetings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={activePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === 1 ? 0.5 : 1, cursor: activePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {activePage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === totalPages ? 0.5 : 1, cursor: activePage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            );
            })()}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '250px', minWidth: '250px', maxWidth: '250px', cursor: 'pointer' }}>Feature {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaDate')} style={{ width: '180px', cursor: 'pointer' }}>Date-time {feedbackSortField === 'amaDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaProgram')} style={{ width: '100px', cursor: 'pointer' }}>Program {feedbackSortField === 'amaProgram' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaCohort')} style={{ width: '120px', cursor: 'pointer' }}>Cohort {feedbackSortField === 'amaCohort' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('amaSpeaker')} style={{ width: '160px', cursor: 'pointer' }}>Speaker {feedbackSortField === 'amaSpeaker' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                    Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetchingFeedback ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedFeedbackFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No feedback features found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbackFeatures.map(feat => {
                  const parentAma = getParentAma(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      className={feat.blocker ? 'row-blocked' : ''}
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
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {feat.priority && (
                                  <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                    {feat.priority}
                                  </span>
                                )}
                                {feat.raisedByTarunSir && (
                                  <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <Sparkles size={10} /> Super Priority
                                  </span>
                                )}
                              </div>
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
                            formatDateToUserPattern(parentAma.date)
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {feat.poc ? (
                              <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                  {feat.poc}
                              </span>
                          ) : '—'}
                          {feat.clickupAssignee && (
                            <div className="cu-tooltip-container">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                CU: {formatClickupAssignee(feat.clickupAssignee)}
                              </span>
                              <span className="cu-tooltip-text">
                                {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                              </span>
                            </div>
                          )}
                        </div>
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
                            {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                          </span>
                        ) : '—'}
                      </td>
                       <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                          <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                            {formatDateToUserPattern(feat.finalRelease)}
                          </span>
                        ) : feat.finalReleaseCompleted ? (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            Delivered
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls for Feedback */}
            {feedbackTotalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--panel-bg)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {feedbackStartIndex + 1} to {feedbackEndIndex} of {feedbackTotalItems} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={feedbackActivePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === 1 ? 0.5 : 1, cursor: feedbackActivePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {feedbackActivePage} of {feedbackTotalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, feedbackTotalPages))}
                      disabled={feedbackActivePage === feedbackTotalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === feedbackTotalPages ? 0.5 : 1, cursor: feedbackActivePage === feedbackTotalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
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
    speakers: configSpeakers, statuses, currentUser, confirm,
    programs, fetchPaginatedMeetingsData,
    meetingSearchQuery, setMeetingSearchQuery,
    highlightedCallId, setHighlightedCallId,
    feedbackSubmissions, formConfigs
  } = useDashboard();
  
  const speakersList = configSpeakers.map(s => s.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAiMeeting, setSelectedAiMeeting] = useState<{
    id: string;
    text: string;
    title: string;
    type: 'ama' | 'call' | 'tarun';
  } | null>(null);
  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<'admin-calls' | 'ama-meetings' | 'student-projects' | null>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setFilterStatuses([]);
    setFilterPrograms([]);
    setFilterPocs([]);
    setCurrentPage(1);
  }, [subTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSuperPriorityOnly, filterStatuses, filterPrograms, filterPocs]);

  // Sorting states
  const [callSortField, setCallSortField] = useState<keyof AdminCall | null>('date');
  const [callSortAsc, setCallSortAsc] = useState(false);

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

  const [editingCallPocId, setEditingCallPocId] = useState<string | null>(null);
  const [inlineCallPocValue, setInlineCallPocValue] = useState('');

  const [editingCallProgramId, setEditingCallProgramId] = useState<string | null>(null);
  const [inlineCallProgramsValue, setInlineCallProgramsValue] = useState<string[]>([]);

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

  const [paginatedCalls, setPaginatedCalls] = useState<AdminCall[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (meetingSearchQuery) {
      setSearchQuery(meetingSearchQuery);
      setMeetingSearchQuery('');
    }
  }, [meetingSearchQuery, setMeetingSearchQuery]);

  useEffect(() => {
    if (highlightedCallId && paginatedCalls.length > 0) {
      const hasItem = paginatedCalls.some(call => call.id === highlightedCallId);
      if (hasItem) {
        setExpandedCallId(highlightedCallId);
        setHighlightedCallId(null);
        setTimeout(() => {
          const el = document.getElementById(`call-row-${highlightedCallId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => {
              el.classList.remove('highlight-pulse');
            }, 3000);
          }
        }, 150);
      }
    }
  }, [highlightedCallId, paginatedCalls, setHighlightedCallId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'adminCalls',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: callSortField || undefined,
        sortAsc: callSortAsc
      });
      if (active) {
        if (res.success) {
          setPaginatedCalls(res.data);
          setTotalItems(res.totalItems);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    callSortField,
    callSortAsc,
    adminCalls,
    fetchPaginatedMeetingsData
  ]);

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const handleAddNew = () => {
    setSearchQuery('');
    const newCall: AdminCall = {
      id: `adm-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      adminPoc: currentUser?.name || (speakersList.length > 0 ? speakersList[0] : 'Akash Sharma'),
      cohortTopic: 'New Admin Call',
      discussion: '',
      actions: '',
      status: 'Scheduled',
      program: ''
    };
    addAdminCall(newCall);
    setInlineCallTopicValue('New Admin Call');
    setEditingCallTopicId(newCall.id);
    setExpandedCallId(newCall.id);
  };

  const [paginatedFeedbackFeatures, setPaginatedFeedbackFeatures] = useState<ProductItem[]>([]);
  const [feedbackTotalItems, setFeedbackTotalItems] = useState(0);
  const [feedbackCompletedItems, setFeedbackCompletedItems] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (subTab === 'feedback') {
        setIsFetchingFeedback(true);
      }
      const res = await fetchPaginatedMeetingsData({
        type: 'adminFeedback',
        page: subTab === 'feedback' ? currentPage : 1,
        limit: subTab === 'feedback' ? pageSize : 1,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: feedbackSortField || undefined,
        sortAsc: feedbackSortAsc
      });
      if (active) {
        if (res.success) {
          if (subTab === 'feedback') {
            setPaginatedFeedbackFeatures(res.data);
            setFeedbackTotalPages(res.totalPages);
          }
          setFeedbackTotalItems(res.totalItems);
          setFeedbackCompletedItems(res.completedItems || 0);
        }
        if (subTab === 'feedback') {
          setIsFetchingFeedback(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    subTab,
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    feedbackSortField,
    feedbackSortAsc,
    productItems,
    fetchPaginatedMeetingsData
  ]);

  const feedbackActivePage = Math.min(currentPage, feedbackTotalPages);
  const feedbackStartIndex = feedbackTotalItems === 0 ? 0 : (feedbackActivePage - 1) * pageSize;
  const feedbackEndIndex = Math.min(feedbackStartIndex + pageSize, feedbackTotalItems);

  return (
    <>
      <TabContainer
        title="Admin Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add Call' : undefined}
        onExportFeedbackCSV={() => {
          exportAttendeeFeedbackToExcel('admin-calls', feedbackSubmissions, formConfigs, adminCalls);
        }}
        onExportCSV={() => {
          if (subTab === 'schedule') {
            const headers = ['ID', 'Date', 'Admin POC', 'Program', 'Cohort / Topic', 'Status', 'Discussion', 'Actions'];
            const rows = adminCalls.map(c => [c.id, c.date, c.adminPoc, c.program || '', c.cohortTopic, c.status, c.discussion, c.actions]);
            downloadCSV(`Admin_Calls_Schedule_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
          } else {
            const headers = ['ID', 'Feature', 'POC', 'Status', 'Clickup Status', 'Priority', 'Blocker', 'Notes', 'Deadline'];
            const rows = productItems.map(p => [p.id, p.feature, p.poc || '', p.status, p.clickupStatus || '', p.priority || '', p.blocker || '', p.notes || '', p.deadline || '']);
            downloadCSV(`Admin_Calls_Feedback_Requests_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
          }
        }}
        searchPlaceholder={subTab === 'schedule' ? 'Search admin calls...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <MultiSelectDropdown
              options={programs.map(p => p.name)}
              selectedValues={filterPrograms}
              onChange={setFilterPrograms}
              placeholder="Program"
            />
            <MultiSelectDropdown
              options={speakersList}
              selectedValues={filterPocs}
              onChange={setFilterPocs}
              placeholder="Feature POC"
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
            Feedback {feedbackTotalItems > 0 ? `(${feedbackCompletedItems}/${feedbackTotalItems})` : ''}
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleCallSort('date')} style={{ width: '150px', cursor: 'pointer' }}>Call Date {callSortField === 'date' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('adminPoc')} style={{ width: '200px', cursor: 'pointer' }}>Admin / POC {callSortField === 'adminPoc' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('program')} style={{ width: '120px', cursor: 'pointer' }}>Program {callSortField === 'program' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('cohortTopic')} style={{ cursor: 'pointer' }}>Topic / Call Agenda {callSortField === 'cohortTopic' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleCallSort('status')} style={{ width: '150px', cursor: 'pointer' }}>Status {callSortField === 'status' ? (callSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '120px' }}>Rating</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '120px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '90%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '50px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No admin calls found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedCalls.map(call => {
                  const related = getRelatedFeatures(call);
                  const isExpanded = expandedCallId === call.id;
                  
                  return (
                    <React.Fragment key={call.id}>
                      <tr 
                        id={`call-row-${call.id}`}
                        onClick={() => setExpandedCallId(isExpanded ? null : call.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : (call.pinned ? 'var(--primary-glow)' : 'transparent'),
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCallDateId(call.id);
                          }}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          title="Click to edit Date"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {call.pinned && (
                              <Pin size={12} style={{ marginRight: '6px', color: 'var(--primary)', fill: 'var(--primary)', flexShrink: 0 }} />
                            )}
                            <span style={{ borderBottom: '1px dashed var(--text-muted)' }}>
                              {call.date ? formatDateToShortPattern(call.date) : 'Set Date'}
                            </span>
                            {editingCallDateId === call.id && (
                              <CustomDatePicker
                                value={call.date || ''}
                                onChange={(date) => updateAdminCall(call.id, { date })}
                                onClose={() => setEditingCallDateId(null)}
                              />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCallProgramId(call.id);
                            const selected = call.program ? call.program.split(',').map(s => s.trim()).filter(Boolean) : [];
                            setInlineCallProgramsValue(selected);
                          }}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          title="Click to edit Program"
                        >
                          {editingCallProgramId === call.id && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCallProgramId(null);
                              }}
                              style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 99,
                                background: 'transparent'
                              }}
                            />
                          )}
                          {editingCallProgramId === call.id ? (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 100,
                                backgroundColor: 'var(--panel-bg)',
                                border: '1.5px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px',
                                boxShadow: 'var(--shadow-lg)',
                                minWidth: '160px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              {programs.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px' }}>No programs configured</span>
                              ) : (
                                programs.map(p => {
                                  const isChecked = inlineCallProgramsValue.includes(p.name);
                                  return (
                                    <label 
                                      key={p.id} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        userSelect: 'none',
                                        color: 'var(--text-primary)'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let next;
                                          if (e.target.checked) {
                                            next = [...inlineCallProgramsValue, p.name];
                                          } else {
                                            next = inlineCallProgramsValue.filter(x => x !== p.name);
                                          }
                                          setInlineCallProgramsValue(next);
                                          updateAdminCall(call.id, { program: next.join(', ') });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <span>{p.name}</span>
                                    </label>
                                  );
                                })
                              )}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCallProgramId(null);
                                  }}
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{call.program || '—'}</span>
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

                                {related.length > 0 && (() => {
                                  const doneCount = related.filter(feat => feat.finalReleaseCompleted || isCompletedStatus(feat.status)).length;
                                  const clickupCount = related.filter(feat => !!feat.taskLink).length;
                                  const isAllDone = doneCount === related.length;
                                  const isAllClickup = clickupCount === related.length;
                                  return (
                                    <>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--primary-glow)', 
                                        color: isAllDone ? '#10b981' : 'var(--primary)', 
                                        border: isAllDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--primary-border)',
                                        fontWeight: 500
                                      }}>
                                        {doneCount}/{related.length} {related.length === 1 ? 'feature' : 'features'}
                                      </span>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllClickup ? 'rgba(16, 185, 129, 0.08)' : 'rgba(123, 97, 255, 0.08)', 
                                        color: isAllClickup ? '#10b981' : '#7b61ff', 
                                        border: isAllClickup ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(123, 97, 255, 0.25)',
                                        fontWeight: 500
                                      }}>
                                        {clickupCount}/{related.length} on ClickUp
                                      </span>
                                    </>
                                  );
                                })()}
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
                              onClick={() => {
                                updateAdminCall(call.id, { pinned: !call.pinned });
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: call.pinned ? 'var(--primary)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              title={call.pinned ? "Unpin Call" : "Pin Call"}
                            >
                              <Pin 
                                size={12} 
                                style={{ 
                                  transform: call.pinned ? 'rotate(0deg)' : 'rotate(45deg)',
                                  fill: call.pinned ? 'var(--primary)' : 'none',
                                  transition: 'transform 0.2s/fill 0.2s ease'
                                }} 
                              />
                            </button>
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
                          <td colSpan={7} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
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
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Attendees / Discussion</label>
                                    {call.discussion && call.discussion.trim() && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAiMeeting({
                                            id: call.id,
                                            text: call.discussion,
                                            title: call.cohortTopic || 'Admin Call',
                                            type: 'call'
                                          });
                                        }}
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '0.7rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(99,102,241,0.08)',
                                          border: '1px solid rgba(99,102,241,0.25)',
                                          color: 'var(--primary)',
                                          cursor: 'pointer',
                                          borderRadius: '4px',
                                          fontWeight: 600,
                                          transition: 'all 0.15s ease'
                                        }}
                                        title="Summarize meeting and extract feature requests using AI"
                                      >
                                        <Sparkles size={10} /> Summarize & Extract
                                      </button>
                                    )}
                                  </div>
                                  <DiscussionTextArea
                                    initialValue={call.discussion || ''}
                                    onSave={(val) => updateAdminCall(call.id, { discussion: val })}
                                    placeholder="Enter discussion details..."
                                    style={{
                                      width: '100%',
                                      minHeight: '80px',
                                      padding: '8px 10px',
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.8rem',
                                      fontFamily: 'inherit',
                                      resize: 'none',
                                      overflowY: 'hidden',
                                      outline: 'none'
                                    }}
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
                                        productDeadline: '',
                                        createdAt: new Date().toISOString()
                                      };
                                      addProductItem(newItem);
                                      setInlineCallRelatedValue('');
                                      setTimeout(() => {
                                        setPreviewProductId(newItem.id);
                                      }, 50);
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
                                           <th style={{ width: '120px' }}>Status</th>
                                          <th style={{ width: '120px' }}>POC</th>
                                          <th style={{ width: '100px' }}>ClickUp</th>
                                          <th style={{ width: '120px' }}>Specs Date</th>
                                          <th style={{ width: '120px' }}>UI/UX Date</th>
                                          <th style={{ width: '120px' }}>Dev Date</th>
                                          <th style={{ width: '120px' }}>Release Date ({related.filter(feat => !!feat.finalReleaseCompleted).length}/{related.length})</th>
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
                                                  {feat.priority && (
                                                    <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                                      {feat.priority}
                                                    </span>
                                                  )}
                                                  {feat.raisedByTarunSir && (
                                                    <span className="badge-super-priority" style={{ padding: '1px 4px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px' }}>
                                                      <Sparkles size={8} /> Super Priority
                                                    </span>
                                                  )}
                                                  {isTaskLinked(feat.notes, feat.id) && (
                                                    <span className="badge-linked" style={{ padding: '2px 6px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 650 }}>
                                                      <Link size={8} /> Linked
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                            <td>{feat.product || '—'}</td>
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
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                {feat.poc ? (
                                                    <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                                        {feat.poc}
                                                    </span>
                                                ) : '—'}
                                                {feat.clickupAssignee && (
                                                  <div className="cu-tooltip-container">
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                                      CU: {formatClickupAssignee(feat.clickupAssignee)}
                                                    </span>
                                                    <span className="cu-tooltip-text">
                                                      {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td>
                                              {feat.clickupStatus ? (
                                                <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                  {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                                              {feat.productDeadline ? (
                                                <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.productDeadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                                              {feat.uiux ? (
                                                <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                  {formatDateToUserPattern(feat.uiux)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                                              {feat.deadline ? (
                                                <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.deadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                                              {feat.finalRelease ? (
                                                <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                  {formatDateToUserPattern(feat.finalRelease)}
                                                </span>
                                              ) : feat.finalReleaseCompleted ? (
                                                <span style={{
                                                  fontSize: '0.68rem',
                                                  padding: '2px 6px',
                                                  borderRadius: '4px',
                                                  fontWeight: 700,
                                                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                  color: '#10b981',
                                                  display: 'inline-block',
                                                  whiteSpace: 'nowrap'
                                                }}>
                                                  Delivered
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
                                          feature: 'New Feature Request',
                                          description: '',
                                          tarunSirApproval: false,
                                          raisedByTarunSir: false,
                                          priority: 'P2',
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
                                          productDeadline: '',
                                          createdAt: new Date().toISOString()
                                        };
                                        addProductItem(newItem);
                                        setInlineCallRelatedValue('');
                                        setTimeout(() => {
                                          setPreviewProductId(newItem.id);
                                        }, 50);
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--panel-bg)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startIndex + 1}</span> to{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> meetings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={activePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === 1 ? 0.5 : 1, cursor: activePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {activePage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === totalPages ? 0.5 : 1, cursor: activePage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature / Call Agenda {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callDate')} style={{ width: '150px', cursor: 'pointer' }}>Call Date {feedbackSortField === 'callDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('callPoc')} style={{ width: '180px', cursor: 'pointer' }}>Admin / POC {feedbackSortField === 'callPoc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                    Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetchingFeedback ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedFeedbackFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No feedback features found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbackFeatures.map(feat => {
                  const parentCall = getParentCall(feat);
                  return (
                    <tr 
                      key={feat.id} 
                      className={feat.blocker ? 'row-blocked' : ''}
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
                      <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem', width: '100%' }}>
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
                              title="Double click to edit Feature Name"
                            >
                              {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                            </div>
                          )}

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
                                  fontSize: '0.75rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <div
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFeedbackTopicId(feat.id);
                                  setInlineFeedbackTopicValue(parentCall.cohortTopic || '');
                                }}
                                style={{ 
                                  width: '100%', 
                                  cursor: 'pointer', 
                                  fontSize: '0.7rem', 
                                  color: 'var(--text-muted)', 
                                  fontWeight: 500,
                                  lineHeight: '1.2' 
                                }}
                                title="Double click to edit Call Agenda"
                              >
                                Call Agenda: {parentCall.cohortTopic || '—'}
                              </div>
                            )
                          ) : (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              Call Agenda: —
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {feat.priority && (
                              <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                {feat.priority}
                              </span>
                            )}
                            {feat.raisedByTarunSir && (
                              <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Sparkles size={10} /> Super Priority
                              </span>
                            )}
                          </div>
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
                      <td>{feat.product || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {feat.poc ? (
                              <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                  {feat.poc}
                              </span>
                          ) : '—'}
                          {feat.clickupAssignee && (
                            <div className="cu-tooltip-container">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                CU: {formatClickupAssignee(feat.clickupAssignee)}
                              </span>
                              <span className="cu-tooltip-text">
                                {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                              </span>
                            </div>
                          )}
                        </div>
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
                            {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                          <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                            {formatDateToUserPattern(feat.finalRelease)}
                          </span>
                        ) : feat.finalReleaseCompleted ? (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            Delivered
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls for Feedback */}
            {feedbackTotalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--panel-bg)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {feedbackStartIndex + 1} to {feedbackEndIndex} of {feedbackTotalItems} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={feedbackActivePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === 1 ? 0.5 : 1, cursor: feedbackActivePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {feedbackActivePage} of {feedbackTotalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, feedbackTotalPages))}
                      disabled={feedbackActivePage === feedbackTotalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === feedbackTotalPages ? 0.5 : 1, cursor: feedbackActivePage === feedbackTotalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
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
      {selectedAiMeeting && (
        <AIMeetingAssistantModal
          isOpen={!!selectedAiMeeting}
          onClose={() => setSelectedAiMeeting(null)}
          meetingId={selectedAiMeeting.id}
          meetingText={selectedAiMeeting.text}
          meetingTitle={selectedAiMeeting.title}
          meetingType={selectedAiMeeting.type}
          onApplySummary={(sum) => {
            updateAdminCall(selectedAiMeeting.id, { discussion: sum });
          }}
        />
      )}
    </>
  );
};

export const TarunSirMeetingsTable: React.FC = () => {
  const { 
    tarunSirMeetings, updateTarunSirMeeting, addTarunSirMeeting, deleteTarunSirMeeting, 
    productItems, addProductItem, updateProductItem, deleteProductItem, setPreviewProductId,
    speakers: configSpeakers, statuses, currentUser, confirm,
    programs, fetchPaginatedMeetingsData,
    meetingSearchQuery, setMeetingSearchQuery,
    highlightedCallId, setHighlightedCallId,
    feedbackSubmissions, formConfigs
  } = useDashboard();
  
  const speakersList = configSpeakers.map(s => s.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAiMeeting, setSelectedAiMeeting] = useState<{
    id: string;
    text: string;
    title: string;
    type: 'ama' | 'call' | 'tarun';
  } | null>(null);
  const [subTab, setSubTab] = useState<'schedule' | 'feedback'>('schedule');
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPrograms, setFilterPrograms] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setFilterStatuses([]);
    setFilterPrograms([]);
    setFilterPocs([]);
    setCurrentPage(1);
  }, [subTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSuperPriorityOnly, filterStatuses, filterPrograms, filterPocs]);

  // Sorting states
  const [meetingSortField, setMeetingSortField] = useState<keyof TarunSirMeeting | null>('date');
  const [meetingSortAsc, setMeetingSortAsc] = useState(false);

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

  const [editingMeetingPocId, setEditingMeetingPocId] = useState<string | null>(null);
  const [inlineMeetingPocValue, setInlineMeetingPocValue] = useState('');

  const [editingMeetingTopicId, setEditingMeetingTopicId] = useState<string | null>(null);
  const [inlineMeetingTopicValue, setInlineMeetingTopicValue] = useState('');
  const editMeetingTopicInputRef = useRef<HTMLInputElement>(null);

  const [editingMeetingProgramId, setEditingMeetingProgramId] = useState<string | null>(null);
  const [inlineMeetingProgramsValue, setInlineMeetingProgramsValue] = useState<string[]>([]);

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
      adminPoc: currentUser?.name || (speakersList.length > 0 ? speakersList[0] : 'Akash Sharma'),
      cohortTopic: 'New Meeting Topic',
      discussion: '',
      actions: '',
      status: 'Scheduled',
      program: ''
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

  const [paginatedFeedbackFeatures, setPaginatedFeedbackFeatures] = useState<ProductItem[]>([]);
  const [feedbackTotalItems, setFeedbackTotalItems] = useState(0);
  const [feedbackCompletedItems, setFeedbackCompletedItems] = useState(0);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (subTab === 'feedback') {
        setIsFetchingFeedback(true);
      }
      const res = await fetchPaginatedMeetingsData({
        type: 'tarunFeedback',
        page: subTab === 'feedback' ? currentPage : 1,
        limit: subTab === 'feedback' ? pageSize : 1,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: feedbackSortField || undefined,
        sortAsc: feedbackSortAsc
      });
      if (active) {
        if (res.success) {
          if (subTab === 'feedback') {
            setPaginatedFeedbackFeatures(res.data);
            setFeedbackTotalPages(res.totalPages);
          }
          setFeedbackTotalItems(res.totalItems);
          setFeedbackCompletedItems(res.completedItems || 0);
        }
        if (subTab === 'feedback') {
          setIsFetchingFeedback(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    subTab,
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    feedbackSortField,
    feedbackSortAsc,
    productItems,
    fetchPaginatedMeetingsData
  ]);

  const feedbackActivePage = Math.min(currentPage, feedbackTotalPages);
  const feedbackStartIndex = feedbackTotalItems === 0 ? 0 : (feedbackActivePage - 1) * pageSize;
  const feedbackEndIndex = Math.min(feedbackStartIndex + pageSize, feedbackTotalItems);

  const [paginatedMeetings, setPaginatedMeetings] = useState<TarunSirMeeting[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (meetingSearchQuery) {
      setSearchQuery(meetingSearchQuery);
      setMeetingSearchQuery('');
    }
  }, [meetingSearchQuery, setMeetingSearchQuery]);

  useEffect(() => {
    if (highlightedCallId && paginatedMeetings.length > 0) {
      const hasItem = paginatedMeetings.some(meeting => meeting.id === highlightedCallId);
      if (hasItem) {
        setExpandedMeetingId(highlightedCallId);
        setHighlightedCallId(null);
        setTimeout(() => {
          const el = document.getElementById(`call-row-${highlightedCallId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('highlight-pulse');
            setTimeout(() => {
              el.classList.remove('highlight-pulse');
            }, 3000);
          }
        }, 150);
      }
    }
  }, [highlightedCallId, paginatedMeetings, setHighlightedCallId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'tarunSirMeetings',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        statuses: filterStatuses,
        programs: filterPrograms,
        pocs: filterPocs,
        sortField: meetingSortField || undefined,
        sortAsc: meetingSortAsc
      });
      if (active) {
        if (res.success) {
          setPaginatedMeetings(res.data);
          setTotalItems(res.totalItems);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPrograms,
    filterPocs,
    meetingSortField,
    meetingSortAsc,
    tarunSirMeetings,
    fetchPaginatedMeetingsData
  ]);

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  return (
    <>
      <TabContainer
        title="Tarun Sir Meetings"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddClick={subTab === 'schedule' ? handleAddNew : undefined}
        addLabel={subTab === 'schedule' ? 'Add Meeting' : undefined}
        onExportFeedbackCSV={() => {
          // Export attendee feedback for meetings category
          exportAttendeeFeedbackToExcel('admin-calls', feedbackSubmissions, formConfigs, [], []);
        }}
        searchPlaceholder={subTab === 'schedule' ? 'Search meetings...' : 'Search feedback features...'}
        filterComponent={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <MultiSelectDropdown
              options={statusOptions}
              selectedValues={filterStatuses}
              onChange={setFilterStatuses}
              placeholder="Status"
            />
            <MultiSelectDropdown
              options={programs.map(p => p.name)}
              selectedValues={filterPrograms}
              onChange={setFilterPrograms}
              placeholder="Program"
            />
            <MultiSelectDropdown
              options={speakersList}
              selectedValues={filterPocs}
              onChange={setFilterPocs}
              placeholder="Feature POC"
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
            Feedback {feedbackTotalItems > 0 ? `(${feedbackCompletedItems}/${feedbackTotalItems})` : ''}
          </button>
        </div>

        {subTab === 'schedule' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th onClick={() => handleMeetingSort('date')} style={{ width: '150px', cursor: 'pointer' }}>Meeting Date {meetingSortField === 'date' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('adminPoc')} style={{ width: '200px', cursor: 'pointer' }}>Admin / POC {meetingSortField === 'adminPoc' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('program')} style={{ width: '120px', cursor: 'pointer' }}>Program {meetingSortField === 'program' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('cohortTopic')} style={{ cursor: 'pointer' }}>Topic / Meeting Agenda {meetingSortField === 'cohortTopic' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleMeetingSort('status')} style={{ width: '150px', cursor: 'pointer' }}>Status {meetingSortField === 'status' ? (meetingSortAsc ? '▲' : '▼') : ''}</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '120px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '14px', width: '90%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedMeetings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No meetings found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedMeetings.map(meeting => {
                  const related = getRelatedFeatures(meeting);
                  const isExpanded = expandedMeetingId === meeting.id;
                  
                  return (
                    <React.Fragment key={meeting.id}>
                      <tr 
                        id={`call-row-${meeting.id}`}
                        onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)} 
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--background-alt)' : (meeting.pinned ? 'var(--primary-glow)' : 'transparent'),
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <td 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMeetingDateId(meeting.id);
                          }}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          title="Click to edit Date"
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {isExpanded ? (
                              <ChevronUp size={16} style={{ marginRight: '8px', color: 'var(--primary)', flexShrink: 0 }} />
                            ) : (
                              <ChevronDown size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)', flexShrink: 0 }} />
                            )}
                            {meeting.pinned && (
                              <Pin size={12} style={{ marginRight: '6px', color: 'var(--primary)', fill: 'var(--primary)', flexShrink: 0 }} />
                            )}
                            <span style={{ borderBottom: '1px dashed var(--text-muted)' }}>
                              {meeting.date ? formatDateToShortPattern(meeting.date) : 'Set Date'}
                            </span>
                            {editingMeetingDateId === meeting.id && (
                              <CustomDatePicker
                                value={meeting.date || ''}
                                onChange={(date) => updateTarunSirMeeting(meeting.id, { date })}
                                onClose={() => setEditingMeetingDateId(null)}
                              />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMeetingProgramId(meeting.id);
                            const selected = meeting.program ? meeting.program.split(',').map(s => s.trim()).filter(Boolean) : [];
                            setInlineMeetingProgramsValue(selected);
                          }}
                          style={{ position: 'relative', cursor: 'pointer' }}
                          title="Click to edit Program"
                        >
                          {editingMeetingProgramId === meeting.id && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMeetingProgramId(null);
                              }}
                              style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 99,
                                background: 'transparent'
                              }}
                            />
                          )}
                          {editingMeetingProgramId === meeting.id ? (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 100,
                                backgroundColor: 'var(--panel-bg)',
                                border: '1.5px solid var(--border)',
                                borderRadius: '8px',
                                padding: '8px',
                                boxShadow: 'var(--shadow-lg)',
                                minWidth: '160px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              {programs.length === 0 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px' }}>No programs configured</span>
                              ) : (
                                programs.map(p => {
                                  const isChecked = inlineMeetingProgramsValue.includes(p.name);
                                  return (
                                    <label 
                                      key={p.id} 
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        userSelect: 'none',
                                        color: 'var(--text-primary)'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          let next;
                                          if (e.target.checked) {
                                            next = [...inlineMeetingProgramsValue, p.name];
                                          } else {
                                            next = inlineMeetingProgramsValue.filter(x => x !== p.name);
                                          }
                                          setInlineMeetingProgramsValue(next);
                                          updateTarunSirMeeting(meeting.id, { program: next.join(', ') });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <span>{p.name}</span>
                                    </label>
                                  );
                                })
                              )}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMeetingProgramId(null);
                                  }}
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                  }}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{meeting.program || '—'}</span>
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
                                {related.length > 0 && (() => {
                                  const doneCount = related.filter(feat => feat.finalReleaseCompleted || isCompletedStatus(feat.status)).length;
                                  const clickupCount = related.filter(feat => !!feat.taskLink).length;
                                  const isAllDone = doneCount === related.length;
                                  const isAllClickup = clickupCount === related.length;
                                  return (
                                    <>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--primary-glow)', 
                                        color: isAllDone ? '#10b981' : 'var(--primary)', 
                                        border: isAllDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--primary-border)',
                                        fontWeight: 500
                                      }}>
                                        {doneCount}/{related.length} {related.length === 1 ? 'feature' : 'features'}
                                      </span>
                                      <span className="badge" style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 6px', 
                                        background: isAllClickup ? 'rgba(16, 185, 129, 0.08)' : 'rgba(123, 97, 255, 0.08)', 
                                        color: isAllClickup ? '#10b981' : '#7b61ff', 
                                        border: isAllClickup ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(123, 97, 255, 0.25)',
                                        fontWeight: 500
                                      }}>
                                        {clickupCount}/{related.length} on ClickUp
                                      </span>
                                    </>
                                  );
                                })()}
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
                                updateTarunSirMeeting(meeting.id, { pinned: !meeting.pinned });
                              }} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: meeting.pinned ? 'var(--primary)' : 'var(--text-secondary)', 
                                display: 'flex', 
                                alignItems: 'center',
                                padding: '4px',
                                transition: 'all 0.2s ease'
                              }}
                              title={meeting.pinned ? "Unpin Meeting" : "Pin Meeting"}
                            >
                              <Pin 
                                size={12} 
                                style={{ 
                                  transform: meeting.pinned ? 'rotate(0deg)' : 'rotate(45deg)',
                                  fill: meeting.pinned ? 'var(--primary)' : 'none',
                                  transition: 'transform 0.2s/fill 0.2s ease'
                                }} 
                              />
                            </button>
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
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Discussion</label>
                                    {meeting.discussion && meeting.discussion.trim() && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAiMeeting({
                                            id: meeting.id,
                                            text: meeting.discussion,
                                            title: meeting.cohortTopic || 'Tarun Sir Meeting',
                                            type: 'tarun'
                                          });
                                        }}
                                        className="btn btn-secondary"
                                        style={{
                                          padding: '2px 8px',
                                          fontSize: '0.7rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          background: 'rgba(99,102,241,0.08)',
                                          border: '1px solid rgba(99,102,241,0.25)',
                                          color: 'var(--primary)',
                                          cursor: 'pointer',
                                          borderRadius: '4px',
                                          fontWeight: 600,
                                          transition: 'all 0.15s ease'
                                        }}
                                        title="Summarize meeting and extract feature requests using AI"
                                      >
                                        <Sparkles size={10} /> Summarize & Extract
                                      </button>
                                    )}
                                  </div>
                                  <DiscussionTextArea
                                    initialValue={meeting.discussion || ''}
                                    onSave={(val) => updateTarunSirMeeting(meeting.id, { discussion: val })}
                                    placeholder="Enter discussion details..."
                                    style={{
                                      width: '100%',
                                      minHeight: '80px',
                                      padding: '8px 10px',
                                      backgroundColor: 'var(--background)',
                                      border: '1px solid var(--border)',
                                      borderRadius: '6px',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.8rem',
                                      fontFamily: 'inherit',
                                      resize: 'none',
                                      overflowY: 'hidden',
                                      outline: 'none'
                                    }}
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
                                        productDeadline: '',
                                        createdAt: new Date().toISOString()
                                      };
                                      addProductItem(newItem);
                                      setInlineMeetingRelatedValue('');
                                      setTimeout(() => {
                                        setPreviewProductId(newItem.id);
                                      }, 50);
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
                                           <th style={{ width: '120px' }}>Status</th>
                                          <th style={{ width: '120px' }}>POC</th>
                                          <th style={{ width: '100px' }}>ClickUp</th>
                                          <th style={{ width: '120px' }}>Specs Date</th>
                                          <th style={{ width: '120px' }}>UI/UX Date</th>
                                          <th style={{ width: '120px' }}>Dev Date</th>
                                          <th style={{ width: '120px' }}>Release Date ({related.filter(feat => !!feat.finalReleaseCompleted).length}/{related.length})</th>
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
                                                 {feat.priority && (
                                                   <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                                     {feat.priority}
                                                   </span>
                                                 )}
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
                                                  {isTaskLinked(feat.notes, feat.id) && (
                                                    <span className="badge-linked" style={{ padding: '2px 6px', fontSize: '0.6rem', borderRadius: '3px', marginLeft: '6px', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary-light)', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 650 }}>
                                                      <Link size={8} /> Linked
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                            <td>{feat.product || '—'}</td>
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
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                {feat.poc ? (
                                                    <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                                        {feat.poc}
                                                    </span>
                                                ) : '—'}
                                                {feat.clickupAssignee && (
                                                  <div className="cu-tooltip-container">
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                                      CU: {formatClickupAssignee(feat.clickupAssignee)}
                                                    </span>
                                                    <span className="cu-tooltip-text">
                                                      {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td>
                                              {feat.clickupStatus ? (
                                                <span style={getClickupBadgeStyle(feat.clickupStatus)}>
                                                  {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                                              {feat.productDeadline ? (
                                                <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.productDeadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                                              {feat.uiux ? (
                                                <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                                                  {formatDateToUserPattern(feat.uiux)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                                              {feat.deadline ? (
                                                <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                                                  {formatDateToUserPattern(feat.deadline)}
                                                </span>
                                              ) : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                                              <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                                              {feat.finalRelease ? (
                                                  <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                    {formatDateToUserPattern(feat.finalRelease)}
                                                  </span>
                                                ) : feat.finalReleaseCompleted ? (
                                                  <span style={{
                                                    fontSize: '0.68rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 700,
                                                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                    color: '#10b981',
                                                    display: 'inline-block',
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    Delivered
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
                                          productDeadline: '',
                                          createdAt: new Date().toISOString()
                                        };
                                        addProductItem(newItem);
                                        setInlineMeetingRelatedValue('');
                                        setTimeout(() => {
                                          setPreviewProductId(newItem.id);
                                        }, 50);
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--panel-bg)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startIndex + 1}</span> to{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> meetings
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={activePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === 1 ? 0.5 : 1, cursor: activePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {activePage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: activePage === totalPages ? 0.5 : 1, cursor: activePage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
            <div className="table-responsive" style={{ flex: 1, minHeight: 0 }}>
              <table className="grid-table">
              <thead>
                <tr>
                  <th className="sticky-header-col" onClick={() => handleFeedbackSort('feature')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature / Meeting Agenda {feedbackSortField === 'feature' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('meetingDate')} style={{ width: '150px', cursor: 'pointer' }}>Meeting Date {feedbackSortField === 'meetingDate' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('meetingPoc')} style={{ width: '180px', cursor: 'pointer' }}>Admin / POC {feedbackSortField === 'meetingPoc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('product')} style={{ width: '150px', cursor: 'pointer' }}>Product Group {feedbackSortField === 'product' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {feedbackSortField === 'poc' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {feedbackSortField === 'status' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {feedbackSortField === 'clickupStatus' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {feedbackSortField === 'productDeadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {feedbackSortField === 'uiux' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {feedbackSortField === 'deadline' ? (feedbackSortAsc ? '▲' : '▼') : ''}</th>
                  <th onClick={() => handleFeedbackSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                    Release Date {feedbackSortField === 'finalRelease' ? (feedbackSortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {isFetchingFeedback ? (
                  Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                      <td style={{ padding: '12px 16px' }}></td>
                    </tr>
                  ))
                ) : paginatedFeedbackFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No feedback features found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbackFeatures.map(feat => {
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
                      <td className="sticky-col" style={{ fontWeight: 600, width: '280px', minWidth: '280px', maxWidth: '280px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem', width: '100%' }}>
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
                              title="Double click to edit Feature Name"
                            >
                              {feat.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                            </div>
                          )}

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
                                  fontSize: '0.75rem',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <div
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFeedbackTopicId(feat.id);
                                  setInlineFeedbackTopicValue(parentMeeting.cohortTopic || '');
                                }}
                                style={{ 
                                  width: '100%', 
                                  cursor: 'pointer', 
                                  fontSize: '0.7rem', 
                                  color: 'var(--text-muted)', 
                                  fontWeight: 500,
                                  lineHeight: '1.2' 
                                }}
                                title="Double click to edit Meeting Agenda"
                              >
                                Meeting Agenda: {parentMeeting.cohortTopic || '—'}
                              </div>
                            )
                          ) : (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              Meeting Agenda: —
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {feat.priority && (
                              <span className={`badge badge-${feat.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                {feat.priority}
                              </span>
                            )}
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
                      <td>{feat.product || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {feat.poc ? (
                              <span style={{ ...getPOCBadgeStyle(feat.poc) }}>
                                  {feat.poc}
                              </span>
                          ) : '—'}
                          {feat.clickupAssignee && (
                            <div className="cu-tooltip-container">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                CU: {formatClickupAssignee(feat.clickupAssignee)}
                              </span>
                              <span className="cu-tooltip-text">
                                {feat.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                              </span>
                            </div>
                          )}
                        </div>
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
                            {feat.clickupStatus}{feat.clickupSubtasksCount ? ` (${feat.clickupSubtasksCount})` : ""}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.createdAt} currentDate={feat.productDeadline} />
                        {feat.productDeadline ? (
                          <span style={getDateSpanStyle(feat.productDeadline, feat.productDeadlineCompleted)}>
                            {formatDateToUserPattern(feat.productDeadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.productDeadline || feat.createdAt} currentDate={feat.uiux} />
                        {feat.uiux ? (
                          <span style={getDateSpanStyle(feat.uiux, feat.uiuxCompleted)}>
                            {formatDateToUserPattern(feat.uiux)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.deadline} />
                        {feat.deadline ? (
                          <span style={getDateSpanStyle(feat.deadline, feat.deadlineCompleted)}>
                            {formatDateToUserPattern(feat.deadline)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        <DateDiffBadge prevDate={feat.deadline || feat.uiux || feat.productDeadline || feat.createdAt} currentDate={feat.finalRelease} />
                        {feat.finalRelease ? (
                                                  <span style={getDateSpanStyle(feat.finalRelease, feat.finalReleaseCompleted)}>
                                                    {formatDateToUserPattern(feat.finalRelease)}
                                                  </span>
                                                ) : feat.finalReleaseCompleted ? (
                                                  <span style={{
                                                    fontSize: '0.68rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 700,
                                                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                    color: '#10b981',
                                                    display: 'inline-block',
                                                    whiteSpace: 'nowrap'
                                                  }}>
                                                    Delivered
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
                }))}
              </tbody>
            </table>
            </div>
            {/* Pagination Controls for Feedback */}
            {feedbackTotalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--panel-bg)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing {feedbackStartIndex + 1} to {feedbackEndIndex} of {feedbackTotalItems} entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-control"
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={feedbackActivePage === 1}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === 1 ? 0.5 : 1, cursor: feedbackActivePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      Previous
                    </button>
                    <span style={{ minWidth: '45px', textAlign: 'center' }}>
                      Page {feedbackActivePage} of {feedbackTotalPages}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, feedbackTotalPages))}
                      disabled={feedbackActivePage === feedbackTotalPages}
                      style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: feedbackActivePage === feedbackTotalPages ? 0.5 : 1, cursor: feedbackActivePage === feedbackTotalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </TabContainer>
      {selectedAiMeeting && (
        <AIMeetingAssistantModal
          isOpen={!!selectedAiMeeting}
          onClose={() => setSelectedAiMeeting(null)}
          meetingId={selectedAiMeeting.id}
          meetingText={selectedAiMeeting.text}
          meetingTitle={selectedAiMeeting.title}
          meetingType={selectedAiMeeting.type}
          onApplySummary={(sum) => {
            updateTarunSirMeeting(selectedAiMeeting.id, { discussion: sum });
          }}
        />
      )}
    </>
  );
};

export const ContentTable: React.FC = () => {
  const { 
    contentItems, addContentItem, deleteContentItem, 
    setPreviewProductId, statuses: configStatuses, currentUser, confirm
  } = useDashboard();
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
      setPreviewProductId(newItem.id);
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
                  Release Date ({filtered.filter(item => !!item.finalReleaseCompleted).length}/{filtered.length}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => setPreviewProductId(item.id)} 
                  style={{ cursor: 'pointer' }}
                >
                  {/* Module Name (Feature) */}
                  <td 
                    className="sticky-col" 
                    style={{ fontWeight: 600, width: '250px', minWidth: '250px', maxWidth: '250px', whiteSpace: 'normal' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                      <span>{item.module || <span style={{ color: 'var(--text-muted)' }}>— (No topic)</span>}</span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {item.priority && (
                          <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                            {item.priority}
                          </span>
                        )}
                        {item.raisedByTarunSir && (
                          <span className="badge-super-priority" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Sparkles size={10} /> Super Priority
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Product Group */}
                  <td>
                    {item.product || '—'}
                  </td>

                  {/* POC Owner */}
                  <td>
                    {item.poc ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={getPOCBadgeStyle(item.poc)}>
                          {item.poc}
                        </span>
                        {item.clickupAssignee && (
                          <div className="cu-tooltip-container">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              CU: {formatClickupAssignee(item.clickupAssignee)}
                            </span>
                            <span className="cu-tooltip-text">
                              {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : '—'}
                  </td>

                  {/* Status */}
                  <td>
                    {item.status ? (
                      <span className="badge" style={{ backgroundColor: getStatusColor(item.status), color: '#fff', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px' }}>
                        {item.status}
                      </span>
                    ) : '—'}
                  </td>

                  {/* ClickUp Status */}
                  <td>
                    {item.clickupStatus ? (
                      <span style={getClickupBadgeStyle(item.clickupStatus)}>
                        {item.clickupStatus}
                      </span>
                    ) : '—'}
                  </td>

                  {/* Specs Date (productDeadline) */}
                  <td>
                    <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                      {item.productDeadline ? formatDateToShortPattern(item.productDeadline) : '—'}
                    </span>
                  </td>

                  {/* UI/UX Date */}
                  <td style={{ position: 'relative' }}>
                    {item.uiux && <DateDiffBadge prevDate={item.productDeadline || item.createdAt} currentDate={item.uiux} />}
                    <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                      {item.uiux ? formatDateToShortPattern(item.uiux) : '—'}
                    </span>
                  </td>

                  {/* Dev Date */}
                  <td style={{ position: 'relative' }}>
                    {item.deadline && <DateDiffBadge prevDate={item.uiux || item.productDeadline || item.createdAt} currentDate={item.deadline} />}
                    <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                      {item.deadline ? formatDateToShortPattern(item.deadline) : '—'}
                    </span>
                  </td>

                  {/* Release Date */}
                  <td style={{ position: 'relative' }}>
                    {item.finalRelease && <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline || item.createdAt} currentDate={item.finalRelease} />}
                    <span style={
                      item.finalRelease ? getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted) : item.finalReleaseCompleted ? {
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      } : {}
                    }>
                      {item.finalRelease ? formatDateToShortPattern(item.finalRelease) : item.finalReleaseCompleted ? 'Delivered' : '—'}
                    </span>
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
    alert,
    comments,
    lastOpenedMap,
    fetchProductBreakdownData
  } = useDashboard();
  const products = productGroups.map(g => g.name);
  const NO_GROUP_TAB = 'No Product Group Assigned';
  const allTabs = [...products, NO_GROUP_TAB];
  const pocList = speakers.map(s => s.name);
  const [productCounts, setProductCounts] = useState<Record<string, { total: number; completed: number }>>({});

  const getProductFeatureCount = (prodName: string) => {
    const val = productCounts[prodName];
    if (!val) return '0/0';
    return `${val.completed}/${val.total}`;
  };

  const [activeProductTab, setActiveProductTab] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterPocs, setFilterPocs] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedFeatures, setPaginatedFeatures] = useState<BreakdownFeature[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const openPreviewRef = useRef(openPreviewForFeature);
  openPreviewRef.current = openPreviewForFeature;
  const setPreviewProductIdRef = useRef(setPreviewProductId);
  setPreviewProductIdRef.current = setPreviewProductId;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeProductTab, searchQuery, filterSuperPriorityOnly, filterStatuses, filterPocs]);

  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];

  type BreakdownFeature = ProductItem & {
    sourceLabel: string;
    sourceId: string;
    openPreview: () => void;
    canDelete: boolean;
  };

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

  const fetchFeatures = useCallback(async () => {
    if (!activeProduct) return;
    setIsFetchingData(true);
    const res = await fetchProductBreakdownData({
      product: activeProduct,
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      superPriority: filterSuperPriorityOnly,
      statuses: filterStatuses,
      pocs: filterPocs,
      sortField: sortField || undefined,
      sortAsc: sortAsc
    });
    if (res && res.success) {
      const mapped = (res.data || []).map((item: any) => {
        let openPreview = () => {};
        if (item.sourceLabel === 'Feedback') {
          openPreview = () => setPreviewProductIdRef.current(item.sourceId);
        } else if (item.sourceLabel === 'Product Breakdown') {
          openPreview = () => setPreviewProductIdRef.current(item.sourceId);
        } else if (item.sourceLabel === 'Priority Requests') {
          openPreview = () => setPreviewProductIdRef.current(item.sourceId);
        } else if (item.sourceLabel === 'Student Projects') {
          openPreview = () => openPreviewRef.current(item.feature, item);
        } else if (item.sourceLabel === 'Content Pipeline') {
          openPreview = () => openPreviewRef.current(item.feature, {
            description: item.description,
            status: item.status,
            clickupStatus: item.clickupStatus,
            priority: item.priority,
            poc: item.poc,
            product: item.product,
            productDeadline: item.productDeadline,
            uiux: item.uiux,
            deadline: item.deadline,
            finalRelease: item.finalRelease,
            productDeadlineCompleted: item.productDeadlineCompleted,
            uiuxCompleted: item.uiuxCompleted,
            deadlineCompleted: item.deadlineCompleted,
            finalReleaseCompleted: item.finalReleaseCompleted,
          });
        } else if (item.sourceLabel === 'Student Meetings') {
          openPreview = () => openPreviewRef.current(item.module || item.feature, item);
        } else if (item.sourceLabel === 'Daily Issues') {
          openPreview = () => openPreviewRef.current(item.module || item.feature, {
            description: item.description,
            product: item.product,
            module: item.module,
            notes: item.notes,
            clickupStatus: item.clickupStatus,
            productDeadlineCompleted: item.productDeadlineCompleted,
            uiuxCompleted: item.uiuxCompleted,
            deadlineCompleted: item.deadlineCompleted,
            finalReleaseCompleted: item.finalReleaseCompleted,
          });
        } else if (item.sourceLabel === 'Feature Request') {
          openPreview = () => openPreviewRef.current(item.module || item.feature, {
            description: item.description,
            product: item.product,
            module: item.module,
            notes: item.notes,
            clickupStatus: item.clickupStatus,
            productDeadlineCompleted: item.productDeadlineCompleted,
            uiuxCompleted: item.uiuxCompleted,
            deadlineCompleted: item.deadlineCompleted,
            finalReleaseCompleted: item.finalReleaseCompleted,
          });
        }

        return {
          ...item,
          openPreview
        };
      });

      setPaginatedFeatures(mapped);
      setTotalItems(res.totalItems || 0);
      setTotalPages(res.totalPages || 1);
      if (res.productCounts) {
        setProductCounts(res.productCounts);
      }
    } else {
      setPaginatedFeatures([]);
      setTotalItems(0);
      setTotalPages(1);
    }
    setIsFetchingData(false);
  }, [
    activeProduct,
    currentPage,
    pageSize,
    searchQuery,
    filterSuperPriorityOnly,
    filterStatuses,
    filterPocs,
    sortField,
    sortAsc,
    fetchProductBreakdownData
  ]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures, productItems, studentProjects, contentItems, studentMeetings, dailyIssues]);

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
      productDeadline: '',
      createdAt: new Date().toISOString()
    };
    
    addProductItem(newItem);
    setTimeout(() => {
      setPreviewProductId(newItem.id);
    }, 50);
  };

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? -1 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

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
              <div className="search-input-wrapper" style={{ position: 'relative' }}>
                <Search size={16} />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search features..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="search-clear-btn" 
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      outline: 'none'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
              <div className="table-responsive" style={{ flex: 1, width: '100%', border: 'none', borderRadius: 0 }}>
                {(paginatedFeatures.length > 0 || isFetchingData) ? (
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th className="sticky-header-col" onClick={() => handleSort('feature')} style={{ width: '320px', minWidth: '320px', maxWidth: '320px', cursor: 'pointer' }}>Feature {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                        Release Date {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isFetchingData ? (
                      Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                        <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                          <td className="sticky-col" style={{ width: '320px', minWidth: '320px', maxWidth: '320px', padding: '12px 16px' }}>
                            <div className="skeleton-line" style={{ height: '14px', width: '80%', marginBottom: '6px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                            <div className="skeleton-line" style={{ height: '10px', width: '40%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                          </td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '70px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                          <td></td>
                        </tr>
                      ))
                    ) : paginatedFeatures.map(item => (
                      <tr key={item.id} className={item.blocker ? 'row-blocked' : ''} onClick={() => {
                        if (editingFeatureId !== item.id) {
                          item.openPreview();
                        }
                      }} style={{ cursor: 'pointer' }}>
                        <td className="sticky-col" style={{ fontWeight: 600, width: '320px', minWidth: '320px', maxWidth: '320px', whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', width: '100%' }}>
                            {/* Source above feature name */}
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                              {item.sourceLabel}
                            </span>
                            {editingFeatureId === item.id ?
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
                            : (() => {
                              const baseId = item.sourceId || item.id;
                              const itemComments = comments.filter((c: any) => c.itemId === baseId);
                              const lastOpened = lastOpenedMap[baseId];
                              const unreadCount = itemComments.filter((c: any) => {
                                if (!lastOpened) return true;
                                return new Date(c.createdAt).getTime() > lastOpened;
                              }).length;

                              return (
                                <span 
                                  onDoubleClick={(e) => {
                                    if (item.canDelete) {
                                      e.stopPropagation();
                                      setEditingFeatureId(item.id);
                                      setInlineEditValue(item.feature || '');
                                    }
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', lineHeight: '1.3' }}
                                >
                                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.feature || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                                  </span>
                                  {unreadCount > 0 && (
                                    <span 
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: 'var(--danger, #ef4444)',
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        padding: '1.5px 5px',
                                        borderRadius: '6px',
                                        lineHeight: 1,
                                        flexShrink: 0
                                      }}
                                      title={`${unreadCount} unread comments`}
                                    >
                                      <MessageSquare size={9} fill="var(--danger, #ef4444)" />
                                      {unreadCount}
                                    </span>
                                  )}
                                </span>
                              );
                            })()
                            }
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                              {item.priority && (
                                <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                  {item.priority}
                                </span>
                              )}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            {item.poc ? (
                                <span style={{ ...getPOCBadgeStyle(item.poc) }}>
                                    {item.poc}
                                </span>
                            ) : '—'}
                            {item.clickupAssignee && (
                              <div className="cu-tooltip-container">
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                  CU: {formatClickupAssignee(item.clickupAssignee)}
                                </span>
                                <span className="cu-tooltip-text">
                                  {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                                </span>
                              </div>
                            )}
                          </div>
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
                              {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.createdAt} currentDate={item.productDeadline} />
                          {item.productDeadline ? (
                            <span style={getDateSpanStyle(item.productDeadline, item.productDeadlineCompleted)}>
                              {formatDateToUserPattern(item.productDeadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.productDeadline || item.createdAt} currentDate={item.uiux} />
                          {item.uiux ? (
                            <span style={getDateSpanStyle(item.uiux, item.uiuxCompleted)}>
                              {formatDateToUserPattern(item.uiux)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.uiux || item.productDeadline || item.createdAt} currentDate={item.deadline} />
                          {item.deadline ? (
                            <span style={getDateSpanStyle(item.deadline, item.deadlineCompleted)}>
                              {formatDateToUserPattern(item.deadline)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                          <DateDiffBadge prevDate={item.deadline || item.uiux || item.productDeadline || item.createdAt} currentDate={item.finalRelease} />
                          {item.finalRelease ? (
                            <span style={getDateSpanStyle(item.finalRelease, item.finalReleaseCompleted)}>
                              {formatDateToUserPattern(item.finalRelease)}
                            </span>
                          ) : item.finalReleaseCompleted ? (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              Delivered
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

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--panel-bg)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderBottomLeftRadius: '8px',
                borderBottomRightRadius: '8px',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                {/* Left: Info */}
                <div>
                  Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startIndex + 1}</span> to{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> features
                </div>

                {/* Right: Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {/* Page Size Select */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '4px 24px 4px 8px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Navigation Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={activePage === 1}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                        opacity: activePage === 1 ? 0.5 : 1,
                        outline: 'none',
                        transition: 'all 0.2s',
                        fontWeight: 'bold'
                      }}
                      title="First Page"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={activePage === 1}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: activePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                        opacity: activePage === 1 ? 0.5 : 1,
                        outline: 'none',
                        transition: 'all 0.2s',
                        fontWeight: 'bold'
                      }}
                      title="Previous Page"
                    >
                      ‹
                    </button>
                    
                    <span style={{ fontSize: '0.75rem', padding: '0 0.5rem', fontWeight: 650 }}>
                      Page {activePage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: activePage === totalPages ? 0.5 : 1,
                        outline: 'none',
                        transition: 'all 0.2s',
                        fontWeight: 'bold'
                      }}
                      title="Next Page"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={activePage === totalPages}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border)',
                        backgroundColor: 'var(--background)',
                        color: activePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: activePage === totalPages ? 0.5 : 1,
                        outline: 'none',
                        transition: 'all 0.2s',
                        fontWeight: 'bold'
                      }}
                      title="Last Page"
                    >
                      »
                    </button>
                  </div>
                </div>
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
  const { dailyIssues, addDailyIssue, deleteDailyIssue, statuses, setPreviewProductId, currentUser, confirm, fetchPaginatedMeetingsData } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterSuperPriorityOnly, setFilterSuperPriorityOnly] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const productStatuses = statuses.map(s => s.label);
  const statusOptions = productStatuses.length > 0 ? productStatuses : ['On Hold', 'In Progress', 'Ongoing', 'Completed'];
  const [sortField, setSortField] = useState<keyof DailyIssue | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedIssues, setPaginatedIssues] = useState<DailyIssue[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterPriority, filterSuperPriorityOnly, filterStatuses]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'dailyIssues',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        superPriority: filterSuperPriorityOnly,
        priority: filterPriority !== 'All' ? filterPriority : undefined,
        statuses: filterStatuses,
        sortField: sortField || undefined,
        sortAsc: sortAsc
      });
      if (active) {
        if (res.success) {
          setPaginatedIssues(res.data);
          setTotalItems(res.totalItems);
          setCompletedItems(res.completedItems || 0);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterPriority,
    filterSuperPriorityOnly,
    filterStatuses,
    sortField,
    sortAsc,
    dailyIssues,
    fetchPaginatedMeetingsData
  ]);

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const handleSort = (field: keyof DailyIssue) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

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
      tarunSirApproval: false,
      createdAt: new Date().toISOString()
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

  const renderDateCell = (item: DailyIssue, field: keyof DailyIssue, previousFields?: (keyof DailyIssue)[]) => {
    const value = String(item[field] || '');
    const completedField = `${String(field)}Completed` as keyof DailyIssue;
    const completed = Boolean(item[completedField]);
    let prevDate = '';
    if (previousFields) {
      for (const pf of previousFields) {
        if (item[pf]) {
          prevDate = String(item[pf]);
          break;
        }
      }
    }
    return (
      <>
        {prevDate && <DateDiffBadge prevDate={prevDate} currentDate={value} />}
        <span style={getDateSpanStyle(value, completed)}>
          {value ? formatDateToUserPattern(value) : '—'}
        </span>
      </>
    );
  };

  const renderRow = (item: DailyIssue) => {
    return (
      <tr 
        key={item.id} 
        className={item.blocker ? 'row-blocked' : ''}
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
              {item.priority && (
                <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                  {item.priority}
                </span>
              )}
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
              {item.clickupStatus}{item.clickupSubtasksCount ? ` (${item.clickupSubtasksCount})` : ""}
            </span>
          ) : '—'}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'productDeadline', ['createdAt'])}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'uiux', ['productDeadline', 'createdAt'])}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'deadline', ['uiux', 'productDeadline', 'createdAt'])}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
          {renderDateCell(item, 'finalRelease', ['deadline', 'uiux', 'productDeadline', 'createdAt'])}
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
    );
  };

  return (
    <TabContainer
      title="Daily Issues Log"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onAddClick={handleAddNew}
      addLabel="Add Issue"
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
        <div className="table-responsive" style={{ flex: 1, overflow: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '280px', minWidth: '280px', maxWidth: '280px', cursor: 'pointer' }}>Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('product')} style={{ cursor: 'pointer' }}>Product Group {sortField === 'product' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ cursor: 'pointer' }}>POC Owner {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ cursor: 'pointer' }}>Prod {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ cursor: 'pointer' }}>UIUX {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ cursor: 'pointer' }}>Dev {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ cursor: 'pointer' }}>Final ({completedItems}/{totalItems}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}></td>
                  </tr>
                ))
              ) : paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No active issues logged.
                  </td>
                </tr>
              ) : (
                paginatedIssues.map(item => renderRow(item))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer - Always visible */}
        <div style={{
          zIndex: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--panel-bg)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-control"
                style={{
                  padding: '2px 6px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1 || totalItems === 0}
                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (activePage === 1 || totalItems === 0) ? 0.5 : 1, cursor: (activePage === 1 || totalItems === 0) ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ minWidth: '45px', textAlign: 'center' }}>
                Page {activePage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages || totalItems === 0}
                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (activePage === totalPages || totalItems === 0) ? 0.5 : 1, cursor: (activePage === totalPages || totalItems === 0) ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </TabContainer>
  );
};

export const FeatureRequestsTable: React.FC = () => {
  const { dailyIssues, deleteDailyIssue, statuses, setPreviewProductId, confirm, comments, lastOpenedMap, fetchPaginatedMeetingsData } = useDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProduct, setFilterProduct] = useState('All');
  const [sortField, setSortField] = useState<keyof DailyIssue | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const featuresList = dailyIssues.filter(item => ['Feature Gap', 'Enhancement', 'New Feature', 'Data Needed', 'Term Report/ Transcript'].includes(item.type || ''));
  const totalFeatures = featuresList.length;
  const completedFeatures = featuresList.filter(f => !!f.finalReleaseCompleted).length;

  const bugsList = dailyIssues.filter(item => item.type === 'BUG');
  const totalBugs = bugsList.length;
  const completedBugs = bugsList.filter(b => !!b.finalReleaseCompleted).length;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paginatedRequests, setPaginatedRequests] = useState<DailyIssue[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [subTab, setSubTab] = useState<'features' | 'bugs'>('features');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterProduct, subTab]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'featureRequests',
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        product: filterProduct !== 'All' ? filterProduct : undefined,
        sortField: sortField || undefined,
        sortAsc: sortAsc,
        requestType: subTab === 'bugs' ? 'BUG' : 'FEATURE'
      });
      if (active) {
        if (res.success) {
          setPaginatedRequests(res.data);
          setTotalItems(res.totalItems);
          setCompletedItems(res.completedItems || 0);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    pageSize,
    searchQuery,
    filterProduct,
    sortField,
    sortAsc,
    dailyIssues,
    subTab,
    fetchPaginatedMeetingsData
  ]);

  const activePage = Math.min(currentPage, totalPages);
  const startIndex = totalItems === 0 ? 0 : (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const handleSort = (field: keyof DailyIssue) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const allProducts = Array.from(new Set(dailyIssues.map(i => i.product).filter(Boolean)));

  const renderDateCell = (item: DailyIssue, field: keyof DailyIssue, previousFields?: (keyof DailyIssue)[]) => {
    const value = String(item[field] || '');
    const completedField = `${String(field)}Completed` as keyof DailyIssue;
    const completed = Boolean(item[completedField]);
    let prevDate = '';
    if (previousFields) {
      for (const pf of previousFields) {
        if (item[pf]) {
          prevDate = String(item[pf]);
          break;
        }
      }
    }
    return (
      <>
        {prevDate && <DateDiffBadge prevDate={prevDate} currentDate={value} />}
        <span style={getDateSpanStyle(value, completed)}>
          {value ? formatDateToUserPattern(value) : '—'}
        </span>
      </>
    );
  };

  return (
    <TabContainer
      title="Requested Features"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="filter-select" value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
            <option value="All">All Products</option>
            {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
        {/* SUB-TABS ROW */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          padding: '0.25rem 1.5rem 0 1.5rem', 
          background: 'var(--panel-bg)', 
          gap: '1.5rem' 
        }}>
          <button
            onClick={() => setSubTab('features')}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'features' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'features' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Feature Requests ({completedFeatures}/{totalFeatures})
          </button>
          <button
            onClick={() => setSubTab('bugs')}
            style={{
              padding: '0.75rem 0.5rem',
              border: 'none',
              background: 'none',
              borderBottom: subTab === 'bugs' ? '2px solid var(--primary)' : '2px solid transparent',
              color: subTab === 'bugs' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Bugs ({completedBugs}/{totalBugs})
          </button>
        </div>
        <div className="table-responsive" style={{ flex: 1, overflow: 'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th className="sticky-header-col" onClick={() => handleSort('module')} style={{ width: '320px', minWidth: '320px', maxWidth: '320px', cursor: 'pointer' }}>Feature {sortField === 'module' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('cohort')} style={{ width: '120px', cursor: 'pointer' }}>Program {sortField === 'cohort' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('poc')} style={{ width: '120px', cursor: 'pointer' }}>Raised By {sortField === 'poc' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th style={{ width: '120px' }}>POC Owner</th>
                <th onClick={() => handleSort('status')} style={{ width: '120px', cursor: 'pointer' }}>Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('clickupStatus')} style={{ width: '100px', cursor: 'pointer' }}>Clickup {sortField === 'clickupStatus' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('productDeadline')} style={{ width: '120px', cursor: 'pointer' }}>Specs Date {sortField === 'productDeadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('uiux')} style={{ width: '120px', cursor: 'pointer' }}>UI/UX Date {sortField === 'uiux' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('deadline')} style={{ width: '120px', cursor: 'pointer' }}>Dev Date {sortField === 'deadline' ? (sortAsc ? '▲' : '▼') : ''}</th>
                <th onClick={() => handleSort('finalRelease')} style={{ width: '120px', cursor: 'pointer' }}>
                  Release Date ({completedItems}/{totalItems}) {sortField === 'finalRelease' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '12px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '60px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '70px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                    <td style={{ padding: '12px 16px' }}></td>
                  </tr>
                ))
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No feature requests yet. Requests submitted via the public calendar will appear here.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map(item => {
                  const statusMatch = statuses.find(s => s.label === item.status);
                  const itemComments = comments.filter((c: any) => c.itemId === item.id);
                  const lastOpened = lastOpenedMap[item.id];
                  const unreadCount = itemComments.filter((c: any) => {
                    if (!lastOpened) return true;
                    return new Date(c.createdAt).getTime() > lastOpened;
                  }).length;

                  return (
                    <tr key={item.id} onClick={() => setPreviewProductId(item.id)} style={{ cursor: 'pointer' }}>
                      <td className="sticky-col" style={{ fontWeight: 600, width: '320px', minWidth: '320px', maxWidth: '320px', whiteSpace: 'normal' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {item.product || 'No Product Group'}
                            </span>
                            <span style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 600, 
                              color: item.type === 'BUG' ? 'var(--danger, #ef4444)' : 'var(--text-secondary)', 
                              background: item.type === 'BUG' ? 'var(--danger-bg, rgba(239, 68, 68, 0.1))' : 'var(--background-alt)', 
                              border: item.type === 'BUG' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
                              padding: '1px 6px', 
                              borderRadius: '4px'
                            }}>
                              ✦ {item.type}
                            </span>
                            {item.priority && (
                              <span className={`badge badge-${item.priority.toLowerCase()}`} style={{ padding: '1px 6px', fontSize: '0.65rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontWeight: 650 }}>
                                {item.priority}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', lineHeight: '1.3' }}>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {item.module || <span style={{ color: 'var(--text-muted)' }}>— (No title)</span>}
                            </span>
                            {unreadCount > 0 && (
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  backgroundColor: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--danger, #ef4444)',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: '8px',
                                  lineHeight: 1,
                                  flexShrink: 0
                                }}
                                title={`${unreadCount} unread comments`}
                              >
                                <MessageSquare size={10} fill="var(--danger, #ef4444)" />
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{item.cohort || '—'}</td>
                      <td>
                        {(item.contact || item.poc) ? (() => {
                          const fullVal = item.contact || item.poc || '';
                          const nameOnly = fullVal.split('(')[0].trim();
                          const emailOnly = fullVal.includes('(') ? fullVal.slice(fullVal.indexOf('(') + 1, fullVal.lastIndexOf(')')).trim() : '';

                          return (
                            <div className="cu-tooltip-container">
                              <span style={getPOCBadgeStyle(nameOnly)}>
                                {nameOnly}
                              </span>
                              {emailOnly && (
                                <span className="cu-tooltip-text" style={{ whiteSpace: 'nowrap' }}>
                                  {emailOnly}
                                </span>
                              )}
                            </div>
                          );
                        })() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {item.poc ? (
                            <span style={{ ...getPOCBadgeStyle(item.poc) }}>
                              {item.poc}
                            </span>
                          ) : '—'}
                          {item.clickupAssignee && (
                            <div className="cu-tooltip-container">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                CU: {formatClickupAssignee(item.clickupAssignee)}
                              </span>
                              <span className="cu-tooltip-text">
                                {item.clickupAssignee.split(',').map(s => s.trim()).join('\n')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.status ? (
                          statusMatch ? (
                            <span className="badge" style={{
                              backgroundColor: `${statusMatch.color}14`,
                              color: statusMatch.color,
                              borderColor: `${statusMatch.color}33`,
                              borderStyle: 'solid',
                              borderWidth: '1px'
                            }}>{item.status}</span>
                          ) : (
                            <span className={`badge ${
                              item.status === 'On Hold' ? 'status-hold' :
                              item.status === 'In Progress' ? 'status-progress' :
                              item.status === 'Ongoing' ? 'status-ongoing' : 'status-completed'
                            }`}>{item.status}</span>
                          )
                        ) : '—'}
                      </td>
                      <td>
                        {item.clickupStatus ? (
                          <span style={getClickupBadgeStyle(item.clickupStatus)}>
                            {item.clickupStatus}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        {renderDateCell(item, 'productDeadline', ['createdAt'])}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        {renderDateCell(item, 'uiux', ['productDeadline', 'createdAt'])}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        {renderDateCell(item, 'deadline', ['uiux', 'productDeadline', 'createdAt'])}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'relative' }}>
                        {renderDateCell(item, 'finalRelease', ['deadline', 'uiux', 'productDeadline', 'createdAt'])}
                      </td>
                      <td>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (await confirm("Are you sure you want to delete this feature request?", "Delete Feature Request")) {
                              deleteDailyIssue(item.id);
                            }
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer - Always visible */}
        <div style={{
          zIndex: 10,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--panel-bg)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-control"
                style={{
                  padding: '2px 6px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1 || totalItems === 0}
                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (activePage === 1 || totalItems === 0) ? 0.5 : 1, cursor: (activePage === 1 || totalItems === 0) ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span style={{ minWidth: '45px', textAlign: 'center' }}>
                Page {activePage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages || totalItems === 0}
                style={{ padding: '2px 8px', fontSize: '0.75rem', opacity: (activePage === totalPages || totalItems === 0) ? 0.5 : 1, cursor: (activePage === totalPages || totalItems === 0) ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
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

  // Selected Program Tab State
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

  // Only show active cohorts and programs that have at least one active cohort
  const activeCohorts = cohorts.filter(c => c.active !== false);
  const activePrograms = programs.filter(p => activeCohorts.some(c => c.programId === p.id));

  // Initialize selectedProgramId
  useEffect(() => {
    if (activePrograms.length > 0 && !selectedProgramId) {
      setSelectedProgramId(activePrograms[0].id);
    }
  }, [activePrograms, selectedProgramId]);

  // Determine cohorts to display based on selected program tab
  const currentProgramId = selectedProgramId || (activePrograms[0]?.id || '');
  const displayCohorts = activeCohorts.filter(c => c.programId === currentProgramId);

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
          const checkedCount = activeCohorts.filter(c => current.includes(c.name)).length;
          return activeCohorts.length > 0 ? (checkedCount / activeCohorts.length) : 0;
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
        filterComponent={null}
      >
        {/* Horizontal Program Tabs */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '1rem', 
            borderBottom: '1px solid var(--border)',
            padding: '0 1.5rem',
            flexShrink: 0,
            backgroundColor: 'var(--panel-bg)',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            marginBottom: '0.75rem'
          }}
        >
          {activePrograms.map(program => {
            const isActive = (selectedProgramId || (activePrograms[0]?.id || '')) === program.id;
            const programCohorts = activeCohorts.filter(c => c.programId === program.id);
            return (
              <button
                key={program.id}
                onClick={() => {
                  setSelectedProgramId(program.id);
                }}
                style={{
                  padding: '0.75rem 0.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {program.name}
                <span 
                  className="badge" 
                  style={{ 
                    fontSize: '0.625rem', 
                    padding: '1px 5px', 
                    borderRadius: '999px',
                    background: isActive ? 'var(--primary-glow)' : 'var(--background-alt)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                >
                  {programCohorts.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="table-responsive">
          <table className="grid-table">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <th 
                  className="sticky-header-col"
                  style={{ 
                    verticalAlign: 'middle', 
                    width: '250px',
                    minWidth: '250px', 
                    maxWidth: '250px',
                    whiteSpace: 'nowrap', 
                    borderRight: '2px solid var(--border)',
                    padding: '8px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                    <span 
                      onClick={() => handleSort('feature')} 
                      style={{ cursor: 'pointer', flex: 1 }}
                      title="Sort by Feature Name"
                    >
                      Feature & Product Group {sortField === 'feature' ? (sortAsc ? '▲' : '▼') : ''}
                    </span>
                    <button 
                      onClick={() => handleSort('adoptionRate')}
                      style={{ 
                        padding: '2px 6px', 
                        fontSize: '0.625rem', 
                        borderRadius: '4px', 
                        border: '1px solid var(--border)', 
                        background: sortField === 'adoptionRate' ? 'var(--primary-glow)' : 'var(--background-alt)', 
                        color: sortField === 'adoptionRate' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        userSelect: 'none'
                      }}
                      title="Sort by Adoption Rate"
                    >
                      Rate {sortField === 'adoptionRate' ? (sortAsc ? '▲' : '▼') : ''}
                    </button>
                  </div>
                </th>
                {displayCohorts.map((c, idx) => {
                  const isBoundary = idx > 0 && c.programId !== displayCohorts[idx - 1].programId;
                  return (
                    <th 
                      key={c.id} 
                      onClick={() => handleSort(`cohort-${c.name}`)} 
                      style={{ 
                        textAlign: 'center', 
                        padding: '6px 8px', 
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        minWidth: '95px',
                        width: '95px',
                        borderLeft: isBoundary ? '2px solid var(--border)' : undefined,
                        verticalAlign: 'middle'
                      }}
                    >
                      <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.name} {sortField === `cohort-${c.name}` ? (sortAsc ? '▲' : '▼') : ''}
                      </div>
                    </th>
                  );
                })}
                <th style={{ width: '80px', minWidth: '80px', maxWidth: '80px', verticalAlign: 'middle' }}></th>
              </tr>
            </thead>
            <tbody>
              {(isAddingFeature && editDraft ? [editDraft, ...sorted] : sorted).map(adopt => {
                const isEditing = editingRowId === adopt.id;
                const displayRate = (() => {
                  const current = ((isEditing ? editDraft?.cohort : adopt.cohort) || '')
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                  const allActiveCheckedCount = activeCohorts.filter(c => current.includes(c.name)).length;
                  return activeCohorts.length > 0 
                    ? Math.round((allActiveCheckedCount / activeCohorts.length) * 100)
                    : 0;
                })();
                
                return (
                  <React.Fragment key={adopt.id}>
                    <tr 
                      style={{ 
                        backgroundColor: isEditing ? 'rgba(99, 102, 241, 0.05)' : undefined,
                        borderLeft: isEditing ? '3px solid var(--primary)' : undefined
                      }}
                    >
                      {/* Feature & Product Group sticky column */}
                      <td 
                        className="sticky-col" 
                        style={{ 
                          width: '250px',
                          minWidth: '250px',
                          maxWidth: '250px',
                          whiteSpace: 'normal',
                          borderRight: '2px solid var(--border)',
                          background: isEditing 
                            ? 'rgba(99, 102, 241, 0.05)' 
                            : `linear-gradient(to right, rgba(99, 102, 241, 0.08) ${displayRate}%, transparent ${displayRate}%)`
                        }}
                      >
                        {isEditing && editDraft ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                {adopt.feature}
                              </span>
                              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--primary)', paddingLeft: '8px' }}>
                                {displayRate}%
                              </span>
                            </div>
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
                          </div>
                        )}
                      </td>
                      
                      {/* Cohorts Columns Checkboxes */}
                      {displayCohorts.map((c, idx) => {
                        const current = ((isEditing ? editDraft?.cohort : adopt.cohort) || '')
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean);
                        const isChecked = current.includes(c.name);
                        const isBoundary = idx > 0 && c.programId !== displayCohorts[idx - 1].programId;
                        
                        return (
                          <td 
                            key={c.id} 
                            style={{ 
                              textAlign: 'center',
                              borderLeft: isBoundary ? '2px solid var(--border)' : undefined
                            }} 
                            onClick={(e) => e.stopPropagation()}
                          >
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



                      {/* Actions Column */}
                      <td style={{ width: '80px', minWidth: '80px', maxWidth: '80px' }}>
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

export const ContactsDirectoryTable: React.FC = () => {
  const {
    directoryContacts = [], addDirectoryContact, updateDirectoryContact, deleteDirectoryContact,
    cohorts = [], addCohort, updateCohort,
    programs = [], confirm, alert
  } = useDashboard();

  // Active selected Program Sub-Tab
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  
  // Active expanded Cohorts
  const [expandedCohortId, setExpandedCohortId] = useState<string | null>(null);

  // Search query to filter contacts
  const [searchQuery, setSearchQuery] = useState('');

  // Cohort creation
  const [showAddCohortId, setShowAddCohortId] = useState<string | null>(null); // programId
  const [newCohortName, setNewCohortName] = useState('');

  // Department creation
  const [showAddDeptId, setShowAddDeptId] = useState<string | null>(null); // cohortId
  const [newDeptName, setNewDeptName] = useState('');

  // Contact import inline state
  const [showImportCohortId, setShowImportCohortId] = useState<string | null>(null); // target cohortId
  const [importSourceCohortId, setImportSourceCohortId] = useState<string>('');

  // Contact creation state per department
  const [activeFormId, setActiveFormId] = useState<{ cohortId: string; dept: string } | null>(null);
  
  // Fields for adding a contact
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactTier, setContactTier] = useState<'L0' | 'L1' | 'L2'>('L0');
  const [contactDept, setContactDept] = useState('');

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<DirectoryContact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edit contact state
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editTier, setEditTier] = useState<'L0' | 'L1' | 'L2'>('L0');
  const [editDept, setEditDept] = useState('');

  // Group email inline edit state
  const [editingDeptEmailKey, setEditingDeptEmailKey] = useState<string | null>(null); // format: `${cohortId}-${deptName}`
  const [tempDeptEmail, setTempDeptEmail] = useState('');

  // Set default expanded program / selected sub-tab on load
  useEffect(() => {
    if (programs.length > 0 && !selectedProgramId) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  // Handle autocomplete search
  useEffect(() => {
    if (!contactName.trim() || contactName.length < 2) {
      setSuggestions([]);
      return;
    }
    const filtered = directoryContacts.filter(c => 
      c.name.toLowerCase().includes(contactName.toLowerCase())
    );
    // Deduplicate suggestions by unique name + email
    const unique: DirectoryContact[] = [];
    const seen = new Set();
    for (const item of filtered) {
      const key = `${item.name.toLowerCase()}_${item.email.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    setSuggestions(unique);
  }, [contactName, directoryContacts]);

  // Auto-mirror WhatsApp if empty or matches old mobile value
  const handleMobileChange = (val: string) => {
    setContactMobile(val);
    if (!contactWhatsapp || contactWhatsapp === contactMobile) {
      setContactWhatsapp(val);
    }
  };

  // Autocomplete selection handler
  const handleSelectSuggestion = (suggested: DirectoryContact) => {
    setContactName(suggested.name);
    setContactEmail(suggested.email || '');
    setContactMobile(suggested.mobile || '');
    setContactWhatsapp(suggested.whatsapp || '');
    setContactTier(suggested.tier || 'L0');
    setShowSuggestions(false);
  };

  // Copy Emails utility
  const copyToClipboard = (emails: string[], typeLabel: string) => {
    const uniqueEmails = Array.from(new Set(emails.map(e => e.trim()).filter(Boolean)));
    if (uniqueEmails.length === 0) {
      alert(`No valid emails found for this ${typeLabel}.`);
      return;
    }
    const text = uniqueEmails.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied ${uniqueEmails.length} unique email(s) for ${typeLabel} to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy emails:', err);
    });
  };

  // Add Cohort handler
  const handleCreateCohort = (programId: string) => {
    if (!newCohortName.trim()) return;
    const cleanName = newCohortName.trim();
    
    // Check if cohort name already exists
    if (cohorts.some(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.programId === programId)) {
      alert('Cohort already exists in this program.');
      return;
    }

    const generalProgramDepts = Array.from(new Set(
      directoryContacts
        .filter(c => c.programId === programId && !c.cohortId && c.department && c.department.trim() !== '')
        .map(c => c.department.trim())
    ));
    const defaultDepts = ['Operations', 'Academics', 'Placement'];
    const rawDepts = [...defaultDepts, ...generalProgramDepts];

    // Deduplicate case-insensitively
    const seenDepts = new Set<string>();
    const finalDepts: string[] = [];
    for (const d of rawDepts) {
      const lower = d.toLowerCase();
      if (!seenDepts.has(lower)) {
        seenDepts.add(lower);
        finalDepts.push(d);
      }
    }

    const newCohortItem = {
      id: `cohort-${Date.now()}`,
      name: cleanName,
      programId: programId,
      active: true,
      departments: finalDepts
    };

    addCohort(newCohortItem);
    setNewCohortName('');
    setShowAddCohortId(null);
    setExpandedCohortId(newCohortItem.id);
  };

  // Add Department handler
  const handleCreateDepartment = (cohortId: string) => {
    if (!newDeptName.trim()) return;
    const cleanName = newDeptName.trim();
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;

    const currentDepts = cohort.departments || [];
    if (currentDepts.some(d => d.toLowerCase() === cleanName.toLowerCase())) {
      alert('Department already exists in this cohort.');
      return;
    }

    const updatedDepts = [...currentDepts, cleanName];
    updateCohort(cohortId, { departments: updatedDepts });
    setNewDeptName('');
    setShowAddDeptId(null);
  };

  // Delete Department handler
  const handleDeleteDepartment = async (cohortId: string, deptName: string) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;

    const hasContacts = directoryContacts.some(c => c.cohortId === cohortId && c.department === deptName);
    if (hasContacts) {
      alert('Cannot delete department because it still contains contacts. Please remove or move them first.');
      return;
    }

    if (await confirm(`Are you sure you want to delete the department "${deptName}"?`, "Delete Department")) {
      const updatedDepts = (cohort.departments || []).filter(d => d !== deptName);
      updateCohort(cohortId, { departments: updatedDepts });
    }
  };

  // Save Department Group Email handler
  const handleSaveDeptEmail = (cohortId: string, deptName: string) => {
    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;
    
    const updatedEmails = { ...(cohort.departmentEmails || {}) };
    const emailVal = tempDeptEmail.trim();
    
    if (emailVal === '') {
      delete updatedEmails[deptName];
    } else {
      updatedEmails[deptName] = emailVal;
    }
    
    updateCohort(cohortId, { departmentEmails: updatedEmails });
    setEditingDeptEmailKey(null);
    setTempDeptEmail('');
  };

  // Add Contact handler
  const handleAddContact = (programId: string, cohortId: string, department: string) => {
    if (!contactName.trim()) {
      alert('Contact Name is required.');
      return;
    }

    const finalDept = cohortId === '' ? contactDept.trim() : department;

    const newContact: DirectoryContact = {
      id: `dir-contact-${Date.now()}`,
      name: contactName.trim(),
      email: contactEmail.trim(),
      mobile: contactMobile.trim(),
      whatsapp: contactWhatsapp.trim(),
      tier: contactTier,
      programId,
      cohortId,
      department: finalDept
    };

    addDirectoryContact(newContact);

    // If it's a general POC and they provided a department, add this department to all cohorts of the program
    if (cohortId === '' && finalDept) {
      const programCohorts = cohorts.filter(c => c.programId === programId);
      programCohorts.forEach(cohort => {
        const currentDepts = cohort.departments || [];
        const hasDept = currentDepts.some(d => d.toLowerCase() === finalDept.toLowerCase());
        if (!hasDept) {
          const updatedDepts = [...currentDepts, finalDept];
          updateCohort(cohort.id, { departments: updatedDepts });
        }
      });
    }

    // Reset inputs
    setContactName('');
    setContactEmail('');
    setContactMobile('');
    setContactWhatsapp('');
    setContactTier('L0');
    setContactDept('');
    setActiveFormId(null);
  };

  // Import Cohort Contacts logic
  const handleImportContacts = (targetCohortId: string, sourceCohortId: string) => {
    if (!sourceCohortId || !targetCohortId) return;
    const targetCohort = cohorts.find(c => c.id === targetCohortId);
    const sourceCohort = cohorts.find(c => c.id === sourceCohortId);
    if (!targetCohort || !sourceCohort) return;

    const sourceContacts = directoryContacts.filter(c => c.cohortId === sourceCohortId);
    if (sourceContacts.length === 0) {
      alert('Selected cohort has no contacts to import.');
      return;
    }

    const targetContacts = directoryContacts.filter(c => c.cohortId === targetCohortId);
    let importedCount = 0;
    const departmentsToUpdate = new Set<string>(targetCohort.departments || []);

    sourceContacts.forEach((srcContact, index) => {
      // Avoid duplicates by email inside the same cohort
      const isDuplicate = srcContact.email && targetContacts.some(
        tc => tc.email.toLowerCase() === srcContact.email.toLowerCase()
      );
      if (isDuplicate) return;

      const newContact: DirectoryContact = {
        id: `dir-contact-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        name: srcContact.name,
        email: srcContact.email || '',
        mobile: srcContact.mobile || '',
        whatsapp: srcContact.whatsapp || '',
        tier: srcContact.tier || 'L0',
        programId: targetCohort.programId,
        cohortId: targetCohortId,
        department: srcContact.department
      };

      addDirectoryContact(newContact);
      departmentsToUpdate.add(srcContact.department);
      importedCount++;
    });

    // Add any new department categories to target cohort
    const currentDepts = targetCohort.departments || [];
    if (departmentsToUpdate.size > currentDepts.length) {
      updateCohort(targetCohortId, { departments: Array.from(departmentsToUpdate) });
    }

    alert(`Successfully imported ${importedCount} contact(s) into ${targetCohort.name}!`);
    setShowImportCohortId(null);
    setImportSourceCohortId('');
  };

  // Edit Contact Trigger
  const handleStartEdit = (contact: DirectoryContact) => {
    setEditingContactId(contact.id);
    setEditName(contact.name);
    setEditEmail(contact.email || '');
    setEditMobile(contact.mobile || '');
    setEditWhatsapp(contact.whatsapp || '');
    setEditTier(contact.tier || 'L0');
    setEditDept(contact.department || '');
  };

  // Save Contact Edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      alert('Name is required');
      return;
    }
    updateDirectoryContact(id, {
      name: editName.trim(),
      email: editEmail.trim(),
      mobile: editMobile.trim(),
      whatsapp: editWhatsapp.trim(),
      tier: editTier,
      department: editDept.trim()
    });
    setEditingContactId(null);
  };

  // Filter contacts by search query
  const getFilteredContacts = (contactsList: DirectoryContact[]) => {
    let list = contactsList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = contactsList.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.mobile.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query)
      );
    }
    
    // Sort by tier: L2 > L1 > L0, then alphabetically by name
    const tierOrder = { 'L2': 2, 'L1': 1, 'L0': 0 };
    return [...list].sort((a, b) => {
      const scoreA = tierOrder[a.tier] ?? 0;
      const scoreB = tierOrder[b.tier] ?? 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const getTierBadgeStyle = (tier: string) => {
    if (tier === 'L0') {
      return { background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' };
    }
    if (tier === 'L1') {
      return { background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.15)' };
    }
    return { background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.15)' };
  };

  // Get active Program object
  const activeProgram = programs.find(p => p.id === selectedProgramId) || programs[0];

  return (
    <>
      <TabContainer
        title="Contacts Directory"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search directory contacts..."
      >
        <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          
          {/* PROGRAM SUB-TABS ROW */}
          <div 
            style={{
              display: 'flex',
              gap: '1.5rem',
              borderBottom: '1.5px solid var(--border)',
              padding: '0 1.5rem',
              flexShrink: 0,
              backgroundColor: 'var(--panel-bg)',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {programs.map(program => {
              const activeCohortIds = new Set(cohorts.filter(c => c.programId === program.id && c.active).map(c => c.id));
              const programContacts = directoryContacts.filter(c => 
                c.programId === program.id && 
                (!c.cohortId || activeCohortIds.has(c.cohortId))
              );
              const isActive = selectedProgramId === program.id;

              return (
                <button
                  key={program.id}
                  onClick={() => {
                    setSelectedProgramId(program.id);
                    setShowAddCohortId(null);
                    setExpandedCohortId(null);
                  }}
                  style={{
                    padding: '0.75rem 0.25rem',
                    border: 'none',
                    background: 'none',
                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {program.name}
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.625rem', 
                      padding: '1px 5px', 
                      borderRadius: '999px',
                      background: isActive ? 'var(--primary-glow)' : 'var(--background-alt)',
                      color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                    }}
                  >
                    {programContacts.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE PROGRAM BLOCK */}
          {activeProgram && (() => {
            const programCohorts = cohorts.filter(c => c.programId === activeProgram.id && c.active);
            const programContacts = directoryContacts.filter(c => c.programId === activeProgram.id);
            const programEmails = programContacts.map(c => c.email);
            const generalContacts = programContacts.filter(c => !c.cohortId);
            const filteredGeneralContacts = getFilteredContacts(generalContacts);

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* GENERAL PROGRAM POCs SECTION (Boxless style matching rest of UI) */}
                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1.5px solid var(--border)' }}>
                  <div style={{
                    padding: '0.6rem 1.5rem',
                    background: 'var(--background-alt)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={13} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        General Program POCs
                      </span>
                      <span className="badge" style={{ fontSize: '0.625rem', padding: '1.5px 5px', borderRadius: '10px', background: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {generalContacts.length}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        if (activeFormId?.cohortId === 'general') {
                          setActiveFormId(null);
                        } else {
                          setActiveFormId({ cohortId: 'general', dept: 'general' });
                          setContactName('');
                          setContactEmail('');
                          setContactMobile('');
                          setContactWhatsapp('');
                          setContactTier('L0');
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', height: '22px' }}
                    >
                      <Plus size={9} />
                      Add General POC
                    </button>
                  </div>

                  {/* Inline Add General POC Form */}
                  {activeFormId?.cohortId === 'general' && (
                    <div style={{ padding: '0.75rem 1.5rem 0.75rem 3.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                      <h4 style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Add General Program POC</h4>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* Name & Autocomplete */}
                        <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
                          <input 
                            type="text"
                            value={contactName}
                            onChange={(e) => {
                              setContactName(e.target.value);
                              setShowSuggestions(true);
                            }}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="Search/Type Name..."
                            onFocus={() => setShowSuggestions(true)}
                          />
                          {/* Auto Suggestions */}
                          {showSuggestions && suggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 150, backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: '4px', boxShadow: 'var(--shadow-sm)', maxHeight: '140px', overflowY: 'auto' }}>
                              {suggestions.map(sug => (
                                <div 
                                  key={sug.id}
                                  onClick={() => handleSelectSuggestion(sug)}
                                  style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.7rem' }}
                                  className="suggestion-item"
                                >
                                  <div style={{ fontWeight: 600 }}>{sug.name}</div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{sug.email}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        <div style={{ flex: 1.2, minWidth: '150px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                          <input 
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="email@example.com"
                          />
                        </div>

                        {/* Mobile */}
                        <div style={{ flex: 0.8, minWidth: '110px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile</label>
                          <input 
                            type="text"
                            value={contactMobile}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="9999988888"
                          />
                        </div>

                        {/* WhatsApp */}
                        <div style={{ flex: 0.8, minWidth: '110px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>WhatsApp</label>
                          <input 
                            type="text"
                            value={contactWhatsapp}
                            onChange={(e) => setContactWhatsapp(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="WhatsApp..."
                          />
                        </div>

                        {/* Tier */}
                        <div style={{ flex: 0.5, minWidth: '70px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tier</label>
                          <select 
                            value={contactTier}
                            onChange={(e) => setContactTier(e.target.value as any)}
                            className="form-control"
                            style={{ padding: '3px 6px', fontSize: '0.725rem', width: '100%', height: '26px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                          >
                            <option value="L0">L0</option>
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                          </select>
                        </div>

                        {/* Department */}
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department</label>
                          <input 
                            type="text"
                            value={contactDept}
                            onChange={(e) => setContactDept(e.target.value)}
                            className="form-control"
                            style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                            placeholder="e.g. Operations"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                        <button 
                          onClick={() => handleAddContact(activeProgram.id, '', '')}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setActiveFormId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                        >
                          Cancel
                        </button>
                      </div>
                      {showSuggestions && (
                        <div onClick={() => setShowSuggestions(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 140, background: 'transparent' }} />
                      )}
                    </div>
                  )}

                  {/* General POCs Table */}
                  <div className="table-responsive" style={{ paddingLeft: '3.5rem', background: 'transparent', overflowX: 'auto' }}>
                    <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ background: 'transparent', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Name</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Department</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Email</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Mobile</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>WhatsApp</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-secondary)', width: '60px', fontWeight: 600, border: 'none' }}>Tier</th>
                          <th style={{ padding: '6px 10px', fontSize: '0.65rem', width: '50px', border: 'none' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGeneralContacts.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.7rem' }}>
                              No general POCs configured for this program.
                            </td>
                          </tr>
                        ) : (
                          filteredGeneralContacts.map(contact => {
                            const isEditing = editingContactId === contact.id;

                            return (
                              <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-light)', background: 'transparent' }}>
                                {/* Name */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 500, border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }}
                                    />
                                  ) : (
                                    contact.name
                                  )}
                                </td>

                                {/* Department */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', color: 'var(--text-secondary)', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editDept}
                                      onChange={(e) => setEditDept(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }}
                                    />
                                  ) : (
                                    contact.department || '—'
                                  )}
                                </td>

                                {/* Email */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="email" 
                                      value={editEmail}
                                      onChange={(e) => setEditEmail(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '180px' }}
                                    />
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <span>{contact.email || '—'}</span>
                                      {contact.email && (
                                        <button 
                                          onClick={() => copyToClipboard([contact.email], contact.name)}
                                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}
                                          title="Copy email"
                                        >
                                          <Copy size={9} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Mobile */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editMobile}
                                      onChange={(e) => setEditMobile(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                    />
                                  ) : (
                                    contact.mobile ? (
                                      <a href={`tel:${contact.mobile}`} style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                                        <Phone size={9} style={{ color: 'var(--text-muted)' }} />
                                        {contact.mobile}
                                      </a>
                                    ) : '—'
                                  )}
                                </td>

                                {/* WhatsApp */}
                                <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                  {isEditing ? (
                                    <input 
                                      type="text" 
                                      value={editWhatsapp}
                                      onChange={(e) => setEditWhatsapp(e.target.value)}
                                      className="form-control"
                                      style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                    />
                                  ) : (
                                    contact.whatsapp ? (
                                      <a 
                                        href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                      >
                                        <MessageCircle size={10} style={{ color: '#25D366' }} />
                                        {contact.whatsapp}
                                      </a>
                                    ) : '—'
                                  )}
                                </td>

                                {/* Tier */}
                                <td style={{ padding: '6px 10px', textAlign: 'center', border: 'none' }}>
                                  {isEditing ? (
                                    <select 
                                      value={editTier}
                                      onChange={(e) => setEditTier(e.target.value as any)}
                                      className="form-control"
                                      style={{ padding: '2px 4px', fontSize: '0.7rem', height: '22px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                                    >
                                      <option value="L0">L0</option>
                                      <option value="L1">L1</option>
                                      <option value="L2">L2</option>
                                    </select>
                                  ) : (
                                    <span 
                                      className="badge" 
                                      style={{ 
                                        fontSize: '0.6rem', 
                                        padding: '1px 5px',
                                        fontWeight: 600,
                                        borderRadius: '999px',
                                        ...getTierBadgeStyle(contact.tier || 'L0') 
                                      }}
                                    >
                                      {contact.tier || 'L0'}
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td style={{ padding: '6px 10px', border: 'none' }}>
                                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                    {isEditing ? (
                                      <>
                                        <button 
                                          onClick={() => handleSaveEdit(contact.id)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }}
                                          title="Save Changes"
                                        >
                                          <CheckCircle size={11} />
                                        </button>
                                        <button 
                                          onClick={() => setEditingContactId(null)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                          title="Cancel"
                                        >
                                          <X size={11} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          onClick={() => handleStartEdit(contact)}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                                          title="Edit Contact"
                                        >
                                          <Edit2 size={10} />
                                        </button>
                                        <button 
                                          onClick={async () => {
                                            if (await confirm(`Are you sure you want to remove this general POC?`, "Delete General POC")) {
                                              deleteDirectoryContact(contact.id);
                                            }
                                          }} 
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                          title="Delete Contact"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ACTIVE PROGRAM ACTION HEADER (Cohorts section starts here) */}
                <div 
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: 'var(--background-alt)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Cohorts in {activeProgram.name}
                    </span>
                    <span className="badge" style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '10px' }}>
                      {programCohorts.length} Cohorts
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => copyToClipboard(programEmails, `${activeProgram.name} Program`)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', height: '22px' }}
                      title="Copy all emails in this program"
                    >
                      <Copy size={10} />
                      Copy Emails
                    </button>
                  </div>
                </div>

                {/* ADD COHORT INLINE INPUT ROW */}
                {showAddCohortId === activeProgram.id && (
                  <div style={{ padding: '0.6rem 1.5rem 0.6rem 2.5rem', borderBottom: '1px solid var(--border)', background: 'var(--background)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="text"
                      placeholder="Cohort Name (e.g. UG2026)"
                      value={newCohortName}
                      onChange={(e) => setNewCohortName(e.target.value)}
                      className="form-control"
                      style={{ maxWidth: '200px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCohort(activeProgram.id)}
                    />
                    <button 
                      onClick={() => handleCreateCohort(activeProgram.id)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setShowAddCohortId(null)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* COHORTS ACCORDION LIST */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {programCohorts.length === 0 ? (
                    <div style={{ padding: '1.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      No cohorts found. Click "Add Cohort" to create one.
                    </div>
                  ) : (
                    programCohorts.map(cohort => {
                      const isCohortExpanded = expandedCohortId === cohort.id;
                      const cohortContacts = directoryContacts.filter(c => c.cohortId === cohort.id);
                      const cohortEmails = cohortContacts.map(c => c.email);

                      // Get department names from General Program POCs of active program
                      const generalProgramDepts = Array.from(new Set(
                        directoryContacts
                          .filter(c => c.programId === activeProgram.id && !c.cohortId && c.department && c.department.trim() !== '')
                          .map(c => c.department.trim())
                      ));

                      const rawDepts = [
                        ...(cohort.departments || []),
                        ...generalProgramDepts
                      ];

                      // Deduplicate case-insensitively
                      const seenDepts = new Set<string>();
                      const departmentsList: string[] = [];
                      for (const d of rawDepts) {
                        const lower = d.toLowerCase();
                        if (!seenDepts.has(lower)) {
                          seenDepts.add(lower);
                          departmentsList.push(d);
                        }
                      }

                      return (
                        <div key={cohort.id} style={{ display: 'flex', flexDirection: 'column' }}>
                          
                          {/* COHORT HEADER ROW */}
                          <div 
                            onClick={() => setExpandedCohortId(isCohortExpanded ? null : cohort.id)}
                            className="accordion-header-row"
                            style={{
                              padding: '0.6rem 1.5rem 0.6rem 2.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none',
                              borderBottom: '1px solid var(--border-light)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isCohortExpanded ? <ChevronDown size={13} style={{ color: 'var(--primary)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />}
                              <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                {cohort.name}
                              </span>
                              <span className="badge" style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '999px', background: 'var(--background-alt)', color: 'var(--text-secondary)' }}>
                                {departmentsList.length} Depts
                              </span>
                              <span className="badge" style={{ fontSize: '0.625rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(123, 97, 255, 0.08)', color: '#7b61ff' }}>
                                {cohortContacts.length} Contacts
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => copyToClipboard(cohortEmails, `Cohort ${cohort.name}`)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', height: '22px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                title="Copy all emails in this cohort"
                              >
                                <Copy size={9} />
                                Copy Emails
                              </button>
                              <button 
                                onClick={() => {
                                  setShowImportCohortId(showImportCohortId === cohort.id ? null : cohort.id);
                                  setImportSourceCohortId('');
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', height: '22px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                title="Import contacts from another cohort"
                              >
                                <Upload size={10} />
                                Import
                              </button>
                            </div>
                          </div>

                          {/* IMPORT COHORT INLINE SELECTOR */}
                          {showImportCohortId === cohort.id && (
                            <div style={{ padding: '0.5rem 1.5rem 0.5rem 3.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background-alt)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Import from:</span>
                              <select
                                value={importSourceCohortId}
                                onChange={(e) => setImportSourceCohortId(e.target.value)}
                                className="form-control"
                                style={{ maxWidth: '240px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                              >
                                <option value="">-- Select Cohort --</option>
                                {programs.map(p => {
                                  const otherCohorts = cohorts.filter(c => c.programId === p.id && c.id !== cohort.id && c.active);
                                  if (otherCohorts.length === 0) return null;
                                  return (
                                    <optgroup key={p.id} label={`${p.name} Program`}>
                                      {otherCohorts.map(oc => {
                                        const ocContactsCount = directoryContacts.filter(dc => dc.cohortId === oc.id).length;
                                        return (
                                          <option key={oc.id} value={oc.id}>
                                            {oc.name} ({ocContactsCount} contacts)
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  );
                                })}
                              </select>
                              <button 
                                onClick={() => handleImportContacts(cohort.id, importSourceCohortId)}
                                className="btn btn-primary btn-sm"
                                disabled={!importSourceCohortId}
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px', opacity: !importSourceCohortId ? 0.5 : 1, cursor: !importSourceCohortId ? 'not-allowed' : 'pointer' }}
                              >
                                Import
                              </button>
                              <button 
                                onClick={() => setShowImportCohortId(null)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* ADD DEPARTMENT INLINE INPUT ROW */}
                          {showAddDeptId === cohort.id && (
                            <div style={{ padding: '0.5rem 1.5rem 0.5rem 3.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input 
                                type="text"
                                placeholder="Department Name (e.g. Placement)"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                className="form-control"
                                style={{ maxWidth: '180px', padding: '4px 6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateDepartment(cohort.id)}
                              />
                              <button 
                                onClick={() => handleCreateDepartment(cohort.id)}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setShowAddDeptId(null)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* DEPARTMENTS FLAT LIST */}
                          {isCohortExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {departmentsList.length === 0 ? (
                                <div style={{ padding: '0.75rem 3.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                                  No departments found. Add a department to get started.
                                </div>
                              ) : (
                                departmentsList.map(deptName => {
                                  const deptContacts = cohortContacts.filter(
                                    c => c.department?.toLowerCase() === deptName.toLowerCase()
                                  );
                                  const filteredDeptContacts = getFilteredContacts(deptContacts);
                                  const deptEmails = deptContacts.map(c => c.email);
                                  const isFormActive = activeFormId?.cohortId === cohort.id && activeFormId?.dept === deptName;

                                  return (
                                    <div key={deptName} style={{ display: 'flex', flexDirection: 'column' }}>
                                      
                                      {/* DEPARTMENT FLAT HEADER ROW */}
                                      <div 
                                        style={{
                                          padding: '0.55rem 1.5rem 0.55rem 3.75rem',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          borderBottom: '1px solid var(--border-light)',
                                          background: 'var(--background-alt)'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                          <span style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {deptName}
                                          </span>
                                          <span className="badge" style={{ fontSize: '0.6rem', padding: '0.5px 4px', borderRadius: '6px', background: 'var(--border)', color: 'var(--text-muted)' }}>
                                            {deptContacts.length}
                                          </span>

                                          {/* Group Email ID */}
                                          {editingDeptEmailKey === `${cohort.id}-${deptName}` ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.6rem' }} onClick={(e) => e.stopPropagation()}>
                                              <input 
                                                type="email"
                                                value={tempDeptEmail}
                                                onChange={(e) => setTempDeptEmail(e.target.value)}
                                                placeholder="Enter group email..."
                                                className="form-control"
                                                style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px', border: '1px solid var(--primary)', width: '170px', height: '20px' }}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    handleSaveDeptEmail(cohort.id, deptName);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingDeptEmailKey(null);
                                                  }
                                                }}
                                              />
                                              <button
                                                onClick={() => handleSaveDeptEmail(cohort.id, deptName)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                title="Save Group Email"
                                              >
                                                <Check size={12} />
                                              </button>
                                              <button
                                                onClick={() => setEditingDeptEmailKey(null)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                title="Cancel"
                                              >
                                                <X size={12} />
                                              </button>
                                            </div>
                                          ) : cohort.departmentEmails?.[deptName] ? (
                                            <div 
                                              style={{ 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '0.35rem', 
                                                background: 'rgba(123, 97, 255, 0.06)', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                border: '1px solid rgba(123, 97, 255, 0.18)', 
                                                marginLeft: '0.6rem',
                                                height: '20px'
                                              }}
                                            >
                                              <Mail size={9} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                                              <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 500 }}>
                                                {cohort.departmentEmails[deptName]}
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigator.clipboard.writeText(cohort.departmentEmails![deptName]);
                                                  alert(`Copied ${deptName} Group Email to clipboard!`);
                                                }}
                                                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                title="Copy Group Email"
                                              >
                                                <Copy size={9} />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingDeptEmailKey(`${cohort.id}-${deptName}`);
                                                  setTempDeptEmail(cohort.departmentEmails?.[deptName] || '');
                                                }}
                                                style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                title="Edit Group Email"
                                              >
                                                <Edit2 size={9} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingDeptEmailKey(`${cohort.id}-${deptName}`);
                                                setTempDeptEmail('');
                                              }}
                                              className="btn btn-secondary btn-sm"
                                              style={{ 
                                                padding: '1px 6px', 
                                                fontSize: '0.65rem', 
                                                borderRadius: '4px', 
                                                height: '20px', 
                                                marginLeft: '0.6rem', 
                                                border: '1px dashed var(--border)',
                                                background: 'transparent',
                                                color: 'var(--text-secondary)',
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '0.25rem',
                                                cursor: 'pointer'
                                              }}
                                              title="Add Group Email ID"
                                            >
                                              <Plus size={9} />
                                              Group Email
                                            </button>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                          <button 
                                            onClick={() => copyToClipboard(deptEmails, `${deptName} Dept`)}
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: '4px', height: '20px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                            title="Copy all emails in this department"
                                          >
                                            <Copy size={9} />
                                            Copy Emails
                                          </button>
                                          <button 
                                            onClick={() => {
                                              if (isFormActive) {
                                                setActiveFormId(null);
                                              } else {
                                                setActiveFormId({ cohortId: cohort.id, dept: deptName });
                                                setContactName('');
                                                setContactEmail('');
                                                setContactMobile('');
                                                setContactWhatsapp('');
                                                setContactTier('L0');
                                              }
                                            }}
                                            className="btn btn-secondary btn-sm"
                                            style={{ padding: '1px 5px', fontSize: '0.625rem', borderRadius: '4px', height: '20px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                          >
                                            <Plus size={9} />
                                            Add Contact
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteDepartment(cohort.id, deptName)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', marginLeft: '0.25rem' }}
                                            title="Delete Department"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* INLINE ADD CONTACT FORM */}
                                      {isFormActive && (
                                        <div style={{ padding: '0.75rem 1.5rem 0.75rem 5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--background)', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                                          <h4 style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Add New Contact</h4>
                                          
                                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {/* NAME & AUTOCOMPLETE */}
                                            <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</label>
                                              <input 
                                                type="text"
                                                value={contactName}
                                                onChange={(e) => {
                                                  setContactName(e.target.value);
                                                  setShowSuggestions(true);
                                                }}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="Search/Type Name..."
                                                onFocus={() => setShowSuggestions(true)}
                                              />
                                              {/* AUTOCOMPLETE SUGGESTIONS BOX */}
                                              {showSuggestions && suggestions.length > 0 && (
                                                <div 
                                                  style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    zIndex: 150,
                                                    backgroundColor: 'var(--panel-bg)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    maxHeight: '140px',
                                                    overflowY: 'auto'
                                                  }}
                                                >
                                                  {suggestions.map(sug => {
                                                    const parentCohort = cohorts.find(c => c.id === sug.cohortId);
                                                    return (
                                                      <div 
                                                        key={sug.id}
                                                        onClick={() => handleSelectSuggestion(sug)}
                                                        style={{
                                                          padding: '6px 8px',
                                                          cursor: 'pointer',
                                                          borderBottom: '1px solid var(--border)',
                                                          fontSize: '0.7rem',
                                                          textAlign: 'left'
                                                        }}
                                                        className="suggestion-item"
                                                      >
                                                        <div style={{ fontWeight: 600 }}>{sug.name}</div>
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                                                          {sug.email} • {parentCohort?.name || 'Unknown'} ({sug.department})
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>

                                            {/* EMAIL */}
                                            <div style={{ flex: 1.2, minWidth: '150px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
                                              <input 
                                                type="email"
                                                value={contactEmail}
                                                onChange={(e) => setContactEmail(e.target.value)}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="email@example.com"
                                              />
                                            </div>

                                            {/* MOBILE */}
                                            <div style={{ flex: 0.8, minWidth: '110px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile</label>
                                              <input 
                                                type="text"
                                                value={contactMobile}
                                                onChange={(e) => handleMobileChange(e.target.value)}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="9999988888"
                                              />
                                            </div>

                                            {/* WHATSAPP */}
                                            <div style={{ flex: 0.8, minWidth: '110px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>WhatsApp</label>
                                              <input 
                                                type="text"
                                                value={contactWhatsapp}
                                                onChange={(e) => setContactWhatsapp(e.target.value)}
                                                className="form-control"
                                                style={{ padding: '4px 6px', fontSize: '0.725rem', width: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                placeholder="WhatsApp Number..."
                                              />
                                            </div>

                                            {/* TIER */}
                                            <div style={{ flex: 0.5, minWidth: '70px' }}>
                                              <label style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tier</label>
                                              <select 
                                                value={contactTier}
                                                onChange={(e) => setContactTier(e.target.value as any)}
                                                className="form-control"
                                                style={{ padding: '3px 6px', fontSize: '0.725rem', width: '100%', height: '26px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                                              >
                                                <option value="L0">L0</option>
                                                <option value="L1">L1</option>
                                                <option value="L2">L2</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                            <button 
                                              onClick={() => handleAddContact(activeProgram.id, cohort.id, deptName)}
                                              className="btn btn-primary btn-sm"
                                              style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                                            >
                                              Add Contact
                                            </button>
                                            <button 
                                              onClick={() => setActiveFormId(null)}
                                              className="btn btn-secondary btn-sm"
                                              style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '4px' }}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                          {/* Suggestion closing clickaway */}
                                          {showSuggestions && (
                                            <div 
                                              onClick={() => setShowSuggestions(false)}
                                              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 140, background: 'transparent' }}
                                            />
                                          )}
                                        </div>
                                      )}

                                      {/* 4. CONTACTS LIST GRID TABLE */}
                                      <div className="table-responsive" style={{ paddingLeft: '5rem', background: 'transparent', overflowX: 'auto' }}>
                                        <table className="grid-table" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: '0.72rem' }}>
                                          <thead>
                                            <tr style={{ background: 'transparent', borderBottom: '1px solid var(--border)' }}>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Name</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Email</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>Mobile</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, border: 'none' }}>WhatsApp</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', textAlign: 'center', color: 'var(--text-secondary)', width: '60px', fontWeight: 600, border: 'none' }}>Tier</th>
                                              <th style={{ padding: '6px 10px', fontSize: '0.65rem', width: '50px', border: 'none' }}></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {filteredDeptContacts.length === 0 ? (
                                              <tr>
                                                <td colSpan={6} style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.7rem', borderBottom: '1px solid var(--border-light)' }}>
                                                  {searchQuery ? 'No matching contacts.' : 'No contacts.'}
                                                </td>
                                              </tr>
                                            ) : (
                                              filteredDeptContacts.map(contact => {
                                                const isEditing = editingContactId === contact.id;

                                                return (
                                                  <tr 
                                                    key={contact.id}
                                                    style={{
                                                      borderBottom: '1px solid var(--border-light)',
                                                      background: 'transparent'
                                                    }}
                                                  >
                                                    {/* NAME */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', fontWeight: 500, border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="text" 
                                                          value={editName}
                                                          onChange={(e) => setEditName(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '120px' }}
                                                        />
                                                      ) : (
                                                        contact.name
                                                      )}
                                                    </td>

                                                    {/* EMAIL */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="email" 
                                                          value={editEmail}
                                                          onChange={(e) => setEditEmail(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '180px' }}
                                                        />
                                                      ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                          <span>{contact.email || '—'}</span>
                                                          {contact.email && (
                                                            <button 
                                                              onClick={() => copyToClipboard([contact.email], contact.name)}
                                                              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                              title="Copy email"
                                                            >
                                                              <Copy size={9} />
                                                            </button>
                                                          )}
                                                        </div>
                                                      )}
                                                    </td>

                                                    {/* MOBILE */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="text" 
                                                          value={editMobile}
                                                          onChange={(e) => setEditMobile(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                                        />
                                                      ) : (
                                                        contact.mobile ? (
                                                          <a href={`tel:${contact.mobile}`} style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                                                            <Phone size={9} style={{ color: 'var(--text-muted)' }} />
                                                            {contact.mobile}
                                                          </a>
                                                        ) : '—'
                                                      )}
                                                    </td>

                                                    {/* WHATSAPP */}
                                                    <td style={{ padding: '6px 10px', fontSize: '0.72rem', border: 'none' }}>
                                                      {isEditing ? (
                                                        <input 
                                                          type="text" 
                                                          value={editWhatsapp}
                                                          onChange={(e) => setEditWhatsapp(e.target.value)}
                                                          className="form-control"
                                                          style={{ padding: '3px 5px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border)', width: '100px' }}
                                                        />
                                                      ) : (
                                                        contact.whatsapp ? (
                                                          <a 
                                                            href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                                                          >
                                                            <MessageCircle size={10} style={{ color: '#25D366' }} />
                                                            {contact.whatsapp}
                                                          </a>
                                                        ) : '—'
                                                      )}
                                                    </td>

                                                    {/* TIER */}
                                                    <td style={{ padding: '6px 10px', textAlign: 'center', border: 'none' }}>
                                                      {isEditing ? (
                                                        <select 
                                                          value={editTier}
                                                          onChange={(e) => setEditTier(e.target.value as any)}
                                                          className="form-control"
                                                          style={{ padding: '2px 4px', fontSize: '0.7rem', height: '22px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer' }}
                                                        >
                                                          <option value="L0">L0</option>
                                                          <option value="L1">L1</option>
                                                          <option value="L2">L2</option>
                                                        </select>
                                                      ) : (
                                                        <span 
                                                          className="badge" 
                                                          style={{ 
                                                            fontSize: '0.6rem', 
                                                            padding: '1px 5px',
                                                            fontWeight: 600,
                                                            borderRadius: '999px',
                                                            ...getTierBadgeStyle(contact.tier || 'L0') 
                                                          }}
                                                        >
                                                          {contact.tier || 'L0'}
                                                        </span>
                                                      )}
                                                    </td>

                                                    {/* ACTIONS */}
                                                    <td style={{ padding: '6px 10px', border: 'none' }}>
                                                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                        {isEditing ? (
                                                          <>
                                                            <button 
                                                              onClick={() => handleSaveEdit(contact.id)}
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }}
                                                              title="Save Changes"
                                                            >
                                                              <CheckCircle size={11} />
                                                            </button>
                                                            <button 
                                                              onClick={() => setEditingContactId(null)}
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                                              title="Cancel"
                                                            >
                                                              <X size={11} />
                                                            </button>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <button 
                                                              onClick={() => handleStartEdit(contact)}
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                                                              title="Edit Contact"
                                                            >
                                                              <Edit2 size={10} />
                                                            </button>
                                                            <button 
                                                              onClick={async () => {
                                                                if (await confirm(`Are you sure you want to remove contact "${contact.name}"?`, "Delete Contact")) {
                                                                  deleteDirectoryContact(contact.id);
                                                                }
                                                              }} 
                                                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                                              title="Delete Contact"
                                                            >
                                                              <Trash2 size={10} />
                                                            </button>
                                                          </>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })()}
        </div>
      </TabContainer>
    </>
  );
};

// ── SIMPLE LINK REPOSITORY VIEW COMPONENT ──────────────────────────────────────────

import { FolderOpen as FolderIcon, Check as CheckIcon, X as CancelIcon, Save as SaveIcon, GripVertical as GripIcon } from 'lucide-react';

const FaviconImage: React.FC<{ url: string }> = ({ url }) => {
  const [error, setError] = useState(false);
  if (error || !url) {
    return <span style={{ fontSize: '0.9rem', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>🔗</span>;
  }
  
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    return <span style={{ fontSize: '0.9rem', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>🔗</span>;
  }

  return (
    <img 
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
      onError={() => setError(true)}
      alt=""
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '3px',
        objectFit: 'contain',
        display: 'inline-block',
        flexShrink: 0
      }}
    />
  );
};

export const RepositoryView: React.FC = () => {
  const {
    repoTabs = [], addRepoTab, updateRepoTab, deleteRepoTab,
    repoDocs = [], addRepoDoc, updateRepoDoc, deleteRepoDoc,
    isLoading, syncStatus,
    confirm, alert
  } = useDashboard();

  // Active states
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab management states
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  // Item form states (Add / Edit)
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  // Copy success animation states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drag and drop states
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  // Local list states for smooth, high-fidelity drag-and-drop
  const [localTabs, setLocalTabs] = useState<any[]>([]);
  const [localLinks, setLocalLinks] = useState<any[]>([]);

  // Synchronize local states when underlying dashboard context values modify
  useEffect(() => {
    if (!draggedTabId) {
      setLocalTabs([...repoTabs].sort((a, b) => a.order - b.order));
    }
  }, [repoTabs, draggedTabId]);

  useEffect(() => {
    if (!draggedItemId) {
      const tabLinks = repoDocs
        .filter(d => d.tabId === activeTabId)
        .sort((a, b) => a.order - b.order);
      setLocalLinks(tabLinks);
    }
  }, [repoDocs, activeTabId, draggedItemId]);

  // Handle setting first tab as active on load
  useEffect(() => {
    if (repoTabs.length > 0 && !activeTabId) {
      const sorted = [...repoTabs].sort((a, b) => a.order - b.order);
      setActiveTabId(sorted[0].id);
    }
  }, [repoTabs, activeTabId]);

  // Tab Drag Handlers
  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTabId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTabDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverTabId !== targetId) {
      setDragOverTabId(targetId);
    }
    if (!draggedTabId || draggedTabId === targetId) return;

    const dragIndex = localTabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = localTabs.findIndex(t => t.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const newList = [...localTabs];
    const [draggedTab] = newList.splice(dragIndex, 1);
    newList.splice(targetIndex, 0, draggedTab);
    
    setLocalTabs(newList);
  };

  const handleTabDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleTabDragEnd = () => {
    if (draggedTabId) {
      // Persist final order changes exactly once at drop
      localTabs.forEach((tab, index) => {
        if (tab.order !== index) {
          updateRepoTab(tab.id, { order: index });
        }
      });
      setDraggedTabId(null);
    }
    setDragOverTabId(null);
  };

  // Item Drag Handlers
  const handleItemDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragOverItemId !== targetId) {
      setDragOverItemId(targetId);
    }
    if (!draggedItemId || draggedItemId === targetId) return;

    const dragIndex = localLinks.findIndex(l => l.id === draggedItemId);
    const targetIndex = localLinks.findIndex(l => l.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) return;

    const newList = [...localLinks];
    const [draggedItem] = newList.splice(dragIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);

    setLocalLinks(newList);
  };

  const handleItemDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleItemDragEnd = () => {
    if (draggedItemId) {
      // Persist final order changes exactly once at drop
      localLinks.forEach((link, index) => {
        if (link.order !== index) {
          updateRepoDoc(link.id, { order: index });
        }
      });
      setDraggedItemId(null);
    }
    setDragOverItemId(null);
  };


  // Add Repository Tab
  const handleCreateTab = () => {
    if (!newTabName.trim()) return;
    const cleanName = newTabName.trim();
    if (repoTabs.some(t => t.name.toLowerCase() === cleanName.toLowerCase())) {
      alert("A tab with this name already exists.");
      return;
    }
    const newTab = {
      id: `repo-tab-${Date.now()}`,
      name: cleanName,
      order: repoTabs.length
    };
    addRepoTab(newTab);
    setActiveTabId(newTab.id);
    setNewTabName('');
    setIsAddingTab(false);
  };

  // Rename Repository Tab
  const handleSaveRenameTab = (tabId: string) => {
    if (!editingTabName.trim()) return;
    updateRepoTab(tabId, { name: editingTabName.trim() });
    setEditingTabId(null);
  };

  // Delete Repository Tab
  const handleDeleteTabClick = async (tab: any) => {
    if (await confirm(`Are you sure you want to delete tab "${tab.name}"? All links inside will be deleted permanently.`, "Delete Tab")) {
      deleteRepoTab(tab.id);
      setActiveTabId(null);
    }
  };

  // Add Link Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTabId) return;
    if (!itemTitle.trim() || !itemUrl.trim()) {
      alert("Please fill in both name and link fields.");
      return;
    }
    
    // Auto prefix link with https:// if no protocol is given
    let finalUrl = itemUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const docsInTab = repoDocs.filter(d => d.tabId === activeTabId);
    const newItem = {
      id: `repo-doc-${Date.now()}`,
      tabId: activeTabId,
      title: itemTitle.trim(),
      url: finalUrl,
      order: docsInTab.length,
      blocks: []
    };

    addRepoDoc(newItem);
    setItemTitle('');
    setItemUrl('');
    setIsAddingItem(false);
  };

  // Save Edit Item
  const handleSaveEditItem = (itemId: string) => {
    if (!editTitle.trim() || !editUrl.trim()) {
      alert("Fields cannot be empty.");
      return;
    }

    let finalUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    updateRepoDoc(itemId, {
      title: editTitle.trim(),
      url: finalUrl
    });
    setEditingItemId(null);
  };

  // Trigger copy to clipboard
  const handleCopyToClipboard = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Delete Item
  const handleDeleteItem = async (doc: any) => {
    if (await confirm(`Are you sure you want to remove link "${doc.title}"?`, "Delete Link")) {
      deleteRepoDoc(doc.id);
    }
  };

  // Filter links from localLinks state
  const filteredLinks = localLinks.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.url || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="full-canvas-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* 1. TOP HEADER ROW */}
      <div className="sheet-toolbar" style={{ borderBottom: 'none' }}>
        <div className="toolbar-left" style={{ flex: 1, overflow: 'hidden', flexWrap: 'nowrap' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', marginRight: '1.5rem' }}>
            Repository
          </h2>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
          {/* Search links */}
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <Search size={16} />
            <input 
              type="text"
              className="search-input"
              placeholder="Search item or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="search-clear-btn" 
                onClick={() => setSearchQuery('')}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Add item trigger */}
          <button
            onClick={() => {
              setIsAddingItem(true);
              setEditingItemId(null);
            }}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Plus size={14} /> Add Resource Link
          </button>
        </div>
      </div>

      {/* 2. SUB-TABS ROW (Underline Style matching Product Breakdown) */}
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
        {localTabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;
          return (
            <div 
              key={tab.id} 
              onClick={() => {
                setActiveTabId(tab.id);
                setIsAddingItem(false);
                setEditingItemId(null);
              }}
              onDoubleClick={() => {
                setEditingTabId(tab.id);
                setEditingTabName(tab.name);
              }}
              draggable={!isEditing}
              onDragStart={(e) => handleTabDragStart(e, tab.id)}
              onDragOver={(e) => handleTabDragOver(e, tab.id)}
              onDragLeave={handleTabDragLeave}
              onDragEnd={handleTabDragEnd}
              style={{ 
                padding: '0.5rem 0.5rem',
                borderBottom: tab.id === dragOverTabId 
                  ? '2px solid var(--primary)' 
                  : (isActive ? '2px solid var(--primary)' : '2px solid transparent'),
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: isEditing ? 'default' : 'grab',
                transition: 'all 0.2s',
                outline: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none',
                backgroundColor: tab.id === dragOverTabId ? 'var(--primary-glow)' : 'transparent',
                borderRadius: tab.id === dragOverTabId ? '4px' : '0px',
                opacity: tab.id === draggedTabId ? 0.4 : 1
              }}
            >
              {isEditing ? (
                <input 
                  type="text"
                  value={editingTabName}
                  onChange={(e) => setEditingTabName(e.target.value)}
                  onBlur={() => handleSaveRenameTab(tab.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameTab(tab.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: '2px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--background)', color: 'var(--text-primary)' }}
                  autoFocus
                />
              ) : (
                <>
                  {tab.name}
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTabClick(tab);
                    }}
                    style={{ fontSize: '0.75rem', opacity: isActive ? 0.6 : 0.2, cursor: 'pointer', marginLeft: '4px' }}
                    title="Delete Tab"
                  >
                    ×
                  </span>
                </>
              )}
            </div>
          );
        })}

        {/* Inline add tab trigger */}
        {isAddingTab ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input 
              type="text"
              placeholder="New Tab Name..."
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTab()}
              style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={handleCreateTab} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Add</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsAddingTab(false)} style={{ padding: '3px 6px', fontSize: '0.7rem' }}>×</button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingTab(true)}
            style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '6px', padding: '0.3rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <Plus size={12} /> Add Tab
          </button>
        )}
      </div>

      {/* 3. MAIN RESOURSE CANVAS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, width: '100%', overflowY: 'auto' }}>
        {!activeTabId ? (
          isLoading || (syncStatus === 'syncing' && repoTabs.length === 0) || repoTabs.length > 0 ? (
            /* Loading state or waiting for activeTabId to initialize in useEffect */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
            </div>
          ) : (
            /* repoTabs is truly empty */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '1rem', padding: '3rem' }}>
              <FolderIcon size={48} style={{ opacity: 0.4, color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Tab Selected</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create a tab above or select an existing one to manage link resources.</p>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Modal Popup Add Item */}
            {isAddingItem && (
              <div className="modal-overlay" onClick={() => setIsAddingItem(false)}>
                <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3 className="modal-title">Add New Link Item</h3>
                    <button className="modal-close" onClick={() => setIsAddingItem(false)}>
                      <CancelIcon size={18} />
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource Title / Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. PRD for Payment Checkout"
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background-alt)', color: 'var(--text-primary)' }}
                          required
                          autoFocus
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource URL</label>
                        <input 
                          type="text" 
                          placeholder="e.g. docs.google.com/... or https://..."
                          value={itemUrl}
                          onChange={(e) => setItemUrl(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--background-alt)', color: 'var(--text-primary)' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setIsAddingItem(false);
                          setItemTitle('');
                          setItemUrl('');
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ background: 'linear-gradient(135deg, var(--primary), #a855f7)', border: 'none' }}
                      >
                        Add Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Links Content Canvas */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {filteredLinks.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--background-alt)', borderRadius: '8px', border: '1px dashed var(--border)', margin: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.825rem', fontStyle: 'italic' }}>
                    {searchQuery ? "No resource links matched your search." : "No resource links inside this tab yet. Click 'Add Resource Link' above to add one."}
                  </p>
                </div>
              ) : (
                <div className="table-responsive" style={{ flex: 1, width: '100%', border: 'none', borderRadius: 0 }}>
                  <table className="grid-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', padding: '10px 1rem', cursor: 'default' }}></th>
                        <th style={{ padding: '0.7rem 1rem', width: '40%', cursor: 'default', textTransform: 'uppercase', fontSize: '0.675rem', fontWeight: 600, letterSpacing: '0.05em' }}>Resource Name</th>
                        <th style={{ padding: '0.7rem 1rem', width: '40%', cursor: 'default', textTransform: 'uppercase', fontSize: '0.675rem', fontWeight: 600, letterSpacing: '0.05em' }}>URL Link</th>
                        <th style={{ padding: '0.7rem 1rem', width: '20%', cursor: 'default', textTransform: 'uppercase', fontSize: '0.675rem', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLinks.map((item) => {
                        const isEditing = item.id === editingItemId;
                        const isCopied = item.id === copiedId;
                        return (
                          <tr 
                            key={item.id} 
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item.id)}
                            onDragOver={(e) => handleItemDragOver(e, item.id)}
                            onDragLeave={handleItemDragLeave}
                            onDragEnd={handleItemDragEnd}
                            style={{ 
                              opacity: item.id === draggedItemId ? 0.4 : 1,
                              background: item.id === draggedItemId 
                                ? 'var(--background-alt)' 
                                : (item.id === dragOverItemId ? 'var(--primary-glow)' : 'transparent'),
                              borderBottom: item.id === dragOverItemId ? '2px solid var(--primary)' : '1px solid var(--border)',
                              transition: 'background-color 0.15s, border-bottom 0.15s',
                              cursor: 'grab'
                            }}
                          >
                            
                            {/* Grip Drag Handle Icon Column */}
                            <td style={{ width: '40px', padding: '10px 1rem', textAlign: 'center', verticalAlign: 'middle', color: 'var(--text-muted)' }}>
                              <GripIcon size={13} style={{ cursor: 'grab', opacity: 0.5 }} />
                            </td>

                            {/* Title/Name Column */}
                            <td style={{ padding: '0.6rem 1rem', verticalAlign: 'middle', width: '40%', fontWeight: 600, whiteSpace: 'normal' }}>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editTitle}
                                  onChange={(e) => editTitle !== e.target.value && setEditTitle(e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    padding: '6px 8px', 
                                    fontSize: '0.8rem', 
                                    borderRadius: '6px', 
                                    border: '1.5px solid var(--primary)', 
                                    background: 'var(--background)', 
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    outline: 'none',
                                    boxShadow: '0 0 0 2px var(--primary-glow)'
                                  }}
                                  required
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: '1.3' }}>
                                  <FaviconImage url={item.url} />
                                  <a 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ 
                                      color: 'var(--text-primary)', 
                                      textDecoration: 'none', 
                                      fontWeight: 600, 
                                      borderBottom: '1px dashed transparent',
                                      transition: 'all 0.2s',
                                    }}
                                    className="repo-link-anchor"
                                  >
                                    {item.title}
                                  </a>
                                </div>
                              )}
                            </td>

                            {/* URL/Link Column */}
                            <td style={{ padding: '0.6rem 1rem', verticalAlign: 'middle', width: '40%', whiteSpace: 'nowrap' }}>
                              {isEditing ? (
                                <input 
                                  type="text" 
                                  value={editUrl}
                                  onChange={(e) => editUrl !== e.target.value && setEditUrl(e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    padding: '6px 8px', 
                                    fontSize: '0.8rem', 
                                    borderRadius: '6px', 
                                    border: '1.5px solid var(--primary)', 
                                    background: 'var(--background)', 
                                    color: 'var(--text-primary)',
                                    fontWeight: 600,
                                    outline: 'none',
                                    boxShadow: '0 0 0 2px var(--primary-glow)'
                                  }}
                                  required
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '380px' }}>
                                  <span style={{ 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap', 
                                    color: 'var(--text-muted)',
                                    fontSize: '0.78rem'
                                  }}>
                                    {item.url}
                                  </span>
                                  
                                  {/* Copy link button (no alerts) */}
                                  <button
                                    onClick={() => handleCopyToClipboard(item.id, item.url || '')}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: isCopied ? '#10b981' : 'var(--text-muted)',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      transition: 'color 0.2s'
                                    }}
                                    title="Copy Link to Clipboard"
                                  >
                                    {isCopied ? <CheckIcon size={12} /> : <Copy size={12} />}
                                    {isCopied && <span style={{ fontSize: '0.65rem', fontWeight: 600, marginLeft: '4px' }}>Copied!</span>}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td style={{ padding: '0.6rem 1rem', verticalAlign: 'middle', width: '20%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                {isEditing ? (
                                  <>
                                    <button 
                                      onClick={() => handleSaveEditItem(item.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      title="Save Link"
                                    >
                                      <SaveIcon size={13} />
                                    </button>
                                    <button 
                                      onClick={() => setEditingItemId(null)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}
                                      title="Cancel"
                                    >
                                      <CancelIcon size={13} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditTitle(item.title);
                                        setEditUrl(item.url || '');
                                        setIsAddingItem(false);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                      title="Edit Link Details"
                                    >
                                      <Edit2 size={12} />
                                    </button>

                                    <button 
                                      onClick={() => handleDeleteItem(item)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                                      title="Delete Link"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

// ============================================================================
// CHALLENGES MULTI SELECT DROPDOWN COMPONENT
// ============================================================================
interface ChallengesMultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  isOpen: boolean;
  onToggle: () => void;
  customSection?: React.ReactNode;
}

const ChallengesMultiSelectDropdown: React.FC<ChallengesMultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  isOpen,
  onToggle,
  customSection
}) => {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        {label}
      </label>
      <div 
        onClick={onToggle}
        style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0.6rem 0.8rem',
          fontSize: '0.85rem',
          color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
          {selected.length > 0 
            ? `${selected.length} selected (${selected.join(', ')})` 
            : placeholder}
        </span>
        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          marginTop: '4px',
          maxHeight: '180px',
          overflowY: 'auto',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}>
          {options.length === 0 && !customSection ? (
            <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            options.map(opt => {
              const isChecked = selected.includes(opt);
              return (
                <label 
                  key={opt} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer', 
                    padding: '4px 6px',
                    borderRadius: '4px',
                    backgroundColor: isChecked ? 'var(--background-alt)' : 'transparent',
                    color: 'var(--text-primary)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...selected, opt]);
                      } else {
                        onChange(selected.filter(x => x !== opt));
                      }
                    }}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  {opt}
                </label>
              );
            })
          )}
          {customSection && (
            <div 
              style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.4rem', marginTop: '0.2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              {customSection}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              marginTop: '0.25rem',
              padding: '4px',
              fontSize: '0.75rem',
              fontWeight: 750,
              color: 'var(--primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'right'
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CHALLENGES TRACKER TABLE
// ============================================================================

export const ChallengesTable: React.FC = () => {
  const { 
    challenges, addChallenge, updateChallenge, deleteChallenge,
    productItems, speakers, setPreviewProductId, canUserEdit, confirm,
    directoryContacts, programs: configPrograms, cohorts: configCohorts,
    fetchPaginatedMeetingsData
  } = useDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterBlockerOnly, setFilterBlockerOnly] = useState(false);

  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSolutionId, setEditingSolutionId] = useState<string | null>(null);
  const [viewingDescChallenge, setViewingDescChallenge] = useState<Challenge | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [paginatedChallenges, setPaginatedChallenges] = useState<Challenge[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDepartment, filterStatus, filterPriority, filterBlockerOnly]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsFetching(true);
      const res = await fetchPaginatedMeetingsData({
        type: 'challenges',
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        priority: filterPriority !== 'All' ? filterPriority : undefined,
        statuses: filterStatus !== 'All' ? [filterStatus] : undefined,
        departments: filterDepartment !== 'All' ? [filterDepartment] : undefined,
        blockersOnly: filterBlockerOnly
      });
      if (active) {
        if (res.success) {
          setPaginatedChallenges(res.data);
          setTotalItems(res.totalItems);
          setTotalPages(res.totalPages);
        }
        setIsFetching(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    currentPage,
    itemsPerPage,
    searchQuery,
    filterDepartment,
    filterStatus,
    filterPriority,
    filterBlockerOnly,
    challenges,
    fetchPaginatedMeetingsData
  ]);

  // Form states for new challenge
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPoc, setNewPoc] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newStatus, setNewStatus] = useState<'Pending' | 'In Progress' | 'Solved' | 'Unsolved'>('Pending');
  const [newSolution, setNewSolution] = useState('');
  const [newRelatedTaskId, setNewRelatedTaskId] = useState('');
  const [newIsBlocker, setNewIsBlocker] = useState(false);

  // Multi-select lists states
  const [newDepartments, setNewDepartments] = useState<string[]>([]);
  const [newPrograms, setNewPrograms] = useState<string[]>([]);
  const [newCohorts, setNewCohorts] = useState<string[]>([]);
  const [customDept, setCustomDept] = useState('');
  const [editCustomDept, setEditCustomDept] = useState('');

  // Dropdown visibility states
  const [activeDropdownNew, setActiveDropdownNew] = useState<'program' | 'cohort' | 'department' | null>(null);
  const [activeDropdownEdit, setActiveDropdownEdit] = useState<'program' | 'cohort' | 'department' | null>(null);


  // Global list of departments from contacts and cohorts (for filter dropdown and custom value checks)
  const availableDepartmentsGlobal = useMemo(() => {
    const allCohortDepts = (configCohorts || [])
      .flatMap(c => c.departments || [])
      .map(d => d.trim())
      .filter(d => d !== '');

    const allContactsDepts = (directoryContacts || [])
      .map(c => c.department?.trim())
      .filter(d => d && d !== '');

    return Array.from(new Set([...allCohortDepts, ...allContactsDepts])).sort();
  }, [configCohorts, directoryContacts]);

  const availablePrograms = useMemo(() => {
    return (configPrograms || []).map(p => p.name).sort();
  }, [configPrograms]);

  // ==========================================================================
  // DEPENDENCY CALCULATIONS - CREATE MODAL
  // ==========================================================================

  // Cohorts are dependent on the Programs selected
  const availableCohortsForNew = useMemo(() => {
    if (newPrograms.length === 0) {
      // If no program selected, show all cohorts
      return (configCohorts || []).map(c => c.name).sort();
    }
    const progIds = (configPrograms || [])
      .filter(p => newPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());
    
    return (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        return cohortProgId && progIds.includes(cohortProgId);
      })
      .map(c => c.name)
      .sort();
  }, [configCohorts, configPrograms, newPrograms]);

  // Departments are dependent on the Programs and Cohorts selected
  const availableDepartmentsForNew = useMemo(() => {
    if (newPrograms.length === 0 && newCohorts.length === 0) {
      return availableDepartmentsGlobal;
    }

    // Get normalized selected program IDs
    const progIds = (configPrograms || [])
      .filter(p => newPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());

    // Get normalized selected cohort names/IDs
    const selectedCohortNamesLower = newCohorts.map(c => c.toLowerCase().trim());
    const cohortIds = (configCohorts || [])
      .filter(c => selectedCohortNamesLower.includes(c.name.toLowerCase().trim()))
      .map(c => c.id.toLowerCase().trim());

    // Filter cohorts departments belonging to selected programs or cohorts
    const filteredCohortDepts = (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        const cohortId = c.id?.toLowerCase().trim();
        return (
          (cohortProgId && progIds.includes(cohortProgId)) ||
          (cohortId && cohortIds.includes(cohortId))
        );
      })
      .flatMap(c => c.departments || [])
      .map(d => d.trim())
      .filter(d => d !== '');

    // Filter contacts departments belonging to selected programs or cohorts
    const filteredContactDepts = (directoryContacts || [])
      .filter(c => {
        const contactProgId = c.programId?.toLowerCase().trim();
        const contactCohortId = c.cohortId?.toLowerCase().trim();
        return (
          (contactProgId && progIds.includes(contactProgId)) ||
          (contactCohortId && cohortIds.includes(contactCohortId))
        );
      })
      .map(c => c.department?.trim())
      .filter(d => d && d !== '');

    return Array.from(new Set([...filteredCohortDepts, ...filteredContactDepts])).sort();
  }, [directoryContacts, configCohorts, configPrograms, newPrograms, newCohorts, availableDepartmentsGlobal]);

  // Auto-cleanup selected cohorts when available list changes
  useEffect(() => {
    if (isCreateModalOpen) {
      setNewCohorts(prev => prev.filter(c => availableCohortsForNew.includes(c)));
    }
  }, [newPrograms, availableCohortsForNew, isCreateModalOpen]);

  // Auto-cleanup selected departments when available list changes (safeguard custom typed entries)
  useEffect(() => {
    if (isCreateModalOpen) {
      setNewDepartments(prev => 
        prev.filter(d => availableDepartmentsForNew.includes(d) || !availableDepartmentsGlobal.includes(d))
      );
    }
  }, [newPrograms, newCohorts, availableDepartmentsForNew, availableDepartmentsGlobal, isCreateModalOpen]);


  // ==========================================================================
  // DEPENDENCY CALCULATIONS - EDIT MODAL
  // ==========================================================================

  const editingPrograms = editingChallenge?.programs || [];
  const editingCohorts = editingChallenge?.cohorts || [];

  // Cohorts are dependent on the Programs selected
  const availableCohortsForEdit = useMemo(() => {
    if (editingPrograms.length === 0) {
      return (configCohorts || []).map(c => c.name).sort();
    }
    const progIds = (configPrograms || [])
      .filter(p => editingPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());
    
    return (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        return cohortProgId && progIds.includes(cohortProgId);
      })
      .map(c => c.name)
      .sort();
  }, [configCohorts, configPrograms, editingPrograms]);

  // Departments are dependent on the Programs and Cohorts selected
  const availableDepartmentsForEdit = useMemo(() => {
    if (editingPrograms.length === 0 && editingCohorts.length === 0) {
      return availableDepartmentsGlobal;
    }

    const progIds = (configPrograms || [])
      .filter(p => editingPrograms.map(n => n.toLowerCase().trim()).includes(p.name.toLowerCase().trim()))
      .map(p => p.id.toLowerCase().trim());

    const selectedCohortNamesLower = editingCohorts.map(c => c.toLowerCase().trim());
    const cohortIds = (configCohorts || [])
      .filter(c => selectedCohortNamesLower.includes(c.name.toLowerCase().trim()))
      .map(c => c.id.toLowerCase().trim());

    const filteredCohortDepts = (configCohorts || [])
      .filter(c => {
        const cohortProgId = c.programId?.toLowerCase().trim();
        const cohortId = c.id?.toLowerCase().trim();
        return (
          (cohortProgId && progIds.includes(cohortProgId)) ||
          (cohortId && cohortIds.includes(cohortId))
        );
      })
      .flatMap(c => c.departments || [])
      .map(d => d.trim())
      .filter(d => d !== '');

    const filteredContactDepts = (directoryContacts || [])
      .filter(c => {
        const contactProgId = c.programId?.toLowerCase().trim();
        const contactCohortId = c.cohortId?.toLowerCase().trim();
        return (
          (contactProgId && progIds.includes(contactProgId)) ||
          (contactCohortId && cohortIds.includes(contactCohortId))
        );
      })
      .map(c => c.department?.trim())
      .filter(d => d && d !== '');

    return Array.from(new Set([...filteredCohortDepts, ...filteredContactDepts])).sort();
  }, [directoryContacts, configCohorts, configPrograms, editingPrograms, editingCohorts, availableDepartmentsGlobal]);

  // Auto-cleanup selected cohorts when available list changes
  useEffect(() => {
    if (editingChallenge) {
      const filteredCohorts = editingCohorts.filter(c => availableCohortsForEdit.includes(c));
      if (filteredCohorts.length !== editingCohorts.length) {
        setEditingChallenge(prev => prev ? { ...prev, cohorts: filteredCohorts } : null);
      }
    }
  }, [editingPrograms, availableCohortsForEdit, editingChallenge, editingCohorts]);

  // Auto-cleanup selected departments when available list changes (safeguard custom typed entries)
  useEffect(() => {
    if (editingChallenge) {
      const currentDepts = editingChallenge.departments || [];
      const filteredDepts = currentDepts.filter(d => 
        availableDepartmentsForEdit.includes(d) || !availableDepartmentsGlobal.includes(d)
      );
      if (filteredDepts.length !== currentDepts.length) {
        setEditingChallenge(prev => prev ? { ...prev, departments: filteredDepts } : null);
      }
    }
  }, [editingPrograms, editingCohorts, availableDepartmentsForEdit, availableDepartmentsGlobal, editingChallenge]);


  // ==========================================================================
  // FILTER CHALLENGES FOR VIEW LISTING
  // ==========================================================================



  const activePage = Math.min(currentPage, totalPages);

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newChal: Challenge = {
      id: `chal-${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      departments: newDepartments,
      programs: newPrograms,
      cohorts: newCohorts,
      poc: newPoc,
      priority: newPriority,
      status: newStatus,
      solution: newStatus === 'Solved' ? newSolution.trim() : '',
      relatedTaskId: newRelatedTaskId,
      isBlocker: newIsBlocker,
      loggedDate: new Date().toISOString().split('T')[0]
    };

    addChallenge(newChal);
    setIsCreateModalOpen(false);
    
    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewPoc('');
    setNewPriority('Medium');
    setNewStatus('Pending');
    setNewSolution('');
    setNewRelatedTaskId('');
    setNewIsBlocker(false);
    setNewDepartments([]);
    setNewPrograms([]);
    setNewCohorts([]);
    setCustomDept('');
    setActiveDropdownNew(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;

    updateChallenge(editingChallenge.id, editingChallenge);
    setEditingChallenge(null);
    setEditCustomDept('');
    setActiveDropdownEdit(null);
  };

  const handleDelete = async (id: string) => {
    const isOk = await confirm('Are you sure you want to delete this challenge?', 'Confirm Delete');
    if (isOk) {
      deleteChallenge(id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#ef4444';
      case 'Medium': return '#f97316';
      case 'Low': return '#6b7280';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Solved': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'Pending': return '#eab308';
      case 'Unsolved': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const toggleDropdownNew = (type: 'program' | 'cohort' | 'department') => {
    setActiveDropdownNew(prev => prev === type ? null : type);
  };

  const toggleDropdownEdit = (type: 'program' | 'cohort' | 'department') => {
    setActiveDropdownEdit(prev => prev === type ? null : type);
  };

  return (
    <TabContainer
      title="Challenges Tracker"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchPlaceholder="Search challenges, descriptions, POCs..."
      onAddClick={canUserEdit ? () => setIsCreateModalOpen(true) : undefined}
      addLabel="Log Challenge"
      filterComponent={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="All">All Departments</option>
            {availableDepartmentsGlobal.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Solved">Solved</option>
            <option value="Unsolved">Unsolved</option>
          </select>

          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
            <input 
              type="checkbox" 
              className="form-checkbox"
              checked={filterBlockerOnly} 
              onChange={(e) => setFilterBlockerOnly(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            Blockers Only
          </label>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0, minWidth: 0, width: '100%' }}>
        {totalItems === 0 && !isFetching ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <AlertCircle size={28} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No challenges logged matching filters</p>
          </div>
        ) : (
          <>
            <div className="table-responsive" style={{ flex: 1, overflow: 'auto' }}>
              <table className="grid-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, width: '130px' }}>Description</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '120px' }}>Program</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '120px' }}>Cohort</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '150px' }}>Department</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, width: '130px' }}>Status</th>
                    <th style={{ textAlign: 'left', fontWeight: 600, width: '280px' }}>Resolution</th>
                    <th style={{ textAlign: 'center', fontWeight: 600, width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching ? (
                    Array.from({ length: Math.min(itemsPerPage, 8) }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} style={{ height: '56px' }}>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '90%', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '24px', width: '100px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '110px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '20px', width: '80px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}><div className="skeleton-line" style={{ height: '14px', width: '200px', borderRadius: '4px', background: 'var(--border)', opacity: 0.3, animation: 'pulse 1.5s infinite ease-in-out' }}></div></td>
                        <td style={{ padding: '12px 16px' }}></td>
                      </tr>
                    ))
                  ) : (
                    paginatedChallenges.map(item => {
                      const linkedTask = productItems.find(p => p.id === item.relatedTaskId);
                      return (
                        <tr key={item.id}>
                          {/* Title */}
                          <td style={{ verticalAlign: 'middle', whiteSpace: 'normal', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                              {item.isBlocker && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ef444420',
                                  color: '#ef4444',
                                  border: '1px solid #ef444430'
                                }}>
                                  🚨 BLOCKER
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                backgroundColor: getPriorityColor(item.priority) + '15',
                                color: getPriorityColor(item.priority),
                                border: `1px solid ${getPriorityColor(item.priority)}25`
                              }}>
                                {item.priority}
                              </span>
                            </div>
                            {linkedTask && (
                              <div style={{ marginTop: '4px' }}>
                                <button
                                  onClick={() => setPreviewProductId(linkedTask.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    fontSize: '0.67rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline'
                                  }}
                                >
                                  <Link size={10} /> Related Feature
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Description Popup Button */}
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            {item.description ? (
                              <button
                                onClick={() => setViewingDescChallenge(item)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}
                              >
                                View Description
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.7rem' }}>—</span>
                            )}
                          </td>

                          {/* Program */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                              {item.programs && item.programs.length > 0 ? (
                                <>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--primary)' }}>{item.programs[0]}</span>
                                  {item.programs.length > 1 && (
                                    <div className="cu-tooltip-container" style={{ display: 'inline-block' }}>
                                      <span 
                                        style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                      >
                                        +{item.programs.length - 1}
                                      </span>
                                      <span className="cu-tooltip-text">
                                        {item.programs.join('\n')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Cohort */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                              {item.cohorts && item.cohorts.length > 0 ? (
                                <>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#0891b2' }}>{item.cohorts[0]}</span>
                                  {item.cohorts.length > 1 && (
                                    <div className="cu-tooltip-container" style={{ display: 'inline-block' }}>
                                      <span 
                                        style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                      >
                                        +{item.cohorts.length - 1}
                                      </span>
                                      <span className="cu-tooltip-text">
                                        {item.cohorts.join('\n')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Department */}
                          <td style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                              {item.departments && item.departments.length > 0 ? (
                                <>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-secondary)' }}>{item.departments[0]}</span>
                                  {item.departments.length > 1 && (
                                    <div className="cu-tooltip-container" style={{ display: 'inline-block' }}>
                                      <span 
                                        style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--background-alt)', color: 'var(--text-muted)', cursor: 'pointer' }}
                                      >
                                        +{item.departments.length - 1}
                                      </span>
                                      <span className="cu-tooltip-text">
                                        {item.departments.join('\n')}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            {canUserEdit ? (
                              <select
                                value={item.status}
                                onChange={(e) => updateChallenge(item.id, { status: e.target.value as any })}
                                className="badge"
                                style={{
                                  backgroundColor: getStatusColor(item.status) + '14',
                                  color: getStatusColor(item.status),
                                  borderColor: getStatusColor(item.status) + '33',
                                  borderStyle: 'solid',
                                  borderWidth: '1px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  textAlign: 'center'
                                }}
                              >
                                <option value="Pending" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>Pending</option>
                                <option value="In Progress" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>In Progress</option>
                                <option value="Solved" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>Solved</option>
                                <option value="Unsolved" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--panel-bg)' }}>Unsolved</option>
                              </select>
                            ) : (
                              <span className="badge" style={{
                                backgroundColor: getStatusColor(item.status) + '14',
                                color: getStatusColor(item.status),
                                borderColor: getStatusColor(item.status) + '33',
                                borderStyle: 'solid',
                                borderWidth: '1px',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                display: 'inline-block'
                              }}>
                                {item.status}
                              </span>
                            )}
                          </td>

                          {/* Resolution */}
                          <td 
                            onClick={() => canUserEdit && setEditingSolutionId(item.id)}
                            style={{ verticalAlign: 'middle', cursor: canUserEdit ? 'pointer' : 'default' }}
                          >
                            {editingSolutionId === item.id ? (
                              <textarea
                                value={item.solution || ''}
                                placeholder="Type solution and click away..."
                                onChange={(e) => updateChallenge(item.id, { solution: e.target.value })}
                                onBlur={() => setEditingSolutionId(null)}
                                autoFocus
                                rows={1}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = `${el.scrollHeight}px`;
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  backgroundColor: 'var(--background)',
                                  border: '1px solid var(--primary)',
                                  borderRadius: '6px',
                                  padding: '6px 8px',
                                  fontSize: '0.75rem',
                                  color: 'var(--text-primary)',
                                  resize: 'none',
                                  fontFamily: 'inherit',
                                  overflowY: 'hidden',
                                  outline: 'none',
                                  boxShadow: '0 0 0 2px var(--primary-glow)'
                                }}
                              />
                            ) : item.solution ? (
                              <div style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                                borderLeft: '3px solid var(--success)',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {item.solution}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                                {canUserEdit ? '— (Click to add solution)' : 'No solution logged'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                            {canUserEdit && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingChallenge(item); }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Edit Challenge"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Delete Challenge"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--panel-bg)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              userSelect: 'none',
              marginTop: '-1px'
            }}>
              <div>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{totalItems > 0 ? (activePage - 1) * itemsPerPage + 1 : 0}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(activePage * itemsPerPage, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="filter-select"
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.75rem',
                      height: '26px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {[20, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    disabled={activePage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                      opacity: activePage === 1 ? 0.4 : 1,
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--background-alt)'
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  <span style={{ margin: '0 4px', fontWeight: 600 }}>
                    Page {activePage} of {totalPages}
                  </span>

                  <button
                    disabled={activePage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: activePage === totalPages ? 0.4 : 1,
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--background-alt)'
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '540px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Log Operations Challenge</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Challenge Title*</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Sandbox environment compilation errors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description & Details</label>
                <textarea
                  placeholder="Provide logs, reproduction steps, or issues..."
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    resize: 'none',
                    fontFamily: 'inherit',
                    overflowY: 'hidden'
                  }}
                />
              </div>

              {/* Programs and Cohorts Custom Dropdowns */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Programs"
                    options={availablePrograms}
                    selected={newPrograms}
                    onChange={setNewPrograms}
                    placeholder="Select Programs..."
                    isOpen={activeDropdownNew === 'program'}
                    onToggle={() => toggleDropdownNew('program')}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Cohorts"
                    options={availableCohortsForNew}
                    selected={newCohorts}
                    onChange={setNewCohorts}
                    placeholder="Select Cohorts..."
                    isOpen={activeDropdownNew === 'cohort'}
                    onToggle={() => toggleDropdownNew('cohort')}
                  />
                </div>
              </div>

              {/* Departments Custom Dropdown */}
              <div>
                <ChallengesMultiSelectDropdown
                  label="Departments"
                  options={availableDepartmentsForNew}
                  selected={newDepartments}
                  onChange={setNewDepartments}
                  placeholder="Select Departments..."
                  isOpen={activeDropdownNew === 'department'}
                  onToggle={() => toggleDropdownNew('department')}
                  customSection={
                    <div style={{ display: 'flex', gap: '0.4rem', padding: '2px 4px' }}>
                      <input
                        type="text"
                        placeholder="Or add manually..."
                        value={customDept}
                        onChange={(e) => setCustomDept(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customDept.trim() && !newDepartments.includes(customDept.trim())) {
                            setNewDepartments([...newDepartments, customDept.trim()]);
                            setCustomDept('');
                          }
                        }}
                        style={{
                          padding: '0 0.5rem',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--background-alt)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  }
                />
              </div>

              {/* Status and POC */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Solved">Solved</option>
                    <option value="Unsolved">Unsolved</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>POC Speaker</label>
                  <select
                    value={newPoc}
                    onChange={(e) => setNewPoc(e.target.value)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {speakers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority & Blocker Checkbox */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
                  <input 
                    type="checkbox"
                    id="newIsBlocker"
                    checked={newIsBlocker}
                    onChange={(e) => setNewIsBlocker(e.target.checked)}
                    style={{ accentColor: 'var(--danger)', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="newIsBlocker" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', cursor: 'pointer', userSelect: 'none' }}>
                    Blocking Progress
                  </label>
                </div>
              </div>

              {/* Solution Description */}
              {newStatus === 'Solved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Resolution Solution*</label>
                  <textarea
                    required
                    placeholder="Describe how this challenge was mitigated or solved..."
                    rows={2}
                    value={newSolution}
                    onChange={(e) => setNewSolution(e.target.value)}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {/* Link Product Feature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Link to Product Feature</label>
                <select
                  value={newRelatedTaskId}
                  onChange={(e) => setNewRelatedTaskId(e.target.value)}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">No Related Task</option>
                  {productItems.map(p => <option key={p.id} value={p.id}>{p.feature} ({p.id})</option>)}
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="premium-timeline-btn btn-secondary"
                  style={{ flex: 1, height: '36px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-timeline-btn btn-primary"
                  style={{ flex: 2, height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  Log Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingChallenge && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '540px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Edit Challenge</h3>
              <button onClick={() => { setEditingChallenge(null); setEditCustomDept(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Challenge Title*</label>
                <input
                  type="text"
                  required
                  value={editingChallenge.title}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, title: e.target.value })}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description & Details</label>
                <textarea
                  rows={2}
                  value={editingChallenge.description || ''}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, description: e.target.value })}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    resize: 'none',
                    fontFamily: 'inherit',
                    overflowY: 'hidden'
                  }}
                />
              </div>

              {/* Programs and Cohorts Custom Dropdowns */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Programs"
                    options={availablePrograms}
                    selected={editingChallenge.programs || []}
                    onChange={(selectedProgs) => setEditingChallenge({ ...editingChallenge, programs: selectedProgs })}
                    placeholder="Select Programs..."
                    isOpen={activeDropdownEdit === 'program'}
                    onToggle={() => toggleDropdownEdit('program')}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <ChallengesMultiSelectDropdown
                    label="Cohorts"
                    options={availableCohortsForEdit}
                    selected={editingChallenge.cohorts || []}
                    onChange={(selectedCohs) => setEditingChallenge({ ...editingChallenge, cohorts: selectedCohs })}
                    placeholder="Select Cohorts..."
                    isOpen={activeDropdownEdit === 'cohort'}
                    onToggle={() => toggleDropdownEdit('cohort')}
                  />
                </div>
              </div>

              {/* Departments Custom Dropdown */}
              <div>
                <ChallengesMultiSelectDropdown
                  label="Departments"
                  options={availableDepartmentsForEdit}
                  selected={editingChallenge.departments || []}
                  onChange={(selectedDepts) => setEditingChallenge({ ...editingChallenge, departments: selectedDepts })}
                  placeholder="Select Departments..."
                  isOpen={activeDropdownEdit === 'department'}
                  onToggle={() => toggleDropdownEdit('department')}
                  customSection={
                    <div style={{ display: 'flex', gap: '0.4rem', padding: '2px 4px' }}>
                      <input
                        type="text"
                        placeholder="Or add manually..."
                        value={editCustomDept}
                        onChange={(e) => setEditCustomDept(e.target.value)}
                        style={{
                          flex: 1,
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const currentDepts = editingChallenge.departments || [];
                          if (editCustomDept.trim() && !currentDepts.includes(editCustomDept.trim())) {
                            setEditingChallenge({ ...editingChallenge, departments: [...currentDepts, editCustomDept.trim()] });
                            setEditCustomDept('');
                          }
                        }}
                        style={{
                          padding: '0 0.5rem',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--background-alt)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        Add
                      </button>
                    </div>
                  }
                />
              </div>

              {/* Status and POC */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</label>
                  <select
                    value={editingChallenge.status}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, status: e.target.value as any })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Solved">Solved</option>
                    <option value="Unsolved">Unsolved</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>POC Speaker</label>
                  <select
                    value={editingChallenge.poc}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, poc: e.target.value })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {speakers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority & Blocker Checkbox */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Priority</label>
                  <select
                    value={editingChallenge.priority}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, priority: e.target.value as any })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
                  <input 
                    type="checkbox"
                    id="editIsBlocker"
                    checked={!!editingChallenge.isBlocker}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, isBlocker: e.target.checked })}
                    style={{ accentColor: 'var(--danger)', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="editIsBlocker" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', cursor: 'pointer', userSelect: 'none' }}>
                    Blocking Progress
                  </label>
                </div>
              </div>

              {/* Resolution Description */}
              {editingChallenge.status === 'Solved' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Resolution Solution*</label>
                  <textarea
                    required
                    placeholder="Describe how this challenge was mitigated or solved..."
                    rows={2}
                    value={editingChallenge.solution || ''}
                    onChange={(e) => setEditingChallenge({ ...editingChallenge, solution: e.target.value })}
                    style={{
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {/* Link Product Feature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Link to Product Feature</label>
                <select
                  value={editingChallenge.relatedTaskId || ''}
                  onChange={(e) => setEditingChallenge({ ...editingChallenge, relatedTaskId: e.target.value })}
                  style={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.8rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="">No Related Task</option>
                  {productItems.map(p => <option key={p.id} value={p.id}>{p.feature} ({p.id})</option>)}
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setEditingChallenge(null); setEditCustomDept(''); }}
                  className="premium-timeline-btn btn-secondary"
                  style={{ flex: 1, height: '36px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="premium-timeline-btn btn-primary"
                  style={{ flex: 2, height: '36px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DESCRIPTION MODAL */}
      {viewingDescChallenge && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Description & Details
              </h3>
              <button 
                onClick={() => setViewingDescChallenge(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%', transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Challenge Title</strong>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {viewingDescChallenge.title}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description Details</strong>
              <div 
                style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  lineHeight: 1.5, 
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--background)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)'
                }}
                dangerouslySetInnerHTML={{ __html: ensureHtmlDescription(viewingDescChallenge.description) }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
              <button
                onClick={() => setViewingDescChallenge(null)}
                className="premium-timeline-btn btn-secondary"
                style={{ height: '36px', padding: '0 1.5rem', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </TabContainer>
  );
};