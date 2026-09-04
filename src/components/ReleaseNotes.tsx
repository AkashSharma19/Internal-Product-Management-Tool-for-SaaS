import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TabContainer } from './TabContainer';
import { RichTextEditor } from './RichTextEditor';
import { parseMarkdownToHtml } from '../utils/text';
import { 
  Trash2, 
  Edit3, 
  Sparkles, 
  RefreshCw, 
  Calendar, 
  Check, 
  X,
  AlertCircle,
  Mail,
  BookMarked,
  ExternalLink
} from 'lucide-react';

const KEEP_COLORS = [
  { id: 'default', name: 'Default', color: 'var(--border)', bgTint: 'transparent' },
  { id: 'rose', name: 'Rose', color: '#ef4444', bgTint: 'rgba(239, 68, 68, 0.05)' },
  { id: 'amber', name: 'Amber', color: '#f59e0b', bgTint: 'rgba(245, 158, 11, 0.05)' },
  { id: 'emerald', name: 'Emerald', color: '#10b981', bgTint: 'rgba(16, 185, 129, 0.05)' },
  { id: 'teal', name: 'Teal', color: '#06b6d4', bgTint: 'rgba(6, 182, 212, 0.05)' },
  { id: 'sky', name: 'Sky', color: '#3b82f6', bgTint: 'rgba(59, 130, 246, 0.05)' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1', bgTint: 'rgba(99, 102, 241, 0.05)' },
  { id: 'amethyst', name: 'Amethyst', color: '#8b5cf6', bgTint: 'rgba(139, 92, 246, 0.05)' },
  { id: 'crimson', name: 'Crimson', color: '#ec4899', bgTint: 'rgba(236, 72, 153, 0.05)' }
];

export const ReleaseNotes: React.FC = () => {
  const { 
    releaseNotes, 
    addReleaseNote, 
    updateReleaseNote, 
    deleteReleaseNote, 
    canUserEdit, 
    confirm 
  } = useDashboard();

  // Search query state for TabContainer
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('default');
  const [content, setContent] = useState('');
  const [features, setFeatures] = useState<any[]>([]);

  // Loading States
  const [isFetchingFeatures, setIsFetchingFeatures] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active view modal detail note
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [copiedGmail, setCopiedGmail] = useState(false);

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setSelectedColorId('default');
    setContent('');
    setFeatures([]);
    setErrorMsg(null);
    setEditingNoteId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTitle(note.title);
    setStartDate(note.startDate);
    setEndDate(note.endDate);
    setSelectedColorId(note.color || 'default');
    setContent(note.content);
    const mapped = (note.features || []).map((f: any) => ({
      ...f,
      selected: f.selected !== false
    }));
    setFeatures(mapped);
    setErrorMsg(null);
    setEditingNoteId(note.id);
    setIsOpen(true);
  };

  const handleToggleFeature = (idx: number) => {
    setFeatures(prev => prev.map((f, i) => i === idx ? { ...f, selected: !f.selected } : f));
  };

  const handleToggleSelectAll = () => {
    const allSelected = features.length > 0 && features.every(f => f.selected !== false);
    setFeatures(prev => prev.map(f => ({ ...f, selected: !allSelected })));
  };

  const handleFetchFeatures = async () => {
    if (!startDate || !endDate) {
      setErrorMsg('Please specify both Start Date and End Date to retrieve features.');
      return;
    }
    setIsFetchingFeatures(true);
    setErrorMsg(null);
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'release-notes-fetch-features',
          data: { startDate, endDate }
        })
      });
      const res = await response.json();
      if (res.success) {
        const mapped = (res.features || []).map((f: any) => ({
          ...f,
          selected: true
        }));
        setFeatures(mapped);
        if (mapped.length === 0) {
          setErrorMsg('No features found with release dates in this range.');
        }
      } else {
        setErrorMsg(res.error || 'Failed to fetch features list.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching features.');
    } finally {
      setIsFetchingFeatures(false);
    }
  };

  const handleGenerateAI = async () => {
    const selectedFeatures = features.filter(f => f.selected !== false);
    if (selectedFeatures.length === 0) {
      setErrorMsg('Cannot generate notes: Please select at least one feature from the list.');
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'release-notes-generate-ai',
          data: {
            title: title || 'Sprint Release Notes',
            startDate,
            endDate,
            features: selectedFeatures
          }
        })
      });
      const res = await response.json();
      if (res.success) {
        let cleanContent = res.content || '';
        if (cleanContent.startsWith('```html')) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith('```')) {
          cleanContent = cleanContent.slice(0, -3);
        }
        setContent(cleanContent.trim());
      } else {
        setErrorMsg(res.error || 'Failed to generate AI release notes.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error contacting generative AI endpoint.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Note title is required.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Content cannot be blank. Generate or type release notes details.');
      return;
    }

    try {
      if (editingNoteId) {
        await updateReleaseNote(editingNoteId, {
          title,
          startDate,
          endDate,
          color: selectedColorId,
          content,
          features
        });
      } else {
        const newNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          startDate,
          endDate,
          color: selectedColorId,
          content,
          features
        };
        await addReleaseNote(newNote);
      }
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save note.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canUserEdit) return;
    const ok = await confirm('Are you sure you want to delete this Release Note?');
    if (ok) {
      await deleteReleaseNote(id);
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
    }
  };

  const handleReanalyze = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canUserEdit) return;
    const ok = await confirm('Reanalyze: Do you want to run AI regeneration on this note using its date range and features?');
    if (!ok) return;

    setErrorMsg(null);
    try {
      const savedUserId = localStorage.getItem('logged-in-user-id') || '';
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': savedUserId
        },
        body: JSON.stringify({
          action: 'release-notes-generate-ai',
          data: {
            title: note.title,
            startDate: note.startDate,
            endDate: note.endDate,
            features: note.features || []
          }
        })
      });
      const res = await response.json();
      if (res.success) {
        let cleanContent = res.content || '';
        if (cleanContent.startsWith('```html')) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith('```')) {
          cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();

        await updateReleaseNote(note.id, { content: cleanContent });
        if (selectedNote?.id === note.id) {
          setSelectedNote({ ...selectedNote, content: cleanContent });
        }
      } else {
        alert(res.error || 'Failed to reanalyze note.');
      }
    } catch (err: any) {
      alert(err.message || 'Reanalysis failed.');
    }
  };

  const getColorStyle = (colorId: string) => {
    const colorObj = KEEP_COLORS.find(c => c.id === colorId) || KEEP_COLORS[0];
    return {
      backgroundColor: 'var(--panel-bg)',
      backgroundImage: colorId !== 'default' ? `linear-gradient(135deg, var(--panel-bg), ${colorObj.bgTint})` : 'none',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${colorObj.color}`,
      color: 'var(--text-primary)',
      mutedColor: 'var(--text-secondary)'
    };
  };

  const getCleanHtml = (rawText: string) => {
    if (!rawText) return '';
    // Backward compatibility check (if it contains HTML tags, return it; otherwise parse from markdown)
    return rawText.includes('<') && rawText.includes('>') ? rawText : parseMarkdownToHtml(rawText);
  };

  // Filter notes by search text (title or content) — guard against undefined fields
  const filteredNotes = releaseNotes.filter(note => {
    const titleMatch = (note.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = (note.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || contentMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>

      <TabContainer
        title="AI Release Notes"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder="Search release notes..."
        onAddClick={canUserEdit ? handleOpenCreate : undefined}
        addLabel="Generate Release Notes"
      >
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '6rem 2rem', 
              border: '1px dashed var(--border)', 
              borderRadius: '12px',
              background: 'var(--background-alt)',
              marginTop: '1rem'
            }}>
              <Sparkles size={48} style={{ color: 'var(--primary)', opacity: 0.5, marginBottom: '1.25rem' }} />
              <h3 style={{ margin: 0, fontWeight: 600 }}>No Release Notes Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center', maxWidth: '400px' }}>
                {searchQuery 
                  ? 'No saved notes match your current search query.' 
                  : 'Generate and save notes containing features built, summaries, and potential impact. They will show up as Google Keep style cards here!'}
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.5rem',
              alignItems: 'start'
            }}>
              {filteredNotes.map((note) => {
                const cardStyle = getColorStyle(note.color);
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className="kpi-card keep-card"
                    style={{
                      ...cardStyle,
                      borderRadius: '12px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      minHeight: '180px',
                      maxHeight: '340px',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {note.title}
                      </h3>
                    </div>

                    {/* Date range pill */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', color: 'var(--text-secondary)', background: 'var(--background-alt)', padding: '3px 8px', borderRadius: '20px', width: 'fit-content' }}>
                      <Calendar size={10} />
                      <span>{note.startDate} to {note.endDate}</span>
                    </div>

                    {/* Preview thumbnail — rendered in isolated iframe so newsletter CSS doesn't leak */}
                    <div style={{ flexGrow: 1, overflow: 'hidden', borderRadius: '6px', position: 'relative', minHeight: '120px' }}>
                      <iframe
                        srcDoc={getCleanHtml(note.content)}
                        title={note.title}
                        sandbox="allow-scripts allow-same-origin"
                        style={{
                          width: '600px',
                          height: '500px',
                          border: 'none',
                          transformOrigin: 'top left',
                          transform: 'scale(0.42)',
                          pointerEvents: 'none',
                          display: 'block'
                        }}
                      />
                    </div>

                    {/* Card controls on hover */}
                    <div className="keep-card-controls" style={{ 
                      display: 'flex', 
                      justifyContent: 'flex-end', 
                      gap: '10px',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--border)',
                      marginTop: 'auto'
                    }}>
                      {canUserEdit && (
                        <>
                          <button 
                            title="Reanalyze / Regenerate" 
                            onClick={(e) => handleReanalyze(note, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            title="Edit Note" 
                            onClick={(e) => handleOpenEdit(note, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            title="Delete Note" 
                            onClick={(e) => handleDelete(note.id, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TabContainer>

      {/* Note view/details Modal */}
      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" style={{ 
            maxWidth: '750px',
            backgroundColor: getColorStyle(selectedNote.color).backgroundColor,
            backgroundImage: getColorStyle(selectedNote.color).backgroundImage,
            border: getColorStyle(selectedNote.color).border,
            borderLeft: getColorStyle(selectedNote.color).borderLeft
          }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>
                {selectedNote.title}
              </h2>
              <button className="modal-close" onClick={() => setSelectedNote(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} />
                {selectedNote.startDate} to {selectedNote.endDate}
              </span>
              {selectedNote.features && selectedNote.features.length > 0 && (
                <span style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '15px' }}>
                  {selectedNote.features.length} features included
                </span>
              )}
            </div>

            {/* Full newsletter rendered in isolated iframe — no parent CSS leakage */}
            <div style={{
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              margin: '0.5rem 0',
              maxHeight: '52vh',
              overflow: 'hidden',
              borderRadius: '8px'
            }}>
              <iframe
                srcDoc={getCleanHtml(selectedNote.content)}
                title={selectedNote.title}
                sandbox="allow-scripts allow-same-origin"
                style={{
                  width: '100%',
                  height: '52vh',
                  border: 'none',
                  display: 'block'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Last updated: {new Date(selectedNote.updatedAt || selectedNote.createdAt || Date.now()).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
              <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
                {/* Copy for Gmail — writes rich HTML to clipboard so it pastes as formatted email */}
                <button
                  onClick={async () => {
                    try {
                      const html = getCleanHtml(selectedNote.content);
                      const blob = new Blob([html], { type: 'text/html' });
                      const item = new ClipboardItem({ 'text/html': blob });
                      await navigator.clipboard.write([item]);
                      setCopiedGmail(true);
                      setTimeout(() => setCopiedGmail(false), 2500);
                    } catch {
                      // Fallback: copy raw HTML as plain text
                      navigator.clipboard.writeText(getCleanHtml(selectedNote.content));
                      setCopiedGmail(true);
                      setTimeout(() => setCopiedGmail(false), 2500);
                    }
                  }}
                  className="btn btn-primary btn-sm"
                  title="Copy formatted HTML — paste directly into Gmail compose window"
                >
                  {copiedGmail ? <><Check size={12} /> Copied!</> : <><Mail size={12} /> Copy for Gmail</>}
                </button>
                {canUserEdit && (
                  <>
                    <button
                      onClick={(e) => { setSelectedNote(null); handleReanalyze(selectedNote, e); }}
                      className="btn btn-secondary btn-sm"
                    >
                      <RefreshCw size={12} /> Reanalyze
                    </button>
                    <button
                      onClick={(e) => { setSelectedNote(null); handleOpenEdit(selectedNote, e); }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Edit3 size={12} /> Edit Note
                    </button>
                    <button
                      onClick={(e) => { handleDelete(selectedNote.id, e); }}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedNote(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal Dialog */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" style={{ 
            maxWidth: '800px', 
            maxHeight: '95vh', 
            overflowY: 'auto' 
          }} onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h2 className="modal-title" style={{ margin: 0 }}>
                {editingNoteId ? 'Edit Release Note' : 'Generate New Release Note'}
              </h2>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'var(--danger-bg)', 
                border: '1px solid var(--danger)', 
                color: 'var(--danger)', 
                padding: '0.75rem 1rem', 
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Release Title */}
              <div className="form-group-full">
                <label className="form-label">
                  Release Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint 5 Release, v1.2.0 Changelog..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Start Date */}
              <div className="form-group">
                <label className="form-label">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                />
              </div>

              {/* End Date */}
              <div className="form-group">
                <label className="form-label">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Google Keep Color Selector */}
            <div className="form-group">
              <label className="form-label">
                Keep Card Accent Color
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {KEEP_COLORS.map(c => (
                  <button
                    key={c.id}
                    title={c.name}
                    onClick={() => setSelectedColorId(c.id)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: c.id === 'default' ? 'var(--background)' : c.color,
                      border: selectedColorId === c.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {selectedColorId === c.id && <Check size={12} style={{ color: c.id === 'default' ? 'var(--primary)' : '#ffffff' }} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Fetch & Match features section */}
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '1rem',
              backgroundColor: 'var(--background-alt)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Features list ({features.filter(f => f.selected !== false).length}/{features.length} selected)
                  </span>
                  {features.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        textDecoration: 'underline'
                      }}
                    >
                      {features.length > 0 && features.every(f => f.selected !== false) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleFetchFeatures}
                  disabled={isFetchingFeatures}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw size={10} style={{ animation: isFetchingFeatures ? 'spin 1.5s linear infinite' : 'none' }} /> Fetch Features
                </button>
              </div>

              {features.length > 0 ? (
                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px',
                  scrollbarWidth: 'thin'
                }}>
                  {features.map((f, idx) => {
                    const isSelected = f.selected !== false;
                    return (
                      <label 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.75rem', 
                          background: isSelected ? 'var(--background)' : 'var(--background-alt)', 
                          padding: '6px 10px', 
                          borderRadius: '6px', 
                          border: isSelected ? '1px solid var(--border)' : '1px dashed var(--border-light)',
                          opacity: isSelected ? 1 : 0.55,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          userSelect: 'none'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleFeature(idx)}
                          style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                        />
                        <span style={{ 
                          fontWeight: 500, 
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                          flex: 1,
                          textDecoration: isSelected ? 'none' : 'line-through',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap'
                        }}>
                          <span>{f.feature}</span>
                          {f.supportDocLink && f.supportDocLink.trim() !== '' && (
                            <a
                              href={f.supportDocLink.startsWith('http') ? f.supportDocLink : `https://${f.supportDocLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`Support Doc: ${f.supportDocLink}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.65rem',
                                fontWeight: 650,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <BookMarked size={10} /> Doc Added <ExternalLink size={8} style={{ opacity: 0.7 }} />
                            </a>
                          )}
                          {f.supportDocsRequired && (!f.supportDocLink || f.supportDocLink.trim() === '') && (
                            <span
                              title="Support docs required but link not provided yet"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.65rem',
                                fontWeight: 650,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.25)'
                              }}
                            >
                              Doc Needed
                            </span>
                          )}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                          {f.product ? `${f.product} • ` : ''}{f.finalRelease}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem 0' }}>
                  No features fetched yet. Specify start/end dates and click Fetch Features.
                </div>
              )}
            </div>

            {/* Generated Content Editor */}
            <div className="form-group" style={{ flexGrow: 1, minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Generated Release Notes Content (Rich Text Editor) *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating || features.filter(f => f.selected !== false).length === 0}
                  className="btn btn-primary btn-sm"
                >
                  <Sparkles size={11} /> {isGenerating ? 'Analyzing...' : 'Generate with AI'}
                </button>
              </div>

              <div style={{ 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                overflow: 'hidden',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--background)',
                minHeight: '280px'
              }}>
                <RichTextEditor
                  value={content}
                  onChange={(val) => setContent(val)}
                  placeholder="Release notes content will generate here. You can edit using formatting tools directly..."
                  canEdit={true}
                />
              </div>
            </div>

            {/* Save Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
              >
                {editingNoteId ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
