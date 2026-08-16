import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquareText, 
  Send, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Bot, 
  Ship,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { playPopSound } from '../utils/audio';

import { useDashboard } from '../context/DashboardContext';
import type { StickyNote } from '../types';

const BoatBotIcon: React.FC<{ size?: number; botSize?: number; className?: string; style?: React.CSSProperties }> = ({ size = 20, botSize = 12, className, style }) => {
  return (
    <div className={className} style={{ position: 'relative', width: `${size}px`, height: `${size}px`, display: 'inline-block', ...style }}>
      <Ship size={size - 2} style={{ position: 'absolute', top: 0, left: 0 }} />
      <Bot 
        size={botSize} 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          right: 0, 
          background: 'var(--panel-bg)', 
          border: '1px solid var(--border-light)', 
          borderRadius: '3px', 
          padding: '1px',
          boxSizing: 'border-box'
        }} 
      />
    </div>
  );
};

const COLORS: StickyNote['color'][] = ['yellow', 'blue', 'pink', 'green', 'purple'];

export const StickyNotesBot: React.FC = () => {
  const { 
    stickyNotes, 
    addStickyNote, 
    updateStickyNote, 
    deleteStickyNote, 
    currentUser,
    completedNotesCount,
    deleteAllCompletedNotes,
    restoreAllCompletedNotes
  } = useDashboard();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [inputValue, setInputValue] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lazy-loaded Completed Notes State
  const [isCompletedExpanded, setIsCompletedExpanded] = useState<boolean>(false);
  const [completedNotes, setCompletedNotes] = useState<StickyNote[]>([]);
  const [completedPage, setCompletedPage] = useState<number>(1);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState<boolean>(false);

  // Auto-expand input box as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  // Fetch completed notes when expanded
  useEffect(() => {
    if (isCompletedExpanded && completedNotes.length === 0) {
      fetchCompletedNotes(1);
    }
  }, [isCompletedExpanded]);

  const fetchCompletedNotes = async (page: number, append = false) => {
    setIsLoadingCompleted(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      const response = await fetch(`/api/data?action=completed-sticky-notes&page=${page}&limit=5`, { headers });
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          setCompletedNotes(prev => append ? [...prev, ...resData.data] : resData.data);
          setCompletedPage(resData.page || 1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch completed notes:', err);
    } finally {
      setIsLoadingCompleted(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote(e);
    }
  };

  const handleTogglePanel = () => {
    playPopSound();
    setIsOpen(!isOpen);
  };

  const handleAddNote = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    // Pick a color based on note length to keep them distributed
    const color = COLORS[stickyNotes.length % COLORS.length];
    
    const newNote: StickyNote = {
      id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: inputValue.trim(),
      completed: false,
      createdAt: new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      color,
      userId: currentUser?.id || '',
    };

    addStickyNote(newNote);
    setInputValue('');
    playPopSound();
  };

  const handleDeleteNote = (id: string) => {
    deleteStickyNote(id, false);
    playPopSound();
  };

  const handleToggleComplete = (id: string) => {
    const note = stickyNotes.find(n => n.id === id);
    if (note) {
      updateStickyNote(id, { ...note, completed: true });
      playPopSound();
    }
  };

  const handleToggleCompleteCompleted = (note: StickyNote) => {
    updateStickyNote(note.id, { ...note, completed: false });
    setCompletedNotes(prev => prev.filter(n => n.id !== note.id));
    playPopSound();
  };

  const handleDeleteCompletedNote = (id: string) => {
    deleteStickyNote(id, true);
    setCompletedNotes(prev => prev.filter(n => n.id !== id));
    playPopSound();
  };

  const handleStartEdit = (note: StickyNote) => {
    setEditingId(note.id);
    setEditingText(note.text);
    playPopSound();
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    updateStickyNote(id, { text: editingText.trim() });
    setEditingId(null);
    setEditingText('');
    playPopSound();
  };

  const handleSaveEditCompleted = (id: string) => {
    if (!editingText.trim()) return;
    updateStickyNote(id, { text: editingText.trim() });
    setCompletedNotes(prev => prev.map(note => note.id === id ? { ...note, text: editingText.trim() } : note));
    setEditingId(null);
    setEditingText('');
    playPopSound();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
    playPopSound();
  };

  const handleChangeColor = (id: string, color: StickyNote['color']) => {
    updateStickyNote(id, { color });
    playPopSound();
  };

  const handleChangeColorCompleted = (id: string, color: StickyNote['color']) => {
    updateStickyNote(id, { color });
    setCompletedNotes(prev => prev.map(note => note.id === id ? { ...note, color } : note));
    playPopSound();
  };

  const handleDeleteAllCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete all completed notes?')) {
      await deleteAllCompletedNotes();
      setCompletedNotes([]);
      playPopSound();
    }
  };

  const handleRestoreAllCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to restore all completed notes?')) {
      // If we don't have all completed notes loaded locally, fetch them from the backend
      let notesToRestore = completedNotes;
      if (completedNotes.length < completedNotesCount) {
        try {
          const headers: Record<string, string> = {};
          if (currentUser?.id) headers['x-user-id'] = currentUser.id;
          const response = await fetch(`/api/data?action=completed-sticky-notes&page=1&limit=1000`, { headers });
          if (response.ok) {
            const resData = await response.json();
            if (resData.success && resData.data) {
              notesToRestore = resData.data;
            }
          }
        } catch (err) {
          console.error('Failed to pre-fetch completed notes for batch restore:', err);
        }
      }
      await restoreAllCompletedNotes(notesToRestore);
      setCompletedNotes([]);
      playPopSound();
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isMobile && (
        <button 
          className={`sticky-bot-fab ${isOpen ? 'hidden' : ''}`} 
          onClick={handleTogglePanel}
          aria-label="Toggle Boat Bot Assistant"
          title="Open Boat Bot"
        >
          <div className="sticky-bot-fab-pulse"></div>
          <MessageSquareText size={24} />
        </button>
      )}

      {/* Drawer Panel */}
      <div className={`sticky-bot-panel ${(isMobile || isOpen) ? 'open' : ''} ${isMobile ? 'mobile-fixed' : ''}`}>
        
        {/* Panel Header */}
        <div className="sticky-bot-header">
          <div className="sticky-bot-header-info">
            <div className="sticky-bot-avatar">
              <BoatBotIcon size={20} botSize={11} />
            </div>
            <div>
              <h3 className="sticky-bot-header-title">Boat Bot</h3>
              <p className="sticky-bot-header-subtitle">Your local scratchpad assistant</p>
            </div>
          </div>
          {!isMobile && (
            <button 
              className="sticky-bot-close-btn" 
              onClick={handleTogglePanel}
              title="Close Panel"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Panel Body */}
        <div className="sticky-bot-body">
          {/* Welcome Message Card (Acts as the Bot Persona) */}
          {stickyNotes.length === 0 && completedNotesCount === 0 && (
            <div className="sticky-note-card blue" style={{ opacity: 0.95, transform: 'none' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <BoatBotIcon size={18} botSize={10} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div className="sticky-note-text" style={{ fontWeight: 600 }}>
                  Hello! I'm your Boat Bot. 
                  <br />
                  Type any quick notes or reminders below, and I'll pin them here. Mark them done, edit, or delete them anytime!
                </div>
              </div>
            </div>
          )}

          {stickyNotes.length === 0 && completedNotesCount === 0 ? (
            <div className="sticky-bot-empty">
              <MessageSquareText size={36} className="sticky-bot-empty-icon" />
              <p className="sticky-bot-empty-text">No notes pinned yet</p>
              <p className="sticky-bot-empty-hint">Type a message below to create your first sticky note!</p>
            </div>
          ) : (
            stickyNotes.map(note => {
              const isEditing = editingId === note.id;
              return (
                <div 
                  key={note.id} 
                  className={`sticky-note-card ${note.color}`}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <textarea
                        className="sticky-note-edit-textarea"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(note.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      
                      {/* Color Selector during edit */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => handleChangeColor(note.id, c)}
                              type="button"
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                border: note.color === c ? '2px solid rgba(0,0,0,0.5)' : '1px solid rgba(0,0,0,0.15)',
                                backgroundColor: 
                                  c === 'yellow' ? '#fde047' : 
                                  c === 'blue' ? '#3b82f6' : 
                                  c === 'pink' ? '#ec4899' : 
                                  c === 'green' ? '#22c55e' : '#a855f7',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title={`Change color to ${c}`}
                            />
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="sticky-note-action-btn"
                            onClick={handleCancelEdit}
                            title="Cancel"
                            type="button"
                          >
                            <X size={14} />
                          </button>
                          <button 
                            className="sticky-note-action-btn"
                            onClick={() => handleSaveEdit(note.id)}
                            title="Save"
                            type="button"
                            style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="sticky-note-text">{note.text}</div>
                      
                      {/* Actions Footer */}
                      <div className="sticky-note-actions">
                        <span className="sticky-note-date">{note.createdAt}</span>
                        
                        <div className="sticky-note-btn-group">
                          {/* Complete button */}
                          <button
                            className="sticky-note-action-btn complete-btn"
                            onClick={() => handleToggleComplete(note.id)}
                            title="Mark Done"
                            type="button"
                          >
                            <Check size={13} />
                          </button>

                          {/* Edit button */}
                          <button
                            className="sticky-note-action-btn"
                            onClick={() => handleStartEdit(note)}
                            title="Edit Note"
                            type="button"
                          >
                            <Edit2 size={12} />
                          </button>

                          {/* Delete button */}
                          <button
                            className="sticky-note-action-btn"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Delete Note"
                            type="button"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Completed Notes collapsible Bar */}
          {completedNotesCount > 0 && (
            <>
              <div 
                className="completed-notes-bar"
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              >
                <div className="completed-notes-bar-left">
                  {isCompletedExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  <Check size={14} style={{ color: 'var(--primary)', strokeWidth: 3 }} />
                  <span>{completedNotesCount} Completed {completedNotesCount === 1 ? 'Note' : 'Notes'}</span>
                </div>
                <div className="completed-notes-bar-actions">
                  <button 
                    className="completed-notes-bar-btn danger-action"
                    onClick={handleDeleteAllCompleted}
                    type="button"
                  >
                    Delete all
                  </button>
                  <button 
                    className="completed-notes-bar-primary-btn"
                    onClick={handleRestoreAllCompleted}
                    type="button"
                  >
                    Restore all
                  </button>
                </div>
              </div>

              {isCompletedExpanded && (
                <div className="completed-notes-list">
                  {completedNotes.map(note => {
                    const isEditing = editingId === note.id;
                    return (
                      <div 
                        key={note.id} 
                        className={`sticky-note-card ${note.color} completed`}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <textarea
                              className="sticky-note-edit-textarea"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEditCompleted(note.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            
                            {/* Color Selector during edit */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {COLORS.map(c => (
                                  <button
                                    key={c}
                                    onClick={() => handleChangeColorCompleted(note.id, c)}
                                    type="button"
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '50%',
                                      border: note.color === c ? '2px solid rgba(0,0,0,0.5)' : '1px solid rgba(0,0,0,0.15)',
                                      backgroundColor: 
                                        c === 'yellow' ? '#fde047' : 
                                        c === 'blue' ? '#3b82f6' : 
                                        c === 'pink' ? '#ec4899' : 
                                        c === 'green' ? '#22c55e' : '#a855f7',
                                      cursor: 'pointer',
                                      padding: 0
                                    }}
                                    title={`Change color to ${c}`}
                                  />
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button 
                                  className="sticky-note-action-btn"
                                  onClick={handleCancelEdit}
                                  title="Cancel"
                                  type="button"
                                >
                                  <X size={14} />
                                </button>
                                <button 
                                  className="sticky-note-action-btn"
                                  onClick={() => handleSaveEditCompleted(note.id)}
                                  title="Save"
                                  type="button"
                                  style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="sticky-note-text">{note.text}</div>
                            
                            {/* Actions Footer */}
                            <div className="sticky-note-actions">
                              <span className="sticky-note-date">{note.createdAt}</span>
                              
                              <div className="sticky-note-btn-group">
                                {/* Done/Undone button */}
                                <button
                                  className="sticky-note-action-btn complete-btn active"
                                  onClick={() => handleToggleCompleteCompleted(note)}
                                  title="Mark Active"
                                  type="button"
                                >
                                  <Check size={13} style={{ strokeWidth: 3 }} />
                                </button>

                                {/* Edit button */}
                                <button
                                  className="sticky-note-action-btn"
                                  onClick={() => handleStartEdit(note)}
                                  title="Edit Note"
                                  type="button"
                                >
                                  <Edit2 size={12} />
                                </button>

                                {/* Delete button */}
                                <button
                                  className="sticky-note-action-btn"
                                  onClick={() => handleDeleteCompletedNote(note.id)}
                                  title="Delete Note"
                                  type="button"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {isLoadingCompleted && (
                    <div style={{ textAlign: 'center', padding: '8px', fontSize: '0.75rem', opacity: 0.6 }}>
                      Loading completed notes...
                    </div>
                  )}

                  {completedNotes.length < completedNotesCount && !isLoadingCompleted && (
                    <button 
                      className="completed-notes-load-more"
                      onClick={() => fetchCompletedNotes(completedPage + 1, true)}
                      type="button"
                    >
                      Load More Completed Notes
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div className="sticky-bot-footer">
          <form className="sticky-bot-input-form" onSubmit={handleAddNote}>
            <textarea
              ref={textareaRef}
              className="sticky-bot-input"
              placeholder="Pin a note..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                height: '36px',
              }}
            />
            <button 
              type="submit" 
              className="sticky-bot-send-btn"
              title="Add Note"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

      </div>
    </>
  );
};
