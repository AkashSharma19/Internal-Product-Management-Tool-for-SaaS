import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Star, CheckCircle, AlertCircle, ClipboardList, Shield } from 'lucide-react';

interface PublicFeedbackFormProps {
  itemId: string;
  category?: string | null;
}

// Simple Base64 URL Decode for decoding Google JWT on the client side
const decodeGoogleJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT', e);
    return null;
  }
};

export const PublicFeedbackForm: React.FC<PublicFeedbackFormProps> = ({ itemId, category }) => {
  const { 
    adminCalls, 
    studentMeetings, 
    amaSessions, 
    studentProjects, 
    formConfigs, 
    addFeedbackSubmission,
    feedbackSubmissions,
    isLoading,
    googleClientId,
    requireGoogleLogin,
    googleAllowedDomains
  } = useDashboard();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submittedBy, setSubmittedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [googleLoginError, setGoogleLoginError] = useState<string | null>(null);

  // Authenticated Google User State
  const [googleUser, setGoogleUser] = useState<{
    email: string;
    name: string;
    picture?: string;
  } | null>(() => {
    const saved = localStorage.getItem('feedback-google-user');
    return saved ? JSON.parse(saved) : null;
  });

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

  // 4. Check past submissions
  const userPastSubmission = googleUser
    ? feedbackSubmissions.find(sub => sub.itemId === itemId && sub.submittedByEmail === googleUser.email)
    : null;

  // If already submitted, pre-fill and lock form
  useEffect(() => {
    if (userPastSubmission) {
      setAnswers(userPastSubmission.answers || {});
      setSubmittedBy(userPastSubmission.submittedBy || '');
    } else {
      setAnswers({});
      setSubmittedBy(googleUser ? googleUser.name : '');
    }
  }, [userPastSubmission, googleUser]);

  // Google Login Script Handler
  useEffect(() => {
    if (googleUser || !googleClientId) return;

    let isMounted = true;

    // Dynamically load Google Sign-in script if not already present
    if (!(window as any).google?.accounts?.id) {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    const initializeGoogleBtn = () => {
      const g = (window as any).google;
      if (g?.accounts?.id) {
        g.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (!isMounted) return;
            const payload = decodeGoogleJwt(response.credential);
            if (payload && payload.email) {
              // Check Domain Restriction
              if (googleAllowedDomains) {
                const domains = googleAllowedDomains.split(',')
                  .map(d => d.trim().toLowerCase())
                  .filter(Boolean);
                const userDomain = payload.email.split('@')[1]?.toLowerCase();
                
                if (domains.length > 0 && !domains.includes(userDomain)) {
                  setGoogleLoginError(`Access Denied: Your email domain (@${userDomain}) is not authorized to submit feedback.`);
                  return;
                }
              }

              const user = {
                email: payload.email,
                name: payload.name || payload.email,
                picture: payload.picture
              };
              setGoogleUser(user);
              setGoogleLoginError(null);
              localStorage.setItem('feedback-google-user', JSON.stringify(user));
            }
          }
        });

        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          g.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: 320
          });
        }
      } else {
        setTimeout(initializeGoogleBtn, 300);
      }
    };

    initializeGoogleBtn();

    return () => {
      isMounted = false;
    };
  }, [googleUser, googleClientId, googleAllowedDomains]);

  const handleGoogleLogout = () => {
    setGoogleUser(null);
    localStorage.removeItem('feedback-google-user');
    setAnswers({});
    setValidationError(null);
    setGoogleLoginError(null);
  };

  const handleRatingClick = (fieldId: string, rating: number) => {
    if (userPastSubmission) return; // read-only
    setAnswers(prev => ({ ...prev, [fieldId]: rating }));
  };

  const handleTextChange = (fieldId: string, value: string) => {
    if (userPastSubmission) return; // read-only
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    if (userPastSubmission) return; // read-only
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
    if (userPastSubmission) return; // prevent submission of past responses
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
        submittedBy: googleUser ? googleUser.name : (submittedBy.trim() || 'Anonymous'),
        submittedByEmail: googleUser ? googleUser.email : ''
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
        fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif"
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
        fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", padding: '1.5rem'
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

  // Render Google Login Secured state (when login required but not logged in)
  if (requireGoogleLogin && !googleUser) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', overflowY: 'auto', background: 'linear-gradient(180deg, var(--background-alt) 0%, var(--background) 100%)',
        fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", padding: '1.5rem'
      }}>
        <div style={{
          background: 'var(--panel-bg)', border: '1px solid var(--border-light)', borderRadius: '24px',
          padding: '3rem 2rem', width: '100%', maxWidth: '480px', boxShadow: 'var(--shadow)',
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '18px',
            background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Shield size={28} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Authentication Required
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              This feedback portal is secured. Please sign in with your Google account to submit your responses.
            </p>
          </div>

          {/* Alert Message for unconfigured Client ID */}
          {!googleClientId ? (
            <div style={{
              display: 'flex', gap: '0.5rem', alignItems: 'start', padding: '10px 14px', borderRadius: '12px',
              background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'left'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Google Login client credential ID is not yet configured. Please contact the administrator to setup the Client ID.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', alignItems: 'center', margin: '0.5rem 0' }}>
              <div id="google-signin-btn-container" style={{ minHeight: '40px' }} />
              {googleLoginError && (
                <div style={{
                  display: 'flex', gap: '0.5rem', alignItems: 'start', padding: '10px 14px', borderRadius: '12px',
                  background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'left', marginTop: '0.5rem'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{googleLoginError}</span>
                </div>
              )}
            </div>
          )}

          {foundItem && (
            <div style={{
              background: 'var(--background-alt)', borderRadius: '12px', padding: '0.85rem 1.25rem',
              width: '100%', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-primary)',
              textAlign: 'left'
            }}>
              <strong style={{ display: 'block', marginBottom: '2px' }}>{itemTitle}</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{itemSubtitle}</span>
            </div>
          )}
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
        fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", padding: '1.5rem'
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
      fontFamily: "'WF Visual Sans Variable', 'WF Visual Sans', 'Outfit', sans-serif", padding: '2rem 1rem'
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
            
            {/* Warning block if they already submitted */}
            {userPastSubmission && (
              <div style={{
                display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '1rem', borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#d97706', fontSize: '0.85rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Feedback Already Submitted</strong>
                  <span>You have already submitted feedback for this session. Your responses are read-only and cannot be changed.</span>
                </div>
              </div>
            )}

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
              const disabled = !!userPastSubmission;
              return (
                <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: disabled ? 0.8 : 1 }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                    {field.label}
                    {field.required && !disabled && <span style={{ color: 'var(--danger)', marginLeft: '3px' }}>*</span>}
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
                            disabled={disabled}
                            onClick={() => handleRatingClick(field.id, star)}
                            style={{
                              background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: 0,
                              color: isSelected ? '#fbbf24' : 'var(--text-muted)',
                              transition: 'transform 0.1s, color 0.15s'
                            }}
                            onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1.2)'; }}
                            onMouseLeave={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1)'; }}
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
                      disabled={disabled}
                      placeholder="Type your response..."
                      value={answers[field.id] || ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                        border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                        fontSize: '0.85rem', outline: 'none', width: '100%', transition: 'border-color 0.2s'
                      }}
                      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--primary)'; }}
                      onBlur={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === 'textarea' && (
                    <textarea
                      disabled={disabled}
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
                      onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--primary)'; }}
                      onBlur={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                    />
                  )}

                  {/* Dropdown Select */}
                  {field.type === 'select' && (
                    <select
                      disabled={disabled}
                      value={answers[field.id] || ''}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                        border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                        fontSize: '0.85rem', outline: 'none', width: '100%', cursor: disabled ? 'default' : 'pointer'
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
                          <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: disabled ? 'default' : 'pointer' }}>
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: disabled ? 'default' : 'pointer' }}
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

            {/* Google Identity Info / Optional Name Input */}
            {googleUser ? (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Submitting As
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--background-alt)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                  {googleUser.picture && (
                    <img src={googleUser.picture} alt="Google Profile" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{googleUser.name}</span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{googleUser.email}</span>
                  </div>
                  {!userPastSubmission && (
                    <button 
                      type="button" 
                      onClick={handleGoogleLogout} 
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Switch Account
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Your Name / Email (Optional)
                  </label>
                  {googleClientId && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or quick sign-in:</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    disabled={!!userPastSubmission}
                    placeholder="Leave blank to remain anonymous"
                    value={submittedBy}
                    onChange={(e) => setSubmittedBy(e.target.value)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', background: 'var(--background)',
                      border: '1.5px solid var(--border-light)', color: 'var(--text-primary)',
                      fontSize: '0.85rem', outline: 'none', width: '100%'
                    }}
                  />
                  {googleClientId && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.25rem' }}>
                      <div id="google-signin-btn-container" style={{ minHeight: '40px' }} />
                      {googleLoginError && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{googleLoginError}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !!userPastSubmission}
              style={{
                background: userPastSubmission ? 'var(--border-light)' : 'linear-gradient(135deg, var(--primary), #4f46e5)',
                color: userPastSubmission ? 'var(--text-muted)' : '#fff', 
                border: 'none', borderRadius: '12px', padding: '12px',
                fontSize: '0.9rem', fontWeight: 650, cursor: (submitting || userPastSubmission) ? 'not-allowed' : 'pointer',
                boxShadow: userPastSubmission ? 'none' : 'var(--primary-glow) 0 8px 16px', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.5rem'
              }}
              onMouseEnter={e => { if (!submitting && !userPastSubmission) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { if (!submitting && !userPastSubmission) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
                  }} />
                  Submitting Feedback...
                </>
              ) : userPastSubmission ? (
                'Feedback Already Submitted'
              ) : (
                'Submit Feedback'
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Powered by ProductShip • Secure Feedback Protocol
        </div>
      </div>
    </div>
  );
};
