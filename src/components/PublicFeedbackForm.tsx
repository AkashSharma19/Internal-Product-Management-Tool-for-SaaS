import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Star, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';

interface PublicFeedbackFormProps {
  itemId: string;
  category?: string | null;
}

export const PublicFeedbackForm: React.FC<PublicFeedbackFormProps> = ({ itemId, category }) => {
  const { 
    adminCalls, 
    studentMeetings, 
    amaSessions, 
    studentProjects, 
    formConfigs, 
    addFeedbackSubmission,
    isLoading
  } = useDashboard();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submittedBy, setSubmittedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 1. Resolve Category
  let resolvedCategory: 'admin-calls' | 'ama-meetings' | 'student-projects' | null = null;
  const cat = category || '';
  if (cat === 'admin-calls' || cat === 'ama-meetings' || cat === 'student-projects') {
    resolvedCategory = cat;
  } else if (itemId) {
    if (itemId.startsWith('adm-')) resolvedCategory = 'admin-calls';
    else if (itemId.startsWith('meet-')) resolvedCategory = 'ama-meetings';
    else if (itemId.startsWith('ama-')) resolvedCategory = 'ama-meetings';
    else if (itemId.startsWith('proj-')) resolvedCategory = 'student-projects';
  }

  // 2. Fetch Meeting/Project details
  let itemTitle = 'Meeting / Project';
  let itemSubtitle = '';
  let foundItem = false;

  if (resolvedCategory === 'admin-calls') {
    const call = adminCalls.find(c => c.id === itemId);
    if (call) {
      itemTitle = call.cohortTopic;
      itemSubtitle = `Admin Call • ${call.adminPoc} • ${call.date}`;
      foundItem = true;
    }
  } else if (resolvedCategory === 'ama-meetings') {
    const meeting = studentMeetings.find(m => m.id === itemId);
    if (meeting) {
      itemTitle = meeting.cohort;
      itemSubtitle = `Student Meeting • ${meeting.poc || 'N/A'} • ${meeting.date}`;
      foundItem = true;
    } else {
      const ama = amaSessions.find(a => a.id === itemId);
      if (ama) {
        itemTitle = ama.topic;
        itemSubtitle = `AMA Session • ${ama.speaker} • ${ama.date}`;
        foundItem = true;
      }
    }
  } else if (resolvedCategory === 'student-projects') {
    const project = studentProjects.find(p => p.id === itemId);
    if (project) {
      itemTitle = project.title;
      itemSubtitle = `Student Project • POC: ${project.poc || 'N/A'}`;
      foundItem = true;
    }
  }

  // 3. Retrieve Form Config
  const config = formConfigs.find(c => c.category === resolvedCategory);
  const isFormConfigured = config && config.enabled && config.fields && config.fields.length > 0;

  const handleRatingClick = (fieldId: string, rating: number) => {
    setAnswers(prev => ({ ...prev, [fieldId]: rating }));
  };

  const handleTextChange = (fieldId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[fieldId] as string[]) || [];
      const updated = checked 
        ? [...current, option]
        : current.filter(o => o !== option);
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedCategory || !isFormConfigured) return;

    setValidationError(null);

    // Validation
    for (const field of config.fields) {
      const val = answers[field.id];
      if (field.required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          setValidationError(`Please answer the required question: "${field.label}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await addFeedbackSubmission({
        category: resolvedCategory,
        itemId,
        answers,
        submittedBy: submittedBy.trim() || 'Anonymous'
      });
      setSubmitted(true);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Loader
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', overflowY: 'auto', background: 'var(--background)', color: 'var(--text-primary)',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div style={{
          width: '40px', height: '40px', border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '1.25rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Loading Form Details...
        </p>
      </div>
    );
  }

  // Render Form Disabled/Not Configured
  if (!resolvedCategory || !isFormConfigured) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', overflowY: 'auto', background: 'linear-gradient(180deg, var(--background-alt) 0%, var(--background) 100%)',
        fontFamily: 'Outfit, sans-serif', padding: '1.5rem'
      }}>
        <div style={{
          background: 'var(--panel-bg)', border: '1px solid var(--border-light)', borderRadius: '24px',
          padding: '2.5rem', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow)',
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)'
          }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Feedback Form Unavailable
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              The feedback form for this session is not yet configured or has been disabled by the administrator. Please check back later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Success State
  if (submitted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', overflowY: 'auto', background: 'linear-gradient(180deg, var(--background-alt) 0%, var(--background) 100%)',
        fontFamily: 'Outfit, sans-serif', padding: '1.5rem'
      }}>
        <div style={{
          background: 'var(--panel-bg)', border: '1px solid var(--border-light)', borderRadius: '24px',
          padding: '3rem 2rem', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow)',
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
          animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--success)'
          }}>
            <CheckCircle size={32} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              THANK YOU!
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: '1.6' }}>
              Your feedback has been successfully submitted. We appreciate your response and will use it to improve future sessions!
            </p>
          </div>
          {foundItem && (
            <div style={{
              background: 'var(--background-alt)', borderRadius: '12px', padding: '0.85rem 1.25rem',
              width: '100%', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-primary)'
            }}>
              <strong>{itemTitle}</strong>
              <div style={{ marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{itemSubtitle}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sorting fields by order
  const sortedFields = [...config.fields].sort((a, b) => a.order - b.order);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto',
      background: 'linear-gradient(180deg, var(--background-alt) 0%, var(--background) 100%)',
      fontFamily: 'Outfit, sans-serif', padding: '2rem 1rem'
    }}>
      <div style={{
        width: '100%', maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {/* Form Card */}
        <div style={{
          background: 'var(--panel-bg)', border: '1px solid var(--border-light)', borderRadius: '24px',
          boxShadow: 'var(--shadow)', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
            padding: '2rem 1.75rem', color: '#fff', position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', opacity: 0.9 }}>
              <ClipboardList size={16} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                SESSION FEEDBACK PORTAL
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, lineHeight: '1.3', letterSpacing: '-0.02em' }}>
              {itemTitle}
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', opacity: 0.85, fontWeight: 500 }}>
              {itemSubtitle || 'We appreciate your honest feedback.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {validationError && (
              <div style={{
                display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '12px',
                background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--danger)', fontSize: '0.85rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Dynamic Questions */}
            {sortedFields.map((field) => {
              return (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                    {field.label}
                    {field.required && <span style={{ color: 'var(--danger)', marginLeft: '3px' }}>*</span>}
                  </label>

                  {/* Rating Field */}
                  {field.type === 'rating' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentVal = answers[field.id] || 0;
                        const isSelected = star <= currentVal;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingClick(field.id, star)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                              color: isSelected ? '#fbbf24' : 'var(--text-muted)',
                              transition: 'transform 0.1s, color 0.15s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            <Star size={32} fill={isSelected ? '#fbbf24' : 'none'} strokeWidth={1.5} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Input */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      placeholder="Type your response..."
                      value={answers[field.id] || ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                        border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                        fontSize: '0.85rem', outline: 'none', width: '100%', transition: 'border-color 0.2s'
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === 'textarea' && (
                    <textarea
                      placeholder="Write your comments here..."
                      rows={4}
                      value={answers[field.id] || ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                        border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                        fontSize: '0.85rem', outline: 'none', width: '100%', resize: 'vertical',
                        transition: 'border-color 0.2s', fontFamily: 'inherit'
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    />
                  )}

                  {/* Dropdown Select */}
                  {field.type === 'select' && (
                    <select
                      value={answers[field.id] || ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                        border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                        fontSize: '0.85rem', outline: 'none', width: '100%', cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Select Option --</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {/* Checkbox Options */}
                  {field.type === 'checkbox' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {(field.options || []).map((opt) => {
                        const checkedList = (answers[field.id] as string[]) || [];
                        const isChecked = checkedList.includes(opt);
                        return (
                          <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ color: 'var(--text-primary)' }}>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Optional Identity */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Name / Email (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Leave blank to remain anonymous"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                    border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                    fontSize: '0.85rem', outline: 'none', width: '100%'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                color: '#fff', border: 'none', borderRadius: '12px', padding: '12px',
                fontSize: '0.9rem', fontWeight: 650, cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--primary-glow) 0 8px 16px', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.5rem'
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
                  }} />
                  Submitting Feedback...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Powered by Operations Control • Secure Feedback Protocol
        </div>
      </div>
    </div>
  );
};
