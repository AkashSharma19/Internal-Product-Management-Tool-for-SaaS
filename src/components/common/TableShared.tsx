import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { stripHtml } from '../../utils/text';
import { getSubmissionFields, getSubmissionFieldUnion } from '../../utils/feedback';
import { triggerReleaseConfetti } from '../../utils/confetti';
import { playPopSound } from '../../utils/audio';
import {
  Trash2,
  X,
  Check,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Star,
  Link,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  ClipboardList,
  Eye,
  Download,
  Lock
} from 'lucide-react';
import type {
  ProductItem,
  FeedbackSubmission,
  FeedbackFormField,
  ConfigProgram,
  ConfigCohort
} from '../../types';
import {
  getAutoCategoryProgramPalette,
  getAutoCategoryProgramCompactStyle,
  exportItemFeedbackToExcel,
  getClickupBadgeStyle,
  extractClickupTaskId,
  parseDateToYYYYMMDD,
  getDateDiffDays
} from './tableUtils';

interface DiscussionTextAreaProps {
  initialValue: string;
  onSave: (val: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const DiscussionTextArea: React.FC<DiscussionTextAreaProps> = ({ initialValue, onSave, placeholder, style }) => {
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

export const AIMeetingAssistantModal: React.FC<AIMeetingAssistantModalProps> = ({
  isOpen,
  onClose,
  meetingText,
  meetingId,
  meetingTitle,
  meetingType,
  onApplySummary
}) => {
  const { addProductItem, currentUser, geminiModel, productGroups } = useDashboard();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState<Array<{
    feature: string;
    description: string;
    priority: string;
    selected: boolean;
    product: string;
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
          priority: '', // Do not pre-populate/suggest priority
          selected: true,
          product: ''
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
        poc: currentUser?.name || 'Akash Sharma', // assigned who are adding them
        status: '',
        clickupStatus: '',
        taskLink: '',
        blocker: '',
        deadline: '',
        notes: noteText,
        product: item.product, // Map to correct product group
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
                              <option value="">No Priority</option>
                              <option value="P0">P0 (Critical)</option>
                              <option value="P1">P1 (High)</option>
                              <option value="P2">P2 (Medium)</option>
                              <option value="P3">P3 (Low)</option>
                              <option value="P4">P4 (Trivial)</option>
                            </select>

                            {/* Product Group Dropdown */}
                            <select
                              value={item.product}
                              onChange={(e) => {
                                const copy = [...actionItems];
                                copy[idx].product = e.target.value;
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
                                cursor: 'pointer',
                                maxWidth: '160px'
                              }}
                              disabled={!item.selected}
                            >
                              <option value="">Product Group</option>
                              {productGroups.map(pg => (
                                <option key={pg.id} value={pg.name}>{pg.name}</option>
                              ))}
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


export const FeedbackSubmissionModal: React.FC<{
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


export const AssignFeedbackModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
  currentFormId?: string;
  onAssigned: (assignedFormId: string) => void;
}> = ({ isOpen, onClose, itemId, itemTitle, category, currentFormId, onAssigned }) => {
  const { formConfigs, updateAMASession, updateStudentMeeting, updateAdminCall, updateStudentProject, studentMeetings, feedbackSubmissions } = useDashboard();
  
  const hasSubmissions = feedbackSubmissions.some(sub => sub.itemId === itemId);
  const submissionsCount = feedbackSubmissions.filter(sub => sub.itemId === itemId).length;

  const categoryForms = useMemo(() => {
    return formConfigs.filter(c => c.category === category && c.enabled !== false);
  }, [formConfigs, category]);

  const defaultForm = useMemo(() => {
    return categoryForms.find(c => c.isDefault) || categoryForms[0];
  }, [categoryForms]);

  const [selectedFormId, setSelectedFormId] = useState<string>(() => {
    return currentFormId || defaultForm?.id || '';
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedFormId(currentFormId || defaultForm?.id || (categoryForms[0]?.id || ''));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categoryLabels = {
    'admin-calls': 'Admin Meeting',
    'ama-meetings': 'Student Meeting',
    'student-projects': 'Student Project'
  };

  const handleConfirmAssign = () => {
    if (!selectedFormId) return;

    if (!hasSubmissions) {
      if (category === 'admin-calls') {
        updateAdminCall(itemId, { feedbackFormId: selectedFormId });
      } else if (category === 'ama-meetings') {
        if (studentMeetings.some(m => m.id === itemId)) {
          updateStudentMeeting(itemId, { feedbackFormId: selectedFormId });
        } else {
          updateAMASession(itemId, { feedbackFormId: selectedFormId });
        }
      } else if (category === 'student-projects') {
        updateStudentProject(itemId, { feedbackFormId: selectedFormId });
      }
    }

    onAssigned(selectedFormId);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10005 }} onClick={onClose}>
      <div 
        className="modal-container" 
        style={{ maxWidth: '520px', width: '90%', padding: '1.5rem', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} style={{ color: 'var(--primary)' }} />
              {hasSubmissions ? 'Feedback Form Details' : 'Assign Feedback Form'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {hasSubmissions ? 'Questionnaire assigned to: ' : 'Choose which questionnaire to use for: '}
              <strong style={{ color: 'var(--text-primary)' }}>{itemTitle}</strong>
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {hasSubmissions && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '1rem'
          }}>
            <Lock size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
              <strong>Questionnaire Locked:</strong> {submissionsCount} feedback {submissionsCount === 1 ? 'response has' : 'responses have'} already been received. The questionnaire cannot be changed.
            </div>
          </div>
        )}

        {categoryForms.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No active feedback forms found for {categoryLabels[category]}. Please create or enable a form in Configuration → Form Builder.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto', padding: '2px' }}>
            {categoryForms.map(form => {
              const isSelected = selectedFormId === form.id;
              const isDef = !!form.isDefault;
              const fieldCount = form.fields?.length || 0;

              return (
                <div
                  key={form.id}
                  onClick={() => {
                    if (!hasSubmissions) setSelectedFormId(form.id);
                  }}
                  style={{
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--primary-glow)' : 'var(--background)',
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: hasSubmissions ? 'default' : 'pointer',
                    opacity: hasSubmissions && !isSelected ? 0.5 : 1,
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: isSelected ? '5px solid var(--primary)' : '2px solid var(--text-muted)',
                    background: '#fff',
                    marginTop: '2px',
                    flexShrink: 0
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 750, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {form.title || 'Feedback Form'}
                      </span>
                      {isDef && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 750, background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '1px 6px', borderRadius: '10px' }}>
                          ★ Default
                        </span>
                      )}
                      {hasSubmissions && isSelected && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1px 6px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={9} /> Active & Locked
                        </span>
                      )}
                    </div>
                    {form.description && (
                      <p style={{ margin: '2px 0 6px 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {form.description}
                      </p>
                    )}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {fieldCount} {fieldCount === 1 ? 'Question' : 'Questions'} • {form.fields?.map(f => f.label).slice(0, 2).join(', ')}{fieldCount > 2 ? '...' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px', borderRadius: '8px', background: 'var(--background-alt)',
              border: '1px solid var(--border)', color: 'var(--text-secondary)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {hasSubmissions ? 'Close' : 'Cancel'}
          </button>
          <button
            disabled={!selectedFormId}
            onClick={handleConfirmAssign}
            style={{
              padding: '8px 18px', borderRadius: '8px', background: 'var(--primary)',
              border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600,
              cursor: selectedFormId ? 'pointer' : 'not-allowed',
              opacity: selectedFormId ? 1 : 0.6,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Link size={14} /> {hasSubmissions ? 'Copy Form Link' : 'Assign & Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AttendeeFeedbackDetails: React.FC<{
  itemId: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
}> = ({ itemId, category }) => {
  const {
    formConfigs,
    feedbackSubmissions,
    currentUser,
    confirm,
    deleteFeedbackSubmission,
    geminiModel,
    addProductItem,
    productGroups,
    amaSessions,
    studentMeetings,
    adminCalls,
    studentProjects,
    updateAMASession,
    updateStudentMeeting,
    updateAdminCall,
    updateStudentProject,
    canUserEdit
  } = useDashboard();

  const [copied, setCopied] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<FeedbackSubmission | null>(null);
  const isCurrentUserAdmin = currentUser ? (currentUser.isAdmin !== false) : false;

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [addedTickets, setAddedTickets] = useState<Set<number>>(new Set());
  const [isAiExpanded, setIsAiExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'responses' | 'ai'>('responses');
  const [recProducts, setRecProducts] = useState<Record<number, string>>({});

  // Find parent meeting/project item
  let currentItem: any = null;
  if (category === 'admin-calls') {
    currentItem = adminCalls.find(c => c.id === itemId);
  } else if (category === 'ama-meetings') {
    currentItem = studentMeetings.find(m => m.id === itemId) || amaSessions.find(a => a.id === itemId);
  } else if (category === 'student-projects') {
    currentItem = studentProjects.find(p => p.id === itemId);
  }

  const categoryForms = formConfigs.filter(c => c.category === category && c.enabled !== false);
  const assignedFormId = currentItem?.feedbackFormId;
  const config = (assignedFormId ? formConfigs.find(c => c.id === assignedFormId) : null)
    || formConfigs.find(c => c.category === category && c.isDefault)
    || formConfigs.find(c => c.category === category && c.enabled !== false)
    || formConfigs.find(c => c.category === category);

  const isFormConfigured = config && config.enabled && config.fields && config.fields.length > 0;
  const submissions = feedbackSubmissions.filter(sub => sub.itemId === itemId);
  const responseFields = getSubmissionFieldUnion(submissions, formConfigs, config?.fields || []);

  useEffect(() => {
    // Reset states when changing items
    setAiAnalysis(null);
    setAiError(null);
    setAddedTickets(new Set());

    const fetchAnalysis = async () => {
      try {
        const headers: Record<string, string> = {};
        if (currentUser?.id) {
          headers['x-user-id'] = currentUser.id;
        }
        const response = await fetch(`/api/data?action=get-feedback-analysis&itemId=${itemId}&category=${category}`, {
          headers
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.analysis) {
            setAiAnalysis(resData.analysis);
          }
        }
      } catch (err) {
        console.error('Failed to fetch existing feedback analysis:', err);
      }
    };

    if (itemId && category) {
      fetchAnalysis();
    }
  }, [itemId, category, currentUser]);

  const handleAnalyzeFeedback = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      
      const response = await fetch('/api/data?action=ai-feedback-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          data: {
            itemId,
            category,
            fields: responseFields,
            submissions,
            model: geminiModel
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze feedback');
      }

      const resData = await response.json();
      if (resData.success && resData.analysis) {
        setAiAnalysis(resData.analysis);
        setIsAiExpanded(true);
        triggerReleaseConfetti();
        playPopSound();
      } else {
        throw new Error('Invalid response structure from AI feedback service');
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'An error occurred during AI analysis');
    } finally {
      setAiLoading(false);
    }
  };

  const handleConvertToTask = (rec: any, idx: number) => {
    if (addedTickets.has(idx)) return;
    
    let prefix = 'prod-feedback';
    let noteText = `Feedback Insight Ref: ${itemId} | Category: ${category}`;
    if (category === 'ama-meetings') {
      prefix = 'prod-ama';
      noteText = `AMA Feedback ID: ${itemId} | Recommendation: ${rec.recommendation}`;
    } else if (category === 'admin-calls') {
      prefix = 'prod-call';
      noteText = `Admin Call Feedback ID: ${itemId} | Recommendation: ${rec.recommendation}`;
    } else if (category === 'student-projects') {
      prefix = 'prod-proj';
      noteText = `Student Project Feedback ID: ${itemId} | Recommendation: ${rec.recommendation}`;
    }

    const newItem: ProductItem = {
      id: `${prefix}-${Date.now()}-${idx}`,
      feature: rec.recommendation.trim(),
      description: rec.details.trim(),
      tarunSirApproval: false,
      raisedByTarunSir: rec.priority === 'P0',
      priority: (rec.priority || '') as "" | "P0" | "P1" | "P2" | "P3" | "P4",
      poc: currentUser?.name || 'Akash Sharma',
      status: '',
      clickupStatus: '',
      taskLink: '',
      blocker: '',
      deadline: '',
      notes: noteText,
      product: recProducts[idx] || '',
      module: '',
      uiux: '',
      finalRelease: '',
      productDeadline: '',
      createdAt: new Date().toISOString()
    };

    addProductItem(newItem);
    setAddedTickets(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    
    triggerReleaseConfetti();
    playPopSound();
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formIdParam = config?.id ? `&formId=${encodeURIComponent(config.id)}` : '';
    const link = `${window.location.origin}/?feedback=${itemId}&category=${category}${formIdParam}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isFormConfigured && submissions.length === 0) {
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
  const sortedFields = responseFields;
  const ratingFields = sortedFields.filter(field => field.type === 'rating');
  const ratingsSummary = ratingFields.map(field => {
    const scores = submissions
      .map(sub => Number(sub.answers?.[field.id]))
      .filter(score => !isNaN(score) && score > 0);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
    return { fieldId: field.id, label: field.label, avg, count: scores.length };
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '1rem'
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
          {categoryForms.length > 0 && (
            submissions.length > 0 ? (
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--panel-bg)', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border)',
                  cursor: 'not-allowed'
                }}
                title={`Questionnaire is locked because ${submissions.length} feedback response(s) have been received.`}
              >
                <Lock size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Form:</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {config?.title || 'Feedback Form'} {config?.isDefault ? '★' : ''}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--background-alt)', padding: '1px 6px', borderRadius: '4px', fontWeight: 650 }}>
                  Locked
                </span>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--panel-bg)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Form:</span>
                <select
                  value={config?.id || ''}
                  disabled={!canUserEdit}
                  onChange={(e) => {
                    const newFormId = e.target.value;
                    if (category === 'admin-calls') {
                      updateAdminCall(itemId, { feedbackFormId: newFormId });
                    } else if (category === 'ama-meetings') {
                      if (studentMeetings.some(m => m.id === itemId)) {
                        updateStudentMeeting(itemId, { feedbackFormId: newFormId });
                      } else {
                        updateAMASession(itemId, { feedbackFormId: newFormId });
                      }
                    } else if (category === 'student-projects') {
                      updateStudentProject(itemId, { feedbackFormId: newFormId });
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: canUserEdit ? 'pointer' : 'default',
                    outline: 'none'
                  }}
                >
                  {categoryForms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.title || f.id} {f.isDefault ? '★ (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {submissions.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportItemFeedbackToExcel(itemId, category, feedbackSubmissions, formConfigs, config?.id);
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

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        gap: '8px',
        marginBottom: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('responses')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'responses' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'responses' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            fontSize: '0.775rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ClipboardList size={13} /> Responses ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ai' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            color: activeTab === 'ai' ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '8px 16px',
            fontSize: '0.775rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={13} style={{ color: activeTab === 'ai' ? 'var(--primary)' : 'inherit' }} /> AI Analysis
        </button>
      </div>

      {activeTab === 'responses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
      </div>
      )}

      {activeTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* AI Feedback Analysis Section */}
      {!aiAnalysis && !aiLoading && submissions.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'var(--panel-bg)',
          border: '1px dashed var(--border)',
          borderRadius: '10px',
          gap: '12px'
        }}>
          <Sparkles size={24} style={{ color: 'var(--primary)' }} />
          <div style={{ textAlign: 'center' }}>
            <h5 style={{ margin: 0, fontSize: '0.825rem', fontWeight: 650 }}>Analyze attendee feedback with Gemini AI</h5>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Get summary, overall sentiment, positive findings, pain points, and actionable recommendations.
            </p>
          </div>
          <button
            onClick={handleAnalyzeFeedback}
            className="btn btn-primary"
            style={{
              fontSize: '0.75rem',
              padding: '8px 16px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
              border: 'none',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)'
            }}
          >
            <Sparkles size={13} /> Analyze feedback with AI
          </button>
        </div>
      )}

      {aiLoading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem',
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Analyzing {submissions.length} feedback responses with Gemini AI...
          </p>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>Synthesizing key themes and generating actionable tickets</span>
        </div>
      )}

      {aiError && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '0.75rem' }}>
            <AlertCircle size={15} />
            <span>{aiError}</span>
          </div>
          <button
            onClick={handleAnalyzeFeedback}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary)',
              fontWeight: 700,
              fontSize: '0.75rem',
              textDecoration: 'underline'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {aiAnalysis && (
        <div style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
          transition: 'all 0.3s'
        }}>
          {/* AI Header */}
          <div 
            onClick={() => setIsAiExpanded(!isAiExpanded)}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'var(--background-alt)',
              borderBottom: isAiExpanded ? '1px solid var(--border)' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Sparkles size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Feedback Analysis
              </span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                (generated on {new Date(aiAnalysis.updatedAt || aiAnalysis.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} by {aiAnalysis.generatedBy || 'System'})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnalyzeFeedback();
                }}
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border)',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  fontSize: '0.675rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
                title="Re-run Gemini AI to analyze feedback including any new responses"
              >
                <RefreshCw size={10} /> Re-analyze
              </button>
              {isAiExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {/* AI Content */}
          {isAiExpanded && (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Summary & Sentiment */}
              <div style={{
                background: 'var(--background-alt)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 650, color: 'var(--text-secondary)' }}>Overall Sentiment:</span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 750,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    background: aiAnalysis.sentiment?.toLowerCase() === 'positive' 
                      ? 'rgba(16, 185, 129, 0.12)' 
                      : aiAnalysis.sentiment?.toLowerCase() === 'critical'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(245, 158, 11, 0.12)',
                    color: aiAnalysis.sentiment?.toLowerCase() === 'positive' 
                      ? '#10b981' 
                      : aiAnalysis.sentiment?.toLowerCase() === 'critical'
                      ? '#ef4444'
                      : '#d97706',
                    border: aiAnalysis.sentiment?.toLowerCase() === 'positive' 
                      ? '1px solid rgba(16, 185, 129, 0.25)' 
                      : aiAnalysis.sentiment?.toLowerCase() === 'critical'
                      ? '1px solid rgba(239, 68, 68, 0.25)'
                      : '1px solid rgba(245, 158, 11, 0.25)'
                  }}>
                    {aiAnalysis.sentiment || 'Mixed'}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    — {aiAnalysis.sentimentJustification}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.775rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                  {aiAnalysis.summary}
                </p>
              </div>

              {/* Highlights & Concerns Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Positives */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.02)',
                  border: '1px solid rgba(16, 185, 129, 0.12)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <CheckCircle size={13} /> Positive Highlights
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.725rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(aiAnalysis.positives || []).map((item: string, i: number) => (
                      <li key={i} style={{ lineHeight: '1.45' }}>{item}</li>
                    ))}
                    {(!aiAnalysis.positives || aiAnalysis.positives.length === 0) && (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None noted.</span>
                    )}
                  </ul>
                </div>

                {/* Pain Points */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.02)',
                  border: '1px solid rgba(239, 68, 68, 0.12)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <AlertCircle size={13} /> Pain Points & Key Concerns
                  </h5>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.725rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(aiAnalysis.painPoints || []).map((item: string, i: number) => (
                      <li key={i} style={{ lineHeight: '1.45' }}>{item}</li>
                    ))}
                    {(!aiAnalysis.painPoints || aiAnalysis.painPoints.length === 0) && (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None noted.</span>
                    )}
                  </ul>
                </div>
              </div>

              {/* Actionable recommendations */}
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Actionable PM Recommendations ({ (aiAnalysis.recommendations || []).length })
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(aiAnalysis.recommendations || []).map((rec: any, idx: number) => (
                    <div 
                      key={idx}
                      style={{
                        background: 'var(--background)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      <div style={{ flex: '1', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

                          <span style={{ fontSize: '0.775rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                            {rec.recommendation}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {rec.details}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Product Group Dropdown */}
                        <select
                          value={recProducts[idx] || ''}
                          onChange={(e) => {
                            setRecProducts(prev => ({ ...prev, [idx]: e.target.value }));
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--background)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            cursor: 'pointer',
                            maxWidth: '130px'
                          }}
                          disabled={addedTickets.has(idx)}
                        >
                          <option value="">Product Group</option>
                          {productGroups.map(pg => (
                            <option key={pg.id} value={pg.name}>{pg.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleConvertToTask(rec, idx)}
                        disabled={addedTickets.has(idx)}
                        style={{
                          background: addedTickets.has(idx) ? 'var(--success-bg)' : 'rgba(99, 102, 241, 0.1)',
                          color: addedTickets.has(idx) ? 'var(--success)' : 'var(--primary)',
                          border: addedTickets.has(idx) ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                          cursor: addedTickets.has(idx) ? 'default' : 'pointer',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 650,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          alignSelf: 'center'
                        }}
                      >
                        {addedTickets.has(idx) ? (
                          <>
                            <Check size={11} /> Task Created ✓
                          </>
                        ) : (
                          <>
                            <Plus size={11} /> Convert to Task
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}

      {activeTab === 'responses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tabular Feedback View */}
      {submissions.length === 0 ? (
        <div style={{
          padding: '2rem 1.5rem',
          textAlign: 'center',
          border: '1.5px dashed var(--border-light)',
          borderRadius: '12px',
          background: 'var(--panel-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ClipboardList size={20} />
          </div>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              No feedback responses received yet
            </h5>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: '1.4' }}>
              Currently using <strong>"{config?.title || 'Default Form'}"</strong> ({sortedFields.length} {sortedFields.length === 1 ? 'question' : 'questions'}). You can change the assigned form using the dropdown above anytime before attendees submit answers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={handleCopyLink}
              style={{
                background: copied ? 'var(--success-bg)' : 'var(--primary)',
                color: copied ? 'var(--success)' : '#fff',
                border: copied ? '1px solid var(--success)' : 'none',
                padding: '7px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 650,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px var(--primary-glow)'
              }}
            >
              {copied ? <Check size={13} /> : <Link size={13} />}
              {copied ? 'Link Copied!' : 'Copy Feedback Link'}
            </button>
          </div>
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
      </div>
      )}

      {viewingSubmission && (
        <FeedbackSubmissionModal
          submission={viewingSubmission}
          fields={getSubmissionFields(viewingSubmission, formConfigs, config?.fields || [])}
          onClose={() => setViewingSubmission(null)}
        />
      )}
    </div>
  );
};


export const FeedbackRatingCell: React.FC<{
  itemId: string;
  category: 'admin-calls' | 'ama-meetings' | 'student-projects';
  onCellClick: (itemId: string, category: 'admin-calls' | 'ama-meetings' | 'student-projects') => void;
}> = ({ itemId, category, onCellClick }) => {
  const { feedbackSubmissions, formConfigs, adminCalls, studentMeetings, amaSessions, studentProjects } = useDashboard();
  
  let currentItem: any = null;
  if (category === 'admin-calls') currentItem = adminCalls.find(c => c.id === itemId);
  else if (category === 'ama-meetings') currentItem = studentMeetings.find(m => m.id === itemId) || amaSessions.find(a => a.id === itemId);
  else if (category === 'student-projects') currentItem = studentProjects.find(p => p.id === itemId);

  const assignedFormId = currentItem?.feedbackFormId;
  const config = (assignedFormId ? formConfigs.find(c => c.id === assignedFormId) : null)
    || formConfigs.find(c => c.category === category && c.isDefault)
    || formConfigs.find(c => c.category === category && c.enabled !== false)
    || formConfigs.find(c => c.category === category);

  const submissions = feedbackSubmissions.filter(sub => sub.itemId === itemId);
  if ((!config || !config.enabled) && submissions.length === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const formTitle = config?.title || (config?.isDefault ? 'Default Form' : 'Feedback Form');
  const isExplicitlyAssigned = !!assignedFormId;

  if (submissions.length === 0) {
    return (
      <span 
        className="badge" 
        onClick={(e) => {
          e.stopPropagation();
          onCellClick(itemId, category);
        }}
        style={{
          fontSize: '0.7rem',
          padding: '3px 8px',
          background: isExplicitlyAssigned ? 'var(--primary-glow)' : 'var(--background-alt)',
          color: isExplicitlyAssigned ? 'var(--primary)' : 'var(--text-muted)',
          border: isExplicitlyAssigned ? '1px solid var(--primary)' : '1px dashed var(--border)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          userSelect: 'none',
          maxWidth: '160px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={`Assigned Form: "${formTitle}" (0 responses yet) • Click to open feedback drawer & manage form`}
      >
        <ClipboardList size={11} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isExplicitlyAssigned ? formTitle : '0 / Manage Form'}
        </span>
      </span>
    );
  }

  const responseFields = getSubmissionFieldUnion(submissions, formConfigs, config?.fields || []);
  const ratingFields = responseFields.filter(field => field.type === 'rating');
  let avg: string | null = null;
  let totalCount = 0;

  if (ratingFields.length > 0) {
    const scores: number[] = [];
    const ratedSubmissionIds = new Set<string>();
    submissions.forEach(sub => {
      ratingFields.forEach(field => {
        const score = Number(sub.answers?.[field.id]);
        if (!isNaN(score) && score > 0) {
          scores.push(score);
          ratedSubmissionIds.add(sub.id);
        }
      });
    });
    if (scores.length > 0) {
      avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      totalCount = ratedSubmissionIds.size;
    }
  }

  const tooltipText = `Assigned Form: "${formTitle}" • Click to view ${submissions.length} response(s)`;

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
        title={tooltipText}
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

export const FeedbackDrawer: React.FC<{
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

export interface CreateClickupTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureTitle: string;
  featureDesc: string;
  onTaskCreated: (taskUrl: string, taskStatus: string, taskAssignee: string) => void;
}

export const CreateClickupTaskModal: React.FC<CreateClickupTaskModalProps> = ({
  isOpen,
  onClose,
  featureTitle,
  featureDesc,
  onTaskCreated
}) => {
  const [teams, setTeams] = useState<{ id: string; name: string; members?: any[] }[]>([]);
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string; lists: { id: string; name: string }[] }[]>([]);
  const [folderlessLists, setFolderlessLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<any[]>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
  
  const [selectedTeamId, setSelectedTeamId] = useState('');

  useEffect(() => {
    setAssigneeSearchQuery('');
  }, [selectedTeamId]);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [selectedListId, setSelectedListId] = useState('');

  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist selections to localStorage
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem('last-clickup-team-id', selectedTeamId);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (selectedSpaceId) {
      localStorage.setItem('last-clickup-space-id', selectedSpaceId);
    }
  }, [selectedSpaceId]);

  useEffect(() => {
    if (selectedListId) {
      localStorage.setItem('last-clickup-list-id', selectedListId);
    }
  }, [selectedListId]);

  // Load teams/workspaces on mount
  useEffect(() => {
    if (!isOpen) return;
    const fetchTeams = async () => {
      setLoadingTeams(true);
      setError(null);
      try {
        const savedUserId = localStorage.getItem('logged-in-user-id') || '';
        const response = await fetch('/api/data?action=clickup-teams', {
          headers: { 'x-user-id': savedUserId }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.teams) {
            setTeams(resData.teams);
            const lastTeamId = localStorage.getItem('last-clickup-team-id');
            if (lastTeamId && resData.teams.some((t: any) => t.id === lastTeamId)) {
              setSelectedTeamId(lastTeamId);
            } else if (resData.teams.length === 1) {
              setSelectedTeamId(resData.teams[0].id);
            }
          } else {
            setError(resData.error || 'Failed to fetch teams');
          }
        } else {
          setError('Failed to fetch workspaces from ClickUp API');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching teams');
      } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeams();
  }, [isOpen]);

  // Load spaces when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setSpaces([]);
      return;
    }
    const fetchSpaces = async () => {
      setLoadingSpaces(true);
      setError(null);
      try {
        const savedUserId = localStorage.getItem('logged-in-user-id') || '';
        const response = await fetch(`/api/data?action=clickup-spaces&teamId=${selectedTeamId}`, {
          headers: { 'x-user-id': savedUserId }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.spaces) {
            setSpaces(resData.spaces);
            const lastSpaceId = localStorage.getItem('last-clickup-space-id');
            if (lastSpaceId && resData.spaces.some((s: any) => s.id === lastSpaceId)) {
              setSelectedSpaceId(lastSpaceId);
            } else if (resData.spaces.length === 1) {
              setSelectedSpaceId(resData.spaces[0].id);
            }
          } else {
            setError(resData.error || 'Failed to fetch spaces');
          }
        } else {
          setError('Failed to fetch spaces from ClickUp API');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching spaces');
      } finally {
        setLoadingSpaces(false);
      }
    };
    fetchSpaces();
  }, [selectedTeamId]);

  // Load folders & lists when space changes
  useEffect(() => {
    if (!selectedSpaceId) {
      setFolders([]);
      setFolderlessLists([]);
      return;
    }
    const fetchContent = async () => {
      setLoadingContent(true);
      setError(null);
      try {
        const savedUserId = localStorage.getItem('logged-in-user-id') || '';
        const response = await fetch(`/api/data?action=clickup-space-content&spaceId=${selectedSpaceId}`, {
          headers: { 'x-user-id': savedUserId }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.success) {
            setFolders(resData.folders || []);
            setFolderlessLists(resData.folderlessLists || []);
            
            const lastListId = localStorage.getItem('last-clickup-list-id');
            const hasList = (resData.folderlessLists || []).some((l: any) => l.id === lastListId) ||
                            (resData.folders || []).some((f: any) => (f.lists || []).some((l: any) => l.id === lastListId));
            if (lastListId && hasList) {
              setSelectedListId(lastListId);
            }
          } else {
            setError(resData.error || 'Failed to fetch folder/list content');
          }
        } else {
          setError('Failed to fetch folders and lists from ClickUp API');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching space contents');
      } finally {
        setLoadingContent(false);
      }
    };
    fetchContent();
  }, [selectedSpaceId]);

  const handleCreate = async () => {
    if (!selectedListId) return;
    setCreatingTask(true);
    setError(null);
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data?action=clickup-create-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          data: {
            listId: selectedListId,
            name: featureTitle,
            description: featureDesc,
            assignees: selectedAssigneeIds
          }
        })
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success) {
          onTaskCreated(resData.taskUrl, resData.taskStatus, resData.taskAssignee);
          onClose();
        } else {
          setError(resData.error || 'Failed to create task');
        }
      } else {
        setError('Failed to create task on ClickUp API');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating task');
    } finally {
      setCreatingTask(false);
    }
  };

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

  if (!isOpen) return null;

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
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Create Task on ClickUp
          </h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ 
            color: 'var(--danger)', 
            padding: '8px 12px', 
            borderRadius: '6px', 
            backgroundColor: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid rgba(239, 68, 68, 0.15)',
            fontSize: '0.75rem' 
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.8rem' }}>
          {/* Workspace Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ClickUp Workspace</label>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setSelectedSpaceId('');
                setSelectedListId('');
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer'
              }}
              disabled={loadingTeams || creatingTask}
            >
              <option value="">-- Select Workspace --</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {loadingTeams && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loading workspaces...</span>}
          </div>

          {/* Space Dropdown */}
          {selectedTeamId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Space</label>
              <select
                value={selectedSpaceId}
                onChange={(e) => {
                  setSelectedSpaceId(e.target.value);
                  setSelectedListId('');
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                disabled={loadingSpaces || creatingTask}
              >
                <option value="">-- Select Space --</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {loadingSpaces && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loading spaces...</span>}
            </div>
          )}

          {/* List Dropdown */}
          {selectedSpaceId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>ClickUp List</label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                disabled={loadingContent || creatingTask}
              >
                <option value="">-- Select List --</option>
                
                {/* Folderless Lists */}
                {folderlessLists.length > 0 && (
                  <optgroup label="Folderless Lists">
                    {folderlessLists.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </optgroup>
                )}

                {/* Folders & their lists */}
                {folders.map(f => (
                  <optgroup key={f.id} label={`Folder: ${f.name}`}>
                    {f.lists.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {loadingContent && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loading lists...</span>}
            </div>
          )}

          {/* Assignees (Workspace Members) */}
          {selectedTeamId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Assign Task To</label>
              <input
                type="text"
                placeholder="Search team members..."
                value={assigneeSearchQuery}
                onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  outline: 'none',
                  marginBottom: '4px'
                }}
                disabled={creatingTask}
              />
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                maxHeight: '130px', 
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
                backgroundColor: 'var(--background)'
              }}>
                {(() => {
                  const currentTeam = teams.find(t => t.id === selectedTeamId) as any;
                  const members = currentTeam?.members || [];
                  const filteredMembers = members.filter((m: any) => {
                    const u = m.user;
                    if (!u) return false;
                    return u.username.toLowerCase().includes(assigneeSearchQuery.toLowerCase());
                  });
                  if (filteredMembers.length === 0) {
                    return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No matching members.</span>;
                  }
                  return filteredMembers.map((m: any) => {
                    const u = m.user;
                    const isChecked = selectedAssigneeIds.includes(u.id);
                    return (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', padding: '2px 0' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedAssigneeIds(selectedAssigneeIds.filter(id => id !== u.id));
                            } else {
                              setSelectedAssigneeIds([...selectedAssigneeIds, u.id]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          disabled={creatingTask}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{u.username}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            disabled={creatingTask}
            style={{ padding: '6px 14px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn btn-primary btn-sm"
            disabled={!selectedListId || creatingTask}
            style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {creatingTask ? 'Creating...' : 'Create Task'}
          </button>
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

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose, onImport, headers, title }) => {
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

export interface HighlightedDate {
  date: string;
  label?: string;
  color?: string;
}

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
  highlightedDates?: (string | HighlightedDate)[];
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  value, 
  onChange, 
  onClose, 
  align = 'left',
  highlightedDates = []
}) => {
  const parsedInitial = parseDateToYYYYMMDD(value);
  let defaultYear = new Date().getFullYear();
  let defaultMonth = new Date().getMonth();
  if (parsedInitial) {
    const [y, m] = parsedInitial.split('-').map(Number);
    if (y && m) {
      defaultYear = y;
      defaultMonth = m - 1;
    }
  }

  const [currentYear, setCurrentYear] = useState(defaultYear);
  const [currentMonth, setCurrentMonth] = useState(defaultMonth); // 0-indexed

  useEffect(() => {
    const parsed = parseDateToYYYYMMDD(value);
    if (parsed) {
      const [y, m] = parsed.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
  }, [value]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const normalizedHighlights = useMemo(() => {
    if (!highlightedDates || highlightedDates.length === 0) return [];
    return highlightedDates.map(item => {
      if (typeof item === 'string') {
        const d = parseDateToYYYYMMDD(item);
        return { date: d, label: 'Milestone', color: '#6366f1' };
      }
      const d = parseDateToYYYYMMDD(item.date);
      return {
        date: d,
        label: item.label || 'Milestone',
        color: item.color || '#6366f1'
      };
    }).filter(h => !!h.date);
  }, [highlightedDates]);

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
    const parsed = parseDateToYYYYMMDD(value);
    if (!parsed) return false;
    const [y, m, d] = parsed.split('-').map(Number);
    return y === currentYear && m === (currentMonth + 1) && d === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
  };

  const getHighlightsForDay = (day: number) => {
    const paddedMonth = (currentMonth + 1).toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');
    const dateStr = `${currentYear}-${paddedMonth}-${paddedDay}`;
    return normalizedHighlights.filter(h => h.date === dateStr);
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
        borderRadius: '10px',
        boxShadow: 'var(--shadow)',
        padding: '12px',
        width: '260px',
        zIndex: 10005,
        fontFamily: 'var(--font-family-base)',
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <button 
          type="button"
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
          {months[currentMonth]} {currentYear}
        </span>
        <button 
          type="button"
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
        {weekdays.map(day => (
          <span key={day} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>
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
          const dayHighlights = getHighlightsForDay(cell);
          const hasHighlight = dayHighlights.length > 0;
          const highlightTooltip = hasHighlight 
            ? dayHighlights.map(h => `${h.label}: ${h.date}`).join(', ') 
            : undefined;

          const primaryColor = dayHighlights[0]?.color || 'var(--primary)';

          return (
            <div 
              key={`day-${cell}`}
              onClick={() => handleDayClick(cell)}
              title={highlightTooltip}
              style={{
                fontSize: '0.75rem',
                fontWeight: selected || hasHighlight ? '700' : '500',
                padding: '4px 0 2px 0',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: selected 
                  ? 'var(--primary)' 
                  : hasHighlight 
                    ? `${primaryColor}1a` 
                    : 'transparent',
                color: selected 
                  ? '#ffffff' 
                  : hasHighlight 
                    ? primaryColor 
                    : current 
                      ? 'var(--accent)' 
                      : 'var(--text-primary)',
                transition: 'all 0.15s ease',
                border: selected 
                  ? 'none' 
                  : hasHighlight 
                    ? `1.5px solid ${primaryColor}` 
                    : current 
                      ? '1px solid var(--accent)' 
                      : '1px solid transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                minHeight: '30px'
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = hasHighlight ? `${primaryColor}2e` : 'var(--background-alt)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = hasHighlight ? `${primaryColor}1a` : 'transparent';
                }
              }}
            >
              <span style={{ lineHeight: 1 }}>{cell}</span>
              {/* Highlight dot indicator */}
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center', height: '4px', marginTop: '2px' }}>
                {hasHighlight && dayHighlights.slice(0, 3).map((h, i) => (
                  <span
                    key={i}
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: selected ? '#ffffff' : (h.color || 'var(--primary)')
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
        <button 
          type="button"
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
          type="button"
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

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ value, onChange, productStatuses }) => {
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
    
    // Check if there is a color configured in the database
    const matched = productStatuses.find(p => p.label.toLowerCase() === s);
    if (matched && matched.color) return matched.color;
    
    if (s === 'completed' || s === 'done' || s === 'delivered' || s === 'closed') return '#10b981';
    if (s === 'in progress' || s === 'in-progress' || s === 'active') return '#f59e0b';
    if (s === 'on hold' || s === 'on-hold' || s === 'hold') return '#ef4444';
    if (s === 'ongoing') return '#8b5cf6';
    if (s === 'information pending') return '#ec4899';
    if (s === 'removed') return '#ef4444';
    if (s === 'under review') return '#8b5cf6';
    if (s === 'not feasible') return '#ef4444';
    return '#6b7280';
  };

  const statusColor = getStatusColor(value);

  const allStatuses = useMemo(() => {
    const list = [...productStatuses];
    if (value && !list.some(s => s.label.toLowerCase() === value.trim().toLowerCase())) {
      list.push({ id: `custom-${value}`, label: value, color: getStatusColor(value) });
    }
    return list;
  }, [productStatuses, value]);

  return (
    <div 
      className="status-dropdown-container" 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        zIndex: isOpen ? 100 : 'auto'
      }}
    >
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
            zIndex: 1000,
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: '4px',
            minWidth: '180px',
            maxHeight: '280px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.15s ease-out',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-light) transparent'
          }}
          className="status-dropdown-menu"
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
          
          {allStatuses.map((s, idx) => {
            const isSelected = s.label.toLowerCase() === (value || '').trim().toLowerCase();
            const itemColor = getStatusColor(s.label);
            return (
              <div
                key={s.id || `status-${idx}`}
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
                  backgroundColor: isSelected ? 'var(--background-alt)' : 'transparent',
                  whiteSpace: 'nowrap'
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
                  alignItems: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  {s.label}
                </span>
                {isSelected && (
                  <CheckSquare size={12} style={{ color: itemColor, marginLeft: '8px', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  counts?: Record<string, number>;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder,
  counts
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

  const getPluralPlaceholder = (text: string) => {
    const lower = text.toLowerCase();
    if (lower === 'category') return 'Categories';
    if (lower === 'status') return 'Statuses';
    if (lower === 'feature poc' || lower === 'poc') return 'Feature POCs';
    if (text.endsWith('y')) return text.slice(0, -1) + 'ies';
    if (text.endsWith('s') || text.endsWith('ch') || text.endsWith('sh')) return text + 'es';
    return text + 's';
  };

  const pluralText = getPluralPlaceholder(placeholder);

  const displayText = selectedValues.length === 0 
    ? `All ${pluralText}`
    : selectedValues.length === options.length 
      ? `All ${pluralText}`
      : selectedValues.join(', ');

  return (
    <div className="multi-select-container" ref={containerRef}>
      <button 
        type="button" 
        className="multi-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title={selectedValues.length > 0 ? selectedValues.join(', ') : `All ${pluralText}`}
      >
        <span className="multi-select-trigger-text">{displayText}</span>
        <ChevronDown size={14} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && (
        <div className="multi-select-dropdown" style={{ minWidth: '220px', maxWidth: '320px' }}>
          {options.length > 2 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 6px 4px', borderBottom: '1px solid var(--border-light, var(--border))', marginBottom: '3px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {pluralText} ({options.length})
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedValues.length < options.length && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([...options]);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    All
                  </button>
                )}
                {selectedValues.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([]);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
          {options.map(option => {
            const isChecked = selectedValues.includes(option);
            const count = counts ? (counts[option] ?? 0) : undefined;
            return (
              <label 
                key={option} 
                className="multi-select-option"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '5px 8px',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  <input 
                    type="checkbox" 
                    className="multi-select-checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleOption(option)}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option}</span>
                </div>
                {count !== undefined && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 650,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: count > 0 ? 'var(--background-alt, rgba(99, 102, 241, 0.08))' : 'transparent',
                      color: count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                      border: count > 0 ? '1px solid var(--border-light, var(--border))' : 'none',
                      flexShrink: 0,
                      minWidth: '20px',
                      textAlign: 'center'
                    }}
                  >
                    {count}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface CategoryPillSelectProps {
  value: string;
  categories: { id: string; name: string; active?: boolean }[];
  onChange: (categoryId: string) => void;
  title?: string;
}

export const CategoryPillSelect: React.FC<CategoryPillSelectProps> = ({ value, categories, onChange, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const catObj = categories.find(c => c.id === value);
  const catName = catObj ? catObj.name : (value === '__uncategorized__' ? 'Uncategorized' : '');
  const displayText = catName || 'Select category';
  const pillStyle = getAutoCategoryProgramCompactStyle(catName);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 60 : 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={pillStyle}
        title={title || (catName ? `Category: ${catName}` : 'Select Category')}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '105px' }}>
          {displayText}
        </span>
        <ChevronDown
          size={11}
          style={{
            flexShrink: 0,
            opacity: 0.7,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s'
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            minWidth: '175px',
            maxWidth: '220px',
            maxHeight: '230px',
            overflowY: 'auto',
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            padding: '4px',
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
              padding: '5px 8px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>Select category</span>
            {!value && <Check size={12} color="var(--primary)" />}
          </div>

          {categories.filter(c => c.active !== false).map(c => {
            const isSelected = value === c.id;
            const pal = getAutoCategoryProgramPalette(c.name);
            return (
              <div
                key={c.id}
                onClick={() => {
                  onChange(c.id);
                  setIsOpen(false);
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 650 : 500,
                  color: isSelected ? pal.color : 'var(--text-primary)',
                  backgroundColor: isSelected ? pal.bg : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--background-alt)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: pal.color,
                      flexShrink: 0
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                </div>
                {isSelected && <Check size={12} color={pal.color} style={{ flexShrink: 0 }} />}
              </div>
            );
          })}

          <div
            onClick={() => {
              onChange('__uncategorized__');
              setIsOpen(false);
            }}
            style={{
              padding: '5px 8px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: value === '__uncategorized__' ? 'var(--primary)' : 'var(--text-secondary)',
              backgroundColor: value === '__uncategorized__' ? 'var(--primary-glow)' : 'transparent',
              borderTop: '1px solid var(--border-light, var(--border))',
              marginTop: '2px',
              paddingTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => {
              if (value !== '__uncategorized__') e.currentTarget.style.backgroundColor = 'var(--background-alt)';
            }}
            onMouseLeave={(e) => {
              if (value !== '__uncategorized__') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>Uncategorized / Existing</span>
            {value === '__uncategorized__' && <Check size={12} color="var(--primary)" />}
          </div>
        </div>
      )}
    </div>
  );
};


interface ProgramMultiSelectPillProps {
  programIds: string;
  programNames: string;
  programs: { id: string; name: string; categoryId?: string }[];
  categoryId?: string;
  onChange: (newIds: string, newNames: string, inferredCategoryId?: string) => void;
  disabled?: boolean;
  title?: string;
}

export const ProgramMultiSelectPill: React.FC<ProgramMultiSelectPillProps> = ({
  programIds,
  programNames,
  programs,
  categoryId,
  onChange,
  disabled,
  title
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availablePrograms = useMemo(() => {
    if (!categoryId || categoryId === '__uncategorized__') {
      return programs;
    }
    return programs.filter(p => (p.categoryId || '__uncategorized__') === categoryId);
  }, [programs, categoryId]);

  const selectedIds = useMemo(() => {
    return (programIds || '').split(',').map(s => s.trim()).filter(Boolean);
  }, [programIds]);

  const rawSelectedNames = useMemo(() => {
    return (programNames || '').split(',').map(s => s.trim()).filter(Boolean);
  }, [programNames]);

  // Priority 1: Match by program ID
  // Priority 2: Match by name
  const selectedPrograms = useMemo(() => {
    if (selectedIds.length > 0) {
      const byId = programs.filter(p => selectedIds.includes(p.id));
      if (byId.length > 0) return byId;
    }
    if (rawSelectedNames.length > 0 && rawSelectedNames[0] !== 'Select program' && rawSelectedNames[0] !== 'No program') {
      return programs.filter(p => rawSelectedNames.some(n => n.toLowerCase() === p.name.toLowerCase()));
    }
    return [];
  }, [selectedIds, rawSelectedNames, programs]);

  const isSelected = (p: { id: string; name: string }) => {
    if (selectedIds.length > 0) {
      return selectedIds.includes(p.id);
    }
    return selectedPrograms.some(sp => sp.id === p.id);
  };

  const matchedProgNames = useMemo(() => {
    return new Set(selectedPrograms.map(p => p.name.toLowerCase()));
  }, [selectedPrograms]);

  const customProgNames = useMemo(() => {
    return rawSelectedNames.filter(n =>
      n.toLowerCase() !== 'select program' &&
      n.toLowerCase() !== 'no program' &&
      !matchedProgNames.has(n.toLowerCase())
    );
  }, [rawSelectedNames, matchedProgNames]);

  const effectiveCount = selectedPrograms.length + customProgNames.length;

  let displayText = 'Select program';
  let primaryName = '';
  if (selectedPrograms.length > 0) {
    primaryName = selectedPrograms[0].name;
  } else if (customProgNames.length > 0) {
    primaryName = customProgNames[0];
  }

  if (effectiveCount === 1) {
    displayText = primaryName;
  } else if (effectiveCount > 1) {
    displayText = `${primaryName} (+${effectiveCount - 1})`;
  }

  const allProgNames = [
    ...selectedPrograms.map(p => p.name),
    ...customProgNames
  ];
  const tooltip = allProgNames.join(', ');

  const pillStyle = getAutoCategoryProgramCompactStyle(primaryName);

  if (disabled) {
    return (
      <div
        style={{
          ...getAutoCategoryProgramCompactStyle(''),
          opacity: 0.45,
          cursor: 'not-allowed',
          display: 'inline-flex'
        }}
        title="Select category first"
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '105px' }}>
          Select program
        </span>
        <ChevronDown size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
      </div>
    );
  }

  const handleToggle = (prog: { id: string; name: string; categoryId?: string }) => {
    const currentIdList = selectedPrograms.map(p => p.id);
    const currentNameList = [...selectedPrograms.map(p => p.name), ...customProgNames];

    let nextIds: string[];
    let nextNames: string[];
    if (isSelected(prog)) {
      nextIds = currentIdList.filter(id => id !== prog.id);
      nextNames = currentNameList.filter(name => name.toLowerCase() !== prog.name.toLowerCase());
    } else {
      nextIds = currentIdList.includes(prog.id) ? currentIdList : [...currentIdList, prog.id];
      nextNames = currentNameList.some(n => n.toLowerCase() === prog.name.toLowerCase())
        ? currentNameList
        : [...currentNameList, prog.name];
    }
    const inferredCat = prog.categoryId || undefined;
    onChange(nextIds.join(', '), nextNames.join(', '), inferredCat);
  };

  const handleSelectAll = () => {
    const nextIds = availablePrograms.map(p => p.id);
    const nextNames = availablePrograms.map(p => p.name);
    onChange(nextIds.join(', '), nextNames.join(', '));
  };

  const handleClear = () => {
    onChange('', '');
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 60 : 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={pillStyle}
        title={title || (tooltip ? `Programs: ${tooltip}` : 'Select Program(s)')}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '105px' }}>
          {displayText}
        </span>
        <ChevronDown
          size={11}
          style={{
            flexShrink: 0,
            opacity: 0.7,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s'
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            minWidth: '200px',
            maxWidth: '260px',
            maxHeight: '260px',
            overflowY: 'auto',
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 4px 6px 4px',
              borderBottom: '1px solid var(--border-light, var(--border))',
              marginBottom: '2px'
            }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Programs ({effectiveCount})
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {availablePrograms.length > 0 && selectedPrograms.length < availablePrograms.length && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 2px'
                  }}
                >
                  All
                </button>
              )}
              {effectiveCount > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger, #ef4444)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 2px'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {availablePrograms.length === 0 ? (
            <div style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No programs found
            </div>
          ) : (
            availablePrograms.map(p => {
              const checked = isSelected(p);
              const pal = getAutoCategoryProgramPalette(p.name);
              return (
                <label
                  key={p.id}
                  onClick={() => handleToggle(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: checked ? 650 : 500,
                    color: checked ? pal.color : 'var(--text-primary)',
                    backgroundColor: checked ? pal.bg : 'transparent',
                    userSelect: 'none',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) e.currentTarget.style.backgroundColor = 'var(--background-alt)';
                  }}
                  onMouseLeave={(e) => {
                    if (!checked) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    style={{
                      cursor: 'pointer',
                      accentColor: pal.color,
                      margin: 0,
                      width: '13px',
                      height: '13px'
                    }}
                  />
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: pal.color,
                      flexShrink: 0
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {p.name}
                  </span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

interface CohortMultiSelectPillProps {
  cohortIds?: string;
  cohortNames: string;
  cohorts: ConfigCohort[];
  programIds?: string;
  programNames?: string;
  programs: ConfigProgram[];
  onChange: (newIds: string, newNames: string, inferredPrograms?: ConfigProgram[]) => void;
  title?: string;
}

export const CohortMultiSelectPill: React.FC<CohortMultiSelectPillProps> = ({
  cohortIds,
  cohortNames,
  cohorts,
  programIds,
  programNames,
  programs,
  onChange,
  title
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomMode]);

  const activeProgIds = useMemo(() => {
    const ids = (programIds || '').split(',').map(s => s.trim()).filter(Boolean);
    const names = (programNames || '').split(',').map(s => s.trim()).filter(Boolean);
    const resolvedIds = new Set<string>(ids);
    names.forEach(name => {
      const match = programs.find(p => p.name.toLowerCase() === name.toLowerCase() || p.id === name);
      if (match) resolvedIds.add(match.id);
    });
    return Array.from(resolvedIds);
  }, [programIds, programNames, programs]);

  const availableCohorts = useMemo(() => {
    if (activeProgIds.length > 0) {
      const filtered = cohorts.filter(c => c.active !== false && activeProgIds.includes(c.programId));
      if (filtered.length > 0) return filtered;
    }
    return cohorts.filter(c => c.active !== false);
  }, [cohorts, activeProgIds]);

  const selectedIds = useMemo(() => {
    return (cohortIds || '').split(',').map(s => s.trim()).filter(Boolean);
  }, [cohortIds]);

  const rawSelectedNames = useMemo(() => {
    return (cohortNames || '').split(',').map(s => s.trim()).filter(Boolean);
  }, [cohortNames]);

  // Priority 1: If cohortIds are provided, resolve against cohorts by ID
  // Priority 2: If only cohortNames are provided (legacy data), match names strictly within availableCohorts (scoped to program)
  const selectedCohortObjs = useMemo(() => {
    if (selectedIds.length > 0) {
      const byId = cohorts.filter(c => selectedIds.includes(c.id));
      if (byId.length > 0) return byId;
    }
    if (rawSelectedNames.length > 0 && rawSelectedNames[0] !== 'Select cohort') {
      // Match by name strictly within availableCohorts so we do not match other programs' cohorts (e.g. 15 other "Cohort 1"s)
      const inAvailable = availableCohorts.filter(c =>
        rawSelectedNames.some(name => name.toLowerCase() === c.name.toLowerCase())
      );
      if (inAvailable.length > 0) return inAvailable;
      // Fallback only if no match in available: search all cohorts
      return cohorts.filter(c =>
        rawSelectedNames.some(name => name.toLowerCase() === c.name.toLowerCase())
      );
    }
    return [];
  }, [selectedIds, rawSelectedNames, availableCohorts, cohorts]);

  // Is a cohort checkbox in the dropdown selected?
  // Use cohort ID as primary source of truth!
  const isSelected = (c: ConfigCohort) => {
    if (selectedIds.length > 0) {
      return selectedIds.includes(c.id);
    }
    return selectedCohortObjs.some(sc => sc.id === c.id);
  };

  // Custom cohort names (typed via "+ Custom Cohort...") that don't match any known config cohort
  const matchedCohortNames = useMemo(() => {
    return new Set(selectedCohortObjs.map(c => c.name.toLowerCase()));
  }, [selectedCohortObjs]);

  const customSelectedNames = useMemo(() => {
    return rawSelectedNames.filter(name =>
      name.toLowerCase() !== 'select cohort' &&
      !matchedCohortNames.has(name.toLowerCase())
    );
  }, [rawSelectedNames, matchedCohortNames]);

  const effectiveCount = selectedCohortObjs.length + customSelectedNames.length;

  let displayText = 'Select cohort';
  let primaryName = '';
  if (selectedCohortObjs.length > 0) {
    primaryName = selectedCohortObjs[0].name;
  } else if (customSelectedNames.length > 0) {
    primaryName = customSelectedNames[0];
  }

  if (effectiveCount === 1) {
    displayText = primaryName;
  } else if (effectiveCount > 1) {
    displayText = `${primaryName} (+${effectiveCount - 1})`;
  }

  const allSelectedNames = [
    ...selectedCohortObjs.map(c => c.name),
    ...customSelectedNames
  ];
  const tooltip = allSelectedNames.join(', ');

  const pillStyle = getAutoCategoryProgramCompactStyle(primaryName);

  const handleToggle = (coh: ConfigCohort) => {
    const currentIdList = selectedCohortObjs.map(c => c.id);
    const currentNameList = [
      ...selectedCohortObjs.map(c => c.name),
      ...customSelectedNames
    ];

    let nextIds: string[];
    let nextNames: string[];

    if (isSelected(coh)) {
      nextIds = currentIdList.filter(id => id !== coh.id);
      nextNames = currentNameList.filter(name => name.toLowerCase() !== coh.name.toLowerCase());
    } else {
      nextIds = currentIdList.includes(coh.id) ? currentIdList : [...currentIdList, coh.id];
      nextNames = currentNameList.some(n => n.toLowerCase() === coh.name.toLowerCase())
        ? currentNameList
        : [...currentNameList, coh.name];
    }

    const inferredProgs: ConfigProgram[] = [];
    nextIds.forEach(cid => {
      const c = cohorts.find(ch => ch.id === cid);
      if (c?.programId) {
        const p = programs.find(pr => pr.id === c.programId);
        if (p && !inferredProgs.some(ip => ip.id === p.id)) inferredProgs.push(p);
      }
    });

    onChange(nextIds.join(', '), nextNames.join(', '), inferredProgs);
  };

  const handleSelectAll = () => {
    const nextIds = Array.from(new Set([...selectedCohortObjs.map(c => c.id), ...availableCohorts.map(c => c.id)]));
    const nextNames = Array.from(new Set([
      ...selectedCohortObjs.map(c => c.name),
      ...availableCohorts.map(c => c.name),
      ...customSelectedNames
    ]));
    const inferredProgs: ConfigProgram[] = [];
    nextIds.forEach(cid => {
      const c = cohorts.find(ch => ch.id === cid);
      if (c?.programId) {
        const p = programs.find(pr => pr.id === c.programId);
        if (p && !inferredProgs.some(ip => ip.id === p.id)) inferredProgs.push(p);
      }
    });
    onChange(nextIds.join(', '), nextNames.join(', '), inferredProgs);
  };

  const handleClear = () => {
    onChange('', '');
  };

  const handleSaveCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      const currentIds = selectedCohortObjs.map(c => c.id);
      const currentNames = [
        ...selectedCohortObjs.map(c => c.name),
        ...customSelectedNames
      ];
      if (!currentNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
        currentNames.push(trimmed);
      }
      onChange(currentIds.join(', '), currentNames.join(', '));
    }
    setCustomText('');
    setIsCustomMode(false);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 60 : 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsCustomMode(false);
        }}
        style={pillStyle}
        title={title || (tooltip ? `Cohorts: ${tooltip}` : 'Select Cohort(s)')}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
          {displayText}
        </span>
        <ChevronDown
          size={11}
          style={{
            flexShrink: 0,
            opacity: 0.7,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s'
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            minWidth: '200px',
            maxWidth: '260px',
            maxHeight: '270px',
            overflowY: 'auto',
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 4px 6px 4px',
              borderBottom: '1px solid var(--border-light, var(--border))',
              marginBottom: '2px'
            }}
          >
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cohorts ({effectiveCount})
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {availableCohorts.length > 0 && selectedCohortObjs.length < availableCohorts.length && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 2px'
                  }}
                >
                  All
                </button>
              )}
              {effectiveCount > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger, #ef4444)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 2px'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {availableCohorts.length === 0 ? (
            <div style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No cohorts found
            </div>
          ) : (
            availableCohorts.map(c => {
              const checked = isSelected(c);
              const pal = getAutoCategoryProgramPalette(c.name);
              return (
                <label
                  key={c.id}
                  onClick={() => handleToggle(c)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: checked ? 650 : 500,
                    color: checked ? pal.color : 'var(--text-primary)',
                    backgroundColor: checked ? pal.bg : 'transparent',
                    userSelect: 'none',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!checked) e.currentTarget.style.backgroundColor = 'var(--background-alt)';
                  }}
                  onMouseLeave={(e) => {
                    if (!checked) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    style={{
                      cursor: 'pointer',
                      accentColor: pal.color,
                      margin: 0,
                      width: '13px',
                      height: '13px'
                    }}
                  />
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: pal.color,
                      flexShrink: 0
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.name}
                  </span>
                </label>
              );
            })
          )}

          {/* Custom cohort button / input */}
          <div style={{ borderTop: '1px solid var(--border-light, var(--border))', marginTop: '2px', paddingTop: '4px' }}>
            {!isCustomMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setCustomText('');
                }}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  borderRadius: '5px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background-alt)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                + Custom Cohort...
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '4px', padding: '2px' }} onClick={(e) => e.stopPropagation()}>
                <input
                  ref={customInputRef}
                  type="text"
                  placeholder="Enter cohort..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCustom();
                    } else if (e.key === 'Escape') {
                      setIsCustomMode(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--primary)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


